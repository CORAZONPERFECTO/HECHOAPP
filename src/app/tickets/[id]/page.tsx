"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, orderBy, getDocs, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { Ticket, TicketEvent, Client } from "@/types/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, User as UserIcon, MapPin, Edit, MessageSquare } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [ticket, setTicket] = useState<Ticket | null>(null);
    const [client, setClient] = useState<Client | null>(null);
    const [events, setEvents] = useState<TicketEvent[]>([]);
    const [loading, setLoading] = useState(true);

    // Status Update State
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [newStatus, setNewStatus] = useState<string>("");
    const [statusComment, setStatusComment] = useState("");
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Fetch Ticket
                const ticketRef = doc(db, "tickets", id);
                const ticketSnap = await getDoc(ticketRef);

                if (!ticketSnap.exists()) {
                    alert("Ticket no encontrado");
                    router.push("/tickets");
                    return;
                }

                const ticketData = { id: ticketSnap.id, ...ticketSnap.data() } as Ticket;
                setTicket(ticketData);
                setNewStatus(ticketData.estado);

                // 2. Fetch Client (if exists)
                if (ticketData.clientId) {
                    // In a real app, fetch from 'clients' collection. 
                    // For now, we simulate or fetch if we had the collection populated.
                    // const clientSnap = await getDoc(doc(db, "clients", ticketData.clientId));
                    // if (clientSnap.exists()) setClient({ id: clientSnap.id, ...clientSnap.data() } as Client);
                }

                // 3. Fetch Events
                const eventsRef = collection(db, "ticketEvents");
                const q = query(eventsRef, where("ticketId", "==", id), orderBy("fechaEvento", "desc"));
                const eventsSnap = await getDocs(q);
                const eventsData = eventsSnap.docs.map(d => ({ id: d.id, ...d.data() } as TicketEvent));
                setEvents(eventsData);

            } catch (error) {
                console.error("Error fetching ticket details:", error);
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchData();
    }, [id, router]);

    const handleStatusUpdate = async () => {
        if (!ticket || !auth.currentUser) return;
        setUpdating(true);

        try {
            // 1. Update Ticket
            const ticketRef = doc(db, "tickets", id);
            await updateDoc(ticketRef, {
                estado: newStatus,
                updatedAt: serverTimestamp(),
                actualizadoPorId: auth.currentUser.uid
            });

            // 2. Create Event
            await addDoc(collection(db, "ticketEvents"), {
                ticketId: id,
                usuarioId: auth.currentUser.uid,
                tipoEvento: "CAMBIO_ESTADO",
                descripcion: `Estado cambiado de ${ticket.estado} a ${newStatus}. ${statusComment ? `Comentario: ${statusComment}` : ""}`,
                estadoAnterior: ticket.estado,
                estadoNuevo: newStatus,
                fechaEvento: serverTimestamp(),
            });

            // 3. Update Local State
            setTicket({ ...ticket, estado: newStatus as any });
            setEvents([{
                id: "temp-id",
                ticketId: id,
                usuarioId: auth.currentUser.uid,
                tipoEvento: "CAMBIO_ESTADO",
                descripcion: `Estado cambiado de ${ticket.estado} a ${newStatus}. ${statusComment ? `Comentario: ${statusComment}` : ""}`,
                estadoAnterior: ticket.estado,
                estadoNuevo: newStatus as any,
                fechaEvento: { seconds: Date.now() / 1000, nanoseconds: 0 } as any
            }, ...events]);

            setIsDialogOpen(false);
            setStatusComment("");
        } catch (error) {
            console.error("Error updating status:", error);
            alert("Error al actualizar estado");
        } finally {
            setUpdating(false);
        }
    };

    if (loading) return <div className="p-8">Cargando...</div>;
    if (!ticket) return null;

    return (
        <div className="container mx-auto py-8 px-4 max-w-4xl">
            <Button variant="ghost" className="mb-6 pl-0" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Volver
            </Button>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="md:col-span-2 space-y-6">
                    <Card>
                        <CardHeader className="flex flex-row items-start justify-between">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Badge variant="outline">{ticket.codigo}</Badge>
                                    <Badge className={
                                        ticket.prioridad === 'CRITICA' ? 'bg-red-600' :
                                            ticket.prioridad === 'ALTA' ? 'bg-orange-500' :
                                                ticket.prioridad === 'MEDIA' ? 'bg-yellow-500' : 'bg-green-500'
                                    }>{ticket.prioridad}</Badge>
                                </div>
                                <CardTitle className="text-2xl">{ticket.titulo}</CardTitle>
                            </div>
                            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="sm">
                                        <Edit className="mr-2 h-4 w-4" /> Cambiar Estado
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Actualizar Estado del Ticket</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            "use client";

                                            import {useEffect, useState, use} from "react";
                                            import {useRouter} from "next/navigation";
                                            import {auth, db} from "@/lib/firebase";
                                            import {doc, getDoc, collection, query, where, orderBy, getDocs, updateDoc, addDoc, serverTimestamp} from "firebase/firestore";
                                            import {Ticket, TicketEvent, Client} from "@/types/schema";
                                            import {Button} from "@/components/ui/button";
                                            import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
                                            import {Badge} from "@/components/ui/badge";
                                            import {ArrowLeft, Clock, User as UserIcon, MapPin, Edit, MessageSquare} from "lucide-react";
                                            import {
                                                Dialog,
                                                DialogContent,
                                                DialogHeader,
                                                DialogTitle,
                                                DialogTrigger,
                                                DialogFooter,
} from "@/components/ui/dialog";
                                            import {
                                                Select,
                                                SelectContent,
                                                SelectItem,
                                                SelectTrigger,
                                                SelectValue,
} from "@/components/ui/select";
                                            import {Textarea} from "@/components/ui/textarea";
                                            import {Label} from "@/components/ui/label";

                                            export default function TicketDetailPage({params}: {params: Promise<{ id: string }> }) {
    const {id} = use(params);
                                            const router = useRouter();
                                            const [ticket, setTicket] = useState<Ticket | null>(null);
                                            const [client, setClient] = useState<Client | null>(null);
                                            const [events, setEvents] = useState<TicketEvent[]>([]);
                                            const [loading, setLoading] = useState(true);

                                            // Status Update State
                                            const [isDialogOpen, setIsDialogOpen] = useState(false);
                                            const [newStatus, setNewStatus] = useState<string>("");
                                                const [statusComment, setStatusComment] = useState("");
                                                const [updating, setUpdating] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Fetch Ticket
                const ticketRef = doc(db, "tickets", id);
                                                const ticketSnap = await getDoc(ticketRef);

                                                if (!ticketSnap.exists()) {
                                                    alert("Ticket no encontrado");
                                                router.push("/tickets");
                                                return;
                }

                                                const ticketData = {id: ticketSnap.id, ...ticketSnap.data() } as Ticket;
                                                setTicket(ticketData);
                                                setNewStatus(ticketData.estado);

                                                // 2. Fetch Client (if exists)
                                                if (ticketData.clientId) {
                                                    // In a real app, fetch from 'clients' collection. 
                                                    // For now, we simulate or fetch if we had the collection populated.
                                                    // const clientSnap = await getDoc(doc(db, "clients", ticketData.clientId));
                                                    // if (clientSnap.exists()) setClient({ id: clientSnap.id, ...clientSnap.data() } as Client);
                                                }

                // 3. Fetch Events
                                                const eventsRef = collection(db, "ticketEvents");
                                                const q = query(eventsRef, where("ticketId", "==", id), orderBy("fechaEvento", "desc"));
                                                const eventsSnap = await getDocs(q);
                const eventsData = eventsSnap.docs.map(d => ({id: d.id, ...d.data() } as TicketEvent));
                                                setEvents(eventsData);

            } catch (error) {
                                                    console.error("Error fetching ticket details:", error);
            } finally {
                                                    setLoading(false);
            }
        };

                                                if (id) fetchData();
    }, [id, router]);

    const handleStatusUpdate = async () => {
        if (!ticket || !auth.currentUser) return;
                                                setUpdating(true);

                                                try {
            // 1. Update Ticket
            const ticketRef = doc(db, "tickets", id);
                                                await updateDoc(ticketRef, {
                                                    estado: newStatus,
                                                updatedAt: serverTimestamp(),
                                                actualizadoPorId: auth.currentUser.uid
            });

                                                // 2. Create Event
                                                await addDoc(collection(db, "ticketEvents"), {
                                                    ticketId: id,
                                                usuarioId: auth.currentUser.uid,
                                                tipoEvento: "CAMBIO_ESTADO",
                                                descripcion: `Estado cambiado de ${ticket.estado} a ${newStatus}. ${statusComment ? `Comentario: ${statusComment}` : ""}`,
                                                estadoAnterior: ticket.estado,
                                                estadoNuevo: newStatus,
                                                fechaEvento: serverTimestamp(),
            });

                                                // 3. Update Local State
                                                setTicket({...ticket, estado: newStatus as any });
                                                setEvents([{
                                                    id: "temp-id",
                                                ticketId: id,
                                                usuarioId: auth.currentUser.uid,
                                                tipoEvento: "CAMBIO_ESTADO",
                                                descripcion: `Estado cambiado de ${ticket.estado} a ${newStatus}. ${statusComment ? `Comentario: ${statusComment}` : ""}`,
                                                estadoAnterior: ticket.estado,
                                                estadoNuevo: newStatus as any,
                                                fechaEvento: {seconds: Date.now() / 1000, nanoseconds: 0 } as any
            }, ...events]);

                                                setIsDialogOpen(false);
                                                setStatusComment("");
        } catch (error) {
                                                    console.error("Error updating status:", error);
                                                alert("Error al actualizar estado");
        } finally {
                                                    setUpdating(false);
        }
    };

                                                if (loading) return <div className="p-8">Cargando...</div>;
                                                if (!ticket) return null;

                                                return (
                                                <div className="container mx-auto py-8 px-4 max-w-4xl">
                                                    <Button variant="ghost" className="mb-6 pl-0" onClick={() => router.back()}>
                                                        <ArrowLeft className="mr-2 h-4 w-4" /> Volver
                                                    </Button>

                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                        {/* Main Content */}
                                                        <div className="md:col-span-2 space-y-6">
                                                            <Card>
                                                                <CardHeader className="flex flex-row items-start justify-between">
                                                                    <div>
                                                                        <div className="flex items-center gap-2 mb-2">
                                                                            <Badge variant="outline">{ticket.codigo}</Badge>
                                                                            <Badge className={
                                                                                ticket.prioridad === 'CRITICA' ? 'bg-red-600' :
                                                                                    ticket.prioridad === 'ALTA' ? 'bg-orange-500' :
                                                                                        ticket.prioridad === 'MEDIA' ? 'bg-yellow-500' : 'bg-green-500'
                                                                            }>{ticket.prioridad}</Badge>
                                                                        </div>
                                                                        <CardTitle className="text-2xl">{ticket.titulo}</CardTitle>
                                                                    </div>
                                                                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                                                                        <DialogTrigger asChild>
                                                                            <Button variant="outline" size="sm">
                                                                                <Edit className="mr-2 h-4 w-4" /> Cambiar Estado
                                                                            </Button>
                                                                        </DialogTrigger>
                                                                        <DialogContent>
                                                                            <DialogHeader>
                                                                                <DialogTitle>Actualizar Estado del Ticket</DialogTitle>
                                                                            </DialogHeader>
                                                                            <div className="space-y-4 py-4">
                                                                                <div className="space-y-2">
                                                                                    <Label>Nuevo Estado</Label>
                                                                                    <Select value={newStatus} onValueChange={setNewStatus}>
                                                                                        <SelectTrigger>
                                                                                            <SelectValue />
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
                                                                                    <Label>Comentario (Opcional)</Label>
                                                                                    <Textarea
                                                                                        value={statusComment}
                                                                                        onChange={(e) => setStatusComment(e.target.value)}
                                                                                        placeholder="Explique la razón del cambio..."
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                            <DialogFooter>
                                                                                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                                                                                <Button onClick={handleStatusUpdate} disabled={updating}>
                                                                                    {updating ? "Actualizando..." : "Confirmar Cambio"}
                                                                                </Button>
                                                                            </DialogFooter>
                                                                        </DialogContent>
                                                                    </Dialog>
                                                                </CardHeader>
                                                                <CardContent className="space-y-4">
                                                                    <div>
                                                                        <h3 className="font-semibold mb-2">Descripción</h3>
                                                                        <p className="text-gray-700 whitespace-pre-wrap">{ticket.descripcion}</p>
                                                                    </div>

                                                                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                                                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                                                            <UserIcon className="h-4 w-4" />
                                                                            <span>{client?.nombreComercial || "Cliente General"}</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                                                            <MapPin className="h-4 w-4" />
                                                                            <span>{ticket.locationId}</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                                                            <Clock className="h-4 w-4" />
                                                                            <span>{new Date((ticket.createdAt as any).seconds * 1000).toLocaleDateString()}</span>
                                                                        </div>
                                                                    </div>
                                                                </CardContent>
                                                            </Card>

                                                            {/* Timeline / Events */}
                                                            <Card>
                                                                <CardHeader>
                                                                    <CardTitle className="text-lg flex items-center gap-2">
                                                                        <MessageSquare className="h-5 w-5" /> Historial de Eventos
                                                                    </CardTitle>
                                                                </CardHeader>
                                                                <CardContent>
                                                                    <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                                                                        {events.map((event) => (
                                                                            <div key={event.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                                                                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-300 group-[.is-active]:bg-blue-500 text-slate-500 group-[.is-active]:text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                                                                                    <Clock className="h-5 w-5" />
                                                                                </div>
                                                                                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded border border-slate-200 bg-white shadow-sm">
                                                                                    <div className="flex items-center justify-between space-x-2 mb-1">
                                                                                        <div className="font-bold text-slate-900">{event.tipoEvento}</div>
                                                                                        <time className="font-caveat font-medium text-indigo-500">
                                                                                            {event.fechaEvento ? new Date((event.fechaEvento as any).seconds * 1000).toLocaleString() : 'Justo ahora'}
                                                                                        </time>
                                                                                    </div>
                                                                                    <div className="text-slate-500 text-sm">{event.descripcion}</div>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </CardContent>
                                                            </Card>
                                                        </div>

                                                        {/* Sidebar Info */}
                                                        <div className="space-y-6">
                                                            <Card>
                                                                <CardHeader>
                                                                    <CardTitle className="text-sm font-medium">Estado Actual</CardTitle>
                                                                </CardHeader>
                                                                <CardContent>
                                                                    <div className="flex flex-col items-center py-4">
                                                                        <div className={`text-lg font-bold px-4 py-2 rounded-full ${ticket.estado === 'ABIERTO' ? 'bg-green-100 text-green-800' :
                                                                            ticket.estado === 'EN_PROCESO' ? 'bg-blue-100 text-blue-800' :
                                                                                ticket.estado === 'CERRADO' ? 'bg-gray-100 text-gray-800' :
                                                                                    'bg-yellow-100 text-yellow-800'
                                                                            }`}>
                                                                            {ticket.estado}
                                                                        </div>
                                                                    </div>
                                                                </CardContent>
                                                            </Card>
                                                        </div>
                                                    </div>
                                                </div>
                                                );
}
