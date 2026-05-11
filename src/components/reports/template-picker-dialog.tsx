"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, LayoutTemplate, Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReportTemplate } from "@/types/reports";
import { getAllTemplates, suggestTemplate } from "@/lib/template-catalog";

interface TemplatePickerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onApply: (template: ReportTemplate) => void;
    /** Ticket service type, used to suggest the best template automatically */
    serviceType?: string;
}

export function TemplatePickerDialog({
    open,
    onOpenChange,
    onApply,
    serviceType,
}: TemplatePickerDialogProps) {
    const [templates, setTemplates] = useState<ReportTemplate[]>([]);
    const [loading, setLoading] = useState(false);
    const [selected, setSelected] = useState<ReportTemplate | null>(null);
    const suggestedTemplate = suggestTemplate(serviceType);

    useEffect(() => {
        if (!open) return;
        const load = async () => {
            setLoading(true);
            try {
                const all = await getAllTemplates();
                setTemplates(all);
                // Pre-select suggested template
                if (suggestedTemplate) {
                    setSelected(suggestedTemplate);
                }
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [open]);

    const handleApply = () => {
        if (!selected) return;
        // Deep-clone sections with fresh IDs so they don't conflict
        const freshSections = selected.sections.map(section => ({
            ...section,
            id: crypto.randomUUID(),
        }));
        onApply({ ...selected, sections: freshSections });
        onOpenChange(false);
        setSelected(null);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0">
                <DialogHeader className="px-6 pt-6 pb-4 border-b">
                    <DialogTitle className="flex items-center gap-2 text-lg">
                        <LayoutTemplate className="h-5 w-5 text-blue-600" />
                        Aplicar Plantilla de Informe
                    </DialogTitle>
                    <DialogDescription>
                        Selecciona una plantilla para pre-estructurar el informe. Las secciones actuales serán reemplazadas.
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto px-6 py-4">
                        {suggestedTemplate && (
                            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-start gap-3">
                                <Sparkles className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                                <p className="text-sm text-blue-700 dark:text-blue-300">
                                    <span className="font-semibold">Sugerida por IA:</span> Basado en el tipo de servicio
                                    {serviceType ? <span className="font-mono ml-1 text-xs bg-blue-100 dark:bg-blue-800 px-1 rounded">{serviceType}</span> : ""}, te recomendamos la plantilla <strong>{suggestedTemplate.name}</strong>.
                                </p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {templates.map((template) => {
                                const isSuggested = template.id === suggestedTemplate?.id;
                                const isSelected = selected?.id === template.id;

                                return (
                                    <button
                                        key={template.id}
                                        type="button"
                                        onClick={() => setSelected(template)}
                                        className={cn(
                                            "relative text-left p-4 rounded-xl border-2 transition-all duration-150 group",
                                            isSelected
                                                ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20 shadow-md shadow-blue-500/10"
                                                : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                                        )}
                                    >
                                        {/* Selected check */}
                                        {isSelected && (
                                            <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-blue-600 flex items-center justify-center">
                                                <Check className="h-3 w-3 text-white" />
                                            </div>
                                        )}

                                        {/* Suggested badge */}
                                        {isSuggested && !isSelected && (
                                            <div className="absolute top-3 right-3">
                                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 border-amber-200">
                                                    Sugerida
                                                </Badge>
                                            </div>
                                        )}

                                        <div className="flex items-start gap-3 pr-8">
                                            <span className="text-2xl leading-none mt-0.5">{template.icon || "📄"}</span>
                                            <div className="min-w-0">
                                                <p className={cn(
                                                    "font-semibold text-sm leading-tight",
                                                    isSelected ? "text-blue-700 dark:text-blue-300" : "text-gray-900 dark:text-gray-100"
                                                )}>
                                                    {template.name}
                                                </p>
                                                {template.description && (
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-snug">
                                                        {template.description}
                                                    </p>
                                                )}
                                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                                                    {template.sections.length} secciones
                                                    {template.isBuiltIn && (
                                                        <span className="ml-2 text-[10px] uppercase tracking-wide font-medium text-gray-400">· Integrada</span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="px-6 py-4 border-t flex items-center justify-between gap-3 bg-gray-50 dark:bg-zinc-900">
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleApply}
                        disabled={!selected}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        <LayoutTemplate className="mr-2 h-4 w-4" />
                        Aplicar Plantilla
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
