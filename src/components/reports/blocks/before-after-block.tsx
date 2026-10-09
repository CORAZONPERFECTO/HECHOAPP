"use client";

import { useState } from "react";
import { BeforeAfterSection, TicketPhoto } from "@/types/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, ArrowRight, GripVertical, PenTool, Image as ImageIcon } from "lucide-react";
import { BeforeAfterSelector } from "../before-after-selector";
import { ImageAnnotator } from "@/components/ui/image-annotator";

interface BeforeAfterBlockProps {
    section: BeforeAfterSection;
    onChange: (updates: Partial<BeforeAfterSection>) => void;
    onRemove: () => void;
    readOnly?: boolean;
    availablePhotos?: TicketPhoto[];
}

export function BeforeAfterBlock({ section, onChange, onRemove, readOnly, availablePhotos = [] }: BeforeAfterBlockProps) {
    const [annotatingPhase, setAnnotatingPhase] = useState<'before' | 'after' | null>(null);

    const handlePhotoUpload = (phase: 'before' | 'after', e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const base64 = event.target?.result as string;
                if (phase === 'before') {
                    onChange({ beforePhotoUrl: base64 });
                } else {
                    onChange({ afterPhotoUrl: base64 });
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleClearPhoto = (phase: 'before' | 'after') => {
        if (phase === 'before') {
            onChange({ beforePhotoUrl: "" });
        } else {
            onChange({ afterPhotoUrl: "" });
        }
    };

    return (
        <Card className="p-4 relative group hover:shadow-md transition-shadow border-slate-200 dark:border-zinc-800">
            {!readOnly && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex gap-2">
                    <Button 
                        type="button"
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-gray-400 hover:text-red-500 cursor-pointer" 
                        onClick={onRemove}
                        title="Eliminar bloque"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            )}
            {!readOnly && (
                <div className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-300 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100">
                    <GripVertical className="h-5 w-5" />
                </div>
            )}

            <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${!readOnly ? 'pl-6' : ''}`}>
                {/* Before Photo */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-rose-600 dark:text-rose-400 uppercase tracking-wider bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded">
                            Foto Antes
                        </span>
                        {!readOnly && section.beforePhotoUrl && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setAnnotatingPhase('before')}
                                className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700 gap-1"
                            >
                                <PenTool className="w-3 h-3" />
                                Marcar
                            </Button>
                        )}
                    </div>

                    {readOnly ? (
                        <div className="relative aspect-video bg-gray-50 dark:bg-zinc-900 rounded-lg overflow-hidden border border-slate-200 dark:border-zinc-800 flex items-center justify-center">
                            {section.beforePhotoUrl ? (
                                <img src={section.beforePhotoUrl} alt="Antes" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-gray-400 text-xs">Sin foto Antes</span>
                            )}
                        </div>
                    ) : (
                        <BeforeAfterSelector
                            label=""
                            photoUrl={section.beforePhotoUrl}
                            onSelect={(url, meta) => onChange({ beforePhotoUrl: url, beforeMeta: meta })}
                            availablePhotos={availablePhotos}
                        />
                    )}
                </div>

                {/* Arrow Separator (Desktop) */}
                <div className="hidden md:flex absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 z-10 bg-white dark:bg-zinc-800 rounded-full p-1.5 shadow-md border dark:border-zinc-700">
                    <ArrowRight className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>

                {/* After Photo */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
                            Foto Después
                        </span>
                        {!readOnly && section.afterPhotoUrl && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setAnnotatingPhase('after')}
                                className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700 gap-1"
                            >
                                <PenTool className="w-3 h-3" />
                                Marcar
                            </Button>
                        )}
                    </div>

                    {readOnly ? (
                        <div className="relative aspect-video bg-gray-50 dark:bg-zinc-900 rounded-lg overflow-hidden border border-slate-200 dark:border-zinc-800 flex items-center justify-center">
                            {section.afterPhotoUrl ? (
                                <img src={section.afterPhotoUrl} alt="Después" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-gray-400 text-xs">Sin foto Después</span>
                            )}
                        </div>
                    ) : (
                        <BeforeAfterSelector
                            label=""
                            photoUrl={section.afterPhotoUrl}
                            onSelect={(url, meta) => onChange({ afterPhotoUrl: url, afterMeta: meta })}
                            availablePhotos={availablePhotos}
                        />
                    )}
                </div>
            </div>

            {/* Description Input */}
            <div className={`mt-3 ${!readOnly ? 'pl-6' : ''}`}>
                <div className="space-y-1">
                    {!readOnly && (
                        <Label className="text-xs font-medium text-slate-500 dark:text-zinc-400">
                            Descripción de la mejora o trabajo realizado
                        </Label>
                    )}
                    <Input
                        placeholder="Escribe el comentario del Antes vs Después (ej: Corrección de fuga y sellado hermético)..."
                        value={section.description || ""}
                        onChange={(e) => onChange({ description: e.target.value })}
                        className={`text-sm ${readOnly ? "border-none bg-transparent shadow-none focus-visible:ring-0 text-center text-slate-700 dark:text-zinc-300 font-medium" : "bg-white dark:bg-zinc-900"}`}
                        readOnly={readOnly}
                    />
                </div>
            </div>

            {/* Annotator Modals */}
            {annotatingPhase === 'before' && section.beforePhotoUrl && (
                <ImageAnnotator
                    open={annotatingPhase === 'before'}
                    onOpenChange={(open) => { if (!open) setAnnotatingPhase(null); }}
                    imageUrl={section.beforePhotoUrl}
                    onSave={(annotatedUrl) => {
                        onChange({ beforePhotoUrl: annotatedUrl });
                        setAnnotatingPhase(null);
                    }}
                />
            )}
            {annotatingPhase === 'after' && section.afterPhotoUrl && (
                <ImageAnnotator
                    open={annotatingPhase === 'after'}
                    onOpenChange={(open) => { if (!open) setAnnotatingPhase(null); }}
                    imageUrl={section.afterPhotoUrl}
                    onSave={(annotatedUrl) => {
                        onChange({ afterPhotoUrl: annotatedUrl });
                        setAnnotatingPhase(null);
                    }}
                />
            )}
        </Card>
    );
}
