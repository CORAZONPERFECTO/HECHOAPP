"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Ticket } from "@/types/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChecklistRenderer } from "@/components/tickets/checklist-renderer";
import { PhotoUploader } from "@/components/tickets/photo-uploader";
import { MapPin, Phone, Calendar, Save, CheckCircle } from "lucide-react";

export default function TechnicianTicketPage() {
    const params = useParams();
    const id = params?.id as string;
    const [ticket, setTicket] = useState<Ticket | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchTicket = async () => {
            if (!id) return;
            try {
                const docRef = doc(db, "tickets", id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setTicket({ id: docSnap.id, ...docSnap.data() } as Ticket);
                }
            } catch (error) {
                console.error("Error fetching ticket:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchTicket();
    }, [id]);

    const handleSave = async () => {
        if (!ticket) return;
        setSaving(true);
        try {
            const docRef = doc(db, "tickets", ticket.id!);
            await updateDoc(docRef, {
                checklist: ticket.checklist,
                photos: ticket.photos,
                status: ticket.status,
                updatedAt: serverTimestamp()
            });
            alert("Cambios guardados correctamente");
        } catch (error) {
            console.error("Error saving ticket:", error);
            alert("Error al guardar");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-4 text-center">Cargando ticket...</div>;
    if (!ticket) return <div className="p-4 text-center text-red-500">Ticket no encontrado</div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header Mobile-First */}
            <div className="bg-white border-b sticky top-0 z-10 px-4 py-3 flex justify-between items-center shadow-sm">
                <div>
                    <h1 className="font-bold text-lg text-gray-900">Ticket #{ticket.ticketNumber || ticket.id?.slice(0, 6)}</h1>
                    <Badge variant={ticket.status === 'COMPLETED' ? 'default' : 'secondary'}>
                        {ticket.status}
                    </Badge>
                </div>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                    {saving ? "..." : <Save className="h-4 w-4" />}
                </Button>
            </div>

            <div className="p-4 space-y-4 max-w-md mx-auto">
                {/* Client Info Card */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Información del Cliente</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2">
                        <div className="font-medium text-lg">{ticket.clientName}</div>
                        <div className="flex items-start gap-2 text-gray-600">
                            <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                            <span>{ticket.locationName}</span>
                        </div>
                        {/* Google Maps Link */}
                        <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ticket.locationName + " " + ticket.clientName)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 text-xs flex items-center gap-1 ml-6 hover:underline"
                        >
                            Ver en Mapa ->
                        </a>
                    </CardContent>
                </Card>

                {/* Service Checklist */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Checklist de Servicio</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ChecklistRenderer
                            items={ticket.checklist}
                            onUpdate={(newChecklist) => setTicket({ ...ticket, checklist: newChecklist })}
                            readOnly={false}
                        />
                    </CardContent>
                </Card>

                {/* Evidence Photos */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Evidencias Fotográficas</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <PhotoUploader
                            label="Antes del Servicio"
                            type="BEFORE"
                            photos={ticket.photos || []}
                            onChange={(photos) => setTicket({ ...ticket, photos })}
                        />
                        <PhotoUploader
                            label="Durante el Servicio"
                            type="DURING"
                            photos={ticket.photos || []}
                            onChange={(photos) => setTicket({ ...ticket, photos })}
                        />
                        <PhotoUploader
                            label="Después del Servicio"
                            type="AFTER"
                            photos={ticket.photos || []}
                            onChange={(photos) => setTicket({ ...ticket, photos })}
                        />
                    </CardContent>
                </Card>

                {/* Actions */}
                <div className="pt-4">
                    <Button
                        className="w-full h-12 text-lg"
                        onClick={() => {
                            setTicket({ ...ticket, status: 'COMPLETED' });
                            setTimeout(handleSave, 100);
                        }}
                    >
                        <CheckCircle className="mr-2 h-5 w-5" />
                        Finalizar Servicio
                    </Button>
                </div>
            </div>
        </div>
    );
}
