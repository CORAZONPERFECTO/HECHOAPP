"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TicketPhoto } from "@/types/schema";
import { Camera, X, Upload, Trash2, Loader2 } from "lucide-react";
import Image from "next/image";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage, auth } from "@/lib/firebase";

const AREAS = [
    "Habitación", "Baño", "Cocina", "Sala", "Comedor",
    "Área Exterior", "Cuarto de máquinas", "Pasillo", "Otro"
];

interface PhotoUploaderProps {
    photos: TicketPhoto[];
    onChange: (photos: TicketPhoto[]) => void;
    type: 'BEFORE' | 'DURING' | 'AFTER';
    label: string;
    allowGallery?: boolean;
    onPhotoAdded?: (photo: TicketPhoto) => void;
}

export function PhotoUploader({ photos, onChange, type, label, allowGallery = false, onPhotoAdded }: PhotoUploaderProps) {
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<string>("");

    const currentPhotos = photos.filter(p => p.type === type);

    const processAndWatermark = (file: File): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const img = document.createElement("img");
            const reader = new FileReader();

            reader.onload = (e) => {
                img.src = e.target?.result as string;
            };

            img.onload = () => {
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");
                if (!ctx) {
                    reject(new Error("Could not get canvas context"));
                    return;
                }

                let width = img.naturalWidth || img.width;
                let height = img.naturalHeight || img.height;
                const MAX = 2048;

                if (width > MAX || height > MAX) {
                    if (width > height) {
                        height = Math.round((height * MAX) / width);
                        width = MAX;
                    } else {
                        width = Math.round((width * MAX) / height);
                        height = MAX;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, width, height);

                const finalize = (lat: number | null, lng: number | null) => {
                    const date = new Date().toLocaleString('es-DO');
                    const locationText = lat && lng ? ` | Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}` : "";
                    const text = `HECHO SRL • ${date}${locationText}`;

                    const fontSize = Math.max(Math.floor(width / 50), 16);
                    ctx.font = `bold ${fontSize}px sans-serif`;
                    ctx.fillStyle = "white";
                    ctx.shadowColor = "rgba(0,0,0,0.85)";
                    ctx.shadowBlur = 6;
                    ctx.shadowOffsetX = 2;
                    ctx.shadowOffsetY = 2;
                    ctx.textAlign = "right";
                    ctx.textBaseline = "bottom";

                    ctx.fillText(text, width - 20, height - 20);

                    canvas.toBlob((blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error("Canvas blob conversion failed"));
                        }
                    }, "image/jpeg", 0.92);
                };

                // Get location and finalize
                if ("geolocation" in navigator) {
                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            finalize(position.coords.latitude, position.coords.longitude);
                        },
                        (error) => {
                            console.warn("Geolocation warning:", error);
                            finalize(null, null);
                        },
                        { timeout: 4000, maximumAge: 60000 }
                    );
                } else {
                    finalize(null, null);
                }
            };

            img.onerror = (err) => reject(err);
            reader.onerror = (err) => reject(err);
            reader.readAsDataURL(file);
        });
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploading(true);
        setUploadProgress(`Preparando ${files.length} ${files.length === 1 ? 'foto' : 'fotos'}...`);

        try {
            const user = auth.currentUser;
            const uid = user?.uid || "admin";
            const newUploadedPhotos: TicketPhoto[] = [];

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                setUploadProgress(`Subiendo ${i + 1}/${files.length}...`);

                // 1. Process & watermark
                let blob: Blob;
                try {
                    blob = await processAndWatermark(file);
                } catch (err) {
                    console.warn("Watermark failed, using original file as blob:", err);
                    blob = file;
                }

                // 2. Upload to Firebase Storage
                const cleanName = file.name.replace(/\s+/g, '_');
                const filename = `tickets/${uid}/${Date.now()}_${type}_${cleanName}`;
                const storageRef = ref(storage, filename);

                await uploadBytes(storageRef, blob, {
                    contentType: 'image/jpeg',
                    customMetadata: { uploadedBy: uid, photoType: type }
                });

                const downloadUrl = await getDownloadURL(storageRef);

                const newPhoto: TicketPhoto = {
                    url: downloadUrl,
                    type: type,
                    timestamp: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 },
                    description: file.name
                };

                newUploadedPhotos.push(newPhoto);
                if (onPhotoAdded) onPhotoAdded(newPhoto);
            }

            onChange([...photos, ...newUploadedPhotos]);
        } catch (error) {
            console.error("Error uploading photo to Firebase Storage:", error);
            alert("Hubo un error al subir la foto a Firebase Storage. Por favor verifica tu conexión.");
        } finally {
            setUploading(false);
            setUploadProgress("");
            e.target.value = "";
        }
    };

    const removePhoto = (urlToRemove: string) => {
        onChange(photos.filter(p => p.url !== urlToRemove));
    };

    return (
        <div className="space-y-3">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-gray-700">{label}</h3>
                    {uploading && (
                        <span className="text-xs text-blue-600 font-medium flex items-center gap-1.5 animate-pulse">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            {uploadProgress}
                        </span>
                    )}
                </div>
                <div className="flex gap-2">
                    {/* Camera Button */}
                    <div className="relative">
                        <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            disabled={uploading}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                            onChange={handleFileChange}
                        />
                        <Button variant="outline" size="sm" disabled={uploading} className="gap-2">
                            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                            <span className="hidden sm:inline">Cámara</span>
                        </Button>
                    </div>

                    {/* Gallery Button - Only show if allowed */}
                    {allowGallery && (
                        <div className="relative">
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                disabled={uploading}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                onChange={handleFileChange}
                            />
                            <Button variant="outline" size="sm" disabled={uploading} className="gap-2">
                                <Upload className="h-4 w-4" />
                                <span className="hidden sm:inline">Galería</span>
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {currentPhotos.length > 0 ? (
                <div className="flex flex-col gap-4">
                    {currentPhotos.map((photo) => (
                        <div key={photo.url} className="flex flex-col sm:flex-row gap-4 p-4 border rounded-lg bg-white shadow-sm relative group">
                            {/* Photo Preview */}
                            <div className="relative w-full sm:w-32 h-32 shrink-0 rounded-md overflow-hidden border bg-gray-100">
                                <Image
                                    src={photo.url}
                                    alt="Evidence"
                                    fill
                                    className="object-cover"
                                />
                            </div>

                            {/* Fields */}
                            <div className="flex-1 space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs text-gray-500">Área</Label>
                                        <Select
                                            value={photo.area || ""}
                                            onValueChange={(val) => {
                                                const newPhotos = photos.map(p =>
                                                    p.url === photo.url ? { ...p, area: val } : p
                                                );
                                                onChange(newPhotos);
                                            }}
                                        >
                                            <SelectTrigger className="h-8">
                                                <SelectValue placeholder="Seleccionar área" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {AREAS.map(area => (
                                                    <SelectItem key={area} value={area}>{area}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-gray-500">Detalles</Label>
                                        <Input
                                            placeholder="Color, condición, notas..."
                                            value={photo.details || ""}
                                            onChange={(e) => {
                                                const newPhotos = photos.map(p =>
                                                    p.url === photo.url ? { ...p, details: e.target.value } : p
                                                );
                                                onChange(newPhotos);
                                            }}
                                            className="h-8"
                                        />
                                    </div>
                                </div>
                                {/* Timestamp display */}
                                <div className="text-xs text-gray-400">
                                    {new Date((photo.timestamp?.seconds || 0) * 1000).toLocaleString()}
                                </div>
                            </div>

                            {/* Remove Button */}
                            <button
                                onClick={() => removePhoto(photo.url)}
                                className="absolute top-2 right-2 text-gray-400 hover:text-red-500 transition-colors"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center text-gray-400 text-sm">
                    {uploading ? (
                        <div className="flex flex-col items-center justify-center gap-2 py-2">
                            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                            <span className="text-blue-600 font-medium text-xs">{uploadProgress}</span>
                        </div>
                    ) : (
                        "No hay fotos registradas"
                    )}
                </div>
            )}
        </div>
    );
}
