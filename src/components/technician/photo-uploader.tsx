"use client";

import { useState } from "react";
import { TicketPhoto } from "@/types/schema";
import { Camera, Image as ImageIcon, X, Loader2, MapPin, Calendar, Clock } from "lucide-react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";

interface PhotoUploaderProps {
    label: string;
    type: 'BEFORE' | 'DURING' | 'AFTER';
    photos: TicketPhoto[];
    onChange: (photos: TicketPhoto[]) => void;
    allowGallery?: boolean;
}

// Function to add metadata watermark to image and resize if needed
const addMetadataToImage = async (file: File, location?: string): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();

        reader.onload = (e) => {
            img.src = e.target?.result as string;
        };

        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Could not get canvas context'));
                return;
            }

            // Calculate new dimensions (max 1920px)
            let width = img.width;
            let height = img.height;
            const MAX_DIMENSION = 1920;

            if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
                if (width > height) {
                    height = Math.round((height * MAX_DIMENSION) / width);
                    width = MAX_DIMENSION;
                } else {
                    width = Math.round((width * MAX_DIMENSION) / height);
                    height = MAX_DIMENSION;
                }
            }

            // Set canvas size
            canvas.width = width;
            canvas.height = height;

            // Draw image resized
            ctx.drawImage(img, 0, 0, width, height);

            // Prepare metadata text
            const now = new Date();
            const dateStr = now.toLocaleDateString('es-DO', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
            const timeStr = now.toLocaleTimeString('es-DO', {
                hour: '2-digit',
                minute: '2-digit'
            });

            // Style for watermark - Adjusted for resized dimensions
            const fontSize = Math.max(width / 40, 20); // Slightly larger relative font
            ctx.font = `bold ${fontSize}px Arial`;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.lineWidth = 3;
            // Ensure text is readable
            ctx.shadowColor = "black";
            ctx.shadowBlur = 4;

            // Position watermark at bottom-left
            const padding = fontSize;
            let yPosition = height - padding;

            // Draw location if available
            if (location) {
                const locationText = `📍 ${location}`;
                ctx.strokeText(locationText, padding, yPosition);
                ctx.fillText(locationText, padding, yPosition);
                yPosition -= fontSize + 5;
            }

            // Draw time
            const timeText = `🕐 ${timeStr}`;
            ctx.strokeText(timeText, padding, yPosition);
            ctx.fillText(timeText, padding, yPosition);
            yPosition -= fontSize + 5;

            // Draw date
            const dateText = `📅 ${dateStr}`;
            ctx.strokeText(dateText, padding, yPosition);
            ctx.fillText(dateText, padding, yPosition);

            // Convert canvas to blob (JPEG 0.8 quality is usually enough and much smaller)
            canvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Could not create blob'));
                }
            }, 'image/jpeg', 0.85);
        };

        img.onerror = () => reject(new Error('Could not load image'));
        reader.onerror = () => reject(new Error('Could not read file'));
        reader.readAsDataURL(file);
    });
};

export function PhotoUploader({ label, type, photos, onChange, allowGallery = false }: PhotoUploaderProps) {
    const [uploading, setUploading] = useState(false);
    const [location, setLocation] = useState<string>("");

    const currentPhotos = photos.filter(p => p.type === type);

    // Get location on component mount
    useState(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    try {
                        // Reverse geocoding using a free API
                        const response = await fetch(
                            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`
                        );
                        const data = await response.json();
                        const address = data.display_name?.split(',').slice(0, 3).join(',') ||
                            `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`;
                        setLocation(address);
                    } catch (error) {
                        console.error('Error getting location name:', error);
                        setLocation(`${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`);
                    }
                },
                (error) => {
                    console.error('Geolocation error:', error);
                }
            );
        }
    });

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setUploading(true);
            try {
                const files = Array.from(e.target.files);
                const newPhotos: TicketPhoto[] = [];

                for (const file of files) {
                    let blobToUpload: Blob = file;

                    // Try to add metadata watermark, but fallback to original if it fails
                    try {
                        blobToUpload = await addMetadataToImage(file, location);
                        console.log('✅ Metadata added to image');
                    } catch (metadataError) {
                        console.warn('⚠️ Could not add metadata, uploading original:', metadataError);
                        // Continue with original file
                    }

                    // Upload to Firebase Storage
                    const storageRef = ref(storage, `tickets/${Date.now()}_${file.name}`);
                    await uploadBytes(storageRef, blobToUpload);
                    const url = await getDownloadURL(storageRef);

                    const newPhoto: TicketPhoto = {
                        url,
                        type,
                        description: "",
                        timestamp: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 },
                        location: location || undefined
                    };

                    newPhotos.push(newPhoto);
                }

                onChange([...photos, ...newPhotos]);
            } catch (error) {
                console.error("Error uploading photo:", error);
                alert(`Error al subir la foto: ${error instanceof Error ? error.message : 'Error desconocido'}`);
            } finally {
                setUploading(false);
                // Reset input
                e.target.value = '';
            }
        }
    };

    const handleRemove = (url: string) => {
        onChange(photos.filter(p => p.url !== url));
    };

    return (
        <div className="space-y-3">
            <h3 className="font-medium text-sm text-gray-900 flex items-center gap-2">
                {label}
                <span className="text-xs text-gray-500">({currentPhotos.length})</span>
            </h3>

            <div className="grid grid-cols-3 gap-2">
                {currentPhotos.map((photo, index) => (
                    <div key={index} className="relative aspect-square bg-slate-100 rounded-lg overflow-hidden group">
                        <img src={photo.url} alt="Evidencia" className="w-full h-full object-cover" />
                        <button
                            onClick={() => handleRemove(photo.url)}
                            className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                        >
                            <X className="h-3 w-3" />
                        </button>
                        {photo.location && (
                            <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[8px] p-1 truncate">
                                📍 {photo.location}
                            </div>
                        )}
                    </div>
                ))}

                <div className="relative aspect-square bg-slate-50 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-1 hover:bg-slate-100 transition-colors">
                    {uploading ? (
                        <div className="flex flex-col items-center">
                            <Loader2 className="h-6 w-6 animate-spin text-blue-600 mb-1" />
                            <span className="text-[10px] text-gray-500">Subiendo...</span>
                        </div>
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
                                        multiple
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

            {location && (
                <p className="text-xs text-gray-500 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    Las fotos incluirán: {location}
                </p>
            )}
        </div>
    );
}
