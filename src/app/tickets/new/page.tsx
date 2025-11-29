"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { httpsCallable } from "firebase/functions";
import { functions, db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { Client } from "@/types/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

export default function NewTicketPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [clients, setClients] = useState<Client[]>([]);

    const [formData, setFormData] = useState({
        titulo: "",
        descripcion: "",
        clientId: "",
        prioridad: "MEDIA",
        tipoServicio: "MANTENIMIENTO",
        locationId: "Lobby Principal", // Hardcoded for now, should filter by client
    });

    useEffect(() => {
        const fetchClients = async () => {
            const snap = await getDocs(collection(db, "clients"));
            setClients(snap.docs.map(d => ({ id: d.id, ...d.data() } as Client)));
        };
        fetchClients();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const createTicket = httpsCallable(functions, "createTicket");
            await createTicket(formData);
            router.push("/tickets");
        } catch (error) {
            console.error("Error creating ticket:", error);
            alert("Error al crear ticket");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-2xl mx-auto">
            <Button variant="ghost" onClick={() => router.back()} className="mb-4 pl-0">
                <ArrowLeft className="mr-2 h-4 w-4" /> Volver
            </Button>

            <Card>
                <CardHeader>
                    <CardTitle>Crear Nuevo Ticket</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="titulo">Título</Label>
                            <Input
                                id="titulo"
                                value={formData.titulo}
                                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="client">Cliente</Label>
                            <Select
                                value={formData.clientId}
                                onValueChange={(val) => setFormData({ ...formData, clientId: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar cliente" />
                                </SelectTrigger>
                                <SelectContent>
                                    {clients.map((client) => (
                                        <SelectItem key={client.id} value={client.id}>
                                            {client.nombreComercial}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="prioridad">Prioridad</Label>
                                <Select
                                    value={formData.prioridad}
                                    onValueChange={(val) => setFormData({ ...formData, prioridad: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="BAJA">Baja</SelectItem>
                                        <SelectItem value="MEDIA">Media</SelectItem>
                                        <SelectItem value="ALTA">Alta</SelectItem>
                                        <SelectItem value="CRITICA">Crítica</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="tipo">Tipo Servicio</Label>
                                <Select
                                    value={formData.tipoServicio}
                                    onValueChange={(val) => setFormData({ ...formData, tipoServicio: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="MANTENIMIENTO">Mantenimiento</SelectItem>
                                        <SelectItem value="INSTALACION">Instalación</SelectItem>
                                        <SelectItem value="EMERGENCIA">Emergencia</SelectItem>
                                        <SelectItem value="INSPECCION">Inspección</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="descripcion">Descripción</Label>
                            <Textarea
                                id="descripcion"
                                value={formData.descripcion}
                                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                                required
                            />
                        </div>

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? "Creando..." : "Crear Ticket"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
