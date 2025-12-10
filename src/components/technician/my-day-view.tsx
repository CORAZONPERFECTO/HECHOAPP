"use client";

import { useEffect, useState } from "react";
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, Timestamp, arrayUnion } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Ticket } from "@/types/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
    MapPin, Clock, ArrowRight, CheckCircle, AlertCircle, 
    Play, Pause, CheckCheck, Navigation, List, Map as MapIcon 
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";

export function MyDayView() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string>("");
    const [activeView, setActiveView] = useState<"list" | "map">("list");
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        const unsubAuth = auth.onAuthStateChanged((user) => {
            if (user) {
                setCurrentUserId(user.uid);
            }
        });

        return () => unsubAuth();
    }, []);

    useEffect(() => {
        if (!currentUserId) return;

        const q = query(
            collection(db, "tickets"),
            where("technicianId", "==", currentUserId),
            where("status", "in", ["OPEN", "IN_PROGRESS", "WAITING_CLIENT", "WAITING_PARTS"]),
            orderBy("priority", "desc"),
            orderBy("createdAt", "asc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Ticket[];
            setTickets(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUserId]);

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

    if (tickets.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4">
                <Card className="max-w-md w-full">
                    <CardContent className="pt-12 pb-12 text-center">
                        <CheckCircle className="h-24 w-24 text-green-600 mx-auto mb-6" />
                        <h2 className="text-3xl font-bold text-gray-900 mb-2">¡Excelente Trabajo!</h2>
                        <p className="text-lg text-gray-600 mb-4">No tienes trabajos pendientes por ahora.</p>
                        <p className="text-sm text-gray-500">Disfruta tu descanso 😎</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
            <div className="max-w-7xl mx-auto py-8 space-y-6">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">Mi Día</h1>
                    <p className="text-lg text-gray-600">
                        {tickets.length} {tickets.length === 1 ? "trabajo pendiente" : "trabajos pendientes"}
                    </p>
                </div>

                {/* View Tabs */}
                <Tabs value={activeView} onValueChange={(v) => setActiveView(v as "list" | "map")} className="w-full">
                    <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-6">
                        <TabsTrigger value="list" className="flex items-center gap-2">
                            <List className="h-4 w-4" />
                            Lista
                        </TabsTrigger>
                        <TabsTrigger value="map" className="flex items-center gap-2">
                            <MapIcon className="h-4 w-4" />
                            Ruta
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="list" className="space-y-4">
                        {tickets.map((ticket, index) => (
                            <Card key={ticket.id} className="shadow-lg hover:shadow-xl transition-shadow">
                                <CardHeader className={`${getPriorityColor(ticket.priority)} py-3`}>
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <span className="bg-white/20 px-3 py-1 rounded-full">#{index + 1}</span>
                                            {ticket.priority}
                                        </CardTitle>
                                        <Badge variant="secondary" className="bg-white/20">
                                            {ticket.ticketNumber || ticket.id.slice(0, 8)}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-6 space-y-4">
                                    {/* Status Badge */}
                                    <div className="flex items-center gap-2">
                                        {getStatusIcon(ticket.status)}
                                        <span className="font-medium text-gray-700">{getStatusLabel(ticket.status)}</span>
                                    </div>

                                    {/* Client & Location */}
                                    <div className="bg-blue-50 rounded-lg p-4">
                                        <p className="text-2xl font-bold text-gray-900 mb-2">{ticket.clientName}</p>
                                        <div className="flex items-start gap-2 text-gray-700">
                                            <MapPin className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <p className="font-semibold">{ticket.locationName}</p>
                                                {ticket.specificLocation && (
                                                    <p className="text-sm text-gray-600">{ticket.specificLocation}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <div className="bg-orange-50 rounded-lg p-4">
                                        <p className="text-sm text-gray-600 mb-1">Problema:</p>
                                        <p className="text-gray-900">{ticket.description}</p>
                                    </div>

                                    {/* Quick Actions */}
                                    <div className="grid grid-cols-2 gap-3 pt-4">
                                        {ticket.status === "OPEN" && (
                                            <Button
                                                onClick={() => handleQuickAction(ticket.id, "start")}
                                                className="bg-green-600 hover:bg-green-700"
                                            >
                                                <Play className="mr-2 h-4 w-4" />
                                                Iniciar
                                            </Button>
                                        )}
                                        {ticket.status === "IN_PROGRESS" && (
                                            <>
                                                <Button
                                                    onClick={() => handleQuickAction(ticket.id, "pause")}
                                                    variant="outline"
                                                >
                                                    <Pause className="mr-2 h-4 w-4" />
                                                    Pausar
                                                </Button>
                                                <Button
                                                    onClick={() => handleQuickAction(ticket.id, "complete")}
                                                    className="bg-emerald-600 hover:bg-emerald-700"
                                                >
                                                    <CheckCheck className="mr-2 h-4 w-4" />
                                                    Completar
                                                </Button>
                                            </>
                                        )}
                                        <Button
                                            onClick={() => router.push(`/tickets/${ticket.id}`)}
                                            variant="default"
                                            className={ticket.status === "OPEN" ? "col-span-1" : "col-span-2"}
                                        >
                                            Ver Detalles
                                            <ArrowRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </TabsContent>

                    <TabsContent value="map">
                        <Card className="p-6">
                            <div className="text-center py-12">
                                <Navigation className="h-16 w-16 text-blue-600 mx-auto mb-4" />
                                <h3 className="text-2xl font-bold text-gray-900 mb-2">Ruta Optimizada</h3>
                                <p className="text-gray-600 mb-6">
                                    Secuencia sugerida para tus {tickets.length} trabajos
                                </p>
                                <div className="space-y-3 max-w-md mx-auto">
                                    {tickets.map((ticket, index) => (
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
        </div>
    );
}
