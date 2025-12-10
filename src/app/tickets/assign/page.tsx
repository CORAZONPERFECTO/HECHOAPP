"use client";

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, updateDoc, doc, Timestamp, arrayUnion, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Ticket } from "@/types/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, MapPin, Zap, TrendingUp } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { AppLayout } from "@/components/layout/app-layout";

interface Technician {
    id: string;
    name: string;
    email: string;
    specialty?: string;
    currentLoad: number; // Number of active tickets
}

export default function AssignmentDashboard() {
    const [unassignedTickets, setUnassignedTickets] = useState<Ticket[]>([]);
    const [technicians, setTechnicians] = useState<Technician[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        // Load unassigned tickets
        const q = query(
            collection(db, "tickets"),
            where("technicianId", "==", ""),
            where("status", "in", ["OPEN", "WAITING_CLIENT"])
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Ticket[];
            setUnassignedTickets(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        // Load technicians and calculate their workload
        const loadTechnicians = async () => {
            const usersSnap = await getDocs(collection(db, "users"));
            const techUsers = usersSnap.docs
                .filter(doc => doc.data().role === "TECNICO")
                .map(doc => ({
                    id: doc.id,
                    name: doc.data().name || doc.data().email,
                    email: doc.data().email,
                    specialty: doc.data().specialty,
                    currentLoad: 0
                }));

            // Count active tickets for each technician
            const ticketsSnap = await getDocs(collection(db, "tickets"));
            const activeTickets = ticketsSnap.docs
                .map(doc => doc.data())
                .filter(ticket => ["OPEN", "IN_PROGRESS", "WAITING_CLIENT", "WAITING_PARTS"].includes(ticket.status));

            techUsers.forEach(tech => {
                tech.currentLoad = activeTickets.filter(ticket => ticket.technicianId === tech.id).length;
            });

            setTechnicians(techUsers);
        };

        loadTechnicians();
    }, []);

    const handleAssign = async (ticketId: string, technicianId: string) => {
        try {
            const technician = technicians.find(t => t.id === technicianId);
            if (!technician) return;

            await updateDoc(doc(db, "tickets", ticketId), {
                technicianId: technician.id,
                technicianName: technician.name,
                updatedAt: Timestamp.now(),
                timeline: arrayUnion({
                    status: "ASSIGNED",
                    timestamp: Timestamp.now(),
                    userId: "admin",
                    userName: "Sistema",
                    note: `Asignado a ${technician.name}`
                })
            });

            toast({
                title: "✅ Ticket Asignado",
                description: `Asignado a ${technician.name}`,
            });

            // Update local state
            setTechnicians(prev => prev.map(t =>
                t.id === technicianId
                    ? { ...t, currentLoad: t.currentLoad + 1 }
                    : t
            ));
        } catch (error) {
            console.error("Error assigning ticket:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "No se pudo asignar el ticket",
            });
        }
    };

    const getSuggestedTechnician = (ticket: Ticket): Technician | null => {
        if (technicians.length === 0) return null;

        // Simple logic: assign to technician with lowest workload
        // In a real system, you'd consider: location, specialty, availability, etc.
        return technicians.reduce((prev, current) =>
            current.currentLoad < prev.currentLoad ? current : prev
        );
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case "URGENT": return "bg-red-100 text-red-800 border-red-300";
            case "HIGH": return "bg-orange-100 text-orange-800 border-orange-300";
            case "MEDIUM": return "bg-yellow-100 text-yellow-800 border-yellow-300";
            case "LOW": return "bg-green-100 text-green-800 border-green-300";
            default: return "bg-gray-100 text-gray-800 border-gray-300";
        }
    };

    if (loading) {
        return (
            <AppLayout>
                <div className="flex items-center justify-center h-screen">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Cargando panel de asignación...</p>
                    </div>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <div className="max-w-7xl mx-auto p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Asignación Inteligente</h1>
                        <p className="text-gray-600">Asigna tickets a técnicos de manera eficiente</p>
                    </div>
                    <Badge variant="outline" className="text-lg px-4 py-2">
                        {unassignedTickets.length} sin asignar
                    </Badge>
                </div>

                {/* Technicians Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {technicians.map(tech => (
                        <Card key={tech.id} className="border-2">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Users className="h-5 w-5 text-blue-600" />
                                    {tech.name}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">Carga Actual:</span>
                                        <Badge variant={tech.currentLoad > 5 ? "destructive" : "default"}>
                                            {tech.currentLoad} tickets
                                        </Badge>
                                    </div>
                                    {tech.specialty && (
                                        <div className="flex items-center gap-2">
                                            <Zap className="h-4 w-4 text-yellow-600" />
                                            <span className="text-sm text-gray-700">{tech.specialty}</span>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Unassigned Tickets */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-purple-600" />
                            Tickets Sin Asignar
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {unassignedTickets.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-gray-500">¡Excelente! No hay tickets sin asignar.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {unassignedTickets.map(ticket => {
                                    const suggested = getSuggestedTechnician(ticket);
                                    return (
                                        <Card key={ticket.id} className={`border-2 ${getPriorityColor(ticket.priority)}`}>
                                            <CardContent className="p-4">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <Badge variant="outline" className="font-mono">
                                                                {ticket.ticketNumber || ticket.id.slice(0, 8)}
                                                            </Badge>
                                                            <Badge className={getPriorityColor(ticket.priority)}>
                                                                {ticket.priority}
                                                            </Badge>
                                                        </div>
                                                        <h3 className="font-semibold text-lg text-gray-900 mb-1">
                                                            {ticket.clientName}
                                                        </h3>
                                                        <div className="flex items-center gap-2 text-gray-600 mb-2">
                                                            <MapPin className="h-4 w-4" />
                                                            <span className="text-sm">{ticket.locationName}</span>
                                                        </div>
                                                        <p className="text-sm text-gray-700">{ticket.description}</p>
                                                        {suggested && (
                                                            <div className="mt-3 flex items-center gap-2 text-sm">
                                                                <Zap className="h-4 w-4 text-yellow-600" />
                                                                <span className="text-gray-600">
                                                                    Sugerido: <strong>{suggested.name}</strong> ({suggested.currentLoad} tickets)
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col gap-2">
                                                        <Select onValueChange={(value) => handleAssign(ticket.id, value)}>
                                                            <SelectTrigger className="w-[200px]">
                                                                <SelectValue placeholder="Asignar a..." />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {technicians.map(tech => (
                                                                    <SelectItem key={tech.id} value={tech.id}>
                                                                        {tech.name} ({tech.currentLoad})
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        {suggested && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => handleAssign(ticket.id, suggested.id)}
                                                                className="gap-2"
                                                            >
                                                                <Zap className="h-4 w-4" />
                                                                Auto-asignar
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
