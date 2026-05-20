"use client";

import { useEffect, useState } from "react";
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, Timestamp, arrayUnion } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Ticket, User } from "@/types/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InstallAppButton } from "@/components/shared/install-app-button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useOfflineSync } from "@/hooks/use-offline-sync";
import {
    MapPin, Clock, ArrowRight, CheckCircle, AlertCircle,
    Play, Pause, CheckCheck, Navigation, List, Map as MapIcon, LogOut,
    Car, AlertTriangle, Droplet, Building2, Truck, WifiOff, RefreshCw, Trash2
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { TicketCardRefactored } from "@/components/tickets/ticket-card-refactored";

export function MyDayView() {
    const { isOnline, isSyncing, pendingOperations, syncQueue, retryOperation, discardOperation } = useOfflineSync();
    const [isQueueOpen, setIsQueueOpen] = useState(false);
    
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string>("");
    const [userData, setUserData] = useState<User | null>(null);
    const [showVehicleCheckIn, setShowVehicleCheckIn] = useState(false);
    const [mileageInput, setMileageInput] = useState("");
    const [updatingMileage, setUpdatingMileage] = useState(false);
    const [activeView, setActiveView] = useState<"list" | "map">("list");
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        const unsubAuth = auth.onAuthStateChanged((user) => {
            if (user) {
                setCurrentUserId(user.uid);
                const unsubUser = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
                    if (docSnap.exists()) {
                        const data = { id: docSnap.id, ...docSnap.data() } as User;
                        setUserData(data);

                        // Check vehicle check-in
                        const todayStr = new Date().toISOString().split("T")[0];
                        if (data.vehicle && data.vehicle.lastMileageUpdateDate !== todayStr) {
                            setShowVehicleCheckIn(true);
                            // Only set default once
                            setMileageInput(prev => prev || (data.vehicle?.currentMileage?.toString() || ""));
                        } else {
                            setShowVehicleCheckIn(false);
                        }
                    }
                });
                return () => unsubUser();
            }
        });

        return () => unsubAuth();
    }, []);

    const handleMileageSubmit = async () => {
        if (!currentUserId || !userData?.vehicle || !mileageInput) return;
        setUpdatingMileage(true);
        try {
            const newMileage = parseInt(mileageInput);
            const todayStr = new Date().toISOString().split("T")[0];
            
            const oilInterval = userData.vehicle.oilChangeInterval || 4500;
            const lastOilChange = userData.vehicle.lastOilChangeMileage || 0;
            const needsOilChange = newMileage - lastOilChange >= oilInterval;

            await updateDoc(doc(db, "users", currentUserId), {
                "vehicle.currentMileage": newMileage,
                "vehicle.lastMileageUpdateDate": todayStr
            });

            if (needsOilChange) {
                toast({
                    title: "⚠️ Mantenimiento de Vehículo",
                    description: `El vehículo ha superado el intervalo de cambio de aceite (${newMileage - lastOilChange} km recorridos). Se notificará al administrador.`,
                    variant: "destructive"
                });
                // In a real scenario, you could create a ticket or notification here for the manager
            } else {
                toast({
                    title: "✅ Vehículo Actualizado",
                    description: "Kilometraje registrado correctamente para iniciar el día."
                });
            }
            setShowVehicleCheckIn(false);
        } catch (error) {
            console.error("Error updating mileage:", error);
            toast({
                title: "Error",
                description: "No se pudo actualizar el kilometraje",
                variant: "destructive"
            });
        } finally {
            setUpdatingMileage(false);
        }
    };

    useEffect(() => {
        if (!currentUserId) return;

        const q = query(
            collection(db, "tickets"),
            where("technicianId", "==", currentUserId),
            where("status", "in", ["OPEN", "IN_PROGRESS", "WAITING_CLIENT", "WAITING_PARTS"])
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Ticket[];

            // Client-side sorting to avoid Firestore composite index requirement
            const priorityWeight = {
                "URGENT": 4,
                "HIGH": 3,
                "MEDIUM": 2,
                "LOW": 1
            };

            data.sort((a, b) => {
                // 1. Check Execution Order (Manual Dispatch Override)
                const orderA = a.executionOrder !== undefined ? a.executionOrder : Number.MAX_SAFE_INTEGER;
                const orderB = b.executionOrder !== undefined ? b.executionOrder : Number.MAX_SAFE_INTEGER;
                if (orderA !== orderB) return orderA - orderB;

                // 2. Sort by Priority (Desc)
                const weightA = priorityWeight[a.priority as keyof typeof priorityWeight] || 0;
                const weightB = priorityWeight[b.priority as keyof typeof priorityWeight] || 0;
                if (weightA !== weightB) return weightB - weightA;

                // 3. Sort by CreatedAt (Asc) - Oldest first
                const dateA = a.createdAt?.seconds || 0;
                const dateB = b.createdAt?.seconds || 0;
                return dateA - dateB;
            });

            setTickets(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUserId]);

    const handleLogout = async () => {
        const pendingLogistics = tickets.filter(t => t.serviceType === "LOGISTICA" && t.status !== "COMPLETED");
        if (pendingLogistics.length > 0) {
            toast({
                title: "⚠️ Tareas Logísticas Pendientes",
                description: `No puedes cerrar tu jornada. Tienes ${pendingLogistics.length} recado(s) o tarea(s) logística(s) sin completar en tu agenda.`,
                variant: "destructive",
                duration: 5000
            });
            return;
        }
        await auth.signOut();
    };

    const handleQuickAction = async (ticketId: string, action: "start" | "pause" | "complete") => {
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) return;

            const statusMap = {
                start: "IN_PROGRESS",
                pause: "WAITING_PARTS",
                complete: "COMPLETED"
            };

            const noteMap = {
                start: "Técnico inició el trabajo",
                pause: "Trabajo pausado",
                complete: "Trabajo completado"
            };

            await updateDoc(doc(db, "tickets", ticketId), {
                status: statusMap[action],
                updatedAt: Timestamp.now(),
                timeline: arrayUnion({
                    status: statusMap[action],
                    timestamp: Timestamp.now(),
                    userId: currentUser.uid,
                    userName: currentUser.displayName || "Técnico",
                    note: noteMap[action]
                })
            });

            toast({
                title: "✅ Actualizado",
                description: noteMap[action],
            });
        } catch (error) {
            console.error("Error updating ticket:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "No se pudo actualizar el ticket",
            });
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case "URGENT": return "bg-red-600 text-white";
            case "HIGH": return "bg-orange-600 text-white";
            case "MEDIUM": return "bg-yellow-600 text-white";
            case "LOW": return "bg-green-600 text-white";
            default: return "bg-gray-600 text-white";
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "OPEN": return <Clock className="h-5 w-5 text-blue-500" />;
            case "IN_PROGRESS": return <Play className="h-5 w-5 text-green-500" />;
            case "WAITING_CLIENT": return <Pause className="h-5 w-5 text-yellow-500" />;
            case "WAITING_PARTS": return <Pause className="h-5 w-5 text-orange-500" />;
            case "COMPLETED": return <CheckCheck className="h-5 w-5 text-emerald-500" />;
            default: return <AlertCircle className="h-5 w-5 text-gray-500" />;
        }
    };

    const getStatusLabel = (status: string) => {
        const labels: Record<string, string> = {
            "OPEN": "Pendiente",
            "IN_PROGRESS": "En Progreso",
            "WAITING_CLIENT": "Esperando Cliente",
            "WAITING_PARTS": "Esperando Piezas",
            "COMPLETED": "Completado"
        };
        return labels[status] || status;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Cargando tu agenda...</p>
                </div>
            </div>
        );
    }

    const displayTickets = tickets.length > 0 ? tickets : [{
        id: "DEFAULT-WELCOME-TICKET",
        ticketNumber: "TIC-BIENVENIDA",
        priority: "LOW",
        clientName: "Sistema HECHOAPP",
        locationName: "Ubicación de Prueba",
        technicianId: currentUserId,
        technicianName: "Tú (Modo Pruebas)",
        description: "Este es un ticket automático generado por el sistema porque no tienes trabajos asignados. Úsalo para probar la interfaz y familiarizarte con las herramientas.",
        status: "OPEN",
        createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
        updatedAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
        equipmentId: "NONE",
        locationId: "NONE",
        clientId: "NONE"
    } as unknown as Ticket];

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 relative">
            {/* Header / Botón Salir (Mobile First) */}
            <div className="absolute top-4 left-4 z-10 md:hidden flex items-center gap-2">
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-blue-600 bg-white/80 backdrop-blur rounded-full shadow-sm"
                    onClick={() => router.push('/technician/projects')}
                >
                    <Building2 className="h-4 w-4 mr-1" />
                    Proyectos
                </Button>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-red-600 bg-white/80 backdrop-blur rounded-full shadow-sm"
                    onClick={handleLogout}
                >
                    <LogOut className="h-4 w-4 mr-1" />
                    Salir
                </Button>
                <InstallAppButton />
            </div>

            {/* Vehicle Check-in Modal */}
            {showVehicleCheckIn && userData?.vehicle && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <Card className="w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                        <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
                            <CardTitle className="flex items-center gap-2 text-xl">
                                <Car className="h-6 w-6" />
                                Vehículo Asignado
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                <h3 className="font-semibold text-blue-900">{userData.vehicle.brand} {userData.vehicle.model} {userData.vehicle.year}</h3>
                                <p className="text-blue-700 text-sm mt-1">Placa: <span className="font-bold">{userData.vehicle.plate || "No registrada"}</span></p>
                            </div>
                            
                            <div className="space-y-3">
                                <label className="text-sm font-medium text-gray-700 block">
                                    Kilometraje actual para iniciar el día:
                                </label>
                                <div className="flex gap-3">
                                    <Input 
                                        type="number" 
                                        placeholder="Ej: 45000"
                                        value={mileageInput}
                                        onChange={(e) => setMileageInput(e.target.value)}
                                        className="text-lg"
                                        autoFocus
                                    />
                                    <Button 
                                        onClick={handleMileageSubmit}
                                        disabled={!mileageInput || updatingMileage}
                                        className="bg-blue-600 hover:bg-blue-700"
                                    >
                                        {updatingMileage ? "Guardando..." : "Registrar"}
                                    </Button>
                                </div>
                                <p className="text-xs text-gray-500">
                                    Último cambio de aceite: {userData.vehicle.lastOilChangeMileage || 0} km | Próximo en: {(userData.vehicle.lastOilChangeMileage || 0) + (userData.vehicle.oilChangeInterval || 4500)} km
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            <div className="max-w-7xl mx-auto py-8 space-y-6">
                {/* Banner de Sincronización */}
                {syncQueue.length > 0 && (
                    <div 
                        onClick={() => setIsQueueOpen(true)}
                        className={`cursor-pointer max-w-lg mx-auto p-4 rounded-xl border flex items-center justify-between shadow-sm transition-all duration-200 hover:shadow-md ${
                            syncQueue.some(op => op.status === 'CONFLICT' || op.status === 'FAILED')
                                ? 'bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100/85'
                                : isSyncing 
                                    ? 'bg-blue-50 border-blue-200 text-blue-900 hover:bg-blue-100/85'
                                    : 'bg-slate-50 border-slate-200 text-slate-900 hover:bg-slate-100/85'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <div className="flex-shrink-0">
                                {syncQueue.some(op => op.status === 'CONFLICT' || op.status === 'FAILED') ? (
                                    <AlertTriangle className="h-5 w-5 text-amber-600 animate-bounce" />
                                ) : isSyncing ? (
                                    <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
                                ) : (
                                    <WifiOff className="h-5 w-5 text-slate-600" />
                                )}
                            </div>
                            <div className="text-left">
                                <p className="text-sm font-semibold">
                                    {syncQueue.some(op => op.status === 'CONFLICT' || op.status === 'FAILED')
                                        ? 'Problema de Sincronización'
                                        : isSyncing 
                                            ? 'Sincronizando cambios...'
                                            : 'Cambios pendientes sin conexión'}
                                </p>
                                <p className="text-xs opacity-80 mt-0.5">
                                    {syncQueue.length} {syncQueue.length === 1 ? 'operación pendiente' : 'operaciones pendientes'} en cola
                                </p>
                            </div>
                        </div>
                        <div className="text-xs font-bold underline px-2 py-1 bg-white/50 rounded hover:bg-white/80 transition-colors">
                            Ver detalles
                        </div>
                    </div>
                )}

                {/* Titles */}
                <div className="text-center mb-8 space-y-5">
                    <div>
                        <h1 className="text-4xl font-bold text-gray-900 mb-2">Mi Día</h1>
                        <p className="text-lg text-gray-600 font-medium mb-4">
                            {displayTickets.length} {displayTickets.length === 1 ? "trabajo pendiente" : "trabajos pendientes"}
                        </p>
                        
                        {/* Quick Navigation for Desktop/Large screens */}
                        <div className="hidden md:flex justify-center gap-4 mb-2">
                            <Button 
                                variant="outline" 
                                className="bg-white hover:bg-blue-50 text-blue-700 border-blue-200"
                                onClick={() => router.push('/technician/projects')}
                            >
                                <Building2 className="h-4 w-4 mr-2" />
                                Gestionar Proyectos
                            </Button>
                            <Button 
                                variant="outline" 
                                className="bg-white hover:bg-red-50 text-red-700 border-red-200"
                                onClick={handleLogout}
                            >
                                <LogOut className="h-4 w-4 mr-2" />
                                Cerrar Sesión
                            </Button>
                            <InstallAppButton />
                        </div>
                    </div>

                    {/* Promesa Bíblica */}
                    <div className="max-w-md mx-auto bg-white/60 backdrop-blur border border-blue-100 rounded-xl p-4 shadow-sm">
                        <p className="text-base font-bold text-gray-800 italic">"Busca a Dios, él te espera."</p>
                        <p className="text-sm text-gray-600 mt-2">
                            El Señor es bueno con los que en él esperan, con los que lo buscan.<br/>
                            <span className="text-xs text-gray-400 font-semibold">— Lamentaciones 3:25</span>
                        </p>
                    </div>
                </div>

                {/* View Tabs */}
                <Tabs value={activeView} onValueChange={(v) => setActiveView(v as "list" | "map")} className="w-full">
                    <TabsList className="grid w-full max-w-lg mx-auto grid-cols-2 mb-6">
                        <TabsTrigger value="list" className="flex items-center gap-2 relative">
                            <List className="h-4 w-4" />
                            <span className="hidden sm:inline">Lista</span>
                        </TabsTrigger>
                        <TabsTrigger value="map" className="flex items-center gap-2">
                            <MapIcon className="h-4 w-4" />
                            <span className="hidden sm:inline">Ruta</span>
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="list" className="space-y-4">
                        {displayTickets.map((ticket, index) => (
                            <div key={ticket.id} className="w-full">
                                <TicketCardRefactored 
                                    ticketId={ticket.id} 
                                    initialData={ticket}
                                    onClick={() => router.push(`/technician/tickets/${ticket.id}`)}
                                />
                            </div>
                        ))}
                    </TabsContent>

                    <TabsContent value="map">
                        <Card className="p-6">
                            <div className="text-center py-12">
                                <Navigation className="h-16 w-16 text-blue-600 mx-auto mb-4" />
                                <h3 className="text-2xl font-bold text-gray-900 mb-2">Ruta Optimizada</h3>
                                <p className="text-gray-600 mb-6">
                                    Secuencia sugerida para tus {displayTickets.length} trabajos
                                </p>
                                <div className="space-y-3 max-w-md mx-auto">
                                    {displayTickets.map((ticket, index) => (
                                        <div key={ticket.id} className="flex items-center gap-3 bg-white p-4 rounded-lg shadow">
                                            <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
                                                {index + 1}
                                            </div>
                                            <div className="flex-1 text-left">
                                                <p className="font-semibold text-gray-900">{ticket.clientName}</p>
                                                <p className="text-sm text-gray-600">{ticket.locationName}</p>
                                            </div>
                                            <Badge className={getPriorityColor(ticket.priority)}>
                                                {ticket.priority}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </Card>
                    </TabsContent>

                </Tabs>
            </div>

            {/* Modal de Control de Cola de Sincronización */}
            <Dialog open={isQueueOpen} onOpenChange={setIsQueueOpen}>
                <DialogContent className="max-w-md max-h-[90vh] flex flex-col p-6 bg-white rounded-lg">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold text-slate-900 flex items-center justify-between">
                            <span>Cola de Sincronización Local</span>
                            <Badge variant={isOnline ? "outline" : "secondary"} className={isOnline ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-slate-700 bg-slate-100"}>
                                {isOnline ? 'Online' : 'Offline'}
                            </Badge>
                        </DialogTitle>
                    </DialogHeader>
                    <div className="text-xs text-slate-500 mb-2">
                        {isOnline 
                            ? 'Tienes conexión de red. Los cambios se sincronizarán automáticamente de fondo.' 
                            : 'Estás operando en modo desconectado. Los cambios se guardan localmente hasta recuperar la señal.'}
                    </div>
                    
                    <ScrollArea className="flex-1 max-h-[400px] pr-2 overflow-y-auto mt-2">
                        {syncQueue.length === 0 ? (
                            <div className="text-center py-8 text-slate-400 text-xs">
                                No hay operaciones pendientes en la cola.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {syncQueue.map((op) => {
                                    let badgeColor = "bg-slate-100 text-slate-700 border-slate-200";
                                    if (op.status === 'CONFLICT') badgeColor = "bg-rose-50 text-rose-800 border-rose-200";
                                    else if (op.status === 'FAILED') badgeColor = "bg-amber-50 text-amber-800 border-amber-200";
                                    else if (op.status === 'RETRYING') badgeColor = "bg-blue-50 text-blue-800 border-blue-200 animate-pulse";

                                    let opLabel = "Operación";
                                    if (op.type === 'UPDATE_TICKET') opLabel = `Actualizar Ticket #${op.data.ticketNumber || op.data.id?.substring(0, 6)}`;
                                    else if (op.type === 'UPLOAD_PHOTO') opLabel = `Subir Foto (${op.data.filename || 'Foto'})`;
                                    else if (op.type === 'CREATE_PURCHASE') opLabel = "Registrar Compra";

                                    return (
                                        <div key={op.id} className="border border-slate-100 rounded-lg p-3 bg-slate-50/50 hover:bg-slate-50 transition-colors text-left">
                                            <div className="flex justify-between items-start mb-1.5 flex-wrap gap-2">
                                                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${badgeColor}`}>
                                                    {op.status === 'PENDING' ? 'Pendiente' : 
                                                     op.status === 'RETRYING' ? 'Sincronizando...' : 
                                                     op.status === 'CONFLICT' ? 'Conflicto' : 'Fallido'}
                                                </Badge>
                                                <span className="text-[10px] text-slate-400">
                                                    {new Date(op.timestamp).toLocaleTimeString()}
                                                </span>
                                            </div>
                                            <div className="text-xs font-semibold text-slate-800 mb-1">
                                                {opLabel}
                                            </div>
                                            {op.error && (
                                                <div className="text-[10px] text-rose-600 bg-rose-50 border border-rose-100 rounded p-2 mb-2 leading-relaxed">
                                                    <strong>Error:</strong> {op.error}
                                                </div>
                                            )}
                                            <div className="flex gap-2 justify-end mt-2 pt-1 border-t border-slate-100">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => discardOperation(op.id)}
                                                    className="h-7 text-[10px] text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 flex items-center gap-1"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                    Descartar
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={() => retryOperation(op.id)}
                                                    disabled={isSyncing}
                                                    className="h-7 text-[10px] bg-slate-900 text-white hover:bg-slate-800 px-2.5 py-1 flex items-center gap-1"
                                                >
                                                    <RefreshCw className={`h-3 w-3 ${isSyncing && op.status === 'RETRYING' ? 'animate-spin' : ''}`} />
                                                    Reintentar
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </ScrollArea>
                    <div className="mt-4 pt-3 border-t flex justify-end">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setIsQueueOpen(false)}
                            className="text-xs h-8"
                        >
                            Cerrar
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
