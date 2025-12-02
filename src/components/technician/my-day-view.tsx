"use client";

import { useEffect, useState } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Ticket } from "@/types/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, ArrowRight, CheckCircle, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export function MyDayView() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string>("");
    const router = useRouter();

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

        // Query tickets assigned to current user, not completed/cancelled
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

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Cargando tus trabajos...</p>
                </div>
            </div>
        );
    }

    const currentTicket = tickets[0];
    const remainingCount = tickets.length - 1;

    if (!currentTicket) {
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

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case "URGENT":
                return "bg-red-600 text-white";
            case "HIGH":
                return "bg-orange-600 text-white";
            case "MEDIUM":
                return "bg-yellow-600 text-white";
            case "LOW":
                return "bg-green-600 text-white";
            default:
                return "bg-gray-600 text-white";
        }
    };

    const getPriorityLabel = (priority: string) => {
        switch (priority) {
            case "URGENT":
                return "🚨 URGENTE";
            case "HIGH":
                return "⚠️ ALTA";
            case "MEDIUM":
                return "📋 MEDIA";
            case "LOW":
                return "✅ BAJA";
            default:
                return priority;
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
            <div className="max-w-2xl mx-auto py-8 space-y-6">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">Mi Día</h1>
                    <p className="text-lg text-gray-600">
                        {tickets.length === 1 ? (
                            "Tu último trabajo del día"
                        ) : (
                            <>
                                Trabajo 1 de {tickets.length} • {remainingCount} {remainingCount === 1 ? "pendiente" : "pendientes"}
                            </>
                        )}
                    </p>
                </div>

                {/* Main Ticket Card */}
                <Card className="shadow-2xl border-2 border-blue-200 overflow-hidden">
                    {/* Priority Banner */}
                    <div className={`${getPriorityColor(currentTicket.priority)} py-3 px-6`}>
                        <p className="text-center text-lg font-bold">{getPriorityLabel(currentTicket.priority)}</p>
                    </div>

                    <CardContent className="p-8 space-y-6">
                        {/* Ticket Number */}
                        <div className="text-center">
                            <p className="text-sm text-gray-500 mb-1">Ticket</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {currentTicket.ticketNumber || currentTicket.id.slice(0, 8)}
                            </p>
                        </div>

                        {/* Client */}
                        <div className="bg-blue-50 rounded-lg p-6">
                            <p className="text-sm text-gray-600 mb-2">Cliente</p>
                            <p className="text-3xl font-bold text-gray-900 mb-4">{currentTicket.clientName}</p>

                            {/* Location */}
                            <div className="flex items-start gap-3 text-gray-700">
                                <MapPin className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
                                <div>
                                    <p className="font-semibold text-lg">{currentTicket.locationName}</p>
                                    {currentTicket.specificLocation && (
                                        <p className="text-gray-600">{currentTicket.specificLocation}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Problem */}
                        <div className="bg-orange-50 rounded-lg p-6">
                            <p className="text-sm text-gray-600 mb-2">Problema Reportado</p>
                            <p className="text-xl text-gray-900 leading-relaxed">{currentTicket.description}</p>
                        </div>

                        {/* Service Type */}
                        <div className="flex items-center justify-center gap-2">
                            <Badge variant="outline" className="text-base py-2 px-4">
                                {currentTicket.serviceType.replace(/_/g, " ")}
                            </Badge>
                        </div>

                        {/* Time Info */}
                        <div className="flex items-center justify-center gap-2 text-gray-500">
                            <Clock className="h-5 w-5" />
                            <span className="text-sm">
                                Creado: {new Date(currentTicket.createdAt.seconds * 1000).toLocaleString()}
                            </span>
                        </div>

                        {/* Action Button */}
                        <Button
                            onClick={() => router.push(`/tickets/${currentTicket.id}`)}
                            size="lg"
                            className="w-full h-16 text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg"
                        >
                            Ir al Trabajo
                            <ArrowRight className="ml-3 h-8 w-8" />
                        </Button>
                    </CardContent>
                </Card>

                {/* Next Tickets Preview */}
                {remainingCount > 0 && (
                    <div className="mt-8">
                        <h3 className="text-lg font-semibold text-gray-700 mb-4 text-center">
                            Próximos Trabajos ({remainingCount})
                        </h3>
                        <div className="space-y-3">
                            {tickets.slice(1, 4).map((ticket, index) => (
                                <Card key={ticket.id} className="bg-white/60 backdrop-blur">
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-gray-200 rounded-full w-8 h-8 flex items-center justify-center font-bold text-gray-700">
                                                {index + 2}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-900">{ticket.clientName}</p>
                                                <p className="text-sm text-gray-600">{ticket.locationName}</p>
                                            </div>
                                        </div>
                                        <Badge className={getPriorityColor(ticket.priority)}>
                                            {ticket.priority}
                                        </Badge>
                                    </CardContent>
                                </Card>
                            ))}
                            {remainingCount > 3 && (
                                <p className="text-center text-gray-500 text-sm">
                                    + {remainingCount - 3} más
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
