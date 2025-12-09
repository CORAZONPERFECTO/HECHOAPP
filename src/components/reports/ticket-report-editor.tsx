"use client";

import { useState } from "react";
import { TicketReportNew, TicketReportSection, TitleSection, TextSection, ListSection, PhotoSection, DividerSection } from "@/types/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionEditor } from "./section-editor";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Save, RefreshCw, RotateCcw, Plus, Type, List, Image as ImageIcon, Minus, Loader2 } from "lucide-react";

interface TicketReportEditorProps {
    report: TicketReportNew;
    onSave: (report: TicketReportNew) => Promise<void>;
    onUpdatePhotos: () => Promise<void>;
    onRegenerate: () => Promise<void>;
    saving?: boolean;
}

// Sortable wrapper for sections
function SortableSection({
    section,
    onChange,
    onDelete,
    onDuplicate,
    isFirst,
    isLast
}: {
    section: TicketReportSection;
    onChange: (section: TicketReportSection) => void;
    onDelete: () => void;
    onDuplicate: () => void;
    isFirst: boolean;
    isLast: boolean;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: section.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            <SectionEditor
                section={section}
                onChange={onChange}
                onDelete={onDelete}
                onDuplicate={onDuplicate}
                onMoveUp={() => { }}
                onMoveDown={() => { }}
                isFirst={isFirst}
                isLast={isLast}
            />
        </div>
    );
}

export function TicketReportEditor({
    report,
    onSave,
    onUpdatePhotos,
    onRegenerate,
    saving = false
}: TicketReportEditorProps) {
    const [localReport, setLocalReport] = useState<TicketReportNew>(report);
    const [hasChanges, setHasChanges] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const updateHeader = (field: keyof typeof localReport.header, value: string) => {
        setLocalReport(prev => ({
            ...prev,
            header: { ...prev.header, [field]: value }
        }));
        setHasChanges(true);
    };

    const updateSection = (index: number, updatedSection: TicketReportSection) => {
        const newSections = [...localReport.sections];
        newSections[index] = updatedSection;
        setLocalReport(prev => ({ ...prev, sections: newSections }));
        setHasChanges(true);
    };

    const deleteSection = (index: number) => {
        if (confirm("¿Eliminar este bloque?")) {
            const newSections = localReport.sections.filter((_, i) => i !== index);
            setLocalReport(prev => ({ ...prev, sections: newSections }));
            setHasChanges(true);
        }
    };

    const duplicateSection = (index: number) => {
        const sectionToDuplicate = localReport.sections[index];
        const duplicated = { ...sectionToDuplicate, id: crypto.randomUUID() };
        const newSections = [...localReport.sections];
        newSections.splice(index + 1, 0, duplicated);
        setLocalReport(prev => ({ ...prev, sections: newSections }));
        setHasChanges(true);
    };

    const addSection = (type: TicketReportSection['type']) => {
        let newSection: TicketReportSection;

        switch (type) {
            case 'h2':
                newSection = { id: crypto.randomUUID(), type: 'h2', content: 'Nuevo Título' } as TitleSection;
                break;
            case 'text':
                newSection = { id: crypto.randomUUID(), type: 'text', content: '' } as TextSection;
                break;
            case 'list':
                newSection = { id: crypto.randomUUID(), type: 'list', items: [''] } as ListSection;
                break;
            case 'photo':
                newSection = { id: crypto.randomUUID(), type: 'photo', photoUrl: '', description: '' } as PhotoSection;
                break;
            case 'divider':
                newSection = { id: crypto.randomUUID(), type: 'divider' } as DividerSection;
                break;
            default:
                return;
        }

        setLocalReport(prev => ({ ...prev, sections: [...prev.sections, newSection] }));
        setHasChanges(true);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setLocalReport(prev => {
                const oldIndex = prev.sections.findIndex(s => s.id === active.id);
                const newIndex = prev.sections.findIndex(s => s.id === over.id);

                return {
                    ...prev,
                    sections: arrayMove(prev.sections, oldIndex, newIndex)
                };
            });
            setHasChanges(true);
        }
    };

    const handleSave = async () => {
        await onSave(localReport);
        setHasChanges(false);
    };

    const handleUpdatePhotos = async () => {
        await onUpdatePhotos();
        setHasChanges(false);
    };

    const handleRegenerate = async () => {
        if (confirm("¿Regenerar el informe desde el ticket? Esto borrará todos tus cambios manuales.")) {
            await onRegenerate();
            setHasChanges(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {/* Sticky Action Bar */}
            <div className="sticky top-0 z-20 bg-white border-b shadow-sm">
                <div className="flex items-center justify-between px-6 py-3">
                    <div className="flex items-center gap-4">
                        <h2 className="text-lg font-semibold text-gray-900">Editor de Informe</h2>
                        {hasChanges && (
                            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                                Cambios sin guardar
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleUpdatePhotos}
                            className="gap-2"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Actualizar Fotos
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRegenerate}
                            className="gap-2 text-orange-600 hover:text-orange-700"
                        >
                            <RotateCcw className="h-4 w-4" />
                            Regenerar Todo
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={saving || !hasChanges}
                            className="gap-2 bg-green-600 hover:bg-green-700"
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Guardar
                        </Button>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-6 custom-scrollbar">
                <style jsx global>{`
                    .custom-scrollbar::-webkit-scrollbar {
                        width: 12px;
                        height: 12px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-track {
                        background: #f1f1f1;
                        border-radius: 10px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb {
                        background: #888;
                        border-radius: 10px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                        background: #555;
                    }
                    .custom-scrollbar {
                        scrollbar-width: thin;
                        scrollbar-color: #888 #f1f1f1;
                    }
                `}</style>
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Header Editor */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Encabezado del Informe</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label>Título del Informe</Label>
                                <Input
                                    value={localReport.header.title}
                                    onChange={(e) => updateHeader('title', e.target.value)}
                                    className="mt-1"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Cliente</Label>
                                    <Input
                                        value={localReport.header.clientName}
                                        onChange={(e) => updateHeader('clientName', e.target.value)}
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <Label>Ticket</Label>
                                    <Input
                                        value={localReport.header.ticketNumber}
                                        onChange={(e) => updateHeader('ticketNumber', e.target.value)}
                                        className="mt-1"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Técnico</Label>
                                    <Input
                                        value={localReport.header.technicianName || ''}
                                        onChange={(e) => updateHeader('technicianName', e.target.value)}
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <Label>Fecha</Label>
                                    <Input
                                        value={localReport.header.date}
                                        onChange={(e) => updateHeader('date', e.target.value)}
                                        className="mt-1"
                                    />
                                </div>
                            </div>
                            <div>
                                <Label>Dirección</Label>
                                <Input
                                    value={localReport.header.address || ''}
                                    onChange={(e) => updateHeader('address', e.target.value)}
                                    className="mt-1"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Add Block Menu */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm">Agregar Bloque</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-2">
                                <Button variant="outline" size="sm" onClick={() => addSection('h2')} className="gap-2">
                                    <Type className="h-4 w-4" />
                                    Título
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => addSection('text')} className="gap-2">
                                    <Type className="h-4 w-4" />
                                    Texto
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => addSection('list')} className="gap-2">
                                    <List className="h-4 w-4" />
                                    Lista
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => addSection('photo')} className="gap-2">
                                    <ImageIcon className="h-4 w-4" />
                                    Foto
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => addSection('divider')} className="gap-2">
                                    <Minus className="h-4 w-4" />
                                    Separador
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Sections */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium text-gray-700">
                            Contenido del Informe ({localReport.sections.length} bloques)
                        </h3>

                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={localReport.sections.map(s => s.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                {localReport.sections.map((section, index) => (
                                    <SortableSection
                                        key={section.id}
                                        section={section}
                                        onChange={(updated) => updateSection(index, updated)}
                                        onDelete={() => deleteSection(index)}
                                        onDuplicate={() => duplicateSection(index)}
                                        isFirst={index === 0}
                                        isLast={index === localReport.sections.length - 1}
                                    />
                                ))}
                            </SortableContext>
                        </DndContext>

                        {localReport.sections.length === 0 && (
                            <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-300 rounded-lg">
                                <Plus className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                <p className="text-sm">No hay bloques aún</p>
                                <p className="text-xs mt-1">Usa los botones de arriba para agregar contenido</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
