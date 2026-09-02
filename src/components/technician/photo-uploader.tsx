"use client";

import { useState, useEffect, useRef } from "react";
import { TicketPhoto } from "@/types/schema";
import { Camera, Image as ImageIcon, X, Loader2, MapPin, CheckCircle } from "lucide-react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { auth } from "@/lib/firebase";

interface PhotoUploaderProps {
    label: string;
    type: 'BEFORE' | 'DURING' | 'AFTER';
    photos: TicketPhoto[];
    onChange: (photos: TicketPhoto[]) => void;
    allowGallery?: boolean;
}

// Resize + watermark image using canvas
const processImage = async (file: File, location?: string): Promise<Blob> => {
    return new Promise((resolve) => {
        const img = new Image();
        const reader = new FileReader();

        reader.onload = (e) => { img.src = e.target?.result as string; };

        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) { resolve(file); return; }

            // Resize to max 2048px (2K) to preserve crisp text and details (crucial for technicians' work audits)
            let { width, height } = img;
            const MAX = 2048;
            if (width > MAX || height > MAX) {
                if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
                else { width = Math.round(width * MAX / height); height = MAX; }
            }

            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);

            // Watermark
            const now = new Date();
            const dateStr = now.toLocaleDateString('es-DO', { year: 'numeric', month: '2-digit', day: '2-digit' });
            const timeStr = now.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' });
            const fontSize = Math.max(Math.floor(width / 45), 16);

            ctx.font = `bold ${fontSize}px Arial`;
            ctx.shadowColor = "black";
            ctx.shadowBlur = 6;
            ctx.fillStyle = 'rgba(255,255,255,0.95)';

            const pad = fontSize;
            let y = height - pad;

            if (location) {
                ctx.fillText(`📍 ${location.slice(0, 40)}`, pad, y);
                y -= fontSize + 6;
            }
            ctx.fillText(`🕐 ${timeStr}  📅 ${dateStr}`, pad, y);

            // Use 0.90 quality to prevent compression artifacts in texts and labels
            canvas.toBlob((blob) => resolve(blob || file), 'image/jpeg', 0.90);
        };

        img.onerror = () => resolve(file);
        reader.onerror = () => resolve(file);
        reader.readAsDataURL(file);
    });
};

export function PhotoUploader({ label, type, photos, onChange, allowGallery = false }: PhotoUploaderProps) {
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<string>("");
    const [location, setLocation] = useState<string>("");
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);

    const currentPhotos = photos.filter(p => p.type === type);

    // ✅ FIX: useEffect (not useState) for geolocation
    useEffect(() => {
        if (typeof navigator === 'undefined' || !navigator.geolocation) return;

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const res = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`
                    );
                    const data = await res.json();
                    const addr = data.display_name?.split(',').slice(0, 2).join(',') ||
                        `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`;
                    setLocation(addr);
                } catch {
                    setLocation(`${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`);
                }
            },
            () => { /* user denied — no location watermark */ },
            { timeout: 5000, maximumAge: 60000 }
        );
    }, []);

    const uploadFiles = async (files: File[]) => {
        if (!files.length) return;

        // ✅ Verify auth before attempting upload
        const user = auth.currentUser;
        if (!user) {
            alert("Error: Sesión expirada. Por favor recarga la página e inicia sesión nuevamente.");
            return;
        }

        setUploading(true);
        setUploadProgress("");

        try {
            const newPhotos: TicketPhoto[] = [];

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                setUploadProgress(`Subiendo ${i + 1}/${files.length}...`);

                // Process image (resize + watermark) — fallback to original on error
                let blob: Blob = file;
                try {
                    blob = await processImage(file, location);
                } catch (e) {
                    console.warn("Image processing failed, using original:", e);
                }

                // Upload to Firebase Storage
                const filename = `tickets/${user.uid}/${Date.now()}_${type}_${file.name.replace(/\s/g, '_')}`;
                const storageRef = ref(storage, filename);

                await uploadBytes(storageRef, blob, {
                    contentType: 'image/jpeg',
                    customMetadata: { uploadedBy: user.uid, photoType: type }
                });
                const url = await getDownloadURL(storageRef);

                newPhotos.push({
                    url,
                    type,
                    description: "",
                    timestamp: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 },
                    location: location || undefined
                });
            }

            onChange([...photos, ...newPhotos]);
            setUploadProgress("✅ Fotos subidas");
            setTimeout(() => setUploadProgress(""), 2000);

        } catch (error: any) {
            console.error("Photo upload error:", error);

            // User-friendly error messages
            let msg = "Error al subir la foto.";
            if (error?.code === 'storage/unauthorized') {
                msg = "Sin permisos de almacenamiento. Contacte al administrador.";
            } else if (error?.code === 'storage/canceled') {
                msg = "Subida cancelada.";
            } else if (error?.code === 'storage/unknown' || error?.message?.includes('network')) {
                msg = "Sin conexión. Verifica tu internet e intenta de nuevo.";
            } else if (error?.message) {
                msg = `Error: ${error.message}`;
            }

            alert(msg);
        } finally {
            setUploading(false);
            // Reset inputs
            if (cameraInputRef.current) cameraInputRef.current.value = '';
            if (galleryInputRef.current) galleryInputRef.current.value = '';
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            uploadFiles(Array.from(e.target.files));
        }
    };

    const handleRemove = (url: string) => {
        if (window.confirm("¿Eliminar esta foto?")) {
            onChange(photos.filter(p => p.url !== url));
        }
    };

    const typeConfig = {
        BEFORE: { emoji: "📸", color: "border-blue-300 bg-blue-50", btnColor: "bg-blue-600" },
        DURING: { emoji: "🔧", color: "border-yellow-300 bg-yellow-50", btnColor: "bg-yellow-600" },
        AFTER:  { emoji: "✅", color: "border-green-300 bg-green-50", btnColor: "bg-green-600" },
    };
    const config = typeConfig[type];

    return (
        <div className={`space-y-3 p-3 rounded-xl border-2 ${config.color}`}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-gray-800 flex items-center gap-1.5">
                    <span>{config.emoji}</span>
                    {label}
                    <span className="ml-1 text-xs bg-white/70 text-gray-500 rounded-full px-2 py-0.5 font-normal">
                        {currentPhotos.length} foto{currentPhotos.length !== 1 ? 's' : ''}
                    </span>
                </h3>
                {location && (
                    <span className="text-[10px] text-gray-400 flex items-center gap-0.5 max-w-[120px] truncate">
                        <MapPin className="h-2.5 w-2.5 shrink-0" />
                        GPS activo
                    </span>
                )}
            </div>

            {/* Upload status */}
            {uploadProgress && (
                <div className="flex items-center gap-2 text-sm text-blue-600 font-medium animate-pulse">
                    {uploadProgress.startsWith('✅') ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    {uploadProgress}
                </div>
            )}

            {/* Photo Grid */}
            <div className="grid grid-cols-3 gap-2">
                {currentPhotos.map((photo, index) => (
                    <div key={index} className="relative aspect-square bg-slate-100 rounded-lg overflow-hidden">
                        <img src={photo.url} alt={`Foto ${index + 1}`} className="w-full h-full object-cover" />
                        <button
                            type="button"
                            onClick={() => handleRemove(photo.url)}
                            className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 shadow-lg active:scale-95"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </div>
                ))}

                {/* Upload Button Box */}
                {!uploading && (
                    <div className="aspect-square bg-white/70 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-1">
                        {/* Camera Button */}
                        <label
                            htmlFor={`camera-${type}`}
                            className="cursor-pointer flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors w-full text-center"
                        >
                            <Camera className="h-6 w-6 text-gray-500" />
                            <span className="text-[10px] text-gray-600 font-medium">Cámara</span>
                            <input
                                ref={cameraInputRef}
                                id={`camera-${type}`}
                                type="file"
                                accept="image/*"
                                capture="environment"
                                className="hidden"
                                onChange={handleFileChange}
                                disabled={uploading}
                            />
                        </label>

                        {/* Gallery Button — show only if allowed */}
                        {allowGallery && (
                            <label
                                htmlFor={`gallery-${type}`}
                                className="cursor-pointer flex flex-col items-center gap-1 px-2 pb-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors w-full text-center border-t border-dashed border-gray-200"
                            >
                                <ImageIcon className="h-5 w-5 text-gray-400 mt-1" />
                                <span className="text-[10px] text-gray-500">Galería</span>
                                <input
                                    ref={galleryInputRef}
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
                    </div>
                )}

                {/* Uploading State Box */}
                {uploading && (
                    <div className="aspect-square bg-white/70 border-2 border-dashed border-blue-300 rounded-lg flex flex-col items-center justify-center gap-2">
                        <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
                        <span className="text-[10px] text-blue-600 font-medium text-center px-1">
                            {uploadProgress || "Procesando..."}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
