"use client";

import { useState, useRef } from "react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { Ticket, TicketPhoto } from "@/types/tickets";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, MapPin, Loader2, PlayCircle, Clock } from "lucide-react";
import { formatDistanceToNow, formatDistance } from "date-fns";
import { es } from "date-fns/locale";

interface StartServiceCardProps {
    ticket: Ticket;
    onStart: () => void;
}

export function StartServiceCard({ ticket, onStart }: StartServiceCardProps) {
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !ticket.id) return;

        setLoading(true);
        try {
            // 1. Upload photo
            const storageRef = ref(storage, `tickets/${ticket.id}/photos/facade_${Date.now()}`);
            await uploadBytes(storageRef, file);
            const downloadUrl = await getDownloadURL(storageRef);

            const newPhoto: TicketPhoto = {
                url: downloadUrl,
                type: 'BEFORE',
                description: 'Foto de Fachada / Llegada',
                timestamp: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }
            };

            // 2. Update ticket
            const updates = {
                arrivedAt: serverTimestamp(),
                workStartedAt: serverTimestamp(),
                status: 'IN_PROGRESS',
                photos: [...(ticket.photos || []), newPhoto]
            };

            await updateDoc(doc(db, "tickets", ticket.id), updates);
            
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
                        <p className="text-sm text-blue-700 mt-1">Para iniciar a contar el tiempo de servicio, debes tomar una foto de la fachada o puerta principal.</p>
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
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-md text-base h-14"
                        disabled={loading}
                        onClick={() => fileInputRef.current?.click()}
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
