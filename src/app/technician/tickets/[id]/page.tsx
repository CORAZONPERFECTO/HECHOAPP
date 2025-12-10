"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VoiceTextarea } from "@/components/ui/voice-textarea";
import { MapPin, Phone, Calendar, Save, CheckCircle, Loader2, FileText } from "lucide-react";
import { Ticket, TicketPhoto } from "@/types/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChecklistRenderer } from "@/components/technician/checklist-renderer";
import { PhotoUploader } from "@/components/technician/photo-uploader";
import { PermissionRequest } from "@/components/technician/permission-request";

export default function TechnicianTicketPage() {
    const params = useParams();
    const id = params?.id as string;
    const [ticket, setTicket] = useState<Ticket | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [user, setUser] = useState<any>(null);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [authLoading, setAuthLoading] = useState(true);
    const [permissionsGranted, setPermissionsGranted] = useState(false);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((u) => {
            setUser(u);
            setAuthLoading(false);
            if (u) {
                // Check if permissions were previously granted
                const granted = localStorage.getItem('technicianPermissionsGranted');
                if (granted === 'true') {
                    setPermissionsGranted(true);
                    fetchTicket();
                }
            }
        });
        return () => unsubscribe();
    }, [id]);

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
            alert("Error: No tienes permiso para ver este ticket.");
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            alert("Error de autenticación: Verifique sus credenciales");
        }
    };

    if (authLoading) return <div className="p-4 text-center"><Loader2 className="animate-spin h-8 w-8 mx-auto" /></div>;

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle className="text-center">Acceso Técnico</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Contraseña</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                            <Button type="submit" className="w-full">
                                Iniciar Sesión
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const handleSave = async () => {
        if (!ticket) return;
        setSaving(true);
        try {
            const docRef = doc(db, "tickets", ticket.id!);
            await updateDoc(docRef, {
                checklist: ticket.checklist,
                photos: ticket.photos,
                status: ticket.status,
                diagnosis: ticket.diagnosis,
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

    const handlePhotoUpdate = async (newPhotos: TicketPhoto[]) => {
        if (!ticket) return;

        // Optimistic update
        setTicket(prev => prev ? { ...prev, photos: newPhotos } : null);

        // Auto-save specifically for photos
        try {
            const docRef = doc(db, "tickets", ticket.id!);
            await updateDoc(docRef, {
                photos: newPhotos,
                updatedAt: serverTimestamp()
            });
            // Silent success or maybe a small toast if we had one
        } catch (error) {
            console.error("Error auto-saving photos:", error);
            alert("Error al guardar la foto en la nube. Por favor intente de nuevo.");
            // Revert on error? For now, let's keep it simple.
        }
    };

    // Show permission request if user is logged in but hasn't granted permissions
    if (user && !permissionsGranted) {
        return (
            <PermissionRequest
                onPermissionsGranted={() => {
                    setPermissionsGranted(true);
                    fetchTicket();
                }}
            />
        );
    }

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
                            Ver en Mapa &rarr;
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

                {/* Technician Notes */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Notas del Técnico
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <VoiceTextarea
                            placeholder="Agrega notas sobre el servicio... Presiona el micrófono para dictar por voz."
                            value={ticket.diagnosis || ""}
                            onChange={(e) => setTicket({ ...ticket, diagnosis: e.target.value })}
                            className="min-h-[120px]"
                        />
                        <p className="text-xs text-gray-500 mt-2">
                            💡 Usa el micrófono para dictar tus notas mientras trabajas
                        </p>
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
                            onChange={handlePhotoUpdate}
                            allowGallery={ticket.allowGalleryUpload}
                        />
                        <PhotoUploader
                            label="Durante el Servicio"
                            type="DURING"
                            photos={ticket.photos || []}
                            onChange={handlePhotoUpdate}
                            allowGallery={ticket.allowGalleryUpload}
                        />
                        <PhotoUploader
                            label="Después del Servicio"
                            type="AFTER"
                            photos={ticket.photos || []}
                            onChange={handlePhotoUpdate}
                            allowGallery={ticket.allowGalleryUpload}
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
