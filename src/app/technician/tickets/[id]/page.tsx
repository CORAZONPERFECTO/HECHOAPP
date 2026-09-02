"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, updateDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VoiceTextarea } from "@/components/ui/voice-textarea";
import { VoiceInput } from "@/components/ui/voice-input";
import { MapPin, Save, CheckCircle, Loader2, FileText, ShoppingCart, PenTool, Info, ListChecks, Camera, XCircle, Sparkles, Wrench, Cpu, History, PackageCheck, Pause, Play } from "lucide-react";
import { Ticket, TicketPhoto, TicketVideo } from "@/types/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChecklistRenderer } from "@/components/technician/checklist-renderer";
import { PhotoUploader } from "@/components/technician/photo-uploader";
import { VideoUploader } from "@/components/technician/video-uploader";
import { TechnicianDocumentsCard } from "@/components/tickets/technician-documents-card";
import { PermissionRequest } from "@/components/technician/permission-request";
import { useOfflineSync } from "@/hooks/use-offline-sync";
import { OfflineIndicator } from "@/components/ui/offline-indicator";
import { ErrorSearchModal } from "@/components/resources/error-search-modal";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InterventionForm } from "@/components/hvac/intervention-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TicketPurchases } from "@/components/tickets/ticket-purchases";
import { TicketMaterialsConsumption } from "@/components/tickets/ticket-materials-consumption";
import { TicketToolsReport } from "@/components/tickets/ticket-tools-report";
import { SignaturePad } from "@/components/tickets/signature-pad";
import { TicketTimeline } from "@/components/tickets/ticket-timeline";
import { TicketDismantlingTab } from "@/components/tickets/ticket-dismantling-tab";
import { StartServiceCard } from "@/components/technician/start-service-card";
import { MaterialRequestForm } from "@/components/technician/material-request-form";
import { EquipmentHistoryModal } from "@/components/technician/equipment-history-modal";
import { FloatingActionButtons } from "@/components/technician/floating-action-buttons";
import { sendWhatsAppNotification } from "@/lib/whatsapp-service";

const getUpdatedVisitsForDraft = (ticket: any) => {
    const currentVisits = ticket.visits || [];
    let updatedVisits = [...currentVisits];
    
    if (updatedVisits.length === 0) {
        updatedVisits.push({
            id: `v1-${Date.now()}`,
            visitNumber: 1,
            technicianId: ticket.technicianId || "unknown",
            technicianName: ticket.technicianName || "Técnico",
            status: ticket.status === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'SCHEDULED',
            diagnosis: ticket.diagnosis || "",
            solution: ticket.solution || "",
            recommendations: ticket.recommendations || "",
            photos: ticket.photos || []
        });
    } else {
        const lastIndex = updatedVisits.length - 1;
        if (updatedVisits[lastIndex].status === 'IN_PROGRESS' || updatedVisits[lastIndex].status === 'SCHEDULED') {
            updatedVisits[lastIndex] = {
                ...updatedVisits[lastIndex],
                diagnosis: ticket.diagnosis || "",
                solution: ticket.solution || "",
                recommendations: ticket.recommendations || "",
                photos: ticket.photos || []
            };
        }
    }
    return updatedVisits;
};

const getUpdatedVisitsForClosure = (ticket: any, endMileageNum: number, status: 'IN_PROGRESS' | 'COMPLETED') => {
    const currentVisits = ticket.visits || [];
    let updatedVisits = [...currentVisits];
    
    if (updatedVisits.length === 0) {
        updatedVisits.push({
            id: `v1-${Date.now()}`,
            visitNumber: 1,
            technicianId: ticket.technicianId || "unknown",
            technicianName: ticket.technicianName || "Técnico",
            status: status,
            arrivedAt: ticket.arrivedAt || Timestamp.now(),
            workStartedAt: ticket.workStartedAt || Timestamp.now(),
            workEndedAt: Timestamp.now(),
            startMileage: ticket.startMileage || 0,
            endMileage: endMileageNum,
            diagnosis: ticket.diagnosis || "",
            solution: ticket.solution || "",
            recommendations: ticket.recommendations || "",
            photos: ticket.photos || []
        });
    } else {
        const lastIndex = updatedVisits.length - 1;
        if (updatedVisits[lastIndex].status === 'IN_PROGRESS' || updatedVisits[lastIndex].status === 'SCHEDULED') {
            updatedVisits[lastIndex] = {
                ...updatedVisits[lastIndex],
                status: status,
                workEndedAt: Timestamp.now(),
                endMileage: endMileageNum,
                diagnosis: ticket.diagnosis || "",
                solution: ticket.solution || "",
                recommendations: ticket.recommendations || "",
                photos: ticket.photos || []
            };
        }
    }
    return updatedVisits;
};

// FORZAR ACTUALIZACION VERCEL - VERSION 3.1 TABS, MATERIALES Y HERRAMIENTAS, CIERRE
export default function TechnicianTicketPage() {
    const params = useParams();
    const router = useRouter();
    const id = params?.id as string;
    const [ticket, setTicket] = useState<Ticket | null>(null);
    const [clientPhone, setClientPhone] = useState<string>("");
    const [endMileage, setEndMileage] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isInterventionOpen, setIsInterventionOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("info");
    const [newMaterialText, setNewMaterialText] = useState("");
    const [user, setUser] = useState<any>(null);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [authLoading, setAuthLoading] = useState(true);
    const [permissionsGranted, setPermissionsGranted] = useState(false);
    const [userRole, setUserRole] = useState<string>("");
    const [allowVideoUpload, setAllowVideoUpload] = useState<boolean>(false);
    const [technicianName, setTechnicianName] = useState<string>("");

    useEffect(() => {
        if (user) {
            getDoc(doc(db, "users", user.uid)).then((docSnap) => {
                if (docSnap.exists()) {
                    const userData = docSnap.data();
                    setUserRole(userData.rol || userData.role || "");
                    setAllowVideoUpload(!!userData.allowVideoUpload);
                    setTechnicianName(userData.nombre || userData.name || user.displayName || user.email || "Técnico");
                }
            }).catch(console.error);
        }
    }, [user]);

    // Offline sync
    const { isOnline, isSyncing, pendingOperations, saveOffline } = useOfflineSync();

    const [ticketEvents, setTicketEvents] = useState<any[]>([]);

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

    useEffect(() => {
        if (!id || !permissionsGranted) return;
        import("firebase/firestore").then(({ query, collection, where, onSnapshot }) => {
            const q = query(collection(db, "ticketEvents"), where("ticketId", "==", id));
            const unsub = onSnapshot(q, snap => {
                setTicketEvents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            });
            return () => unsub();
        });
    }, [id, permissionsGranted]);

    const fetchTicket = async () => {
        if (!id) return;
        try {
            const docRef = doc(db, "tickets", id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const ticketData = { id: docSnap.id, ...docSnap.data() } as Ticket;
                setTicket(ticketData);

                // Fetch client phone number
                if (ticketData.clientId) {
                    try {
                        const clientSnap = await getDoc(doc(db, "clients", ticketData.clientId));
                        if (clientSnap.exists()) {
                            setClientPhone(clientSnap.data().telefonoContacto || "");
                        }
                    } catch (err) {
                        console.error("Error fetching client phone:", err);
                    }
                }
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
            const updatedVisits = getUpdatedVisitsForDraft(ticket);
            const updates = {
                checklist: ticket.checklist || [],
                materialsChecklist: ticket.materialsChecklist || [],
                photos: ticket.photos || [],
                status: ticket.status,
                diagnosis: ticket.diagnosis || "",
                solution: ticket.solution || "",
                recommendations: ticket.recommendations || "",
                clientSignature: ticket.clientSignature || "",
                clientSignatureName: ticket.clientSignatureName || "",
                visits: updatedVisits,
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

    const handleVideoUpdate = async (newVideos: TicketVideo[]) => {
        if (!ticket) return;

        // Optimistic update
        setTicket(prev => prev ? { ...prev, videos: newVideos } : null);

        // Auto-save specifically for videos
        try {
            const docRef = doc(db, "tickets", ticket.id!);
            await updateDoc(docRef, {
                videos: newVideos,
                updatedAt: serverTimestamp()
            });
        } catch (error) {
            console.error("Error auto-saving videos:", error);
            alert("Error al guardar el video en la nube. Por favor intente de nuevo.");
        }
    };

    const handleAddMaterial = () => {
        if (!newMaterialText.trim()) return;
        setTicket(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                materialsChecklist: [
                    ...(prev.materialsChecklist || []),
                    { id: Date.now().toString(), text: newMaterialText.trim(), checked: false }
                ]
            };
        });
        setNewMaterialText("");
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

            {/* Admin Banner inside Technician view */}
            {user && ticket && (userRole === 'ADMIN' || user.email?.toLowerCase() === 'lcaa27@gmail.com') && (
                <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white px-4 py-2.5 text-xs flex justify-between items-center shadow-md sticky top-[49px] z-10">
                    <span className="font-semibold flex items-center gap-1.5">
                        🛡️ Vista de Técnico (Administrador)
                    </span>
                    <Button 
                        size="sm" 
                        variant="secondary" 
                        onClick={() => router.push(`/tickets/${ticket.id}`)}
                        className="h-7 text-xs px-2.5 bg-white text-blue-900 font-bold hover:bg-blue-50 border-0"
                    >
                        Gestionar Ticket →
                    </Button>
                </div>
            )}

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
                                { value: "info", label: "Info", icon: <Info className="h-4 w-4" /> },
                                { value: "checklist", label: "Checklist", icon: <ListChecks className="h-4 w-4" /> },
                                { value: "fotos", label: "Fotos", icon: <Camera className="h-4 w-4" /> },
                                { value: "reporte", label: "Reporte", icon: <FileText className="h-4 w-4" /> },
                                { value: "desmontaje", label: "Piezas", icon: <Cpu className="h-4 w-4" /> },
                                { value: "materiales", label: "Materiales", icon: <PackageCheck className="h-4 w-4" /> },
                                { value: "compras", label: "Compras", icon: <ShoppingCart className="h-4 w-4" /> },
                                { value: "herramientas", label: "Herramientas", icon: <Wrench className="h-4 w-4" /> },
                                { value: "historial", label: "Historial", icon: <History className="h-4 w-4" /> },
                                { value: "cierre", label: "Cierre", icon: <CheckCircle className="h-4 w-4" /> },
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
                        <StartServiceCard ticket={ticket} onStart={fetchTicket} />

                        {/* Controles de Pausa / Reanudación */}
                        {ticket.status === 'IN_PROGRESS' && (
                            <Card className="border-amber-200 bg-amber-50/30">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-semibold flex items-center gap-2 text-amber-800">
                                        <Pause className="h-4 w-4 text-amber-600" />
                                        Pausar o Reportar Espera
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 text-xs border-amber-300 text-amber-800 bg-white hover:bg-amber-50"
                                        onClick={async () => {
                                            try {
                                                setSaving(true);
                                                await updateDoc(doc(db, "tickets", ticket.id!), {
                                                    status: 'WAITING_PARTS',
                                                    updatedAt: serverTimestamp()
                                                });
                                                fetchTicket();
                                                alert("Estado cambiado a: Esperando Repuestos.");
                                            } catch (err) {
                                                console.error(err);
                                                alert("Error al cambiar estado.");
                                            } finally {
                                                setSaving(false);
                                            }
                                        }}
                                    >
                                        Esperando Repuestos
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 text-xs border-amber-300 text-amber-800 bg-white hover:bg-amber-50"
                                        onClick={async () => {
                                            try {
                                                setSaving(true);
                                                await updateDoc(doc(db, "tickets", ticket.id!), {
                                                    status: 'WAITING_CLIENT',
                                                    updatedAt: serverTimestamp()
                                                });
                                                fetchTicket();
                                                alert("Estado cambiado a: Esperando al Cliente.");
                                            } catch (err) {
                                                console.error(err);
                                                alert("Error al cambiar estado.");
                                            } finally {
                                                setSaving(false);
                                            }
                                        }}
                                    >
                                        Esperando al Cliente
                                    </Button>
                                </CardContent>
                            </Card>
                        )}

                        {(ticket.status === 'WAITING_PARTS' || ticket.status === 'WAITING_CLIENT') && (
                            <Card className="border-blue-200 bg-blue-50/30">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-semibold flex items-center gap-2 text-blue-800">
                                        <Play className="h-4 w-4 text-blue-600 animate-pulse" />
                                        Servicio en Espera / Pausado
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Button
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
                                        onClick={async () => {
                                            try {
                                                setSaving(true);
                                                await updateDoc(doc(db, "tickets", ticket.id!), {
                                                    status: 'IN_PROGRESS',
                                                    updatedAt: serverTimestamp()
                                                });
                                                fetchTicket();
                                                alert("Servicio reanudado.");
                                            } catch (err) {
                                                console.error(err);
                                                alert("Error al reanudar el servicio.");
                                            } finally {
                                                setSaving(false);
                                            }
                                        }}
                                    >
                                        Reanudar Trabajo
                                    </Button>
                                </CardContent>
                            </Card>
                        )}

                        {/* Cliente */}
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base">Información del Cliente</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm space-y-2">
                                <div className="font-bold text-lg">{ticket.clientName}</div>
                                <div className="flex items-center gap-2 text-gray-500">
                                    <MapPin className="h-3.5 w-3.5 text-red-500 shrink-0" />
                                    <span>{ticket.locationName}</span>
                                </div>
                                <a
                                    href={
                                        ticket.locationUrl && ticket.locationUrl.match(/https?:\/\/[^\s]+/)
                                            ? ticket.locationUrl.match(/https?:\/\/[^\s]+/)?.[0]
                                            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ticket.locationName + " " + ticket.clientName)}`
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 text-xs flex items-center gap-1 hover:underline mt-1 font-semibold"
                                >
                                    {ticket.locationUrl ? "📍 Abrir Ubicación del Cliente →" : "📍 Ver en Mapa →"}
                                </a>
                            </CardContent>
                        </Card>

                        {ticket.technicianId && (
                            <TechnicianDocumentsCard
                                technicianId={ticket.technicianId}
                                ticket={ticket}
                            />
                        )}

                        {/* Historial de Equipo (RIT) */}
                        {ticket.equipmentId && (
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base flex items-center gap-2 text-gray-700">
                                        <History className="h-4 w-4 text-gray-500" />
                                        Historial del Equipo (RIT)
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="flex justify-between items-center text-sm gap-4">
                                    <span className="text-gray-600">Ver todas las intervenciones previas a este equipo.</span>
                                    <EquipmentHistoryModal equipmentId={ticket.equipmentId} />
                                </CardContent>
                            </Card>
                        )}

                        {/* Dirección detallada — SOLO LECTURA */}
                        <Card className="border-gray-200 bg-gray-50">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2 text-gray-700">
                                    <MapPin className="h-4 w-4 text-gray-500" />
                                    Dirección de Servicio
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {ticket.locationArea || ticket.locationStreet || ticket.locationHouseNumber ? (
                                    <div className="bg-white border border-gray-200 rounded-lg px-3 py-3 text-sm text-gray-800">
                                        <p className="font-semibold text-gray-500 text-xs mb-1 uppercase">Detalle de Ubicación</p>
                                        <p>{[ticket.locationArea, ticket.locationStreet, ticket.locationHouseNumber ? `No. ${ticket.locationHouseNumber}` : null].filter(Boolean).join(' · ')}</p>
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500 italic">No hay detalles adicionales de dirección registrados.</p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Descripción del Servicio */}
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2 text-gray-700">
                                    <FileText className="h-4 w-4 text-gray-500" />
                                    Descripción del Servicio
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-gray-800 whitespace-pre-wrap">
                                    {ticket.description || "No hay descripción detallada para este ticket."}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Checklist de Materiales y Herramientas */}
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2 text-gray-700">
                                    <PenTool className="h-4 w-4 text-gray-500" />
                                    Preparación de Materiales y Herramientas
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-xs text-gray-500">
                                    Verifica los insumos que necesitas antes de desplazarte.
                                </p>
                                <ChecklistRenderer
                                    items={ticket.materialsChecklist || []}
                                    onItemChange={async (id, checked) => {
                                        const newMaterials = (ticket.materialsChecklist || []).map(item => item.id === id ? { ...item, checked } : item);
                                        setTicket(prev => prev ? { ...prev, materialsChecklist: newMaterials } : null);
                                        try {
                                            await updateDoc(doc(db, "tickets", ticket.id!), { materialsChecklist: newMaterials });
                                        } catch (err) { console.error("Error saving checklist:", err); }
                                    }}
                                />
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Ej: Taladro, Cables, Tornillos..."
                                        value={newMaterialText}
                                        onChange={e => setNewMaterialText(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddMaterial(); } }}
                                        className="flex-1 text-sm"
                                    />
                                    <Button type="button" onClick={handleAddMaterial} variant="secondary" size="sm">
                                        Añadir
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Checklist Tab */}
                    <TabsContent value="checklist" className="space-y-4">
                        {/* Mis Tareas Pendientes Section */}
                        <Card className="border-blue-200 bg-blue-50/10 shadow-sm">
                            <CardHeader className="pb-2 bg-blue-50/30">
                                <CardTitle className="text-base text-blue-900 flex items-center gap-2">
                                    <ListChecks className="h-5 w-5 text-blue-600" />
                                    Mis Tareas Asignadas Pendientes
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4">
                                {(() => {
                                    const myPending = (ticket.checklist || []).filter(
                                        item => item.assignedToId === user?.uid && !item.checked
                                    );
                                    if (myPending.length === 0) {
                                        return (
                                            <div className="text-center py-4 text-emerald-600 font-medium text-sm flex items-center justify-center gap-2">
                                                <CheckCircle className="h-5 w-5 text-emerald-500" />
                                                ¡Excelente! No tienes tareas asignadas pendientes.
                                            </div>
                                        );
                                    }
                                    return (
                                        <div className="space-y-3">
                                            {myPending.map((item) => (
                                                <div key={item.id} className="flex items-start space-x-3 p-3 rounded-lg border border-blue-200 bg-white hover:bg-blue-50/30 transition-colors">
                                                    <input
                                                        type="checkbox"
                                                        id={`my-${item.id}`}
                                                        checked={item.checked}
                                                        onChange={async (e) => {
                                                            const newChecklist = ticket.checklist.map(chk =>
                                                                chk.id === item.id ? { ...chk, checked: e.target.checked } : chk
                                                            );
                                                            setTicket(prev => prev ? { ...prev, checklist: newChecklist } : null);
                                                            try {
                                                                await updateDoc(doc(db, "tickets", ticket.id!), { checklist: newChecklist });
                                                            } catch (err) {
                                                                console.error("Error saving checklist:", err);
                                                            }
                                                        }}
                                                        className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <div className="grid gap-1.5 leading-none flex-1 min-w-0">
                                                        <label
                                                            htmlFor={`my-${item.id}`}
                                                            className="text-sm font-semibold text-blue-950 leading-relaxed cursor-pointer break-words"
                                                        >
                                                            {item.text}
                                                        </label>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })()}
                            </CardContent>
                        </Card>

                        {/* Todas las Tareas Section */}
                        <Card className="border-slate-200 shadow-sm">
                            <CardHeader className="pb-2 bg-slate-50/50">
                                <CardTitle className="text-base text-slate-800">Checklist General de Servicio</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4">
                                {(!ticket.checklist || ticket.checklist.length === 0) ? (
                                    <p className="text-sm text-gray-500 italic text-center py-4">No hay tareas en el checklist de este ticket.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {ticket.checklist.map((item) => (
                                            <div key={item.id} className="flex items-start justify-between p-3 rounded-lg border bg-white hover:bg-slate-50 transition-colors gap-3">
                                                <div className="flex items-start space-x-3 flex-1 min-w-0">
                                                    <input
                                                        type="checkbox"
                                                        id={`gen-${item.id}`}
                                                        checked={item.checked}
                                                        onChange={async (e) => {
                                                            const newChecklist = ticket.checklist.map(chk =>
                                                                chk.id === item.id ? { ...chk, checked: e.target.checked } : chk
                                                            );
                                                            setTicket(prev => prev ? { ...prev, checklist: newChecklist } : null);
                                                            try {
                                                                await updateDoc(doc(db, "tickets", ticket.id!), { checklist: newChecklist });
                                                            } catch (err) {
                                                                console.error("Error saving checklist:", err);
                                                            }
                                                        }}
                                                        className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <div className="grid gap-1 leading-none flex-1 min-w-0">
                                                        <label
                                                            htmlFor={`gen-${item.id}`}
                                                            className={`text-sm font-medium leading-relaxed cursor-pointer break-words ${item.checked ? 'line-through text-gray-400' : 'text-gray-800'}`}
                                                        >
                                                            {item.text}
                                                        </label>
                                                    </div>
                                                </div>
                                                
                                                <div className="shrink-0 flex items-center">
                                                    {item.assignedToId === user?.uid ? (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                                                            Para mí
                                                        </span>
                                                    ) : item.assignedToId ? (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 max-w-[120px] truncate" title={item.assignedToName}>
                                                            👤 {item.assignedToName}
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-50 text-gray-400 border">
                                                            General
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Checklist de Materiales y Herramientas (Existing) */}
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base text-blue-700">Preparación de Materiales y Herramientas</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {(!ticket.materialsChecklist || ticket.materialsChecklist.length === 0) ? (
                                    <p className="text-sm text-gray-500 italic">No se agregaron materiales para este servicio.</p>
                                ) : (
                                    <ChecklistRenderer
                                        items={ticket.materialsChecklist}
                                        onItemChange={async (id, checked) => {
                                            const newMaterials = (ticket.materialsChecklist || []).map(item => item.id === id ? { ...item, checked } : item);
                                            setTicket(prev => prev ? { ...prev, materialsChecklist: newMaterials } : null);
                                            try {
                                                await updateDoc(doc(db, "tickets", ticket.id!), { materialsChecklist: newMaterials });
                                            } catch (err) { console.error("Error saving materials:", err); }
                                        }}
                                        readOnly={false}
                                    />
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Fotos Tab */}
                    <TabsContent value="fotos" className="space-y-4">
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

                        {allowVideoUpload && (
                            <VideoUploader
                                videos={ticket.videos || []}
                                onChange={handleVideoUpdate}
                                ticketId={ticket.id}
                                technicianName={technicianName}
                            />
                        )}
                    </TabsContent>

                    {/* Materiales Tab */}
                    <TabsContent value="materiales" className="space-y-4">
                        <div className="bg-white rounded-lg shadow border p-4">
                            <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
                                <PackageCheck className="h-5 w-5 text-blue-600" />
                                Materiales Utilizados
                            </h3>
                            <TicketMaterialsConsumption
                                ticketId={ticket.id!}
                                ticketNumber={ticket.ticketNumber}
                                currentUserRole="TECNICO"
                            />
                        </div>

                        {/* Solicitar Material Adicional */}
                        <MaterialRequestForm
                            ticketId={ticket.id!}
                            ticketNumber={ticket.ticketNumber}
                            userId={user.uid}
                            userName={user.displayName || user.email || "Técnico"}
                        />
                    </TabsContent>

                    {/* Compras Tab */}
                    <TabsContent value="compras">
                        <div className="bg-white rounded-lg shadow border p-4">
                            <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
                                <ShoppingCart className="h-5 w-5 text-purple-600" />
                                Compras Registradas
                            </h3>
                            <TicketPurchases 
                                ticketId={ticket.id!} 
                                ticketNumber={ticket.ticketNumber}
                                currentUserRole="TECNICO"
                                userId={user?.uid}
                            />
                        </div>
                    </TabsContent>

                    {/* Reporte Tab */}
                    <TabsContent value="reporte" className="space-y-4">
                        <div className="flex justify-end mb-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-2 border-purple-200 text-purple-700 hover:bg-purple-50"
                                onClick={async () => {
                                    if (!ticket.diagnosis && !ticket.solution) {
                                        alert("Escribe algo de diagnóstico o solución primero para que la IA pueda mejorarlo.");
                                        return;
                                    }
                                    setSaving(true);
                                    try {
                                        const contextData = {
                                            diagnosis: ticket.diagnosis || "Sin diagnóstico",
                                            solution: ticket.solution || "Sin solución",
                                            task: "Mejora la ortografía, gramática y haz que suene como un reporte técnico profesional de mantenimiento. Separa claramente el Diagnóstico y la Solución en dos bloques de texto. No uses markdown de asteriscos."
                                        };
                                        const response = await fetch('/api/gemini', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                context: JSON.stringify(contextData),
                                                task: 'generate-report'
                                            })
                                        });
                                        const data = await response.json();
                                        if (data.output && data.output.sections) {
                                            const textBlocks = data.output.sections.filter((s: any) => s.type === 'text' || s.type === 'h2').map((s: any) => s.content).join('\n\n');
                                            setTicket(prev => prev ? { ...prev, solution: textBlocks } : null);
                                            alert("¡Reporte mejorado por IA con éxito!");
                                        }
                                    } catch (err) {
                                        console.error(err);
                                        alert("Error al conectar con la IA.");
                                    } finally {
                                        setSaving(false);
                                    }
                                }}
                            >
                                <Sparkles className="h-4 w-4" />
                                Mejorar texto con IA
                            </Button>
                        </div>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <FileText className="h-4 w-4" />
                                        Diagnóstico
                                    </div>
                                    <ErrorSearchModal
                                        onSelectSolution={(sol: string) => {
                                            setTicket(prev => {
                                                if (!prev) return prev;
                                                const current = prev.diagnosis || "";
                                                return { ...prev, diagnosis: current + (current ? "\n\n" : "") + "Solución sugerida: " + sol };
                                            });
                                        }}
                                    />
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <VoiceTextarea
                                    placeholder="Dicta o escribe el diagnóstico..."
                                    value={ticket.diagnosis || ""}
                                    onValueChange={(val) => setTicket(prev => prev ? { ...prev, diagnosis: val } : null)}
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
                                    onValueChange={(val) => setTicket(prev => prev ? { ...prev, solution: val } : null)}
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
                                    onValueChange={(val) => setTicket(prev => prev ? { ...prev, recommendations: val } : null)}
                                    className="min-h-[100px]"
                                />
                            </CardContent>
                        </Card>
                        <div className="flex justify-center mt-4">
                            <Button onClick={handleSave} disabled={saving} className="w-full max-w-sm bg-slate-800 hover:bg-slate-900 text-white shadow-md">
                                {saving ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                Guardar Borrador de Textos
                            </Button>
                        </div>
                    </TabsContent>

                    {/* Herramientas Tab */}
                    <TabsContent value="herramientas" className="space-y-4">
                        <TicketToolsReport
                            ticket={ticket}
                            currentUser={{ id: user.uid, name: user.displayName || user.email || "Técnico" }}
                            events={ticketEvents}
                        />
                    </TabsContent>

                    {/* Desmontaje Tab */}
                    <TabsContent value="desmontaje" className="space-y-4">
                        <TicketDismantlingTab
                            ticket={ticket}
                            setTicket={setTicket}
                            onSave={handleSave}
                            currentUserId={user.uid}
                            currentUserName={user.displayName || user.email || "Técnico"}
                        />
                    </TabsContent>

                    {/* Historial Tab */}
                    <TabsContent value="historial" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Historial del Ticket</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <TicketTimeline 
                                    events={ticketEvents}
                                    ticketId={ticket.id}
                                    currentUserId={user.uid}
                                    currentUserName={user.displayName || user.email || "Técnico"}
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Cierre Tab */}
                    <TabsContent value="cierre" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Datos de Cierre y Conformidad</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                                    <Label className="font-semibold text-blue-950">Kilometraje Final del Vehículo *</Label>
                                    <Input
                                        type="number"
                                        placeholder={ticket.startMileage ? `Debe ser >= ${ticket.startMileage}` : "Ej. 145300"}
                                        value={endMileage}
                                        onChange={(e) => setEndMileage(e.target.value)}
                                        className="bg-white text-base h-11"
                                    />
                                    {ticket.startMileage && (
                                        <p className="text-xs text-blue-800 font-medium">Kilometraje inicial registrado: {ticket.startMileage} km</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-semibold">Nombre legible de quien recibe *</Label>
                                    <VoiceInput
                                        placeholder="Ej. Juan Pérez"
                                        value={ticket.clientSignatureName || ""}
                                        onChange={(e) => setTicket(prev => prev ? { ...prev, clientSignatureName: e.target.value } : null)}
                                        className="h-12 text-lg font-medium"
                                    />
                                    <p className="text-xs text-gray-500">Dicta o escribe el nombre de la persona que aprueba el trabajo.</p>
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-semibold">Firma de Conformidad</Label>
                                    <SignaturePad
                                        value={ticket.clientSignature || ""}
                                        onChange={(val) => setTicket(prev => prev ? { ...prev, clientSignature: val } : null)}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <Button
                            className="w-full h-12 text-lg bg-green-600 hover:bg-green-700"
                            onClick={async () => {
                                if (!ticket.clientSignatureName || ticket.clientSignatureName.trim() === "") {
                                    alert("⚠️ El Nombre Legible de quien recibe es obligatorio para poder cerrar el servicio.");
                                    return;
                                }
                                if (!endMileage) {
                                    alert("⚠️ El Kilometraje Final es obligatorio para poder cerrar el servicio.");
                                    return;
                                }
                                const endMileageNum = parseInt(endMileage);
                                if (isNaN(endMileageNum) || endMileageNum <= 0) {
                                    alert("⚠️ Por favor, ingresa un kilometraje final numérico válido.");
                                    return;
                                }
                                if (ticket.startMileage && endMileageNum < ticket.startMileage) {
                                    alert(`⚠️ El kilometraje final (${endMileageNum} km) no puede ser menor al kilometraje inicial (${ticket.startMileage} km).`);
                                    return;
                                }

                                if (!ticket.equipmentId) {
                                    // Direct closure without intervention form
                                    try {
                                        setSaving(true);
                                        // Complete Ticket
                                        const updatedVisits = getUpdatedVisitsForClosure(ticket, endMileageNum, 'COMPLETED');
                                        await updateDoc(doc(db, "tickets", ticket.id!), {
                                            status: 'COMPLETED',
                                            closedAt: serverTimestamp(),
                                            endMileage: endMileageNum,
                                            interventionId: "NOT_APPLICABLE",
                                            visits: updatedVisits
                                        });

                                        // Update user vehicle profile mileage
                                        await updateDoc(doc(db, "users", user.uid), {
                                            "vehicle.currentMileage": endMileageNum,
                                            "vehicle.lastMileageUpdateDate": new Date().toISOString().split("T")[0]
                                        }).catch(err => console.error("Error updating user current mileage:", err));

                                        // Log to history logs collection
                                        import("firebase/firestore").then(({ addDoc, collection, serverTimestamp }) => {
                                            addDoc(collection(db, "vehicleMileageLogs"), {
                                                userId: user.uid,
                                                userName: user.displayName || user.email || "Técnico",
                                                vehiclePlate: "S/R",
                                                vehicleBrand: "S/R",
                                                vehicleModel: "S/R",
                                                mileage: endMileageNum,
                                                type: 'TICKET_END',
                                                ticketId: ticket.id,
                                                ticketNumber: ticket.ticketNumber || ticket.id?.substring(0, 8),
                                                createdAt: serverTimestamp(),
                                                date: new Date().toISOString().split("T")[0]
                                            }).catch(err => console.error("Error logging mileage to history:", err));
                                        });

                                        fetchTicket();
                                        alert("Servicio finalizado.");
                                    } catch (err) {
                                        console.error("Error finalizing:", err);
                                        alert("Error al finalizar el servicio.");
                                    } finally {
                                        setSaving(false);
                                    }
                                    return;
                                }
                                setIsInterventionOpen(true);
                            }}
                            disabled={saving || ticket.status === 'COMPLETED'}
                        >
                            <CheckCircle className="mr-2 h-5 w-5" />
                            {ticket.equipmentId ? "Finalizar y Crear RIT" : "Finalizar Servicio"}
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

                                // Create checklist alert
                                const pendingChecklist = (ticket.checklist || []).filter(item => !item.checked);

                                if (pendingChecklist.length > 0) {
                                    import("firebase/firestore").then(({ addDoc, collection }) => {
                                        addDoc(collection(db, "ticketEvents"), {
                                            ticketId: ticket.id,
                                            userId: "system",
                                            userName: "Sistema Automático",
                                            type: "COMMENT",
                                            description: `⚠️ ALERTA: El técnico finalizó el servicio pero dejó pasos sin verificar:\n\nPasos pendientes: ${pendingChecklist.map(i => i.text).join(", ")}`,
                                            timestamp: serverTimestamp()
                                        }).catch(console.error);
                                    });
                                }

                                const endMileageNum = parseInt(endMileage);

                                // Complete Ticket
                                const updatedVisits = getUpdatedVisitsForClosure(ticket, endMileageNum, 'COMPLETED');
                                await updateDoc(doc(db, "tickets", ticket.id!), {
                                    status: 'COMPLETED',
                                    closedAt: serverTimestamp(),
                                    endMileage: endMileageNum,
                                    interventionId: "PENDING_LINK",
                                    visits: updatedVisits
                                });

                                // Update user vehicle profile mileage
                                await updateDoc(doc(db, "users", user.uid), {
                                    "vehicle.currentMileage": endMileageNum,
                                    "vehicle.lastMileageUpdateDate": new Date().toISOString().split("T")[0]
                                }).catch(err => console.error("Error updating user current mileage:", err));

                                // Log to history logs collection
                                import("firebase/firestore").then(({ addDoc, collection, serverTimestamp }) => {
                                    addDoc(collection(db, "vehicleMileageLogs"), {
                                        userId: user.uid,
                                        userName: user.displayName || user.email || "Técnico",
                                        vehiclePlate: "S/R",
                                        vehicleBrand: "S/R",
                                        vehicleModel: "S/R",
                                        mileage: endMileageNum,
                                        type: 'TICKET_END',
                                        ticketId: ticket.id,
                                        ticketNumber: ticket.ticketNumber || ticket.id?.substring(0, 8),
                                        createdAt: serverTimestamp(),
                                        date: new Date().toISOString().split("T")[0]
                                    }).catch(err => console.error("Error logging mileage to history:", err));
                                });

                                fetchTicket();
                                alert("Servicio finalizado y guardado en RIT.");
                            }}
                            onCancel={() => setIsInterventionOpen(false)}
                        />
                    )}
                </DialogContent>
            </Dialog>

            <FloatingActionButtons ticket={ticket} clientPhone={clientPhone} />

            <style>{`
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
}
