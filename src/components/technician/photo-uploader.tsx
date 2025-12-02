"use client";

import { useState } from "react";
import { TicketPhoto, EventType } from "@/types/schema";
import { Button } from "@/components/ui/button";
import { Camera, Image as ImageIcon, X, Loader2 } from "lucide-react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";

interface PhotoUploaderProps {
    label: string;
    type: 'BEFORE' | 'DURING' | 'AFTER';
    photos: TicketPhoto[];
    onChange: (photos: TicketPhoto[]) => void;
    allowGallery?: boolean;
}

export function PhotoUploader({ label, type, photos, onChange, allowGallery = false }: PhotoUploaderProps) {
    const [uploading, setUploading] = useState(false);

    const currentPhotos = photos.filter(p => p.type === type);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setUploading(true);
            try {
                const file = e.target.files[0];
                const storageRef = ref(storage, `tickets/${Date.now()}_${file.name}`);
                await uploadBytes(storageRef, file);
                const url = await getDownloadURL(storageRef);

                const newPhoto: TicketPhoto = {
                    url,
                    type,
                    description: "",
                    timestamp: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }
                };

                onChange([...photos, newPhoto]);
            } catch (error) {
                console.error("Error uploading photo:", error);
                alert("Error al subir la foto");
            } finally {
                setUploading(false);
            }
        }
    };

    const handleRemove = (url: string) => {
        onChange(photos.filter(p => p.url !== url));
    };

    return (
        <div className="space-y-3">
            <h3 className="font-medium text-sm text-gray-900">{label}</h3>

            <div className="grid grid-cols-3 gap-2">
                {currentPhotos.map((photo, index) => (
                    <div key={index} className="relative aspect-square bg-slate-100 rounded-lg overflow-hidden group">
                        <img src={photo.url} alt="Evidencia" className="w-full h-full object-cover" />
                        <button
                            onClick={() => handleRemove(photo.url)}
                            className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </div>
                ))}

                <div className="relative aspect-square bg-slate-50 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-1 hover:bg-slate-100 transition-colors">
                    {uploading ? (
                        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    ) : (
                        <>
                            <label htmlFor={`camera-${type}`} className="cursor-pointer flex flex-col items-center">
                                <Camera className="h-6 w-6 text-gray-400 mb-1" />
                                <span className="text-[10px] text-gray-500">Cámara</span>
                                <input
                                    id={`camera-${type}`}
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    className="hidden"
                                    onChange={handleFileChange}
                                    disabled={uploading}
                                />
                            </label>
                            {allowGallery && (
                                <label htmlFor={`gallery-${type}`} className="cursor-pointer flex flex-col items-center mt-2 border-t pt-2 w-full">
                                    <ImageIcon className="h-4 w-4 text-gray-400" />
                                    <span className="text-[10px] text-gray-500">Galería</span>
                                    <input
                                        id={`gallery-${type}`}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleFileChange}
                                        disabled={uploading}
                                    />
                                </label>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
