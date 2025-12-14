"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Ticket, TicketReportNew, UserRole } from "@/types/schema";
import { generateReportFromTicket, updatePhotosFromTicket } from "@/lib/report-generator";
import { TicketReportEditor } from "@/components/reports/ticket-report-editor";
import { ExportMenu } from "@/components/reports/export-menu";
import { Button } from "@/components/ui/button";
import { Loader2, Undo2, Redo2, RefreshCw, Maximize2, Sparkles } from "lucide-react";
import { useUndoRedo } from "@/hooks/use-undo-redo";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useDebounce } from "@/hooks/use-debounce";
import Link from "next/link";
import { useToast } from "@/components/ui/use-toast";

interface TicketReportTabProps {
    ticket: Ticket;
    currentUserRole?: UserRole | null;
}

export function TicketReportTab({ ticket, currentUserRole }: TicketReportTabProps) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [generating, setGenerating] = useState(false);
    const { toast } = useToast();

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

    // ... (keep Auto-save effect and LoadData effect)

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
                toast({ title: "Guardado", description: "Informe guardado correctamente", variant: "default" });
            }
        } catch (error: any) {
            console.error("Error completo al guardar:", error);
            if (!isAutoSave) toast({ title: "Error", description: "No se pudo guardar el informe", variant: "destructive" });
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

            toast({ title: "Fotos actualizadas", description: "Se han sincronizado las fotos del ticket.", variant: "default" });
        } catch (error) {
            console.error("Error updating photos:", error);
            toast({ title: "Error", description: "Error al actualizar fotos", variant: "destructive" });
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

            toast({ title: "Regenerado", description: "Informe reiniciado a valores del ticket.", variant: "default" });
        } catch (error) {
            console.error("Error regenerating report:", error);
            toast({ title: "Error", description: "Error al regenerar el informe", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const handleSmartGenerate = async () => {
        if (!ticket || !report) return;
        if (!confirm("¿Usar Inteligencia Artificial para redactar el informe? Esto reemplazará el texto actual con una versión profesional.")) return;

        setGenerating(true);
        try {
            // Serialize relevant ticket data for the prompt
            const contextData = {
                description: ticket.description,
                diagnosis: ticket.diagnosis,
                solution: ticket.solution,
                recommendations: ticket.recommendations,
                notes: ticket.notes,
                clientName: ticket.clientName,
                serviceType: ticket.serviceType
            };

            const response = await fetch('/api/gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    context: JSON.stringify(contextData),
                    task: 'generate-report'
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Error en la API de IA");
            }

            if (data.output && data.output.sections) {
                // Merge Logic:
                // We want to keep photos from current report, but replace text sections with AI ones.

                const existingPhotos = report.sections.filter(s => s.type === 'photo');
                // We also might want to keep the Title/General Info at the top if AI didn't include it?
                // But AI prompt asked for full structure.
                // Let's create a hybrid: AI Text Sections + Existing Photos at the end (safest).

                // Add unique IDs to AI sections
                const aiSections = data.output.sections.map((s: any) => ({
                    ...s,
                    id: crypto.randomUUID()
                }));

                const newSections = [...aiSections, ...existingPhotos];

                const smartReport: TicketReportNew = {
                    ...report,
                    sections: newSections
                };

                await handleSave(smartReport); // Save immediately
                setReport(smartReport);
                toast({
                    title: "✨ Informe IA Generado",
                    description: "Gemini ha redactado un informe profesional para ti.",
                    variant: "success" // Assuming we have success variant, otherwise generic
                });
            }

        } catch (error: any) {
            console.error("AI Generation Error:", error);
            toast({
                title: "Error IA",
                description: "No se pudo generar el reporte. Verifica tus credenciales.",
                variant: "destructive"
            });
        } finally {
            setGenerating(false);
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
            <div className="bg-white dark:bg-zinc-900 border-b dark:border-zinc-800 px-4 py-2 flex items-center justify-between flex-wrap gap-2">
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

                    {/* Botón Mágico AI */}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSmartGenerate}
                        disabled={generating}
                        className="h-7 text-xs gap-1 border-purple-200 text-purple-700 hover:bg-purple-50 hover:text-purple-800 hover:border-purple-300 transition-colors"
                    >
                        {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                        {generating ? "Redactando..." : "Redactar con IA"}
                    </Button>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 hidden sm:inline-block">
                        {saving ? "Guardando..." : "Guardado"}
                    </span>
                    <Link href={`/tickets/${ticket.id}/report`} target="_blank">
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Pantalla Completa">
                            <Maximize2 className="h-4 w-4" />
                        </Button>
                    </Link>
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
