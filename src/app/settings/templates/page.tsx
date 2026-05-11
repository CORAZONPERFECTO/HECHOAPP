"use client";

import { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

import { Loader2, Plus, Pencil, Trash2, Lock, LayoutTemplate, Copy } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
    BUILT_IN_TEMPLATES, getAllTemplates, createTemplate, deleteTemplate,
} from "@/lib/template-catalog";
import { ReportTemplate } from "@/types/reports";

export default function ReportTemplatesPage() {
    const [templates, setTemplates] = useState<ReportTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);

    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ name: "", description: "", icon: "📄" });

    const { toast } = useToast();

    useEffect(() => { loadTemplates(); }, []);

    const loadTemplates = async () => {
        setLoading(true);
        try {
            const all = await getAllTemplates();
            setTemplates(all);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!formData.name.trim()) return;
        setCreating(true);
        try {
            const userId = auth.currentUser?.uid || "system";
            const blankBase = BUILT_IN_TEMPLATES.find(t => t.id === "builtin-blank")!;
            await createTemplate({
                name: formData.name.trim(),
                description: formData.description.trim(),
                icon: formData.icon || "📄",
                sections: blankBase.sections.map(s => ({ ...s, id: crypto.randomUUID() })),
            }, userId);
            toast({ title: "Plantilla creada", description: `"${formData.name}" lista para usar.` });
            setShowForm(false);
            setFormData({ name: "", description: "", icon: "📄" });
            await loadTemplates();
        } catch {
            toast({ title: "Error", description: "No se pudo crear la plantilla.", variant: "destructive" });
        } finally {
            setCreating(false);
        }
    };

    const handleDuplicate = async (template: ReportTemplate) => {
        setCreating(true);
        try {
            const userId = auth.currentUser?.uid || "system";
            await createTemplate({
                name: `${template.name} (copia)`,
                description: template.description,
                icon: template.icon,
                sections: template.sections.map(s => ({ ...s, id: crypto.randomUUID() })),
                serviceTypes: template.serviceTypes,
            }, userId);
            toast({ title: "Plantilla duplicada", description: "Copia creada con éxito." });
            await loadTemplates();
        } catch {
            toast({ title: "Error", description: "No se pudo duplicar la plantilla.", variant: "destructive" });
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (template: ReportTemplate) => {
        if (!confirm(`¿Eliminar la plantilla "${template.name}"? Esta acción no se puede deshacer.`)) return;
        try {
            await deleteTemplate(template.id);
            toast({ title: "Eliminada", description: `"${template.name}" eliminada.` });
            await loadTemplates();
        } catch {
            toast({ title: "Error", description: "No se pudo eliminar.", variant: "destructive" });
        }
    };

    const builtIn = templates.filter(t => t.isBuiltIn);
    const custom = templates.filter(t => !t.isBuiltIn);

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <LayoutTemplate className="h-6 w-6 text-blue-600" />
                        Plantillas de Informes
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Administra las estructuras predefinidas para los informes técnicos por tipo de servicio.
                    </p>
                </div>
                <Button
                    onClick={() => setShowForm(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                >
                    <Plus className="h-4 w-4" />
                    Nueva Plantilla
                </Button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
            ) : (
                <div className="space-y-10">
                    {/* Built-in templates */}
                    <section>
                        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Lock className="h-3.5 w-3.5" />
                            Plantillas del Sistema
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {builtIn.map(template => (
                                <TemplateCard
                                    key={template.id}
                                    template={template}
                                    onDuplicate={() => handleDuplicate(template)}
                                    isBuiltIn
                                />
                            ))}
                        </div>
                    </section>

                    {/* Custom templates */}
                    <section>
                        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-4">
                            Plantillas Personalizadas
                        </h3>
                        {custom.length === 0 ? (
                            <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-10 text-center text-gray-400">
                                <LayoutTemplate className="h-8 w-8 mx-auto mb-3 opacity-30" />
                                <p className="text-sm">No hay plantillas personalizadas.</p>
                                <p className="text-xs mt-1">Crea una nueva o duplica una del sistema para empezar.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {custom.map(template => (
                                    <TemplateCard
                                        key={template.id}
                                        template={template}
                                        onDuplicate={() => handleDuplicate(template)}
                                        onDelete={() => handleDelete(template)}
                                    />
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            )}

            {/* Create Form Dialog */}
            <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Nueva Plantilla Personalizada</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="flex gap-3">
                            <div className="space-y-2 w-20">
                                <Label>Ícono</Label>
                                <Input
                                    value={formData.icon}
                                    onChange={e => setFormData(p => ({ ...p, icon: e.target.value }))}
                                    className="text-center text-xl"
                                    maxLength={4}
                                />
                            </div>
                            <div className="space-y-2 flex-1">
                                <Label>Nombre *</Label>
                                <Input
                                    value={formData.name}
                                    onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                                    placeholder="Ej: Mantenimiento Chillers"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Descripción</Label>
                            <Textarea
                                value={formData.description}
                                onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                                placeholder="Describe cuándo usar esta plantilla..."
                                className="h-20"
                            />
                        </div>
                        <p className="text-xs text-gray-500">
                            💡 La plantilla se creará con una sección de texto vacía. Luego podrás editar sus secciones desde el editor de informes.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
                        <Button onClick={handleCreate} disabled={creating || !formData.name.trim()}>
                            {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Crear Plantilla
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>


        </div>
    );
}

// ─────────────────────────────────────────────
// Sub-component: TemplateCard
// ─────────────────────────────────────────────
function TemplateCard({
    template,
    isBuiltIn = false,
    onDuplicate,
    onDelete,
}: {
    template: ReportTemplate;
    isBuiltIn?: boolean;
    onDuplicate: () => void;
    onDelete?: () => void;
}) {
    return (
        <div className="group relative bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-150">
            <div className="flex items-start gap-3">
                <span className="text-3xl leading-none">{template.icon || "📄"}</span>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 leading-tight">
                            {template.name}
                        </p>
                        {isBuiltIn && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-gray-100 dark:bg-zinc-800 text-gray-500">
                                Sistema
                            </Badge>
                        )}
                    </div>
                    {template.description && (
                        <p className="text-xs text-gray-400 mt-1 leading-snug line-clamp-2">
                            {template.description}
                        </p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                        {template.sections.length} secciones
                    </p>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 mt-3 pt-3 border-t border-gray-100 dark:border-zinc-800">
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1 text-gray-500 hover:text-blue-600"
                    onClick={onDuplicate}
                >
                    <Copy className="h-3.5 w-3.5" />
                    Duplicar
                </Button>
                {!isBuiltIn && onDelete && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1 text-gray-400 hover:text-red-600 ml-auto"
                        onClick={onDelete}
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                        Eliminar
                    </Button>
                )}
            </div>
        </div>
    );
}
