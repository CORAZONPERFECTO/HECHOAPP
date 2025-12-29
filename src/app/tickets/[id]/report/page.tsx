"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, setDoc, updateDoc, onSnapshot, Timestamp } from "firebase/firestore"; // Added updateDoc, onSnapshot, Timestamp
import { db, auth } from "@/lib/firebase"; // Added auth
import { Ticket, TicketReport, ReportSection, TicketReportSection, TicketReportNew } from "@/types/schema";
import { generateReportFromTicket, updatePhotosFromTicket } from "@/lib/report-generator";
import { TicketReportEditor } from "@/components/reports/ticket-report-editor";
import { TicketReportView } from "@/components/reports/ticket-report-view";
import { ExportMenu } from "@/components/reports/export-menu";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Eye, Edit, Printer, ArrowLeft, Undo2, Redo2, Lock } from "lucide-react"; // Added Lock
import { useUndoRedo } from "@/hooks/use-undo-redo";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useDebounce } from "@/hooks/use-debounce";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Would need this component, assuming standard shadcn

export default function TicketReportPage() {
    const params = useParams();
    const router = useRouter();
    const ticketId = params.id as string;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [ticket, setTicket] = useState<Ticket | null>(null);
    const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");

    // Locking State
    const [isLocked, setIsLocked] = useState(false);
    const [lockedBy, setLockedBy] = useState<{ userId: string; userName: string; at: Timestamp } | null>(null);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

    // Undo/Redo para el reporte
    const {
        state: report,
        setState: setReport,
        undo,
        redo,
        canUndo,
        canRedo,
    } = useUndoRedo<TicketReportNew | null>({
        initialState: null,
        maxHistory: 50,
    });

    const [lastSavedReport, setLastSavedReport] = useState<TicketReportNew | null>(null);
    const debouncedReport = useDebounce(report, 2000); // 2 seconds debounce for auto-save

    // Auto-save effect
    useEffect(() => {
        if (debouncedReport && lastSavedReport) {
            // Compare stringified versions to avoid deep object equality issues or unnecessary saves
            const hasChanges = JSON.stringify(debouncedReport) !== JSON.stringify(lastSavedReport);
            if (hasChanges) {
                handleSave(debouncedReport, true); // true = auto-save (silent)
            }
        }
    }, [debouncedReport]);

    // Auth Listener
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            setCurrentUser(user);
        });
        return () => unsubscribe();
    }, []);

    // Locking Logic
    const claimLock = async () => {
        if (!currentUser || !ticketId || isLocked) return;
        try {
            // Only update the lock fields to avoid overwriting content
            await updateDoc(doc(db, "ticketReports", ticketId), {
                lockedBy: {
                    userId: currentUser.uid,
                    userName: currentUser.displayName || 'Usuario',
                    at: Timestamp.now()
                }
            });
        } catch (e) {
            console.error("Error claiming lock:", e);
        }
    };

    const releaseLock = async () => {
        if (!currentUser || !ticketId) return;
        try {
            // We optimistically release assuming we own it or it's stale
            //Ideally check if we own it, but for now simplify to avoid complex reads on unmount
            await updateDoc(doc(db, "ticketReports", ticketId), {
                lockedBy: null
            });
        } catch (e) {
            console.error("Error releasing lock:", e);
        }
    };

    // Heartbeat & Lock Check
    useEffect(() => {
        if (!ticketId || !currentUser) return;

        // 1. Realtime listener for Lock Status
        const unsubscribe = onSnapshot(doc(db, "ticketReports", ticketId), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data() as TicketReportNew;
                const lock = data.lockedBy;

                if (lock) {
                    const lockTime = lock.at.toDate().getTime();
                    const now = Date.now();
                    const diffMinutes = (now - lockTime) / 1000 / 60;

                    if (lock.userId !== currentUser.uid && diffMinutes < 5) {
                        // Locked by someone else active
                        setIsLocked(true);
                        setLockedBy(lock);
                    } else {
                        // Locked by me OR expired -> We can take it
                        setIsLocked(false);
                        setLockedBy(null);
                    }
                } else {
                    setIsLocked(false);
                    setLockedBy(null);
                }
            }
        });

        // 2. Heartbeat to maintain my lock
        const interval = setInterval(() => {
            if (!isLocked && currentUser) {
                claimLock();
            }
        }, 60 * 1000); // Every minute

        // Initial claim
        claimLock();

        return () => {
            unsubscribe();
            clearInterval(interval);
            // Attempt release on unmount if we weren't locked out
            if (!isLocked) releaseLock();
        };
    }, [ticketId, currentUser, isLocked]);

    useEffect(() => {
        loadData();
    }, [ticketId]);

    const loadData = async () => {
        try {
            setLoading(true);

            // Load ticket
            const ticketDoc = await getDoc(doc(db, "tickets", ticketId));
            if (!ticketDoc.exists()) {
                alert("Ticket no encontrado");
                router.push("/tickets");
                return;
            }
            const ticketData = { id: ticketDoc.id, ...ticketDoc.data() } as Ticket;
            setTicket(ticketData);

            // Load or generate report
            const reportDoc = await getDoc(doc(db, "ticketReports", ticketId));

            let currentReport: TicketReportNew;
            if (reportDoc.exists()) {
                // Load existing report
                currentReport = reportDoc.data() as TicketReportNew;
            } else {
                // Generate new report
                currentReport = generateReportFromTicket(ticketData);
                await setDoc(doc(db, "ticketReports", ticketId), currentReport);
            }
            setReport(currentReport);
            setLastSavedReport(currentReport); // Initialize last saved state
        } catch (error) {
            console.error("Error loading data:", error);
            alert("Error al cargar el informe");
        } finally {
            setLoading(false);
        }
    };
    const handleSave = async (updatedReport: TicketReportNew, isAutoSave = false) => {
        // Validation: Block save if locked by someone else
        if (isLocked) {
            if (!isAutoSave) alert("No puedes guardar cambios: El reporte está bloqueado por otro usuario.");
            return;
        }

        try {
            if (!isAutoSave) setSaving(true);

            // Validación
            if (!updatedReport.ticketId || !updatedReport.sections) {
                throw new Error("Datos del informe incompletos");
            }

            // Sanitizar datos: remover undefined values que Firestore no acepta
            const sanitizeData = (obj: any): any => {
                if (obj === null || obj === undefined) return null;
                if (Array.isArray(obj)) {
                    return obj.map(item => sanitizeData(item)).filter(item => item !== null && item !== undefined);
                }
                if (typeof obj === 'object') {
                    const cleaned: any = {};
                    Object.keys(obj).forEach(key => {
                        const value = sanitizeData(obj[key]);
                        if (value !== undefined && value !== null) {
                            cleaned[key] = value;
                        }
                    });
                    return cleaned;
                }
                return obj;
            };

            const cleanedReport = sanitizeData(updatedReport);

            if (!isAutoSave) console.log("Guardando informe:", ticketId, cleanedReport);
            await setDoc(doc(db, "ticketReports", ticketId), cleanedReport);

            // Only update local state if it's a manual save to avoid resetting undo history (?)
            // Actually, we don't need to update state here because it's already updated via onChange.
            // We just update the lastSaved reference.
            setLastSavedReport(updatedReport);

            if (!isAutoSave) {
                // Show success toast for manual save
                const toast = document.createElement('div');
                toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-opacity duration-500';
                toast.textContent = '✓ Informe guardado correctamente';
                document.body.appendChild(toast);
                setTimeout(() => {
                    toast.style.opacity = '0';
                    setTimeout(() => toast.remove(), 500);
                }, 3000);
            }
        } catch (error: any) {
            console.error("Error completo al guardar:", error);
            if (!isAutoSave) alert("Error al guardar el informe");
        } finally {
            if (!isAutoSave) setSaving(false);
        }
    };

    const loadTicketPhotos = async (tid: string) => {
        try {
            setLoading(true);
            const ticketDoc = await getDoc(doc(db, "tickets", tid));
            if (!ticketDoc.exists()) return;

            const ticketData = { id: ticketDoc.id, ...ticketDoc.data() } as Ticket;
            setTicket(ticketData);

            if (report) {
                const updatedReport = updatePhotosFromTicket(report, ticketData);
                setReport(updatedReport);
                // Auto-save the updated report immediately to persist new photos
                await handleSave(updatedReport, true);

                // Show success toast
                const toast = document.createElement('div');
                toast.className = 'fixed top-4 right-4 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-opacity duration-500';
                toast.textContent = '✓ Fotos actualizadas correctamente';
                document.body.appendChild(toast);
                setTimeout(() => {
                    toast.style.opacity = '0';
                    setTimeout(() => toast.remove(), 500);
                }, 3000);
            }
        } catch (error) {
            console.error("Error updating photos:", error);
            alert("Error al actualizar fotos");
        } finally {
            setLoading(false);
        }
    };


    const handleUpdatePhotos = async () => {
        if (!ticket || !report) return;

        try {
            setSaving(true);
            const updatedReport = updatePhotosFromTicket(report, ticket);
            await setDoc(doc(db, "ticketReports", ticketId), updatedReport);
            setReport(updatedReport);
            setLastSavedReport(updatedReport);

            // Show success toast
            const toast = document.createElement('div');
            toast.className = 'fixed top-4 right-4 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg z-50';
            toast.textContent = '✓ Fotos actualizadas correctamente';
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
        } catch (error) {
            console.error("Error updating photos:", error);
            alert("Error al actualizar fotos");
        } finally {
            setSaving(false);
        }
    };

    const handleRegenerate = async () => {
        if (!ticket) return;

        try {
            setSaving(true);
            const newReport = generateReportFromTicket(ticket);
            await setDoc(doc(db, "ticketReports", ticketId), newReport);
            setReport(newReport);
            setLastSavedReport(newReport);

            // Show success toast
            const toast = document.createElement('div');
            toast.className = 'fixed top-4 right-4 bg-orange-600 text-white px-6 py-3 rounded-lg shadow-lg z-50';
            toast.textContent = '✓ Informe regenerado desde el ticket';
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
        } catch (error) {
            console.error("Error regenerating report:", error);
            alert("Error al regenerar el informe");
        } finally {
            setSaving(false);
        }
    };

    // State for interactive preview
    const [isInteractive, setIsInteractive] = useState(false);

    // Helper to update a section content directly
    const handleUpdateSection = (sectionId: string, updates: Partial<TicketReportSection>) => {
        if (!report) return;

        const sectionIndex = report.sections.findIndex(s => s.id === sectionId);
        if (sectionIndex === -1) return;

        const updatedSections = [...report.sections];
        updatedSections[sectionIndex] = { ...updatedSections[sectionIndex], ...updates } as any;

        const newReport = { ...report, sections: updatedSections };
        setReport(newReport);
    };

    // Atajos de teclado
    useKeyboardShortcuts([
        {
            key: 's',
            ctrl: true,
            handler: () => {
                if (report) {
                    handleSave(report); // Manual save
                }
            },
            description: 'Guardar'
        },
        {
            key: 'z',
            ctrl: true,
            handler: undo,
            description: 'Deshacer'
        },
        {
            key: 'y',
            ctrl: true,
            handler: redo,
            description: 'Rehacer'
        }
    ], true);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!ticket || !report) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50">
                <p className="text-gray-500">No se pudo cargar el informe</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-gray-50 dark:bg-zinc-950">
            {/* Header */}
            <div className="flex-none bg-white dark:bg-zinc-900 border-b px-6 py-4 flex items-center justify-between shadow-sm z-10">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-xl font-bold dark:text-white">Editar Informe</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Ticket #{ticket?.ticketNumber || '...'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="mr-4 flex items-center bg-gray-100 dark:bg-zinc-800 p-1 rounded-lg">
                        <Button
                            variant={activeTab === 'edit' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => setActiveTab('edit')}
                            className="text-sm gap-2"
                        >
                            <Edit className="h-4 w-4" />
                            Editor
                        </Button>
                        <Button
                            variant={activeTab === 'preview' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => setActiveTab('preview')}
                            className="text-sm gap-2"
                        >
                            <Eye className="h-4 w-4" />
                            Vista Previa
                        </Button>
                    </div>

                    {/* Undo/Redo Controls - Only show in Edit mode or if interactive */}
                    <div className="flex items-center gap-1 mr-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={undo}
                            disabled={!canUndo}
                            title="Deshacer (Ctrl+Z)"
                        >
                            <Undo2 className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={redo}
                            disabled={!canRedo}
                            title="Rehacer (Ctrl+Y)"
                        >
                            <Redo2 className="h-4 w-4" />
                        </Button>
                    </div>

                    <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-2" />

                    <Button
                        variant={saving ? 'secondary' : 'default'}
                        onClick={() => report && handleSave(report)}
                        disabled={saving || !report || isLocked}
                    >
                        {saving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Guardando...
                            </>
                        ) : (
                            isLocked ? (
                                <>
                                    <Lock className="mr-2 h-4 w-4" />
                                    Bloqueado
                                </>
                            ) : 'Guardar'
                        )}
                    </Button>

                    {report && (
                        <ExportMenu
                            report={report}
                        />
                    )}
                </div>
            </div>

            {/* Locked Alert */}
            {isLocked && lockedBy && (
                <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 flex items-center justify-between text-sm text-amber-800">
                    <div className="flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        <span>
                            <strong>{lockedBy.userName}</strong> está editando este reporte.
                            <span className="ml-1 opacity-75">
                                (Desde hace {Math.floor((Date.now() - lockedBy.at.toDate().getTime()) / 1000 / 60)} min)
                            </span>
                        </span>
                    </div>
                    <div>Modo Solo Lectura</div>
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 overflow-hidden relative">
                {loading ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                    </div>
                ) : (
                    activeTab === 'edit' ? (
                        <div className="absolute inset-0 overflow-y-auto p-6">
                            <div className="max-w-4xl mx-auto bg-white dark:bg-zinc-900 rounded-xl shadow-sm min-h-[calc(100vh-12rem)] pb-20">
                                <div className="flex-1 overflow-hidden">
                                    {report ? (
                                        <TicketReportEditor
                                            report={report}
                                            onChange={setReport}
                                            onSave={async (r) => {
                                                setReport(r); // Optimistic update
                                                await handleSave(r);
                                            }}
                                            onUpdatePhotos={async () => {
                                                await loadTicketPhotos(params.id as string);
                                            }}
                                            onRegenerate={async () => {
                                                if (confirm('¿Regenerar reporte? Se perderán los cambios manuales.')) {
                                                    // Logic to regenerate would go here, or we call the initial generation again
                                                    // For now, reload the page or re-trigger generation if we had the function exposed
                                                    window.location.reload();
                                                }
                                            }}
                                            availablePhotos={ticket?.photos || []}
                                            saving={saving}
                                            readOnly={isLocked}
                                        />
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="absolute inset-0 overflow-y-auto bg-gray-100 dark:bg-black p-6">
                            {/* Preview Controls Header */}
                            <div className="max-w-[210mm] mx-auto mb-4 flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <label className="flex items-center gap-2 cursor-pointer bg-white dark:bg-zinc-900 px-3 py-2 rounded-md shadow-sm border text-sm font-medium select-none">
                                        <input
                                            type="checkbox"
                                            checked={isInteractive}
                                            onChange={(e) => setIsInteractive(e.target.checked)}
                                            className="accent-blue-600 h-4 w-4"
                                        />
                                        Vista Previa Interactiva
                                    </label>
                                    {isInteractive && <span className="text-xs text-blue-600 font-medium animate-pulse">● Modo Edición Activo</span>}
                                </div>
                                <div className="text-xs text-gray-500">
                                    Formato A4
                                </div>
                            </div>

                            <div className="max-w-[210mm] mx-auto bg-white dark:bg-zinc-900 shadow-lg min-h-[297mm] p-[15mm] print:shadow-none print:m-0 print:w-full">
                                {report && (
                                    <TicketReportView
                                        report={report}
                                        isInteractive={isInteractive}
                                        onUpdateSection={handleUpdateSection}
                                    />
                                )}
                            </div>
                        </div>
                    )
                )}
            </div>
        </div>
    );
}
