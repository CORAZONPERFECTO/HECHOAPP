"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Ticket, TicketReportNew, UserRole } from "@/types/schema";
import { generateReportFromTicket, updatePhotosFromTicket, deduplicateReportSections } from "@/lib/report-generator";
import { TicketReportEditor } from "@/components/reports/ticket-report-editor";
import { ExportMenu } from "@/components/reports/export-menu";
import { Button } from "@/components/ui/button";
import { Loader2, Undo2, Redo2, Sparkles, LayoutTemplate, MessageSquare, Link as LinkIcon, ExternalLink, RefreshCw, Printer } from "lucide-react";
import { useUndoRedo } from "@/hooks/use-undo-redo";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useDebounce } from "@/hooks/use-debounce";
import Link from "next/link";
import { useToast } from "@/components/ui/use-toast";
import { TemplatePickerDialog } from "@/components/reports/template-picker-dialog";
import { ReportTemplate } from "@/types/reports";
import { DEFAULT_REPORT_POLICIES, ReportPolicySettings } from "@/components/settings/report-policy-settings";

interface TicketReportTabProps {
    ticket: Ticket;
    currentUserRole?: UserRole | null;
}

export function TicketReportTab({ ticket, currentUserRole }: TicketReportTabProps) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
    const [reportPolicies, setReportPolicies] = useState<ReportPolicySettings>(DEFAULT_REPORT_POLICIES);
    const { toast } = useToast();

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
    const debouncedReport = useDebounce(report, 2000);

    // Auto-save
    useEffect(() => {
        if (debouncedReport && lastSavedReport) {
            const hasChanges = JSON.stringify(debouncedReport) !== JSON.stringify(lastSavedReport);
            if (hasChanges) {
                handleSave(debouncedReport, true);
            }
        }
    }, [debouncedReport]);

    useEffect(() => {
        loadData();
    }, [ticket.id]);

    const loadData = async () => {
        try {
            setLoading(true);

            // 1. Load policies
            let policies = DEFAULT_REPORT_POLICIES;
            try {
                const polSnap = await getDoc(doc(db, "settings", "reports"));
                if (polSnap.exists()) {
                    policies = { ...DEFAULT_REPORT_POLICIES, ...polSnap.data() as ReportPolicySettings };
                }
            } catch (e) {
                console.error("Error loading policies:", e);
            }
            setReportPolicies(policies);

            // 2. Load or generate report
            const reportDoc = await getDoc(doc(db, "ticketReports", ticket.id));

            let currentReport: TicketReportNew;
            if (reportDoc.exists()) {
                const rawReport = reportDoc.data() as TicketReportNew;
                const cleanSections = deduplicateReportSections(rawReport.sections || []);
                currentReport = { ...rawReport, sections: cleanSections };

                // Si se detectaron y removieron duplicados en Firestore, guardar la versión limpia
                if (JSON.stringify(cleanSections) !== JSON.stringify(rawReport.sections)) {
                    await setDoc(doc(db, "ticketReports", ticket.id), currentReport);
                }
            } else {
                currentReport = generateReportFromTicket(ticket, policies);
                await setDoc(doc(db, "ticketReports", ticket.id), currentReport);
            }
            setReport(currentReport);
            setLastSavedReport(currentReport);
        } catch (error) {
            console.error("Error loading report data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (updatedReport: TicketReportNew, isAutoSave = false) => {
        try {
            if (!isAutoSave) setSaving(true);

            if (!updatedReport.ticketId || !updatedReport.sections) {
                throw new Error("Datos del informe incompletos");
            }

            type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
            const sanitizeData = (obj: unknown): JsonValue => {
                if (obj === null || obj === undefined) return null;
                if (Array.isArray(obj)) {
                    return obj.map(item => sanitizeData(item)).filter(item => item !== null && item !== undefined);
                }
                if (typeof obj === 'object') {
                    const cleaned: Record<string, JsonValue> = {};
                    Object.keys(obj as Record<string, unknown>).forEach(key => {
                        const value = sanitizeData((obj as Record<string, unknown>)[key]);
                        if (value !== undefined && value !== null) {
                            cleaned[key] = value;
                        }
                    });
                    return cleaned;
                }
                return obj as JsonValue;
            };

            const cleanedReport = sanitizeData(updatedReport) as unknown as TicketReportNew;
            await setDoc(doc(db, "ticketReports", ticket.id), cleanedReport);
            setLastSavedReport(updatedReport);

            if (!isAutoSave) {
                toast({ title: "Guardado", description: "Informe guardado correctamente", variant: "default" });
            }
        } catch (error: unknown) {
            console.error("Error al guardar:", error);
            if (!isAutoSave) toast({ title: "Error", description: "No se pudo guardar el informe", variant: "destructive" });
        } finally {
            if (!isAutoSave) setSaving(false);
        }
    };

    const handleUpdatePhotos = async () => {
        if (!report) return;
        try {
            let currentTicket = ticket;
            try {
                const ticketSnap = await getDoc(doc(db, "tickets", ticket.id));
                if (ticketSnap.exists()) {
                    currentTicket = { id: ticketSnap.id, ...ticketSnap.data() } as Ticket;
                }
            } catch (err) {
                console.warn("Could not fetch fresh ticket snapshot:", err);
            }

            const updatedReport = updatePhotosFromTicket(report, currentTicket);
            setReport(updatedReport);
            await handleSave(updatedReport);
            toast({ title: "Fotos Actualizadas", description: "Se han sincronizado las evidencias fotográficas con éxito." });
        } catch (error) {
            console.error("Error updating photos:", error);
            toast({ title: "Error", description: "No se pudieron actualizar las fotos", variant: "destructive" });
        }
    };

    const handleRegenerate = async () => {
        if (!ticket) return;
        if (!confirm("¿Deseas reiniciar y estructurar el informe con los datos y fotos actuales del ticket?")) return;

        try {
            setSaving(true);
            let currentTicket = ticket;
            try {
                const ticketSnap = await getDoc(doc(db, "tickets", ticket.id));
                if (ticketSnap.exists()) {
                    currentTicket = { id: ticketSnap.id, ...ticketSnap.data() } as Ticket;
                }
            } catch (err) {
                console.warn("Could not fetch fresh ticket snapshot:", err);
            }

            const newReport = generateReportFromTicket(currentTicket, reportPolicies);
            await setDoc(doc(db, "ticketReports", ticket.id), newReport);
            setReport(newReport);
            setLastSavedReport(newReport);

            toast({ title: "✅ Informe Generado", description: "Informe actualizado con fotos, diagnóstico y recomendaciones sin duplicados." });
        } catch (error) {
            console.error("Error regenerating report:", error);
            toast({ title: "Error", description: "Error al generar el informe", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const handleSendWhatsApp = () => {
        const url = `${window.location.origin}/r/${ticket.id}`;
        const template = reportPolicies.whatsappTemplate || DEFAULT_REPORT_POLICIES.whatsappTemplate;
        
        const message = template
            .replace(/{{cliente}}/g, ticket.clientName || 'Estimado/a Cliente')
            .replace(/{{ubicacion}}/g, ticket.locationName || ticket.specificLocation || 'su propiedad')
            .replace(/{{ticket}}/g, ticket.ticketNumber || ticket.id.slice(0, 6))
            .replace(/{{enlace}}/g, url);

        const phone = (ticket as any).clientPhone || (ticket as any).phone || '';
        const cleanPhone = phone.replace(/\D/g, '');

        const whatsappUrl = cleanPhone 
            ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
            : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;

        window.open(whatsappUrl, '_blank');
        toast({
            title: "WhatsApp Abierto",
            description: "Enlace y mensaje del informe listos para enviar al cliente.",
        });
    };

    const handleApplyTemplate = (template: ReportTemplate) => {
        if (!report) return;
        if (!confirm(`¿Aplicar la plantilla "${template.name}"? Esto reemplazará las secciones actuales.`)) return;

        const updatedReport = {
            ...report,
            sections: template.sections,
        };
        setReport(updatedReport);
        handleSave(updatedReport);
        toast({
            title: "✅ Plantilla aplicada",
            description: `La estructura "${template.name}" se ha cargado en el informe.`,
        });
    };

    useKeyboardShortcuts([
        {
            key: 's',
            ctrl: true,
            handler: () => {
                if (report) handleSave(report);
            },
            description: 'Guardar'
        },
        { key: 'z', ctrl: true, handler: undo, description: 'Deshacer' },
        { key: 'y', ctrl: true, handler: redo, description: 'Rehacer' }
    ], true);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64 bg-slate-50 dark:bg-zinc-900 rounded-2xl border border-slate-200">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!report) {
        return (
            <div className="flex items-center justify-center h-64 bg-slate-50 rounded-2xl border-2 border-dashed">
                <div className="text-center">
                    <p className="text-slate-500 mb-2">No se pudo cargar el informe</p>
                    <Button onClick={loadData} variant="outline" size="sm">Reintentar</Button>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="flex flex-col h-full bg-slate-50/50 dark:bg-black rounded-2xl overflow-hidden border border-slate-200/80 shadow-sm">
                {/* Executive Toolbar */}
                <div className="bg-white dark:bg-zinc-900 border-b dark:border-zinc-800 px-4 py-3 flex items-center justify-between flex-wrap gap-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Undo / Redo */}
                        <div className="flex bg-slate-100 dark:bg-zinc-800 rounded-xl p-0.5">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={undo}
                                disabled={!canUndo}
                                className="h-7 w-7 text-slate-600 dark:text-slate-300 rounded-lg"
                                title="Deshacer (Ctrl+Z)"
                            >
                                <Undo2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={redo}
                                disabled={!canRedo}
                                className="h-7 w-7 text-slate-600 dark:text-slate-300 rounded-lg"
                                title="Rehacer (Ctrl+Y)"
                            >
                                <Redo2 className="h-3.5 w-3.5" />
                            </Button>
                        </div>

                        <div className="h-5 w-px bg-slate-200 dark:bg-zinc-700 hidden sm:block" />

                        {/* 1. Botón Mágico Auto-Generar / Regenerar */}
                        <Button
                            variant="default"
                            size="sm"
                            onClick={handleRegenerate}
                            disabled={generating || saving}
                            className="h-8 text-xs font-semibold gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-sm"
                        >
                            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                            Auto-Estructurar con Fotos
                        </Button>

                        {/* 2. Plantillas */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setTemplatePickerOpen(true)}
                            className="h-8 text-xs gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-medium"
                        >
                            <LayoutTemplate className="h-3.5 w-3.5 text-purple-600" />
                            Plantilla
                        </Button>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {/* 3. Enviar por WhatsApp */}
                        <Button
                            size="sm"
                            className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-sm"
                            onClick={handleSendWhatsApp}
                        >
                            <MessageSquare className="h-3.5 w-3.5 fill-white" />
                            Enviar por WhatsApp
                        </Button>

                        {/* 4. Copiar Link Cliente */}
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-medium"
                            onClick={() => {
                                const url = `${window.location.origin}/r/${ticket.id}`;
                                navigator.clipboard.writeText(url);
                                toast({
                                    title: "✅ Enlace Copiado",
                                    description: "El enlace público del cliente se ha copiado al portapapeles.",
                                });
                            }}
                        >
                            <LinkIcon className="h-3.5 w-3.5 text-blue-600" />
                            <span className="hidden sm:inline">Copiar Link</span>
                        </Button>

                        {/* 5. Vista Externa Cliente */}
                        <Link href={`/r/${ticket.id}`} target="_blank">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50 rounded-xl" title="Ver Vista del Cliente">
                                <ExternalLink className="h-4 w-4" />
                            </Button>
                        </Link>

                        <ExportMenu report={report} />
                    </div>
                </div>

                {/* Editor Content */}
                <div className="flex-1 overflow-hidden relative min-h-[600px]">
                    {(() => {
                        const allAvailablePhotos: import("@/types/schema").TicketPhoto[] = [...(ticket.photos || [])];
                        if (ticket.surveyAreas && Array.isArray(ticket.surveyAreas)) {
                            ticket.surveyAreas.forEach(area => {
                                if (area.photos && Array.isArray(area.photos)) {
                                    area.photos.forEach(p => {
                                        if (p && p.url && !allAvailablePhotos.some(existing => existing.url === p.url)) {
                                            allAvailablePhotos.push({
                                                ...p,
                                                area: p.area || area.name,
                                                description: p.description || `Evidencia en ${area.name}`
                                            });
                                        }
                                    });
                                }
                            });
                        }

                        return (
                            <TicketReportEditor
                                report={report}
                                onChange={setReport}
                                onSave={async (r) => handleSave(r)}
                                onUpdatePhotos={handleUpdatePhotos}
                                onRegenerate={handleRegenerate}
                                availablePhotos={allAvailablePhotos}
                                saving={saving}
                            />
                        );
                    })()}
                </div>
            </div>

            <TemplatePickerDialog
                open={templatePickerOpen}
                onOpenChange={setTemplatePickerOpen}
                onApply={handleApplyTemplate}
                serviceType={ticket.serviceType}
            />
        </>
    );
}
