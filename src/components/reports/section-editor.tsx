"use client";

import { TicketReportSection, TitleSection, TextSection, ListSection, PhotoSection, GallerySection } from "@/types/schema";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { GripVertical, Trash2, Copy, Sparkles, Loader2, Plus, X, Image as ImageIcon } from "lucide-react";
import { useState } from "react";
import Image from "next/image";
import { BeforeAfterBlock } from "./blocks/before-after-block";
import { BeforeAfterSelector } from "./before-after-selector";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface SectionEditorProps {
    section: TicketReportSection;
    onChange: (section: TicketReportSection) => void;
    onDelete: () => void;
    onDuplicate: () => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
    isFirst: boolean;
    isLast: boolean;
    availablePhotos?: any[]; // Passed down for selection
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
    availablePhotos,
    dragAttributes,
    dragListeners,
    readOnly
}: SectionEditorProps) {
    const [isRefining, setIsRefining] = useState(false);
    const [isGalleryDialogOpen, setIsGalleryDialogOpen] = useState(false);

    const handleRefine = async (currentContent: string, type: 'text' | 'title' | 'photoDescription', imageUrl?: string) => {
        // Allow empty content if we have an image (generation vs refinement)
        if (!currentContent?.trim() && !imageUrl) return;

        setIsRefining(true);
        try {
            const response = await fetch('/api/gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: currentContent,
                    imageUrl, // Pass image URL if available
                    task: imageUrl ? 'describe-image' : 'refine' // Switch task if image present
                })
            });

            const data = await response.json();
            if (data.output) {
                // Determine update based on type
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
            // Optional: visual error feedback?
        } finally {
            setIsRefining(false);
        }
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
                        />
                    </div>
                );

            case 'text':
                return (
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <Label className="text-sm font-medium block">Texto</Label>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRefine((section as TextSection).content, 'text')}
                                disabled={isRefining || !(section as TextSection).content}
                                className="h-6 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                                title="Mejorar redacción con IA"
                            >
                                {isRefining ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
                                {isRefining ? "Mejorando..." : "Pulir Texto"}
                            </Button>
                        </div>
                        <Textarea
                            value={(section as TextSection).content}
                            onChange={(e) => onChange({ ...section, content: e.target.value } as TextSection)}
                            className="min-h-[120px]"
                            placeholder="Escribe el contenido..."
                        />
                    </div>
                );

            case 'list':
                return (
                    <div>
                        <Label className="text-sm font-medium mb-2 block">
                            Lista (un item por línea)
                        </Label>
                        <Textarea
                            value={(section as ListSection).items.join('\n')}
                            onChange={(e) => {
                                const items = e.target.value.split('\n');
                                onChange({ ...section, items } as ListSection);
                            }}
                            className="min-h-[120px] font-mono text-sm"
                            placeholder="Item 1&#10;Item 2&#10;Item 3"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            {(section as ListSection).items.length} items
                        </p>
                    </div>
                );

            case 'beforeAfter':
                return (
                    <BeforeAfterBlock
                        section={section as any}
                        onChange={(updates) => onChange({ ...section, ...updates } as any)}
                        onRemove={onDelete}
                    />
                );

            case 'photo':
                const photoSection = section as PhotoSection;
                return (
                    <div className="space-y-3">
                        <div className="flex gap-4">
                            {/* Reusing BeforeAfterSelector for single photo selection */}
                            <div className="w-1/3 min-w-[150px]">
                                <BeforeAfterSelector
                                    label="Seleccionar Foto"
                                    photoUrl={photoSection.photoUrl}
                                    onSelect={(url, meta) => onChange({ ...section, photoUrl: url, photoMeta: meta } as PhotoSection)}
                                    availablePhotos={availablePhotos || []}
                                />
                            </div>

                            <div className="flex-1 space-y-2">
                                <div>
                                    <Label className="text-sm font-medium mb-1 block">URL de la imagen</Label>
                                    <Input
                                        value={photoSection.photoUrl}
                                        onChange={(e) => onChange({ ...section, photoUrl: e.target.value } as PhotoSection)}
                                        placeholder="https://..."
                                        className="text-sm"
                                    />
                                </div>
                                {photoSection.photoMeta && (
                                    <div className="flex gap-2 text-xs text-gray-500">
                                        {photoSection.photoMeta.phase && (
                                            <span className="px-2 py-1 bg-gray-100 rounded">
                                                {photoSection.photoMeta.phase}
                                            </span>
                                        )}
                                        {photoSection.photoMeta.area && (
                                            <span className="px-2 py-1 bg-gray-100 rounded">
                                                {photoSection.photoMeta.area}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <Label className="text-sm font-medium block">Descripción</Label>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRefine(photoSection.description || "Describe esta foto profesionalmente.", 'photoDescription', photoSection.photoUrl)}
                                    disabled={isRefining}
                                    className="h-6 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                                    title="Mejorar descripción con IA"
                                >
                                    {isRefining ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
                                    IA
                                </Button>
                            </div>
                            <Textarea
                                value={photoSection.description || ''}
                                onChange={(e) => onChange({ ...section, description: e.target.value } as PhotoSection)}
                                placeholder="Descripción de la imagen..."
                                className="min-h-[60px] mb-3"
                            />

                            <div className="flex items-center gap-4">
                                <Label className="text-sm font-medium whitespace-nowrap">Tamaño de foto:</Label>
                                <select
                                    value={photoSection.size || 'medium'}
                                    onChange={(e) => onChange({ ...section, size: e.target.value as any } as PhotoSection)}
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <option value="small">Pequeña (1/4 página)</option>
                                    <option value="medium">Mediana (1/2 página)</option>
                                    <option value="large">Grande (Pagina completa)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                );

            case 'divider':
                return (
                    <div className="py-4">
                        <hr className="border-2 border-gray-300" />
                        <p className="text-center text-xs text-gray-500 mt-2">Separador</p>
                    </div>
                );

            case 'gallery':
                const gallerySection = section as GallerySection;
                return (
                    <div className="space-y-4">
                        <Label className="text-sm font-medium">Galería de Fotos ({gallerySection.photos.length})</Label>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                            {/* Existing Photos */}
                            {gallerySection.photos.map((p, i) => (
                                <div key={i} className="relative aspect-square bg-gray-100 rounded overflow-hidden border group">
                                    <Image
                                        src={p.photoUrl}
                                        alt="Preview"
                                        fill
                                        className="object-cover"
                                    />
                                    {/* Delete Button (Overlay) - Only if not readOnly if we wanted to enforce it, but here we enforce via drag handles so clicks work */}
                                    {!readOnly && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                const newPhotos = [...gallerySection.photos];
                                                newPhotos.splice(i, 1);
                                                onChange({ ...section, photos: newPhotos } as GallerySection);
                                            }}
                                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-sm z-10 cursor-pointer"
                                            title="Quitar foto"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    )}
                                </div>
                            ))}

                            {/* Add Photo Button */}
                            {!readOnly && (
                                <Dialog open={isGalleryDialogOpen} onOpenChange={setIsGalleryDialogOpen}>
                                    <DialogTrigger asChild>
                                        <div
                                            className="flex flex-col items-center justify-center aspect-square bg-gray-50 border-2 border-dashed border-gray-300 rounded hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-all"
                                            title="Agregar foto existente"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                            }}
                                        >
                                            <Plus className="h-6 w-6 text-gray-400 mb-1" />
                                            <span className="text-[10px] text-gray-500 font-medium">Agregar</span>
                                        </div>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                                        <DialogHeader>
                                            <DialogTitle>Seleccionar foto para agregar</DialogTitle>
                                        </DialogHeader>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                                            {(availablePhotos || []).map((photo, i) => (
                                                <div
                                                    key={i}
                                                    className="relative aspect-video group cursor-pointer border rounded-lg overflow-hidden hover:ring-2 hover:ring-blue-500"
                                                    onClick={() => {
                                                        const newPhoto = {
                                                            photoUrl: photo.url,
                                                            description: photo.description || '',
                                                            photoMeta: {
                                                                originalId: (photo as any).id || crypto.randomUUID(),
                                                                area: photo.area,
                                                                phase: photo.type
                                                            }
                                                        };
                                                        onChange({
                                                            ...section,
                                                            photos: [...gallerySection.photos, newPhoto]
                                                        } as GallerySection);
                                                        setIsGalleryDialogOpen(false);
                                                    }}
                                                >
                                                    <Image
                                                        src={photo.url}
                                                        alt="Thumb"
                                                        fill
                                                        className="object-cover"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            )}
                        </div>
                        <p className="text-xs text-gray-500">
                            Puedes reordenar o eliminar fotos individualmente.
                        </p>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="group relative border-2 border-gray-200 hover:border-blue-300 rounded-lg p-4 bg-white transition-all">
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
                        variant="ghost"
                        size="sm"
                        onClick={onDuplicate}
                        className="h-8 w-8 p-0"
                        title="Duplicar"
                    >
                        <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onDelete}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Eliminar"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            )}

            {/* Content */}
            <div className={!readOnly ? "pl-6" : ""}>
                {renderEditor()}
            </div>
        </div>
    );
}
