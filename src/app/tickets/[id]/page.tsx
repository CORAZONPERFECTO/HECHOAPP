"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { Ticket, TicketEvent, Client } from "@/types/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Clock, User as UserIcon, MapPin, Edit } from "lucide-react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function TicketDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const [ticket, setTicket] = useState<Ticket | null>(null);
    const [client, setClient] = useState<Client | null>(null);
    const [events, setEvents] = useState<TicketEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusDialogOpen, setStatusDialogOpen] = useState(false);
    const [newStatus, setNewStatus] = useState("");
    const [statusComment, setStatusComment] = useState("");
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        if (!id) return;

        const fetchData = async () => {
            try {
                // 1. Fetch Ticket
                const ticketDoc = await getDoc(doc(db, "tickets", id as string));
                if (!ticketDoc.exists()) {
                    console.error("Ticket not found");
                    setLoading(false);
                    return;
                }
                const ticketData = { id: ticketDoc.id, ...ticketDoc.data() } as Ticket;
                setTicket(ticketData);

                // 2. Fetch Client
                if (ticketData.clientId) {
                    const clientDoc = await getDoc(doc(db, "clients", ticketData.clientId));
                    if (clientDoc.exists()) {
                        setClient({ id: clientDoc.id, ...clientDoc.data() } as Client);
                    }
                }

                // 3. Fetch Events
                const q = query(
                    collection(db, "ticketEvents"),
                    where("ticketId", "==", id),
                    orderBy("fechaEvento", "desc")
                );
                const eventsSnap = await getDocs(q);
                const eventsData = eventsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as TicketEvent[];
                setEvents(eventsData);

            } catch (error) {
                console.error("Error fetching ticket details:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    const handleStatusUpdate = async () => {
        if (!newStatus) return;
        setUpdating(true);
        try {
            const updateStatus = httpsCallable(functions, "updateTicketStatus");
            await updateStatus({
                ticketId: id,
                newStatus,
                comment: statusComment,
            });
            setStatusDialogOpen(false);
            // Refresh data (simplified)
            window.location.reload();
        } catch (error) {
            console.error("Error updating status:", error);
            alert("Error al actualizar estado");
        } finally {
            setUpdating(false);
        }
    };

    if (loading) return <div className="p-8">Cargando detalles...</div>;
    if (!ticket) return <div className="p-8">Ticket no encontrado.</div>;

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <Button variant="ghost" onClick={() => router.back()} className="mb-4 pl-0">
                <ArrowLeft className="mr-2 h-4 w-4" /> Volver
            </Button>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="md:col-span-2 space-y-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-3xl font-bold">{ticket.codigo}</h1>
                            <Badge>{ticket.estado.replace("_", " ")}</Badge>
                            <Badge variant="outline">{ticket.prioridad}</Badge>
                        </div>
                        <h2 className="text-xl text-gray-700 font-medium">{ticket.titulo}</h2>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Descripción</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="whitespace-pre-wrap text-gray-600">{ticket.descripcion}</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Historial de Eventos</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {events.map((event) => (
                                    <div key={event.id} className="flex gap-4 border-b pb-4 last:border-0">
                                        <div className="mt-1">
                                            <div className="h-2 w-2 rounded-full bg-blue-500" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">{event.tipoEvento}</p>
                                            <p className="text-sm text-gray-500">{event.descripcion}</p>
                                            <p className="text-xs text-gray-400 mt-1">
                                                {new Date(event.fechaEvento.seconds * 1000).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium text-gray-500">Cliente</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {client ? (
                                <div>
                                    <p className="font-bold text-lg">{client.nombreComercial}</p>
                                    <p className="text-sm text-gray-600">{client.personaContacto}</p>
                                    <p className="text-sm text-gray-600">{client.telefonoContacto}</p>
                                </div>
                            ) : (
                                <p>Cargando cliente...</p>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium text-gray-500">Detalles</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-center gap-2 text-sm">
                                <UserIcon className="h-4 w-4 text-gray-400" />
                                <span>Técnico: {ticket.tecnicoAsignadoId || "Sin asignar"}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <MapPin className="h-4 w-4 text-gray-400" />
                                <span>Ubicación: {ticket.locationId || "N/A"}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <Clock className="h-4 w-4 text-gray-400" />
                                <span>Creado: {new Date(ticket.createdAt.seconds * 1000).toLocaleDateString()}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex flex-col gap-2">
                        <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
                            <DialogTrigger asChild>
                                <Button className="w-full">Cambiar Estado</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Actualizar Estado del Ticket</DialogTitle>
                                    <DialogDescription>
                                        Selecciona el nuevo estado y añade un comentario opcional.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label>Nuevo Estado</Label>
                                        <Select value={newStatus} onValueChange={setNewStatus}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccionar estado" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="ABIERTO">Abierto</SelectItem>
                                                <SelectItem value="EN_PROCESO">En Proceso</SelectItem>
                                                <SelectItem value="PENDIENTE_CLIENTE">Pendiente Cliente</SelectItem>
                                                <SelectItem value="PENDIENTE_MATERIAL">Pendiente Material</SelectItem>
                                                <SelectItem value="CERRADO">Cerrado</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Comentario</Label>
                                        <Textarea
                                            value={statusComment}
                                            onChange={(e) => setStatusComment(e.target.value)}
                                            placeholder="Razón del cambio..."
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>Cancelar</Button>
                                    <Button onClick={handleStatusUpdate} disabled={updating}>
                                        {updating ? "Actualizando..." : "Guardar Cambio"}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

                        <Button variant="outline" className="w-full">Asignar Técnico</Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
