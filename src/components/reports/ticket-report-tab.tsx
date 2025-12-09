"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Ticket, TicketReportNew, UserRole } from "@/types/schema";
import { generateReportFromTicket, updatePhotosFromTicket } from "@/lib/report-generator";
import { TicketReportEditor } from "@/components/reports/ticket-report-editor";
import { ExportMenu } from "@/components/reports/export-menu";
import { Button } from "@/components/ui/button";
import { Loader2, Undo2, Redo2, RefreshCw, Maximize2 } from "lucide-react";
import { useUndoRedo } from "@/hooks/use-undo-redo";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useDebounce } from "@/hooks/use-debounce";
import Link from "next/link";

interface TicketReportTabProps {
    ticket: Ticket;
    currentUserRole?: UserRole | null;
}

export function TicketReportTab({ ticket, currentUserRole }: TicketReportTabProps) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

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

    useEffect(() => {
        loadData();
    }, [ticket.id]);

    const loadData = async () => {
        try {
            setLoading(true);

            // Load or generate report
            const reportDoc = await getDoc(doc(db, "ticketReports", ticket.id));

            let currentReport: TicketReportNew;
            if (reportDoc.exists()) {
                // Load existing report
                currentReport = reportDoc.data() as TicketReportNew;
            } else {
                // Generate new report
                currentReport = generateReportFromTicket(ticket);
                // Save initial version
                await setDoc(doc(db, "ticketReports", ticket.id), currentReport);
            }
            setReport(currentReport);
            setLastSavedReport(currentReport);
        } catch (error) {
            console.error("Error loading report data:", error);
            // Don't alert here to avoid spamming if loaded in background, maybe just log
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (updatedReport: TicketReportNew, isAutoSave = false) => {
        try {
            if (!isAutoSave) setSaving(true);

            // Validación
            if (!updatedReport.ticketId || !updatedReport.sections) {
                throw new Error("Datos del informe incompletos");
            }

            // Sanitizar datos
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

            if (!isAutoSave) console.log("Guardando informe:", ticket.id, cleanedReport);
            await setDoc(doc(db, "ticketReports", ticket.id), cleanedReport);

            setLastSavedReport(updatedReport);

            if (!isAutoSave) {
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

    const handleUpdatePhotos = async () => {
        if (!report) return;

        try {
            setSaving(true);
            const updatedReport = updatePhotosFromTicket(report, ticket);
            await setDoc(doc(db, "ticketReports", ticket.id), updatedReport);
            setReport(updatedReport);
            setLastSavedReport(updatedReport);

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
        if (!confirm("¿Estás seguro de regenerar el informe? Se perderán los cambios manuales.")) return;

        try {
            setSaving(true);
            const newReport = generateReportFromTicket(ticket);
            await setDoc(doc(db, "ticketReports", ticket.id), newReport);
            setReport(newReport);
            setLastSavedReport(newReport);

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
            <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!report) {
        return (
            <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed">
                <div className="text-center">
                    <p className="text-gray-500 mb-2">No se pudo cargar el informe</p>
                    <Button onClick={loadData} variant="outline" size="sm">Reintentar</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-black rounded-lg overflow-hidden border shadow-sm">
            {/* Toolbar Local */}
            <div className="bg-white dark:bg-zinc-900 border-b dark:border-zinc-800 px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="flex bg-gray-100 dark:bg-zinc-800 rounded-md p-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={undo}
                            disabled={!canUndo}
                            className="h-7 w-7 text-gray-600 dark:text-gray-300"
                            title="Deshacer (Ctrl+Z)"
                        >
                            <Undo2 className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={redo}
                            disabled={!canRedo}
                            className="h-7 w-7 text-gray-600 dark:text-gray-300"
                            title="Rehacer (Ctrl+Y)"
                        >
                            <Redo2 className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="h-5 w-px bg-gray-200 dark:bg-zinc-700" />
                    <Link href={`/tickets/${ticket.id}/report`} target="_blank">
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-blue-600">
                            <Maximize2 className="h-3.5 w-3.5" />
                            Pantalla Completa
                        </Button>
                    </Link>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 hidden sm:inline-block">
                        {saving ? "Guardando..." : "Guardado"}
                    </span>
                    <ExportMenu report={report} />
                </div>
            </div>

            {/* Editor Content */}
            <div className="flex-1 overflow-hidden relative min-h-[600px]">
                <TicketReportEditor
                    report={report}
                    onChange={setReport}
                    onSave={async (r) => handleSave(r)}
                    onUpdatePhotos={handleUpdatePhotos}
                    onRegenerate={handleRegenerate}
                    availablePhotos={ticket.photos || []}
                    saving={saving}
                />
            </div>
        </div>
    );
}
