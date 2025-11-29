"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, Timestamp } from "firebase/firestore";
import { Ticket } from "@/types/schema";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

export default function TicketListPage() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const q = query(collection(db, "tickets"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const ticketData = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Ticket[];
            setTickets(ticketData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const getStatusColor = (status: string) => {
        switch (status) {
            case "ABIERTO": return "default"; // Primary/Blue
            case "EN_PROCESO": return "secondary"; // Gray/Yellowish
            case "PENDIENTE_CLIENTE": return "outline";
            case "CERRADO": return "secondary"; // Green? Custom needed
            default: return "default";
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case "CRITICA": return "destructive";
            case "ALTA": return "destructive";
            case "MEDIA": return "default";
            case "BAJA": return "secondary";
            default: return "outline";
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Gestión de Tickets</h1>
                <Button onClick={() => router.push("/tickets/new")}>
                    <Plus className="mr-2 h-4 w-4" /> Nuevo Ticket
                </Button>
            </div>

            <div className="rounded-md border bg-white">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Código</TableHead>
                            <TableHead>Título</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead>Prioridad</TableHead>
                            <TableHead>Fecha</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8">
                                    Cargando tickets...
                                </TableCell>
                            </TableRow>
                        ) : tickets.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                    No hay tickets registrados.
                                </TableCell>
                            </TableRow>
                        ) : (
                            tickets.map((ticket) => (
                                <TableRow
                                    key={ticket.id}
                                    className="cursor-pointer hover:bg-gray-50"
                                    onClick={() => router.push(`/tickets/${ticket.id}`)}
                                >
                                    <TableCell className="font-medium">{ticket.codigo}</TableCell>
                                    <TableCell>{ticket.titulo}</TableCell>
                                    <TableCell>{ticket.clientId}</TableCell> {/* TODO: Resolve Client Name */}
                                    <TableCell>
                                        <Badge variant={getStatusColor(ticket.estado) as any}>
                                            {ticket.estado.replace("_", " ")}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={getPriorityColor(ticket.prioridad) as any}>
                                            {ticket.prioridad}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {new Date(ticket.createdAt.seconds * 1000).toLocaleDateString()}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
