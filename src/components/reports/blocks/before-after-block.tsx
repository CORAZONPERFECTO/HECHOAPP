
"use client";

import { useState } from "react";
import { BeforeAfterSection } from "@/types/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, X, ArrowRight, GripVertical } from "lucide-react";

interface BeforeAfterBlockProps {
    section: BeforeAfterSection;
    onChange: (updates: Partial<BeforeAfterSection>) => void;
    onRemove: () => void;
    readOnly?: boolean;
}

export function BeforeAfterBlock({ section, onChange, onRemove, readOnly }: BeforeAfterBlockProps) {
    const handlePhotoUpload = (phase: 'before' | 'after', e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            if (phase === 'before') {
                onChange({ beforePhotoUrl: url });
            } else {
                onChange({ afterPhotoUrl: url });
            }
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
        <Card className="p-4 relative group hover:shadow-md transition-shadow">
            {!readOnly && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-500 cursor-pointer" onClick={onRemove}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            )}
            {!readOnly && (
                <div className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-300 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100">
                    <GripVertical className="h-5 w-5" />
                </div>
            )}

            <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${!readOnly ? 'pl-8' : ''}`}>
                {/* Before Photo */}
                <div className="space-y-2">
                    <div className="font-semibold text-center text-sm text-gray-500 uppercase tracking-wider">Antes</div>
                    <div className="relative aspect-video bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 hover:bg-gray-100 transition-colors flex flex-col items-center justify-center overflow-hidden">
                        {section.beforePhotoUrl ? (
                            <>
                                <img src={section.beforePhotoUrl} alt="Antes" className="w-full h-full object-cover" />
                                {!readOnly && (
                                    <Button
                                        variant="destructive"
                                        size="icon"
                                        className="absolute top-2 right-2 h-6 w-6 rounded-full opacity-0 hover:opacity-100 transition-opacity"
                                        onClick={() => handleClearPhoto('before')}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                )}
                            </>
                        ) : (
                            !readOnly && (
                                <label className="cursor-pointer flex flex-col items-center p-4 w-full h-full justify-center">
                                    <Upload className="h-8 w-8 text-gray-300 mb-2" />
                                    <span className="text-xs text-gray-400">Subir foto Antes</span>
                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload('before', e)} />
                                </label>
                            )
                        )}
                        {readOnly && !section.beforePhotoUrl && <span className="text-gray-400 text-sm">Sin foto</span>}
                    </div>
                </div>

                {/* Arrow Separator (Desktop) */}
                <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-1 shadow-sm border">
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                </div>

                {/* After Photo */}
                <div className="space-y-2">
                    <div className="font-semibold text-center text-sm text-gray-500 uppercase tracking-wider">Después</div>
                    <div className="relative aspect-video bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 hover:bg-gray-100 transition-colors flex flex-col items-center justify-center overflow-hidden">
                        {section.afterPhotoUrl ? (
                            <>
                                <img src={section.afterPhotoUrl} alt="Después" className="w-full h-full object-cover" />
                                {!readOnly && (
                                    <Button
                                        variant="destructive"
                                        size="icon"
                                        className="absolute top-2 right-2 h-6 w-6 rounded-full opacity-0 hover:opacity-100 transition-opacity"
                                        onClick={() => handleClearPhoto('after')}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                )}
                            </>
                        ) : (
                            !readOnly && (
                                <label className="cursor-pointer flex flex-col items-center p-4 w-full h-full justify-center">
                                    <Upload className="h-8 w-8 text-gray-300 mb-2" />
                                    <span className="text-xs text-gray-400">Subir foto Después</span>
                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload('after', e)} />
                                </label>
                            )
                        )}
                        {readOnly && !section.afterPhotoUrl && <span className="text-gray-400 text-sm">Sin foto</span>}
                    </div>
                </div>
            </div>

            <div className={`mt-3 ${!readOnly ? 'pl-8' : ''}`}>
                <Input
                    placeholder="Descripción de la mejora (opcional)..."
                    value={section.description || ""}
                    onChange={(e) => onChange({ description: e.target.value })}
                    className="border-none bg-transparent shadow-none focus-visible:ring-0 text-center text-gray-600 placeholder:text-gray-300"
                    readOnly={readOnly}
                />
            </div>
        </Card>
    );
}
