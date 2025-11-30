"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TicketPhoto } from "@/types/schema";
import { Camera, X, Upload } from "lucide-react";
import Image from "next/image";

interface PhotoUploaderProps {
    photos: TicketPhoto[];
    onChange: (photos: TicketPhoto[]) => void;
    type: 'BEFORE' | 'DURING' | 'AFTER';
    label: string;
}

export function PhotoUploader({ photos, onChange, type, label }: PhotoUploaderProps) {
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

        // Draw background for readability
        // ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        // ctx.fillRect(x - 300, y - (lines.length * lineHeight) - 10, 320, (lines.length * lineHeight) + 20);

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
                        Agregar Foto
                    </Button>
                </div>
            </div>

            {currentPhotos.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {currentPhotos.map((photo, index) => (
                        <div key={index} className="relative aspect-square rounded-lg overflow-hidden border bg-gray-100 group">
                            <Image
                                src={photo.url}
                                alt="Evidence"
                                fill
                                className="object-cover"
                            />
                            <button
                                onClick={() => removePhoto(photo.url)}
                                className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <X className="h-3 w-3" />
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
