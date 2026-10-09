"use client";

import { authFetch } from "@/lib/api-client";
import { TicketReportSection, TitleSection, TextSection, ListSection, PhotoSection, GallerySection, TicketPhoto } from "@/types/schema";
import { Input } from "@/components/ui/input";
import { RichFormattedTextarea } from "@/components/ui/rich-formatted-textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { GripVertical, Trash2, Copy, Sparkles, Loader2, Plus, X, Image as ImageIcon, PenTool, Upload, ZoomIn } from "lucide-react";
import { useState } from "react";
import Image from "next/image";
import { BeforeAfterBlock } from "./blocks/before-after-block";
import { BeforeAfterSelector } from "./before-after-selector";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ImageAnnotator } from "@/components/ui/image-annotator";

interface SectionEditorProps {
    section: TicketReportSection;
    onChange: (section: TicketReportSection) => void;
    onDelete: () => void;
    onDuplicate: () => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
    isFirst: boolean;
    isLast: boolean;
    availablePhotos?: TicketPhoto[]; // Passed down for selection
    dragAttributes?: any;
    dragListeners?: any;
    readOnly?: boolean;
}

export function SectionEditor({
    section,
    onChange,
    onDelete,
    onDuplicate,
    onMoveUp,
    onMoveDown,
    isFirst,
    isLast,
    availablePhotos = [],
    dragAttributes,
    dragListeners,
    readOnly
}: SectionEditorProps) {
    const [isRefining, setIsRefining] = useState(false);
    const [refiningGalleryIndex, setRefiningGalleryIndex] = useState<number | null>(null);
    const [isGalleryDialogOpen, setIsGalleryDialogOpen] = useState(false);
    const [isAnnotatorOpen, setIsAnnotatorOpen] = useState(false);
    const [annotatingGalleryIndex, setAnnotatingGalleryIndex] = useState<number | null>(null);
    const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

    const handleRefine = async (currentContent: string, type: 'text' | 'title' | 'photoDescription', imageUrl?: string) => {
        if (!currentContent?.trim() && !imageUrl) return;

        setIsRefining(true);
        try {
            const response = await authFetch('/api/gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: currentContent || "Describe esta fotografía técnicamente con detalle profesional conciso.",
                    imageUrl,
                    task: imageUrl ? 'describe-image' : 'refine'
                })
            });

            const data = await response.json();
            if (data.output) {
                if (type === 'text') {
                    onChange({ ...section, content: data.output } as TextSection);
                } else if (type === 'title') {
                    onChange({ ...section, content: data.output } as TitleSection);
                } else if (type === 'photoDescription') {
                    onChange({ ...section, description: data.output } as PhotoSection);
                }
            }
        } catch (error) {
            console.error("Refine error:", error);
        } finally {
            setIsRefining(false);
        }
    };

    const handleRefineGalleryPhoto = async (index: number, currentDesc: string, photoUrl?: string) => {
        const gallerySection = section as GallerySection;
        setRefiningGalleryIndex(index);
        try {
            const response = await authFetch('/api/gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: currentDesc || "Describe esta fotografía de servicio técnico de manera concisa y profesional.",
                    imageUrl: photoUrl,
                    task: photoUrl ? 'describe-image' : 'refine'
                })
            });

            const data = await response.json();
            if (data.output) {
                const newPhotos = [...gallerySection.photos];
                newPhotos[index] = { ...newPhotos[index], description: data.output };
                onChange({ ...section, photos: newPhotos } as GallerySection);
            }
        } catch (error) {
            console.error("Refine gallery photo error:", error);
        } finally {
            setRefiningGalleryIndex(null);
        }
    };

    const handleFileUploadToGallery = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const base64 = event.target?.result as string;
            const gallerySection = section as GallerySection;
            const newPhoto = {
                photoUrl: base64,
                description: '',
                photoMeta: {
                    originalId: crypto.randomUUID(),
                    area: 'General',
                    phase: 'DURING'
                }
            };
            onChange({
                ...section,
                photos: [...gallerySection.photos, newPhoto]
            } as GallerySection);
            setIsGalleryDialogOpen(false);
        };
        reader.readAsDataURL(file);
    };

    const renderEditor = () => {
        switch (section.type) {
            case 'h1':
            case 'h2':
                return (
                    <div>
                        <Label className="text-sm font-medium mb-2 block">
                            {section.type === 'h1' ? 'Título Principal' : 'Título de Sección'}
                        </Label>
                        <Input
                            value={(section as TitleSection).content}
                            onChange={(e) => onChange({ ...section, content: e.target.value } as TitleSection)}
                            className="text-lg font-semibold"
                            placeholder="Escribe el título..."
                            readOnly={readOnly}
                        />
                    </div>
                );

            case 'text':
                return (
                    <div>
                        <Label className="text-sm font-medium mb-1.5 block">Texto y Formato</Label>
                        <RichFormattedTextarea
                            value={(section as TextSection).content}
                            onChange={(e) => onChange({ ...section, content: e.target.value } as TextSection)}
                            className="min-h-[130px]"
                            placeholder="Escribe el contenido... Puedes usar la barra superior para agregar negrita (**), cursiva (*), títulos de áreas, listas, o retroceder (Ctrl+Z)."
                            showAIBtn={!readOnly}
                            onRefineWithAI={() => handleRefine((section as TextSection).content, 'text')}
                            isRefining={isRefining}
                            readOnly={readOnly}
                        />
                    </div>
                );

            case 'list':
                return (
                    <div>
                        <Label className="text-sm font-medium mb-1.5 block">
                            Lista de Elementos (un item por línea)
                        </Label>
                        <RichFormattedTextarea
                            value={(section as ListSection).items.join('\n')}
                            onChange={(e) => {
                                const items = e.target.value.split('\n');
                                onChange({ ...section, items } as ListSection);
                            }}
                            className="min-h-[120px] font-mono text-sm"
                            placeholder="• Item 1&#10;• Item 2&#10;• Item 3"
                            showHeadingBtn={false}
                            showListBtn={true}
                            readOnly={readOnly}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            {(section as ListSection).items.filter(Boolean).length} items
                        </p>
                    </div>
                );

            case 'beforeAfter':
                return (
                    <BeforeAfterBlock
                        section={section as any}
                        onChange={(updates) => onChange({ ...section, ...updates } as any)}
                        onRemove={onDelete}
                        availablePhotos={availablePhotos}
                        readOnly={readOnly}
                    />
                );

            case 'photo': {
                const photoSection = section as PhotoSection;
                return (
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row gap-4">
                            {/* Selector de foto del ticket */}
                            <div className="w-full sm:w-1/3 min-w-[180px]">
                                <BeforeAfterSelector
                                    label="Seleccionar Foto"
                                    photoUrl={photoSection.photoUrl}
                                    onSelect={(url, meta) => {
                                        const updates: Partial<PhotoSection> = {
                                            photoUrl: url,
                                            photoMeta: meta
                                        };
                                        if (meta?.description && !photoSection.description) {
                                            updates.description = meta.description;
                                        }
                                        onChange({ ...section, ...updates } as PhotoSection);
                                    }}
                                    availablePhotos={availablePhotos}
                                />
                            </div>

                            <div className="flex-1 space-y-3">
                                <div>
                                    <Label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">
                                        URL de la imagen
                                    </Label>
                                    <Input
                                        value={photoSection.photoUrl}
                                        onChange={(e) => onChange({ ...section, photoUrl: e.target.value } as PhotoSection)}
                                        placeholder="https://..."
                                        className="text-sm font-mono"
                                        readOnly={readOnly}
                                    />
                                </div>

                                {photoSection.photoMeta && (
                                    <div className="flex flex-wrap gap-2 text-xs">
                                        {photoSection.photoMeta.phase && (
                                            <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-semibold rounded-md border border-blue-200 dark:border-blue-900">
                                                Fase: {photoSection.photoMeta.phase}
                                            </span>
                                        )}
                                        {photoSection.photoMeta.area && (
                                            <span className="px-2.5 py-1 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-medium rounded-md border border-slate-200 dark:border-zinc-700">
                                                Área: {photoSection.photoMeta.area}
                                            </span>
                                        )}
                                    </div>
                                )}

                                <div className="flex items-center gap-3 pt-1">
                                    <Label className="text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">
                                        Tamaño:
                                    </Label>
                                    <select
                                        value={photoSection.size || 'medium'}
                                        onChange={(e) => onChange({ ...section, size: e.target.value as any } as PhotoSection)}
                                        disabled={readOnly}
                                        className="flex h-8 w-full max-w-[200px] rounded-md border border-input bg-transparent px-2.5 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    >
                                        <option value="small">Pequeña (1/4 pág)</option>
                                        <option value="medium">Mediana (1/2 pág)</option>
                                        <option value="large">Grande (Página completa)</option>
                                    </select>
                                    
                                    {!readOnly && photoSection.photoUrl && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setIsAnnotatorOpen(true)}
                                            className="h-8 whitespace-nowrap text-xs gap-1.5 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                                        >
                                            <PenTool className="h-3.5 w-3.5" />
                                            Marcar Fotografía
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Descripción / Comentario de la Foto */}
                        <div className="pt-1">
                            <Label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">
                                Comentario / Descripción de la Fotografía
                            </Label>
                            <RichFormattedTextarea
                                value={photoSection.description || ''}
                                onChange={(e) => onChange({ ...section, description: e.target.value } as PhotoSection)}
                                placeholder="Escribe los hallazgos o detalles técnicos de esta fotografía..."
                                className="min-h-[85px]"
                                containerClassName="mb-1"
                                showAIBtn={!readOnly}
                                onRefineWithAI={() => handleRefine(photoSection.description || "Describe esta foto profesionalmente.", 'photoDescription', photoSection.photoUrl)}
                                isRefining={isRefining}
                                showHeadingBtn={false}
                                showListBtn={false}
                                readOnly={readOnly}
                            />
                        </div>

                        {photoSection.photoUrl && (
                            <ImageAnnotator
                                open={isAnnotatorOpen}
                                onOpenChange={setIsAnnotatorOpen}
                                imageUrl={photoSection.photoUrl}
                                onSave={(annotatedUrl) => onChange({ ...section, photoUrl: annotatedUrl } as PhotoSection)}
                            />
                        )}
                    </div>
                );
            }

            case 'divider':
                return (
                    <div className="py-4">
                        <hr className="border-2 border-gray-300 dark:border-zinc-700" />
                        <p className="text-center text-xs text-gray-500 mt-2">Separador Visual</p>
                    </div>
                );

            case 'gallery': {
                const gallerySection = section as GallerySection;
                return (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-semibold flex items-center gap-2">
                                <ImageIcon className="w-4 h-4 text-blue-600" />
                                Galería de Fotografías ({gallerySection.photos.length})
                            </Label>

                            {/* Botón Agregar Foto a la Galería */}
                            {!readOnly && (
                                <Dialog open={isGalleryDialogOpen} onOpenChange={setIsGalleryDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            className="h-8 text-xs gap-1.5 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900 hover:bg-blue-100"
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                            Agregar Foto a Galería
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                                        <DialogHeader>
                                            <DialogTitle className="flex items-center gap-2">
                                                <ImageIcon className="w-5 h-5 text-blue-600" />
                                                Seleccionar o Subir Fotografía para la Galería
                                            </DialogTitle>
                                        </DialogHeader>

                                        {/* Subir foto local */}
                                        <div className="p-3 my-2 bg-slate-50 dark:bg-zinc-900 rounded-lg border border-dashed border-slate-300 dark:border-zinc-700 flex items-center justify-between">
                                            <div className="flex items-center gap-2.5">
                                                <Upload className="w-4 h-4 text-slate-500" />
                                                <span className="text-xs text-slate-600 dark:text-zinc-300 font-medium">
                                                    Subir imagen desde tu dispositivo
                                                </span>
                                            </div>
                                            <label className="cursor-pointer">
                                                <span className="inline-flex items-center justify-center rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700">
                                                    Seleccionar archivo
                                                </span>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={handleFileUploadToGallery}
                                                />
                                            </label>
                                        </div>

                                        <div className="mt-2">
                                            <Label className="text-xs font-semibold text-slate-500 uppercase block mb-2">
                                                Fotos disponibles del Ticket ({availablePhotos.length})
                                            </Label>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                                {availablePhotos.length > 0 ? (
                                                    availablePhotos.map((photo, i) => (
                                                        <div
                                                            key={i}
                                                            className="relative aspect-[4/3] group cursor-pointer border rounded-lg overflow-hidden hover:ring-2 hover:ring-blue-500 shadow-sm bg-slate-100 dark:bg-zinc-800"
                                                            onClick={() => {
                                                                const newPhoto = {
                                                                    photoUrl: photo.url,
                                                                    description: photo.description || '',
                                                                    photoMeta: {
                                                                        originalId: (photo as any).id || photo.url || crypto.randomUUID(),
                                                                        area: photo.area || 'General',
                                                                        phase: photo.type || 'DURING'
                                                                    }
                                                                };
                                                                onChange({
                                                                    ...section,
                                                                    photos: [...gallerySection.photos, newPhoto]
                                                                } as GallerySection);
                                                                setIsGalleryDialogOpen(false);
                                                            }}
                                                        >
                                                            <img
                                                                src={photo.url}
                                                                alt={photo.description || "Foto"}
                                                                className="w-full h-full object-cover"
                                                                loading="lazy"
                                                            />
                                                            {photo.type && (
                                                                <span className="absolute top-1 left-1 text-[9px] font-bold bg-black/70 text-white px-1.5 py-0.5 rounded">
                                                                    {photo.type}
                                                                </span>
                                                            )}
                                                            {photo.description && (
                                                                <div className="absolute inset-x-0 bottom-0 bg-black/60 p-1 text-[10px] text-white truncate">
                                                                    {photo.description}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="col-span-full py-8 text-center text-xs text-slate-400">
                                                        No hay fotografías adicionales registradas en este ticket.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            )}
                        </div>

                        {/* Lista de Fotos con Tarjetas de Edición Individual */}
                        {gallerySection.photos.length === 0 ? (
                            <div className="p-6 text-center border-2 border-dashed rounded-lg border-slate-200 dark:border-zinc-800 text-slate-400 text-xs">
                                No hay fotografías en esta galería. Haz clic en &quot;Agregar Foto&quot; para añadir evidencias.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {gallerySection.photos.map((p, i) => (
                                    <div
                                        key={i}
                                        className="p-3 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50 space-y-2.5 shadow-sm"
                                    >
                                        {/* Cabecera de la Tarjeta con Foto e Información */}
                                        <div className="flex gap-3">
                                            {/* Miniatura con zoom y botones de acción */}
                                            <div className="relative w-28 h-24 shrink-0 bg-slate-200 dark:bg-zinc-800 rounded-md overflow-hidden border group">
                                                <img
                                                    src={p.photoUrl}
                                                    alt={`Foto ${i + 1}`}
                                                    className="w-full h-full object-cover cursor-pointer"
                                                    onClick={() => setPreviewPhoto(p.photoUrl)}
                                                />
                                                <div 
                                                    className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-white"
                                                    onClick={() => setPreviewPhoto(p.photoUrl)}
                                                >
                                                    <ZoomIn className="w-4 h-4" />
                                                </div>
                                            </div>

                                            {/* Metadata y Acciones Rápidas */}
                                            <div className="flex-1 flex flex-col justify-between min-w-0">
                                                <div className="space-y-1">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                                                            Fotografía #{i + 1}
                                                        </span>
                                                        {!readOnly && (
                                                            <div className="flex items-center gap-1">
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => setAnnotatingGalleryIndex(i)}
                                                                    className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                                                                    title="Marcar / Anotar fotografía"
                                                                >
                                                                    <PenTool className="h-3.5 w-3.5" />
                                                                </Button>
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => {
                                                                        const newPhotos = [...gallerySection.photos];
                                                                        newPhotos.splice(i, 1);
                                                                        onChange({ ...section, photos: newPhotos } as GallerySection);
                                                                    }}
                                                                    className="h-7 w-7 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950"
                                                                    title="Quitar de la galería"
                                                                >
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex flex-wrap gap-1.5 text-[10px]">
                                                        {p.photoMeta?.phase && (
                                                            <span className={`px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                                                                p.photoMeta.phase === 'BEFORE' 
                                                                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' 
                                                                    : p.photoMeta.phase === 'AFTER' 
                                                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' 
                                                                    : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                                                            }`}>
                                                                {p.photoMeta.phase === 'BEFORE' ? 'Antes' : p.photoMeta.phase === 'AFTER' ? 'Después' : 'Durante'}
                                                            </span>
                                                        )}
                                                        {p.photoMeta?.area && (
                                                            <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 font-medium">
                                                                {p.photoMeta.area}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {!readOnly && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleRefineGalleryPhoto(i, p.description || '', p.photoUrl)}
                                                        disabled={refiningGalleryIndex === i}
                                                        className="h-6 px-2 text-[11px] self-start text-purple-600 hover:text-purple-700 gap-1"
                                                    >
                                                        {refiningGalleryIndex === i ? (
                                                            <Loader2 className="w-3 h-3 animate-spin" />
                                                        ) : (
                                                            <Sparkles className="w-3 h-3" />
                                                        )}
                                                        Generar comentario con IA
                                                    </Button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Campo de Comentario / Descripción de la Foto */}
                                        <div>
                                            <Input
                                                value={p.description || ''}
                                                onChange={(e) => {
                                                    const newPhotos = [...gallerySection.photos];
                                                    newPhotos[i] = { ...newPhotos[i], description: e.target.value };
                                                    onChange({ ...section, photos: newPhotos } as GallerySection);
                                                }}
                                                placeholder="Comentario o hallazgo de esta fotografía..."
                                                className="text-xs bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-700"
                                                readOnly={readOnly}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Modal de Anotación para Foto de Galería */}
                        {annotatingGalleryIndex !== null && gallerySection.photos[annotatingGalleryIndex]?.photoUrl && (
                            <ImageAnnotator
                                open={annotatingGalleryIndex !== null}
                                onOpenChange={(open) => {
                                    if (!open) setAnnotatingGalleryIndex(null);
                                }}
                                imageUrl={gallerySection.photos[annotatingGalleryIndex].photoUrl}
                                onSave={(annotatedUrl) => {
                                    const newPhotos = [...gallerySection.photos];
                                    newPhotos[annotatingGalleryIndex] = {
                                        ...newPhotos[annotatingGalleryIndex],
                                        photoUrl: annotatedUrl
                                    };
                                    onChange({ ...section, photos: newPhotos } as GallerySection);
                                    setAnnotatingGalleryIndex(null);
                                }}
                            />
                        )}

                        {/* Modal de Vista Previa Ampliada */}
                        {previewPhoto && (
                            <Dialog open={!!previewPhoto} onOpenChange={(open) => { if (!open) setPreviewPhoto(null); }}>
                                <DialogContent className="max-w-4xl p-2 bg-black/95 border-zinc-800">
                                    <div className="relative w-full h-[75vh] flex items-center justify-center">
                                        <img
                                            src={previewPhoto}
                                            alt="Preview"
                                            className="max-w-full max-h-full object-contain rounded"
                                        />
                                    </div>
                                </DialogContent>
                            </Dialog>
                        )}
                    </div>
                );
            }

            default:
                return null;
        }
    };

    return (
        <div className="group relative border-2 border-gray-200 dark:border-zinc-800 hover:border-blue-300 rounded-lg p-4 bg-white dark:bg-zinc-900 transition-all">
            {/* Drag Handle */}
            {!readOnly && (
                <div
                    className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab touch-none"
                    {...dragAttributes}
                    {...dragListeners}
                >
                    <GripVertical className="h-5 w-5 text-gray-400" />
                </div>
            )}

            {/* Controls */}
            {!readOnly && (
                <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={onDuplicate}
                        className="h-8 w-8 p-0"
                        title="Duplicar sección"
                    >
                        <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={onDelete}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                        title="Eliminar sección"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            )}

            {/* Content */}
            <div className={!readOnly ? "pl-4" : ""}>
                {renderEditor()}
            </div>
        </div>
    );
}
