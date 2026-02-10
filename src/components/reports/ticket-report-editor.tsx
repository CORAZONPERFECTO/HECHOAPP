"use client";

import { useState, useEffect } from "react";
import { TicketReportNew, TicketReportSection, TitleSection, TextSection, ListSection, PhotoSection, DividerSection, BeforeAfterSection, GallerySection, TicketPhoto } from "@/types/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionEditor } from "./section-editor";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Save, RefreshCw, RotateCcw, Plus, Type, List, Image as ImageIcon, Minus, Loader2, Moon, Sun, Columns, Smartphone, Eye, Layout, PenTool } from "lucide-react";
import { TicketReportView } from "./ticket-report-view";
import { BeforeAfterSelector } from "./before-after-selector";
import { SignaturePad, SignaturePadRef } from "@/components/ui/signature-pad";
import { useRef } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

interface TicketReportEditorProps {
    report: TicketReportNew;
    onChange: (report: TicketReportNew) => void; // Controlled component
    onSave: (report: TicketReportNew) => Promise<void>;
    onUpdatePhotos: () => Promise<void>;
    onRegenerate: () => Promise<void>;
    availablePhotos?: TicketPhoto[]; // Photos from the ticket for selection
    saving?: boolean;
    readOnly?: boolean;
}

// Sortable wrapper for sections
function SortableSection({
    section,
    onChange,
    onDelete,
    onDuplicate,
    onClick,
    isActive,
    isFirst,
    isLast,
    availablePhotos = [],
    readOnly = false // Add prop
}: {
    section: TicketReportSection;
    onChange: (section: TicketReportSection) => void;
    onDelete: () => void;
    onDuplicate: () => void;
    onClick: () => void;
    isActive: boolean;
    isFirst: boolean;
    isLast: boolean;
    availablePhotos?: TicketPhoto[];
    readOnly?: boolean;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: section.id, disabled: readOnly }); // Disable drag if readOnly

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            // Removed attributes/listeners from here to fix interaction issues
            // {...attributes}
            // {...listeners}
            onClick={(e) => {
                e.stopPropagation();
                onClick();
            }}
            className={`transition-all duration-200 rounded-lg ${isActive ? 'ring-2 ring-blue-500 shadow-md bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-zinc-800'} ${readOnly ? 'pointer-events-none opacity-80' : ''}`}
        >
            <SectionEditor
                section={section}
                onChange={onChange}
                onDelete={onDelete}
                onDuplicate={onDuplicate}
                onMoveUp={() => { }}
                onMoveDown={() => { }}
                isFirst={isFirst}
                isLast={isLast}
                dragAttributes={attributes}
                dragListeners={listeners}
                readOnly={readOnly}
            />

            {/* Custom Editor for Before/After Block */}
            {section.type === 'beforeAfter' && (
                <div className="px-4 pb-4">
                    <Card className="border-dashed">
                        <CardContent className="pt-4 grid grid-cols-2 gap-4">
                            <BeforeAfterSelector
                                label="Foto Antes"
                                photoUrl={(section as BeforeAfterSection).beforePhotoUrl}
                                onSelect={(url, meta) => onChange({ ...section, beforePhotoUrl: url, beforeMeta: meta } as BeforeAfterSection)}
                                availablePhotos={availablePhotos}
                            />
                            <BeforeAfterSelector
                                label="Foto Después"
                                photoUrl={(section as BeforeAfterSection).afterPhotoUrl}
                                onSelect={(url, meta) => onChange({ ...section, afterPhotoUrl: url, afterMeta: meta } as BeforeAfterSection)}
                                availablePhotos={availablePhotos}
                            />
                            <div className="col-span-2">
                                <Label className="text-xs text-gray-500">Descripción / Comentario</Label>
                                <Input
                                    className="mt-1"
                                    placeholder="Descripción de la mejora..."
                                    value={(section as BeforeAfterSection).description || ''}
                                    onChange={(e) => onChange({ ...section, description: e.target.value } as BeforeAfterSection)}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}

export function TicketReportEditor({
    report,
    onChange,
    onSave,
    onUpdatePhotos,
    onRegenerate,
    availablePhotos = [],
    saving = false,
    readOnly = false
}: TicketReportEditorProps) {
    const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
    const [darkMode, setDarkMode] = useState(false);
    const [viewMode, setViewMode] = useState<'split' | 'edit' | 'preview'>('split');

    // Refs for signatures
    const techSigRef = useRef<SignaturePadRef>(null);
    const clientSigRef = useRef<SignaturePadRef>(null);

    const handleSignatureUpdate = (type: 'technician' | 'client') => {
        const ref = type === 'technician' ? techSigRef : clientSigRef;
        if (ref.current && !ref.current.isEmpty()) {
            const signatureUrl = ref.current.toDataURL();
            const signatures = report.signatures || {};

            onChange({
                ...report,
                signatures: {
                    ...signatures,
                    [type === 'technician' ? 'technicianSignature' : 'clientSignature']: signatureUrl,
                    [type === 'technician' ? 'technicianSignedAt' : 'clientSignedAt']: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as any
                }
            });
        }
    };

    const clearSignature = (type: 'technician' | 'client') => {
        const signatures = { ...report.signatures };
        if (type === 'technician') {
            delete signatures.technicianSignature;
            delete signatures.technicianSignedAt;
        } else {
            delete signatures.clientSignature;
            delete signatures.clientSignedAt;
        }
        onChange({ ...report, signatures });
    };

    // Initialize dark mode from system/local storage if needed
    useEffect(() => {
        const isDark = document.documentElement.classList.contains('dark');
        setDarkMode(isDark);
    }, []);

    const toggleDarkMode = () => {
        const newMode = !darkMode;
        setDarkMode(newMode);
        if (newMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const updateHeader = (field: keyof typeof report.header, value: string) => {
        onChange({
            ...report,
            header: { ...report.header, [field]: value }
        });
    };

    const updateSection = (index: number, updatedSection: TicketReportSection) => {
        const newSections = [...report.sections];
        newSections[index] = updatedSection;
        onChange({ ...report, sections: newSections });
    };

    const deleteSection = (index: number) => {
        if (confirm("¿Eliminar este bloque?")) {
            const newSections = report.sections.filter((_, i) => i !== index);
            onChange({ ...report, sections: newSections });
            setActiveBlockId(null);
        }
    };

    const duplicateSection = (index: number) => {
        const sectionToDuplicate = report.sections[index];
        const duplicated = { ...sectionToDuplicate, id: crypto.randomUUID() };
        const newSections = [...report.sections];
        newSections.splice(index + 1, 0, duplicated);
        onChange({ ...report, sections: newSections });
        setActiveBlockId(duplicated.id);
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
            case 'beforeAfter':
                newSection = {
                    id: crypto.randomUUID(),
                    type: 'beforeAfter',
                    beforePhotoUrl: '',
                    afterPhotoUrl: '',
                    description: ''
                } as BeforeAfterSection;
                break;
            case 'divider':
                newSection = { id: crypto.randomUUID(), type: 'divider' } as DividerSection;
                break;
            default:
                return;
        }

        onChange({ ...report, sections: [...report.sections, newSection] });
        setActiveBlockId(newSection.id);

        // Auto scroll to bottom
        setTimeout(() => {
            const element = document.getElementById('report-bottom');
            element?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = report.sections.findIndex(s => s.id === active.id);
            const newIndex = report.sections.findIndex(s => s.id === over.id);

            onChange({
                ...report,
                sections: arrayMove(report.sections, oldIndex, newIndex)
            });
        }
    };

    // Keyboard shortcuts handler for blocks
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!activeBlockId) return;

            // Only trigger if not typing in an input
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

            if (e.key === 'Delete') {
                const index = report.sections.findIndex(s => s.id === activeBlockId);
                if (index !== -1) deleteSection(index);
            }

            if (e.ctrlKey && e.key === 'd') {
                e.preventDefault(); // Prevent bookmark
                const index = report.sections.findIndex(s => s.id === activeBlockId);
                if (index !== -1) duplicateSection(index);
            }

            if (e.ctrlKey && e.key === 'ArrowUp') {
                e.preventDefault();
                const index = report.sections.findIndex(s => s.id === activeBlockId);
                if (index > 0) {
                    const newSections = [...report.sections];
                    [newSections[index - 1], newSections[index]] = [newSections[index], newSections[index - 1]];
                    onChange({ ...report, sections: newSections });
                }
            }

            if (e.ctrlKey && e.key === 'ArrowDown') {
                e.preventDefault();
                const index = report.sections.findIndex(s => s.id === activeBlockId);
                if (index < report.sections.length - 1) {
                    const newSections = [...report.sections];
                    [newSections[index + 1], newSections[index]] = [newSections[index], newSections[index + 1]];
                    onChange({ ...report, sections: newSections });
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeBlockId, report.sections]);

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-black text-gray-900 dark:text-gray-100 transition-colors duration-200">
            {/* Sticky Action Bar */}
            <div className="sticky top-0 z-20 bg-white dark:bg-zinc-900 border-b dark:border-zinc-800 shadow-sm">
                <div className="flex items-center justify-between px-4 py-2">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleDarkMode}
                            title={darkMode ? "Modo Claro" : "Modo Oscuro"}
                        >
                            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                        </Button>

                        <div className="h-6 w-px bg-gray-200 dark:bg-zinc-700" />

                        {/* View Mode Toggles for Desktop/Mobile */}
                        <div className="flex bg-gray-100 dark:bg-zinc-800 rounded-lg p-1">
                            <Button
                                variant={viewMode === 'edit' ? 'secondary' : 'ghost'}
                                size="sm"
                                className="h-7 px-3 text-xs"
                                onClick={() => setViewMode('edit')}
                            >
                                Editor
                            </Button>
                            <Button
                                variant={viewMode === 'split' ? 'secondary' : 'ghost'}
                                size="sm"
                                className="h-7 px-3 text-xs hidden md:flex"
                                onClick={() => setViewMode('split')}
                            >
                                Split
                            </Button>
                            <Button
                                variant={viewMode === 'preview' ? 'secondary' : 'ghost'}
                                size="sm"
                                className="h-7 px-3 text-xs"
                                onClick={() => setViewMode('preview')}
                            >
                                Preview
                            </Button>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onUpdatePhotos}
                            disabled={saving || readOnly}
                            className="gap-2 hidden sm:flex dark:border-zinc-700 dark:hover:bg-zinc-800"
                        >
                            <RefreshCw className={`h-4 w-4 ${saving ? 'animate-spin' : ''}`} />
                            <span className="hidden lg:inline">Actualizar Fotos</span>
                            {/* NEW: Badge for new photos */}
                            {(() => {
                                const reportPhotoUrls = new Set<string>();
                                report.sections.forEach(s => {
                                    if (s.type === 'photo' && (s as PhotoSection).photoUrl) {
                                        reportPhotoUrls.add((s as PhotoSection).photoUrl);
                                    }
                                    if (s.type === 'gallery' && (s as GallerySection).photos) {
                                        (s as GallerySection).photos.forEach(p => {
                                            if (p.photoUrl) reportPhotoUrls.add(p.photoUrl);
                                        });
                                    }
                                    if (s.type === 'beforeAfter') {
                                        const ba = s as BeforeAfterSection;
                                        if (ba.beforePhotoUrl) reportPhotoUrls.add(ba.beforePhotoUrl);
                                        if (ba.afterPhotoUrl) reportPhotoUrls.add(ba.afterPhotoUrl);
                                    }
                                });
                                const newCount = availablePhotos.filter(p => !reportPhotoUrls.has(p.url)).length;

                                if (newCount > 0) {
                                    return (
                                        <span className="ml-1 -mr-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm animate-pulse">
                                            {newCount}
                                        </span>
                                    );
                                }
                                return null;
                            })()}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onRegenerate}
                            disabled={saving || readOnly}
                            className="gap-2 text-orange-600 hover:text-orange-700 dark:border-zinc-700 dark:hover:bg-zinc-800"
                        >
                            <RotateCcw className="h-4 w-4" />
                            <span className="hidden lg:inline">Regenerar</span>
                        </Button>
                        <Button
                            onClick={() => onSave(report)}
                            disabled={saving || readOnly}
                            className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Guardar
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-hidden flex">
                {/* Editor Panel */}
                {(viewMode === 'edit' || viewMode === 'split') && (
                    <div className={`flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar ${viewMode === 'split' ? 'w-1/2 border-r dark:border-zinc-800' : 'w-full'}`}>
                        <div className="max-w-3xl mx-auto space-y-6">
                            {/* Header Editor */}
                            <Card className="dark:bg-zinc-900 dark:border-zinc-800">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base flex justify-between items-center">
                                        Encabezado
                                        <div className="flex gap-2">
                                            {/* Auto-generate Report Number if empty */}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 text-xs text-blue-600"
                                                onClick={() => updateHeader('reportNumber', `${report.header.ticketNumber}-R01`)}
                                                disabled={!!report.header.reportNumber}
                                            >
                                                Generar Folio
                                            </Button>
                                        </div>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid gap-3">
                                        <div className="grid gap-1">
                                            <Label>Título</Label>
                                            <Input
                                                value={report.header.title}
                                                onChange={(e) => updateHeader('title', e.target.value)}
                                                className="dark:bg-zinc-800 dark:border-zinc-700"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="grid gap-1">
                                                <Label>Folio / N° Reporte</Label>
                                                <Input
                                                    value={report.header.reportNumber || ''}
                                                    onChange={(e) => updateHeader('reportNumber', e.target.value)}
                                                    placeholder="Ej: TK-2024-001-FF"
                                                    className="dark:bg-zinc-800 dark:border-zinc-700 font-mono text-sm"
                                                />
                                            </div>
                                            <div className="grid gap-1">
                                                <Label>Fecha</Label>
                                                <Input
                                                    value={report.header.date}
                                                    onChange={(e) => updateHeader('date', e.target.value)}
                                                    className="dark:bg-zinc-800 dark:border-zinc-700"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="grid gap-1">
                                                <Label>Cliente</Label>
                                                <Input
                                                    value={report.header.clientName}
                                                    onChange={(e) => updateHeader('clientName', e.target.value)}
                                                    className="dark:bg-zinc-800 dark:border-zinc-700"
                                                />
                                            </div>
                                            <div className="grid gap-1">
                                                <Label>Ticket Ref.</Label>
                                                <Input
                                                    value={report.header.ticketNumber}
                                                    onChange={(e) => updateHeader('ticketNumber', e.target.value)}
                                                    className="dark:bg-zinc-800 dark:border-zinc-700"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid gap-1">
                                            <Label>Técnico Responsable</Label>
                                            <Input
                                                value={report.header.technicianName || ''}
                                                onChange={(e) => updateHeader('technicianName', e.target.value)}
                                                className="dark:bg-zinc-800 dark:border-zinc-700"
                                            />
                                        </div>

                                        {/* Company Info Section */}
                                        <div className="pt-2 border-t mt-2">
                                            <Label className="text-xs font-semibold text-gray-500 mb-2 block">DATOS DE LA EMPRESA (Encabezado del PDF)</Label>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="grid gap-1">
                                                    <Label className="text-xs">Nombre Empresa</Label>
                                                    <Input
                                                        value={report.header.companyInfo?.name || 'HECHO SRL'}
                                                        onChange={(e) => updateHeader('companyInfo', { ...report.header.companyInfo, name: e.target.value } as any)}
                                                        className="h-8 text-xs dark:bg-zinc-800 dark:border-zinc-700"
                                                    />
                                                </div>
                                                <div className="grid gap-1">
                                                    <Label className="text-xs">Dirección / Contacto</Label>
                                                    <Input
                                                        value={report.header.companyInfo?.address || ''}
                                                        onChange={(e) => updateHeader('companyInfo', { ...report.header.companyInfo, address: e.target.value } as any)}
                                                        className="h-8 text-xs dark:bg-zinc-800 dark:border-zinc-700"
                                                        placeholder="Dirección, Teléfono, Web..."
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Add Block Menu */}
                            <Card className="dark:bg-zinc-900 dark:border-zinc-800 sticky top-0 z-10 shadow-md">
                                <CardContent className="p-3">
                                    <div className="flex flex-wrap gap-2 justify-center">
                                        <Button variant="outline" size="sm" onClick={() => addSection('h2')} className="gap-2 h-8 text-xs dark:hover:bg-zinc-800">
                                            <Type className="h-3.5 w-3.5" /> Título
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={() => addSection('text')} className="gap-2 h-8 text-xs dark:hover:bg-zinc-800">
                                            <Type className="h-3.5 w-3.5" /> Texto
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={() => addSection('list')} className="gap-2 h-8 text-xs dark:hover:bg-zinc-800">
                                            <List className="h-3.5 w-3.5" /> Lista
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={() => addSection('photo')} className="gap-2 h-8 text-xs dark:hover:bg-zinc-800">
                                            <ImageIcon className="h-3.5 w-3.5" /> Foto
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={() => addSection('beforeAfter')} className="gap-2 h-8 text-xs dark:hover:bg-zinc-800 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                                            <Columns className="h-3.5 w-3.5" /> Antes/Después
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={() => addSection('divider')} className="gap-2 h-8 text-xs dark:hover:bg-zinc-800">
                                            <Minus className="h-3.5 w-3.5" /> Separador
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Sortable Sections */}
                            <div className="space-y-4 pb-20">
                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragEnd={handleDragEnd}
                                >
                                    <SortableContext
                                        items={report.sections.map(s => s.id)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        {report.sections.map((section, index) => (
                                            <SortableSection
                                                key={section.id}
                                                section={section}
                                                onChange={(updated) => updateSection(index, updated)}
                                                onDelete={() => deleteSection(index)}
                                                onDuplicate={() => duplicateSection(index)}
                                                onClick={() => setActiveBlockId(section.id)}
                                                isActive={activeBlockId === section.id}
                                                isFirst={index === 0}
                                                isLast={index === report.sections.length - 1}
                                                availablePhotos={availablePhotos}
                                                readOnly={readOnly}
                                            />
                                        ))}
                                    </SortableContext>
                                </DndContext>
                                <div id="report-bottom" className="h-10" />
                            </div>

                            {/* Signatures Section */}
                            <Card className="dark:bg-zinc-900 dark:border-zinc-800 pb-8">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <PenTool className="h-5 w-5" /> Firmas Digitales
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="grid md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <Label className="text-base font-semibold">Técnico</Label>
                                            {report.signatures?.technicianSignedAt && (
                                                <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">Firmado</span>
                                            )}
                                        </div>
                                        <div className="h-40">
                                            <SignaturePad
                                                ref={techSigRef}
                                                onEnd={() => handleSignatureUpdate('technician')}
                                                className="h-full w-full border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors"
                                            />
                                        </div>
                                        <Input
                                            placeholder="Nombre del Técnico"
                                            value={report.signatures?.technicianName || report.header.technicianName || ''}
                                            onChange={(e) => onChange({
                                                ...report,
                                                signatures: { ...report.signatures, technicianName: e.target.value }
                                            })}
                                        />
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <Label className="text-base font-semibold">Cliente</Label>
                                            {report.signatures?.clientSignedAt && (
                                                <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">Firmado</span>
                                            )}
                                        </div>
                                        <div className="h-40">
                                            <SignaturePad
                                                ref={clientSigRef}
                                                onEnd={() => handleSignatureUpdate('client')}
                                                className="h-full w-full border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors"
                                            />
                                        </div>
                                        <Input
                                            placeholder="Nombre del Cliente"
                                            value={report.signatures?.clientName || report.header.clientName || ''}
                                            onChange={(e) => onChange({
                                                ...report,
                                                signatures: { ...report.signatures, clientName: e.target.value }
                                            })}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}

                {/* Live Preview Panel */}
                {(viewMode === 'preview' || viewMode === 'split') && (
                    <div className={`flex-1 bg-gray-100 dark:bg-zinc-950 overflow-y-auto p-4 md:p-8 ${viewMode === 'split' ? 'w-1/2' : 'w-full'}`}>
                        <div className="max-w-4xl mx-auto bg-white dark:bg-black shadow-lg min-h-[800px] p-8 md:p-12 transition-colors duration-200">
                            <TicketReportView report={report} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
