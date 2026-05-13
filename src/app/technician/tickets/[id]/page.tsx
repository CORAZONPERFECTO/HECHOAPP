"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VoiceTextarea } from "@/components/ui/voice-textarea";
import { MapPin, Save, CheckCircle, Loader2, FileText, ShoppingCart, PenTool, Info, ListChecks, Camera, XCircle } from "lucide-react";
import { Ticket, TicketPhoto } from "@/types/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChecklistRenderer } from "@/components/technician/checklist-renderer";
import { PhotoUploader } from "@/components/technician/photo-uploader";
import { PermissionRequest } from "@/components/technician/permission-request";
import { useOfflineSync } from "@/hooks/use-offline-sync";
import { OfflineIndicator } from "@/components/ui/offline-indicator";
import { ErrorSearchModal } from "@/components/resources/error-search-modal";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InterventionForm } from "@/components/hvac/intervention-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TicketPurchases } from "@/components/tickets/ticket-purchases";
import { SignaturePad } from "@/components/tickets/signature-pad";

// FORZAR ACTUALIZACION VERCEL - VERSION 2.0 TABS
export default function TechnicianTicketPage() {
    const params = useParams();
    const id = params?.id as string;
    const [ticket, setTicket] = useState<Ticket | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isInterventionOpen, setIsInterventionOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("info");

    const [user, setUser] = useState<any>(null);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [authLoading, setAuthLoading] = useState(true);
    const [permissionsGranted, setPermissionsGranted] = useState(false);

    // Offline sync
    const { isOnline, isSyncing, pendingOperations, saveOffline } = useOfflineSync();

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
            const updates = {
                checklist: ticket.checklist || [],
                photos: ticket.photos || [],
                status: ticket.status,
                diagnosis: ticket.diagnosis || "",
                solution: ticket.solution || "",
                recommendations: ticket.recommendations || "",
                clientSignature: ticket.clientSignature || "",
                updatedAt: serverTimestamp()
            };

            if (isOnline) {
                // Online: save directly to Firestore
                const docRef = doc(db, "tickets", ticket.id!);
                await updateDoc(docRef, updates);
                alert("Cambios guardados correctamente");
            } else {
                // Offline: save to IndexedDB and queue for sync
                await saveOffline(ticket.id!, updates as any);
                alert("Guardado offline. Se sincronizará al reconectar.");
            }
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
        } catch (error) {
            console.error("Error auto-saving photos:", error);
            alert("Error al guardar la foto en la nube. Por favor intente de nuevo.");
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
        <div className="min-h-screen bg-gray-50 pb-24">
            {/* Offline Indicator */}
            <OfflineIndicator pendingOperations={pendingOperations} isSyncing={isSyncing} />

            {/* Header Mobile-First */}
            <div className="bg-white border-b sticky top-0 z-10 px-4 py-3 flex justify-between items-center shadow-sm">
                <div>
                    <h1 className="font-bold text-lg text-gray-900">Ticket #{ticket.ticketNumber || ticket.id?.slice(0, 6)}</h1>
                    <Badge variant={ticket.status === 'COMPLETED' ? 'default' : 'secondary'}>
                        {ticket.status}
                    </Badge>
                </div>
                <Button size="sm" onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                    {saving ? <Loader2 className="animate-spin h-4 w-4" /> : <Save className="h-4 w-4 mr-2" />}
                    {saving ? "" : "Guardar"}
                </Button>
            </div>

            <main className="max-w-lg mx-auto p-4">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    {/* Nav de tabs: scroll nativo en div externo, Radix no bloquea overflow */}
                    <div className="overflow-x-auto hide-scrollbar -mx-4 px-4 mb-4">
                        <TabsList className="inline-flex min-w-max bg-white border p-1 rounded-xl gap-0.5 shadow-sm">
                            {([
                                { value: "info",      label: "Info",      icon: <Info className="h-4 w-4" /> },
                                { value: "checklist", label: "Checklist", icon: <ListChecks className="h-4 w-4" /> },
                                { value: "fotos",     label: "Fotos",     icon: <Camera className="h-4 w-4" /> },
                                { value: "compras",   label: "Compras",   icon: <ShoppingCart className="h-4 w-4" /> },
                                { value: "reporte",   label: "Reporte",   icon: <FileText className="h-4 w-4" /> },
                                { value: "cierre",    label: "Cierre",    icon: <CheckCircle className="h-4 w-4" /> },
                            ] as const).map(tab => (
                                <TabsTrigger
                                    key={tab.value}
                                    value={tab.value}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm whitespace-nowrap rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                                >
                                    {tab.icon}
                                    {tab.label}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </div>

                    {/* Info Tab */}
                    <TabsContent value="info" className="space-y-4">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base">Información del Cliente</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm space-y-2">
                                <div className="font-medium text-lg">{ticket.clientName}</div>

                                {/* Dirección completa */}
                                <div className="flex items-start gap-2 text-gray-600">
                                    <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-red-500" />
                                    <div className="flex flex-col">
                                        <span className="font-medium">{ticket.locationName}</span>
                                    </div>
                                </div>

                                {/* Calle y Número de Villa/Casa destacados */}
                                {(ticket.locationStreet || ticket.locationHouseNumber) && (
                                    <div className="ml-6 mt-1 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 flex flex-col gap-0.5">
                                        {ticket.locationStreet && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Calle:</span>
                                                <span className="text-sm font-medium text-blue-900">{ticket.locationStreet}</span>
                                            </div>
                                        )}
                                        {ticket.locationHouseNumber && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">No. Villa / Casa:</span>
                                                <span className="text-sm font-bold text-blue-900">{ticket.locationHouseNumber}</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Google Maps Link */}
                                <a
                                    href={
                                        ticket.locationUrl && ticket.locationUrl.startsWith('http')
                                            ? ticket.locationUrl
                                            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ticket.locationName + " " + ticket.clientName)}`
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 text-xs flex items-center gap-1 ml-6 hover:underline"
                                >
                                    {ticket.locationUrl ? "📍 Abrir Ubicación del Cliente →" : "Ver en Mapa →"}
                                </a>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Checklist Tab */}
                    <TabsContent value="checklist">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base">Checklist de Servicio</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ChecklistRenderer
                                    items={ticket.checklist || []}
                                    onItemChange={(id, checked) => {
                                        setTicket(prev => {
                                            if (!prev) return prev;
                                            return {
                                                ...prev,
                                                checklist: prev.checklist.map(item => item.id === id ? { ...item, checked } : item)
                                            };
                                        });
                                    }}
                                    readOnly={false}
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Fotos Tab */}
                    <TabsContent value="fotos">
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
                                    allowGallery={false}
                                />
                                <PhotoUploader
                                    label="Durante el Servicio"
                                    type="DURING"
                                    photos={ticket.photos || []}
                                    onChange={handlePhotoUpdate}
                                    allowGallery={false}
                                />
                                <PhotoUploader
                                    label="Después del Servicio"
                                    type="AFTER"
                                    photos={ticket.photos || []}
                                    onChange={handlePhotoUpdate}
                                    allowGallery={false}
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Compras Tab */}
                    <TabsContent value="compras">
                        <div className="bg-white rounded-lg shadow border p-4">
                            <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
                                <ShoppingCart className="h-5 w-5 text-purple-600" />
                                Compras Registradas
                            </h3>
                            <TicketPurchases ticketId={ticket.id!} />
                        </div>
                    </TabsContent>

                    {/* Reporte Tab */}
                    <TabsContent value="reporte" className="space-y-4">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <FileText className="h-4 w-4" />
                                        Diagnóstico
                                    </div>
                                    <ErrorSearchModal
                                        onSelectSolution={(sol: string) => {
                                            const current = ticket?.diagnosis || "";
                                            setTicket({ ...ticket!, diagnosis: current + (current ? "\n\n" : "") + "Solución sugerida: " + sol });
                                        }}
                                    />
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <VoiceTextarea
                                    placeholder="Dicta o escribe el diagnóstico..."
                                    value={ticket.diagnosis || ""}
                                    onChange={(e) => setTicket({ ...ticket, diagnosis: e.target.value })}
                                    className="min-h-[100px]"
                                />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <PenTool className="h-4 w-4" />
                                    Solución / Trabajos Realizados
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <VoiceTextarea
                                    placeholder="Dicta o escribe la solución ampliada..."
                                    value={ticket.solution || ""}
                                    onChange={(e) => setTicket({ ...ticket, solution: e.target.value })}
                                    className="min-h-[100px]"
                                />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <CheckCircle className="h-4 w-4" />
                                    Recomendaciones
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <VoiceTextarea
                                    placeholder="Dicta o escribe las recomendaciones para el cliente..."
                                    value={ticket.recommendations || ""}
                                    onChange={(e) => setTicket({ ...ticket, recommendations: e.target.value })}
                                    className="min-h-[100px]"
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Cierre Tab */}
                    <TabsContent value="cierre" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Firma de Conformidad</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <SignaturePad
                                    value={ticket.clientSignature || ""}
                                    onChange={(val) => setTicket({ ...ticket, clientSignature: val })}
                                />
                            </CardContent>
                        </Card>

                        <Button
                            className="w-full h-12 text-lg bg-green-600 hover:bg-green-700"
                            onClick={() => {
                                if (!ticket.equipmentId) {
                                    alert("Este ticket no tiene un equipo asignado. Por favor registre el equipo primero o contacte soporte.");
                                    return;
                                }
                                setIsInterventionOpen(true);
                            }}
                            disabled={saving || ticket.status === 'COMPLETED'}
                        >
                            <CheckCircle className="mr-2 h-5 w-5" />
                            Finalizar y Crear RIT
                        </Button>
                    </TabsContent>
                </Tabs>
            </main>

            <Dialog open={isInterventionOpen} onOpenChange={setIsInterventionOpen}>
                <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Registrar Intervención (RIT)</DialogTitle>
                    </DialogHeader>
                    {user && ticket && ticket.equipmentId && (
                        <InterventionForm
                            assetId={ticket.equipmentId}
                            clientId={ticket.clientId || ""}
                            locationId={ticket.id}
                            technicianId={user.uid}
                            technicianName={user.displayName || user.email || "Técnico"}
                            onSuccess={async () => {
                                setIsInterventionOpen(false);
                                // Complete Ticket
                                await updateDoc(doc(db, "tickets", ticket.id!), {
                                    status: 'COMPLETED',
                                    closedAt: serverTimestamp(),
                                    interventionId: "PENDING_LINK"
                                });
                                fetchTicket();
                                alert("Servicio finalizado y guardado en RIT.");
                            }}
                            onCancel={() => setIsInterventionOpen(false)}
                        />
                    )}
                </DialogContent>
            </Dialog>

            <style>{`
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
}
