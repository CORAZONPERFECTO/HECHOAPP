"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, onSnapshot, updateDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { validateAndRegisterCrewDevice, setTicketStandby, closeCrewToken } from "@/lib/crew-link-service";
import { generateAndSaveTicketReport } from "@/lib/report-generator";
import { Ticket, TicketPhoto, TicketCrewToken } from "@/types/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
    Users, 
    Lock, 
    AlertTriangle, 
    CheckCircle2, 
    Loader2, 
    Pause, 
    Play, 
    Camera, 
    Wrench, 
    MapPin, 
    FileText, 
    Share2, 
    FileDown, 
    Navigation, 
    Sparkles,
    CheckCircle,
    UserCheck,
    Truck
} from "lucide-react";
import { EquipmentServiceChecklist } from "@/components/technician/equipment-service-checklist";
import { PhotoUploader } from "@/components/technician/photo-uploader";
import { QuickVehicleConsumption } from "@/components/tickets/quick-vehicle-consumption";
import { SignaturePad } from "@/components/tickets/signature-pad";
import { VoiceInput } from "@/components/ui/voice-input";
import { VoiceTextarea } from "@/components/ui/voice-textarea";

export default function CrewDispatchPage() {
    const params = useParams();
    const router = useRouter();
    const token = params.token as string;

    const [loading, setLoading] = useState(true);
    const [authorizing, setAuthorizing] = useState(true);
    const [authResult, setAuthResult] = useState<{
        authorized: boolean;
        isClosed?: boolean;
        isLimitReached?: boolean;
        reason?: string;
    } | null>(null);

    const [ticket, setTicket] = useState<Ticket | null>(null);
    const [tokenData, setTokenData] = useState<TicketCrewToken | null>(null);
    const [activeTab, setActiveTab] = useState("equipos");
    const [workerName, setWorkerName] = useState<string>("");
    const [isEditingWorker, setIsEditingWorker] = useState(false);

    // Cierre state
    const [endMileage, setEndMileage] = useState<string>("");
    const [closingService, setClosingService] = useState(false);
    const [successDialogOpen, setSuccessDialogOpen] = useState(false);

    // 1. Obtener o generar identificador único para este celular
    const getDeviceId = () => {
        if (typeof window === 'undefined') return "ssr-device";
        let devId = localStorage.getItem("hecho_crew_device_id");
        if (!devId) {
            devId = `dev-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)}`;
            localStorage.setItem("hecho_crew_device_id", devId);
        }
        return devId;
    };

    // 2. Validar token y registrar dispositivo al montar
    useEffect(() => {
        if (!token) return;

        const initAuth = async () => {
            setAuthorizing(true);
            const devId = getDeviceId();
            const res = await validateAndRegisterCrewDevice(token, devId);

            setAuthResult({
                authorized: res.authorized,
                isClosed: res.isClosed,
                isLimitReached: res.isLimitReached,
                reason: res.reason
            });

            if (res.tokenData) setTokenData(res.tokenData);
            if (res.ticket) setTicket(res.ticket);

            // Cargar nombre del técnico/ayudante guardado localmente
            if (typeof window !== 'undefined' && res.ticket?.id) {
                const savedWorker = localStorage.getItem(`hecho_crew_worker_${res.ticket.id}`);
                if (savedWorker) {
                    setWorkerName(savedWorker);
                } else {
                    setWorkerName(res.isExistingDevice ? "Técnico" : "Técnico / Ayudante");
                }
            }

            setAuthorizing(false);
            setLoading(false);
        };

        initAuth();
    }, [token]);

    // 3. Listener en tiempo real del ticket si está autorizado
    useEffect(() => {
        if (!authResult?.authorized || !ticket?.id) return;

        const unsubscribe = onSnapshot(doc(db, "tickets", ticket.id), (docSnap) => {
            if (docSnap.exists()) {
                const liveData = { id: docSnap.id, ...docSnap.data() } as Ticket;
                setTicket(liveData);

                // Si otro compañero finalizó el servicio en su celular, actualizar estado
                if (liveData.status === 'COMPLETED' || liveData.status === 'CANCELLED') {
                    setAuthResult(prev => ({
                        authorized: false,
                        isClosed: true,
                        reason: "Este servicio acaba de ser finalizado y cerrado. No se permiten modificaciones adicionales."
                    }));
                }
            }
        });

        return () => unsubscribe();
    }, [authResult?.authorized, ticket?.id]);

    const handleSaveWorkerName = (name: string) => {
        setWorkerName(name);
        setIsEditingWorker(false);
        if (ticket?.id) {
            localStorage.setItem(`hecho_crew_worker_${ticket.id}`, name);
        }
    };

    const handleToggleStandby = async () => {
        if (!ticket?.id) return;
        const currentStandby = !!ticket.isStandby;
        let reason = "";

        if (!currentStandby) {
            const promptReason = prompt("¿Cuál es el motivo de la pausa? (Ej. Almuerzo, Buscando piezas, Continuación mañana):", "Pausa operativa");
            if (promptReason === null) return;
            reason = promptReason || "Pausa operativa";
        }

        try {
            await setTicketStandby(ticket.id, !currentStandby, reason, "crew", workerName || "Cuadrilla");
        } catch (err: any) {
            alert("Error al cambiar estado de standby: " + err.message);
        }
    };

    const handlePhotoUpdate = async (updatedPhotos: TicketPhoto[]) => {
        if (!ticket?.id) return;
        try {
            // Asignar autor a las fotos nuevas
            const stampedPhotos = updatedPhotos.map(p => ({
                ...p,
                description: p.description?.includes("[Por:") ? p.description : `${p.description || 'Evidencia'} [Por: ${workerName || 'Cuadrilla'}]`
            }));

            await updateDoc(doc(db, "tickets", ticket.id), {
                photos: stampedPhotos,
                updatedAt: serverTimestamp()
            });
        } catch (err) {
            console.error("Error updating photos:", err);
        }
    };

    const handleFinalizeService = async () => {
        if (!ticket?.id) return;

        if (!ticket.clientSignatureName || ticket.clientSignatureName.trim() === "") {
            alert("⚠️ El Nombre Legible de quien recibe es obligatorio para poder cerrar el servicio.");
            return;
        }

        if (!endMileage) {
            alert("⚠️ El Kilometraje Final es obligatorio para poder cerrar el servicio.");
            return;
        }

        const endNum = parseInt(endMileage);
        if (isNaN(endNum) || endNum <= 0) {
            alert("⚠️ Por favor ingresa un kilometraje numérico válido.");
            return;
        }

        setClosingService(true);
        try {
            // 1. Marcar ticket como COMPLETED
            const updatedTicketData = {
                ...ticket,
                status: 'COMPLETED' as const,
                closedAt: serverTimestamp(),
                endMileage: endNum,
                isStandby: false,
                closedByName: workerName || "Cuadrilla en Sitio"
            };

            await updateDoc(doc(db, "tickets", ticket.id), {
                status: 'COMPLETED',
                closedAt: serverTimestamp(),
                endMileage: endNum,
                isStandby: false,
                closedByName: workerName || "Cuadrilla en Sitio"
            });

            // 2. Generar informe técnico automático en PDF
            try {
                await generateAndSaveTicketReport(ticket.id, {
                    ...ticket,
                    status: 'COMPLETED',
                    endMileage: endNum
                });
            } catch (repErr) {
                console.error("Error auto-generating PDF report:", repErr);
            }

            // 3. Cerrar el token de cuadrilla
            await closeCrewToken(ticket.id);

            setSuccessDialogOpen(true);
        } catch (error: any) {
            console.error("Error finalizing service:", error);
            alert("Error al finalizar el servicio: " + error.message);
        } finally {
            setClosingService(false);
        }
    };

    if (authorizing || loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-3" />
                <h2 className="text-sm font-bold text-slate-800">Verificando Credenciales de Cuadrilla...</h2>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                    Comprobando autorización del dispositivo y estado del servicio en HECHO SRL.
                </p>
            </div>
        );
    }

    // PANTALLA 1: SERVICIO CERRADO (BLOQUEO DE SEGURIDAD)
    if (authResult?.isClosed) {
        return (
            <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6 text-center">
                <Card className="w-full max-w-md border-slate-300 shadow-md bg-white p-6 space-y-4">
                    <div className="w-16 h-16 bg-slate-100 text-slate-700 rounded-full flex items-center justify-center mx-auto shadow-inner">
                        <Lock className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 tracking-tight">Servicio Cerrado</h1>
                        <Badge variant="outline" className="mt-1 bg-slate-100 text-slate-700 border-slate-300 font-mono text-xs">
                            Ticket #{ticket?.ticketNumber || ticket?.id?.slice(0, 8)}
                        </Badge>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">
                        Este ticket ya fue finalizado y cerrado oficialmente. Por razones de auditoría y seguridad técnica, el enlace ha quedado bloqueado y no permite modificaciones.
                    </p>

                    <div className="pt-2 space-y-2">
                        {ticket?.id && (
                            <Button
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-11 gap-2 shadow-xs"
                                onClick={() => window.open(`/tickets/${ticket.id}/report?preview=true`, '_blank')}
                            >
                                <FileDown className="w-4 h-4" />
                                Ver / Descargar Informe Técnico PDF
                            </Button>
                        )}
                        <Button
                            variant="outline"
                            className="w-full text-xs h-10"
                            onClick={() => window.location.reload()}
                        >
                            Actualizar Estado
                        </Button>
                    </div>
                </Card>
            </div>
        );
    }

    // PANTALLA 2: LÍMITE DE APERTURAS / DISPOSITIVOS ALCANZADO
    if (authResult?.isLimitReached) {
        return (
            <div className="min-h-screen bg-amber-50/50 flex flex-col items-center justify-center p-6 text-center">
                <Card className="w-full max-w-md border-amber-300 shadow-md bg-white p-6 space-y-4">
                    <div className="w-16 h-16 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto shadow-inner">
                        <AlertTriangle className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-lg font-black text-slate-900 tracking-tight">Límite de Dispositivos Alcanzado</h1>
                        <Badge variant="outline" className="mt-1 bg-amber-50 text-amber-800 border-amber-300 text-xs">
                            Cupo de Cuadrilla Completo
                        </Badge>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">
                        Este enlace ya fue abierto en los celulares asignados a esta cuadrilla (Técnico Líder y Ayudante).
                    </p>

                    <div className="p-3 bg-slate-50 rounded-xl border text-[11px] text-slate-700 text-left space-y-1">
                        <p className="font-semibold text-slate-900">¿Necesitas agregar este celular a la orden?</p>
                        <p>Solicita al Administrador o Supervisor que pulse el botón <strong>"+1 Cupo"</strong> en el ticket para habilitar este dispositivo de inmediato.</p>
                    </div>

                    <Button
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-10 shadow-xs"
                        onClick={() => window.location.reload()}
                    >
                        Ya me habilitaron el cupo (Reintentar)
                    </Button>
                </Card>
            </div>
        );
    }

    if (!authResult?.authorized || !ticket) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                <AlertTriangle className="w-10 h-10 text-rose-500 mb-2" />
                <h2 className="text-sm font-bold text-slate-800">Enlace No Disponible</h2>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                    {authResult?.reason || "El enlace no es válido o ha expirado."}
                </p>
            </div>
        );
    }

    // PANTALLA PRINCIPAL: ACCESO CONCEDIDO A LA CUADRILLA
    return (
        <div className="min-h-screen bg-slate-100 pb-20 text-slate-900">
            {/* Header Móvil de Cuadrilla */}
            <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3 shadow-xs">
                <div className="flex items-center justify-between gap-2 max-w-3xl mx-auto">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md border border-blue-200">
                                TK #{ticket.ticketNumber || ticket.id.slice(0, 6)}
                            </span>
                            <span className="text-xs font-bold text-slate-700 truncate max-w-[160px]">
                                {ticket.locationName || ticket.clientName}
                            </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                            {ticket.serviceType?.replace(/_/g, ' ') || 'Mantenimiento Climatización'}
                        </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                        {/* Standby Action Button */}
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={handleToggleStandby}
                            className={`h-8 text-xs font-bold px-2.5 gap-1 shadow-2xs ${
                                ticket.isStandby 
                                    ? 'bg-amber-100 text-amber-900 border-amber-400 animate-pulse' 
                                    : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                            }`}
                        >
                            {ticket.isStandby ? (
                                <>
                                    <Play className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
                                    Reanudar
                                </>
                            ) : (
                                <>
                                    <Pause className="w-3.5 h-3.5 text-amber-600" />
                                    Standby
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Banner de Standby Activo */}
                {ticket.isStandby && (
                    <div className="mt-2.5 p-2 bg-amber-500 text-white rounded-lg text-xs flex items-center justify-between shadow-xs max-w-3xl mx-auto">
                        <span className="font-bold flex items-center gap-1.5">
                            <Pause className="w-4 h-4 fill-white" />
                            Servicio en Standby: {ticket.standbyReason || "Pausa operativa"}
                        </span>
                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={handleToggleStandby}
                            className="h-6 text-[11px] font-bold text-amber-950 bg-white"
                        >
                            Reanudar Ahora
                        </Button>
                    </div>
                )}

                {/* Identificador de Miembro de Cuadrilla */}
                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs max-w-3xl mx-auto">
                    <div className="flex items-center gap-1.5 text-slate-600">
                        <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                        <span>Celular de:</span>
                        {isEditingWorker ? (
                            <div className="flex items-center gap-1">
                                <Input
                                    value={workerName}
                                    onChange={(e) => setWorkerName(e.target.value)}
                                    placeholder="Tu nombre (ej. Juan)"
                                    className="h-6 text-xs w-36 px-1.5"
                                />
                                <Button
                                    size="sm"
                                    onClick={() => handleSaveWorkerName(workerName)}
                                    className="h-6 px-2 text-[10px] bg-slate-900 text-white"
                                >
                                    OK
                                </Button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setIsEditingWorker(true)}
                                className="font-bold text-slate-900 underline underline-offset-2 hover:text-blue-600"
                            >
                                {workerName || "Click para ingresar tu nombre"}
                            </button>
                        )}
                    </div>

                    {ticket.locationUrl && (
                        <a
                            href={ticket.locationUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200"
                        >
                            <Navigation className="w-3 h-3 text-blue-600" />
                            GPS Mapa
                        </a>
                    )}
                </div>
            </header>

            {/* Contenido Principal con Pestañas Móviles */}
            <main className="max-w-3xl mx-auto p-4 space-y-4">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                    <TabsList className="grid grid-cols-4 w-full bg-white p-1 rounded-xl border border-slate-200 shadow-2xs h-11">
                        <TabsTrigger value="equipos" className="text-xs font-bold gap-1 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                            <Wrench className="w-3.5 h-3.5" />
                            Equipos
                        </TabsTrigger>
                        <TabsTrigger value="fotos" className="text-xs font-bold gap-1 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                            <Camera className="w-3.5 h-3.5" />
                            Fotos ({ticket.photos?.length || 0})
                        </TabsTrigger>
                        <TabsTrigger value="materiales" className="text-xs font-bold gap-1 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                            <Truck className="w-3.5 h-3.5" />
                            Gas / Stock
                        </TabsTrigger>
                        <TabsTrigger value="cierre" className="text-xs font-bold gap-1 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Cierre
                        </TabsTrigger>
                    </TabsList>

                    {/* 1. Equipos y Manómetros */}
                    <TabsContent value="equipos" className="space-y-4">
                        <EquipmentServiceChecklist
                            ticket={ticket}
                            onTicketUpdated={(updated) => setTicket(updated)}
                        />
                    </TabsContent>

                    {/* 2. Fotos Colaborativas */}
                    <TabsContent value="fotos" className="space-y-4">
                        <Card className="border-slate-200 bg-white">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-bold flex items-center justify-between">
                                    <span>Fotos Colaborativas en Tiempo Real</span>
                                    <Badge variant="outline" className="text-[10px] bg-slate-50">
                                        Líder & Ayudante
                                    </Badge>
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Las fotos que tomes se sincronizan automáticamente con el celular de tu compañero de cuadrilla.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <PhotoUploader
                                    label="Condición Inicial (Antes)"
                                    type="BEFORE"
                                    photos={ticket.photos || []}
                                    onChange={handlePhotoUpdate}
                                    allowGallery={false}
                                />
                                <PhotoUploader
                                    label="Durante el Trabajo (En Ejecución)"
                                    type="DURING"
                                    photos={ticket.photos || []}
                                    onChange={handlePhotoUpdate}
                                    allowGallery={false}
                                />
                                <PhotoUploader
                                    label="Trabajo Terminado (Después)"
                                    type="AFTER"
                                    photos={ticket.photos || []}
                                    onChange={handlePhotoUpdate}
                                    allowGallery={false}
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* 3. Consumo de Gas y Materiales */}
                    <TabsContent value="materiales" className="space-y-4">
                        <QuickVehicleConsumption
                            ticketId={ticket.id}
                            ticketNumber={ticket.ticketNumber}
                            userId={ticket.technicianId || "crew"}
                            userName={workerName || ticket.technicianName || "Cuadrilla"}
                        />
                    </TabsContent>

                    {/* 4. Diagnóstico, Solución y Cierre */}
                    <TabsContent value="cierre" className="space-y-4">
                        <Card className="border-slate-200 bg-white shadow-xs">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-bold">Diagnóstico y Trabajo Realizado</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div>
                                    <Label className="text-xs font-semibold">Diagnóstico:</Label>
                                    <VoiceTextarea
                                        placeholder="Dicta o escribe el diagnóstico..."
                                        value={ticket.diagnosis || ""}
                                        onValueChange={(val) => setTicket(prev => prev ? { ...prev, diagnosis: val } : null)}
                                        className="min-h-[80px] text-xs"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold">Trabajo Realizado / Solución:</Label>
                                    <VoiceTextarea
                                        placeholder="Dicta o escribe la solución aplicada..."
                                        value={ticket.solution || ""}
                                        onValueChange={(val) => setTicket(prev => prev ? { ...prev, solution: val } : null)}
                                        className="min-h-[80px] text-xs"
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-slate-200 bg-white shadow-xs">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-bold">Datos de Cierre y Firma</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-1.5 bg-blue-50/60 p-3 rounded-xl border border-blue-100">
                                    <Label className="font-bold text-xs text-blue-950">Kilometraje Final del Vehículo *</Label>
                                    <Input
                                        type="number"
                                        placeholder="Ej. 145200"
                                        value={endMileage}
                                        onChange={(e) => setEndMileage(e.target.value)}
                                        className="bg-white h-10 text-sm font-semibold"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="font-bold text-xs">Nombre Legible de quien recibe *</Label>
                                    <VoiceInput
                                        placeholder="Ej. Juan Pérez"
                                        value={ticket.clientSignatureName || ""}
                                        onChange={(e) => setTicket(prev => prev ? { ...prev, clientSignatureName: e.target.value } : null)}
                                        className="h-10 text-sm"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="font-bold text-xs">Firma de Conformidad</Label>
                                    <SignaturePad
                                        value={ticket.clientSignature || ""}
                                        onChange={(val) => setTicket(prev => prev ? { ...prev, clientSignature: val } : null)}
                                    />
                                </div>

                                <Button
                                    className="w-full h-12 text-base font-bold bg-green-600 hover:bg-green-700 shadow-md text-white mt-4"
                                    onClick={handleFinalizeService}
                                    disabled={closingService}
                                >
                                    {closingService ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                            Cerrando y Compilando PDF...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="w-5 h-5 mr-2" />
                                            Finalizar Servicio y Generar PDF
                                        </>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </main>

            {/* Modal de Éxito al Finalizar */}
            <Dialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
                <DialogContent className="sm:max-w-md text-center p-6 space-y-4">
                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                        <CheckCircle2 className="w-9 h-9" />
                    </div>
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black text-slate-900 text-center tracking-tight">
                            ¡Servicio Finalizado con Éxito!
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
                        La orden ha sido cerrada y el Informe Técnico Oficial en PDF fue compilado automáticamente con todos los datos y fotos de la cuadrilla. El enlace ha quedado cerrado para edición.
                    </p>

                    <div className="space-y-2.5 pt-2">
                        <Button
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 text-sm gap-2 shadow-xs"
                            onClick={() => {
                                window.open(`/tickets/${ticket?.id}/report?preview=true`, '_blank');
                            }}
                        >
                            <FileDown className="w-4 h-4" />
                            Ver / Descargar Informe PDF
                        </Button>

                        <Button
                            variant="outline"
                            className="w-full border-emerald-300 text-emerald-800 hover:bg-emerald-50 font-semibold h-11 text-sm gap-2"
                            onClick={() => {
                                const text = `Hola, le comparto el Informe Técnico Oficial de HECHO SRL del servicio #${ticket?.ticketNumber || ticket?.id?.slice(0, 8)}:\n${window.location.origin}/tickets/${ticket?.id}/report?preview=true`;
                                window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                            }}
                        >
                            <Share2 className="w-4 h-4" />
                            Compartir por WhatsApp
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
