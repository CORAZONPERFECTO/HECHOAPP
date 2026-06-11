"use client";

import { useState, useRef } from "react";
import { TicketVideo } from "@/types/schema";
import { Video, Trash2, Loader2, Play, CheckCircle } from "lucide-react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage, auth } from "@/lib/firebase";

interface VideoUploaderProps {
    videos: TicketVideo[];
    onChange: (videos: TicketVideo[]) => void;
    ticketId: string;
    technicianName: string;
}

export function VideoUploader({ videos, onChange, ticketId, technicianName }: VideoUploaderProps) {
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<string>("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];

        // 1. Verify Authentication
        const user = auth.currentUser;
        if (!user) {
            alert("Error: Sesión expirada. Por favor recarga la página e inicia sesión nuevamente.");
            return;
        }

        // 2. Validate client-side duration
        setUploading(true);
        setUploadProgress("Validando video...");

        try {
            const duration = await getVideoDuration(file);
            console.log("Video duration:", duration);

            if (duration > 15.5) {
                alert(`⚠️ El video seleccionado dura ${duration.toFixed(1)} segundos. El límite permitido es de 15 segundos.`);
                setUploading(false);
                setUploadProgress("");
                if (fileInputRef.current) fileInputRef.current.value = "";
                return;
            }

            setUploadProgress("Subiendo video...");
            
            // 3. Upload to Firebase Storage under the tickets/videos/ path
            const filename = `tickets/videos/${ticketId}/${Date.now()}_${file.name.replace(/\s/g, '_')}`;
            const storageRef = ref(storage, filename);

            await uploadBytes(storageRef, file, {
                contentType: file.type || 'video/mp4',
                customMetadata: {
                    uploadedBy: user.uid,
                    uploadedByName: technicianName,
                    ticketId: ticketId
                }
            });

            const url = await getDownloadURL(storageRef);

            const newVideo: TicketVideo = {
                id: `vid_${Date.now()}`,
                url,
                uploadedAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 },
                uploadedBy: technicianName || "Técnico"
            };

            onChange([...videos, newVideo]);
            setUploadProgress("✅ Video subido");
            setTimeout(() => setUploadProgress(""), 2500);

        } catch (error: any) {
            console.error("Video upload error:", error);
            let msg = "Error al subir el video.";
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
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    // Helper function to load metadata and read duration
    const getVideoDuration = (file: File): Promise<number> => {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.muted = true;
            video.playsInline = true;

            const url = URL.createObjectURL(file);
            video.src = url;

            video.onloadedmetadata = () => {
                URL.revokeObjectURL(url);
                resolve(video.duration);
            };

            video.onerror = (e) => {
                URL.revokeObjectURL(url);
                reject(new Error("No se pudo leer la duración del archivo. Asegúrate de subir un formato de video válido (MP4, MOV)."));
            };
        });
    };

    const handleRemove = (id: string) => {
        if (window.confirm("¿Eliminar este video? Se quitará de este ticket.")) {
            onChange(videos.filter(v => v.id !== id));
        }
    };

    return (
        <div className="space-y-4 p-4 rounded-xl border-2 border-indigo-200 bg-indigo-50/50">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-indigo-950 flex items-center gap-1.5">
                    <span className="text-base">📹</span>
                    Evidencias en Video (Límite: 15s)
                    <span className="ml-1 text-xs bg-indigo-100 text-indigo-800 rounded-full px-2 py-0.5 font-semibold">
                        {videos.length} video{videos.length !== 1 ? 's' : ''}
                    </span>
                </h3>
            </div>

            {/* Upload status */}
            {uploadProgress && (
                <div className="flex items-center gap-2 text-sm text-indigo-700 font-semibold animate-pulse">
                    {uploadProgress.startsWith('✅') ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    {uploadProgress}
                </div>
            )}

            {/* Videos Playlist */}
            {videos.length > 0 && (
                <div className="grid grid-cols-1 gap-3">
                    {videos.map((video) => (
                        <div key={video.id} className="relative bg-white rounded-lg border border-indigo-100 p-2 shadow-sm flex flex-col gap-2">
                            <div className="relative aspect-video bg-black rounded-md overflow-hidden flex items-center justify-center">
                                <video
                                    src={video.url}
                                    controls
                                    className="w-full h-full object-contain"
                                    preload="none"
                                    playsInline
                                />
                            </div>
                            <div className="flex justify-between items-center text-xs px-1">
                                <span className="text-gray-500 font-medium truncate max-w-[200px]">
                                    Por: {video.uploadedBy}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => handleRemove(video.id)}
                                    className="text-red-500 hover:text-red-700 p-1 flex items-center gap-1 transition-colors"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    <span>Eliminar</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Record / Upload Trigger */}
            {!uploading && (
                <div className="flex gap-2">
                    <label
                        htmlFor="video-file-input"
                        className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white py-3 px-4 rounded-lg cursor-pointer text-sm font-semibold transition-all shadow-sm"
                    >
                        <Video className="h-4.5 w-4.5" />
                        Grabar o Seleccionar Video
                        <input
                            ref={fileInputRef}
                            id="video-file-input"
                            type="file"
                            accept="video/*"
                            capture="environment"
                            className="hidden"
                            onChange={handleFileChange}
                            disabled={uploading}
                        />
                    </label>
                </div>
            )}

            {/* Uploading State */}
            {uploading && (
                <div className="bg-white/80 border border-indigo-100 rounded-lg p-4 flex flex-col items-center justify-center gap-2 min-h-[100px]">
                    <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
                    <span className="text-xs text-indigo-700 font-bold">
                        {uploadProgress || "Procesando video..."}
                    </span>
                </div>
            )}
        </div>
    );
}
