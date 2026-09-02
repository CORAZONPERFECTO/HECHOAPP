"use client";

import { useState, useRef } from "react";
import { doc, updateDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage, auth } from "@/lib/firebase";
import { Ticket, TicketPhoto } from "@/types/tickets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, MapPin, Loader2, PlayCircle, Clock } from "lucide-react";
import { formatDistanceToNow, formatDistance } from "date-fns";
import { es } from "date-fns/locale";

interface StartServiceCardProps {
    ticket: Ticket;
    onStart: () => void;
}

const compressImageFacade = (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
        const img = new Image();
        const reader = new FileReader();
        reader.onload = (e) => { img.src = e.target?.result as string; };
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) { resolve(file); return; }

            // Max resolution 2048px (2K) to keep high details
            let { width, height } = img;
            const MAX = 2048;
            if (width > MAX || height > MAX) {
                if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
                else { width = Math.round(width * MAX / height); height = MAX; }
            }

            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob((blob) => resolve(blob || file), 'image/jpeg', 0.90);
        };
        img.onerror = () => resolve(file);
        reader.onerror = () => resolve(file);
        reader.readAsDataURL(file);
    });
};

export function StartServiceCard({ ticket, onStart }: StartServiceCardProps) {
    const [loading, setLoading] = useState(false);
    const [startMileage, setStartMileage] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !ticket.id) return;

        if (!startMileage) {
            alert("⚠️ Por favor, ingresa el kilometraje de inicio antes de capturar la foto.");
            return;
        }

        const mileageNum = parseInt(startMileage);
        if (isNaN(mileageNum) || mileageNum <= 0) {
            alert("⚠️ Ingresa un kilometraje numérico válido.");
            return;
        }

        setLoading(true);
        try {
            // Compress facade photo
            let blob: Blob = file;
            try {
                blob = await compressImageFacade(file);
            } catch (err) {
                console.warn("Facade photo compression failed, using original:", err);
            }

            // 1. Upload photo
            const storageRef = ref(storage, `tickets/${ticket.id}/photos/facade_${Date.now()}`);
            await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
            const downloadUrl = await getDownloadURL(storageRef);

            const newPhoto: TicketPhoto = {
                url: downloadUrl,
                type: 'BEFORE',
                description: 'Foto de Fachada / Llegada',
                timestamp: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }
            };

            // 2. Update visits history
            const currentVisits = ticket.visits || [];
            let updatedVisits = [...currentVisits];
            
            if (updatedVisits.length === 0) {
                updatedVisits.push({
                    id: `v1-${Date.now()}`,
                    visitNumber: 1,
                    technicianId: ticket.technicianId || "unknown",
                    technicianName: ticket.technicianName || "Técnico",
                    status: 'IN_PROGRESS',
                    arrivedAt: Timestamp.now(),
                    workStartedAt: Timestamp.now(),
                    startMileage: mileageNum,
                    photos: [newPhoto]
                });
            } else {
                const lastIndex = updatedVisits.length - 1;
                if (updatedVisits[lastIndex].status === 'SCHEDULED') {
                    updatedVisits[lastIndex] = {
                        ...updatedVisits[lastIndex],
                        status: 'IN_PROGRESS',
                        arrivedAt: Timestamp.now(),
                        workStartedAt: Timestamp.now(),
                        startMileage: mileageNum,
                        photos: [...(updatedVisits[lastIndex].photos || []), newPhoto]
                    };
                }
            }

            // 3. Update ticket
            const updates = {
                arrivedAt: serverTimestamp(),
                workStartedAt: serverTimestamp(),
                status: 'IN_PROGRESS',
                startMileage: mileageNum,
                photos: [...(ticket.photos || []), newPhoto],
                visits: updatedVisits
            };

            await updateDoc(doc(db, "tickets", ticket.id), updates);

            // Log to vehicleMileageLogs history
            import("firebase/firestore").then(({ addDoc, collection, serverTimestamp }) => {
                const currentUser = auth.currentUser;
                addDoc(collection(db, "vehicleMileageLogs"), {
                    userId: currentUser?.uid || ticket.technicianId || "unknown",
                    userName: currentUser?.displayName || currentUser?.email || ticket.technicianName || "Técnico",
                    vehiclePlate: "S/R",
                    vehicleBrand: "S/R",
                    vehicleModel: "S/R",
                    mileage: mileageNum,
                    type: 'TICKET_START',
                    ticketId: ticket.id,
                    ticketNumber: ticket.ticketNumber || ticket.id?.substring(0, 8),
                    createdAt: serverTimestamp(),
                    date: new Date().toISOString().split("T")[0]
                }).catch(err => console.error("Error logging ticket start mileage:", err));
            });
            
            // 3. Notify parent to refresh
            onStart();
        } catch (error) {
            console.error("Error al iniciar servicio:", error);
            alert("Error al iniciar el servicio. Intente de nuevo.");
        } finally {
            setLoading(false);
        }
    };

    if (ticket.arrivedAt) {
        // Show active timer or arrived status
        const startTime = ticket.arrivedAt.seconds ? new Date(ticket.arrivedAt.seconds * 1000) : new Date();
        const endTime = ticket.closedAt?.seconds ? new Date(ticket.closedAt.seconds * 1000) : new Date();
        const durationStr = formatDistanceToNow(startTime, { locale: es });
        const finalDurationStr = ticket.closedAt ? formatDistance(startTime, endTime, { locale: es }) : '';

        return (
            <Card className="border-green-200 bg-green-50/50">
                <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                            <Clock className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                            <p className="font-bold text-green-800 text-sm">Servicio Iniciado</p>
                            <p className="text-xs text-green-700">
                                {ticket.closedAt ? `Duración total: ` : `Tiempo transcurrido: `}
                                {ticket.closedAt ? finalDurationStr : durationStr}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-blue-200 bg-blue-50/50 shadow-sm">
            <CardContent className="p-4">
                <div className="flex flex-col items-center text-center space-y-3">
                    <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mb-1">
                        <MapPin className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="font-bold text-blue-900">¿Ya llegaste a la ubicación?</h3>
                        <p className="text-sm text-blue-700 mt-1">Para iniciar a contar el tiempo de servicio, debes ingresar el kilometraje inicial y tomar una foto de la fachada o puerta principal.</p>
                    </div>

                    <div className="w-full max-w-xs space-y-1.5 text-left bg-white p-3 rounded-lg border border-blue-200">
                        <label className="text-xs font-bold text-blue-800 uppercase tracking-wide block">
                            Kilometraje Inicial del Vehículo *
                        </label>
                        <Input
                            type="number"
                            placeholder="Ej: 145200"
                            value={startMileage}
                            onChange={e => setStartMileage(e.target.value)}
                            className="h-10 text-sm"
                        />
                    </div>
                    
                    <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment" 
                        ref={fileInputRef}
                        className="hidden" 
                        onChange={handlePhotoCapture}
                    />
                    
                    <Button 
                        size="lg" 
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-md text-base h-14 animate-pulse-subtle"
                        disabled={loading || !startMileage}
                        onClick={() => {
                            if (!startMileage) {
                                alert("Por favor, ingresa el kilometraje inicial.");
                                return;
                            }
                            fileInputRef.current?.click();
                        }}
                    >
                        {loading ? (
                            <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Registrando Llegada...</>
                        ) : (
                            <><Camera className="mr-2 h-5 w-5" /> Tomar Foto e Iniciar Servicio</>
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
