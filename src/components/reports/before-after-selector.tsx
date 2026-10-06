"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ImageIcon, PenTool } from "lucide-react";
import { TicketPhoto } from "@/types/schema";
import { ImageAnnotator } from "@/components/ui/image-annotator";

interface BeforeAfterSelectorProps {
    label: string;
    photoUrl?: string;
    onSelect: (photoUrl: string, meta?: any) => void;
    availablePhotos: TicketPhoto[];
}

export function BeforeAfterSelector({
    label,
    photoUrl,
    onSelect,
    availablePhotos
}: BeforeAfterSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isAnnotating, setIsAnnotating] = useState(false);

    const handleSelect = (photo: TicketPhoto) => {
        onSelect(photo.url, {
            originalId: photo.url, // Usando URL como ID por ahora si no hay ID explícito
            area: photo.area,
            timestamp: photo.timestamp
        });
        setIsOpen(false);
    };

    return (
        <div className="space-y-2">
            <span className="text-xs font-semibold text-gray-500 uppercase">{label}</span>

            <div className="relative w-full aspect-video group">
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <div
                            className="w-full h-full bg-gray-100 rounded-lg overflow-hidden border-2 border-dashed border-gray-300 hover:border-blue-500 cursor-pointer transition-colors relative"
                            role="button"
                        >
                            {photoUrl ? (
                                <>
                                    <img
                                        src={photoUrl}
                                        alt={label}
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                        <span className="text-white text-xs font-medium bg-black/50 px-3 py-1 rounded-full">Cambiar</span>
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                    <ImageIcon className="h-8 w-8 mb-2 opacity-50" />
                                    <span className="text-xs">Seleccionar foto</span>
                                </div>
                            )}
                        </div>
                    </DialogTrigger>
                    {/* ... dialog content remains the same but nested here ... */}
                    <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Seleccionar foto para: {label}</DialogTitle>
                        </DialogHeader>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                            {availablePhotos.length > 0 ? (
                                availablePhotos.map((photo, i) => (
                                    <div
                                        key={i}
                                        className="relative aspect-video group cursor-pointer border rounded-lg overflow-hidden hover:ring-2 hover:ring-blue-500"
                                        onClick={() => handleSelect(photo)}
                                    >
                                        <img
                                            src={photo.url}
                                            alt={photo.description || 'Foto del ticket'}
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                        />
                                        {photo.type && (
                                            <span className="absolute top-1 left-1 text-[10px] bg-black/60 text-white px-2 py-0.5 rounded">
                                                {photo.type}
                                            </span>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full text-center py-8 text-gray-500">
                                    No hay fotos disponibles en este ticket.
                                </div>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Botón de Marcar encima del Trigger, pero posicionado absoluto */}
                {photoUrl && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsAnnotating(true);
                        }}
                        className="absolute bottom-2 right-2 bg-blue-500 text-white rounded-full p-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity hover:bg-blue-600 shadow-md z-10 cursor-pointer"
                        title="Marcar foto"
                    >
                        <PenTool className="h-4 w-4" />
                    </button>
                )}
            </div>

            {/* Modal para Editar/Marcar Foto */}
            {isAnnotating && photoUrl && (
                <ImageAnnotator
                    open={isAnnotating}
                    onOpenChange={setIsAnnotating}
                    imageUrl={photoUrl}
                    onSave={(annotatedUrl) => {
                        onSelect(annotatedUrl);
                        setIsAnnotating(false);
                    }}
                />
            )}
        </div>
    );
}
