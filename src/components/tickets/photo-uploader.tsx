"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TicketPhoto } from "@/types/schema";
import { Camera, X, Upload, Trash2 } from "lucide-react";
import Image from "next/image";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
}

export function PhotoUploader({ photos, onChange, type, label, allowGallery = false }: PhotoUploaderProps) {
    const currentPhotos = photos.filter(p => p.type === type);

    const addWatermark = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const img = document.createElement("img");
            img.src = URL.createObjectURL(file);
            img.onload = () => {
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");
                if (!ctx) {
                    reject(new Error("Could not get canvas context"));
                    return;
                }

                canvas.width = img.width;
                canvas.height = img.height;

                // Draw original image
                ctx.drawImage(img, 0, 0);

                // Get location
                if ("geolocation" in navigator) {
                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            drawText(ctx, canvas.width, canvas.height, position.coords.latitude, position.coords.longitude);
                            resolve(canvas.toDataURL("image/jpeg", 0.8));
                        },
                        (error) => {
                            console.warn("Geolocation error:", error);
                            drawText(ctx, canvas.width, canvas.height, null, null); // Draw without location
                            resolve(canvas.toDataURL("image/jpeg", 0.8));
                        }
                    );
                } else {
                    drawText(ctx, canvas.width, canvas.height, null, null);
                    resolve(canvas.toDataURL("image/jpeg", 0.8));
                }
            };
            img.onerror = reject;
        });
    };

    const drawText = (ctx: CanvasRenderingContext2D, width: number, height: number, lat: number | null, lng: number | null) => {
        const date = new Date().toLocaleString();
        const locationText = lat && lng ? `\nLat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}` : "";
        const text = `${date}${locationText}`;

        const fontSize = width * 0.03; // Responsive font size
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.fillStyle = "white";
        ctx.shadowColor = "black";
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.textAlign = "right";
        ctx.textBaseline = "bottom";

        const lines = text.split("\n");
        const lineHeight = fontSize * 1.2;
        const x = width - 20;
        const y = height - 20;

        ctx.fillStyle = "white";
        lines.reverse().forEach((line, index) => {
            ctx.fillText(line, x, y - (index * lineHeight));
        });
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];

            try {
                const watermarkedUrl = await addWatermark(file);

                const newPhoto: TicketPhoto = {
                    url: watermarkedUrl,
                    type: type,
                    timestamp: { seconds: Date.now() / 1000, nanoseconds: 0 },
                    description: file.name
                };

                onChange([...photos, newPhoto]);
            } catch (error) {
                console.error("Error processing image:", error);
                // Fallback to original if processing fails
                const fakeUrl = URL.createObjectURL(file);
                const newPhoto: TicketPhoto = {
                    url: fakeUrl,
                    type: type,
                    timestamp: { seconds: Date.now() / 1000, nanoseconds: 0 },
                    description: file.name
                };
                onChange([...photos, newPhoto]);
            }
        }
    };

    const removePhoto = (urlToRemove: string) => {
        onChange(photos.filter(p => p.url !== urlToRemove));
    };

    return (
        <div className="space-y-3">
            <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-gray-700">{label}</h3>
                <div className="flex gap-2">
                    {/* Camera Button */}
                    <div className="relative">
                        <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={handleFileChange}
                        />
                        <Button variant="outline" size="sm" className="gap-2">
                            <Camera className="h-4 w-4" />
                            <span className="hidden sm:inline">Cámara</span>
                        </Button>
                    </div>

                    {/* Gallery Button - Only show if allowed */}
                    {allowGallery && (
                        <div className="relative">
                            <input
                                type="file"
                                accept="image/*"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                onChange={handleFileChange}
                                multiple
                            />
                            <Button variant="outline" size="sm" className="gap-2">
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
                    No hay fotos registradas
                </div>
            )}
        </div>
    );
}
