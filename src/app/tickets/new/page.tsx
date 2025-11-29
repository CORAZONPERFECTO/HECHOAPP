"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, getCountFromServer } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";
import { TicketPriority, ServiceType } from "@/types/schema";

export default function NewTicketPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        titulo: "",
        descripcion: "",
        prioridad: "MEDIA" as TicketPriority,
        tipoServicio: "SOPORTE_REMOTO" as ServiceType,
        clientId: "CLIENT-001", // Hardcoded for now, would come from a Client selector
        locationId: "LOC-001",
        equipmentId: "EQ-001",
        tecnicoAsignadoId: "TECH-001",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (!auth.currentUser) throw new Error("No autenticado");

            // 1. Generate Code
            const ticketsColl = collection(db, "tickets");
            const snapshot = await getCountFromServer(ticketsColl);
            const count = snapshot.data().count;
            const code = `TCK-2025-${String(count + 1).padStart(4, "0")}`;

            // 2. Create Ticket
            const ticketRef = await addDoc(ticketsColl, {
                ...formData,
                codigo: code,
                estado: "ABIERTO",
                origen: "LLAMADA",
                creadoPorId: auth.currentUser.uid,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            // 3. Create Event
            await addDoc(collection(db, "ticketEvents"), {
                ticketId: ticketRef.id,
                usuarioId: auth.currentUser.uid,
                tipoEvento: "CREACION",
                descripcion: "Ticket creado manualmente por usuario",
                fechaEvento: serverTimestamp(),
            });

            router.push(`/tickets/${ticketRef.id}`);
        } catch (error) {
            console.error("Error creating ticket:", error);
            alert("Error al crear el ticket");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto py-10 px-4 max-w-2xl">
            <Button
                variant="ghost"
                className="mb-6 pl-0 hover:pl-2 transition-all"
                onClick={() => router.back()}
            >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
            </Button>

            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">Nuevo Ticket</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">

                        <div className="space-y-2">
                            <Label htmlFor="titulo">Título del Problema</Label>
                            <Input
                                id="titulo"
                                placeholder="Ej: Impresora no conecta a red"
                                value={formData.titulo}
                                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="prioridad">Prioridad</Label>
                                <Select
                                    value={formData.prioridad}
                                    onValueChange={(value: TicketPriority) =>
                                        setFormData({ ...formData, prioridad: value })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar prioridad" />
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
                                <Label htmlFor="tipoServicio">Tipo de Servicio</Label>
                                <Select
                                    value={formData.tipoServicio}
                                    onValueChange={(value: ServiceType) =>
                                        setFormData({ ...formData, tipoServicio: value })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar tipo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="MANTENIMIENTO_PREVENTIVO">Mantenimiento Preventivo</SelectItem>
                                        <SelectItem value="MANTENIMIENTO_CORRECTIVO">Mantenimiento Correctivo</SelectItem>
                                        <SelectItem value="INSTALACION">Instalación</SelectItem>
                                        <SelectItem value="SOPORTE_REMOTO">Soporte Remoto</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="descripcion">Descripción Detallada</Label>
                            <Textarea
                                id="descripcion"
                                placeholder="Describa el problema con el mayor detalle posible..."
                                className="min-h-[120px]"
                                value={formData.descripcion}
                                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Cliente (Simulado)</Label>
                            <Select disabled defaultValue="CLIENT-001">
                                <SelectTrigger>
                                    <SelectValue placeholder="Cliente A" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="CLIENT-001">Empresa Demo S.A.</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                * Selección de clientes se implementará en la siguiente fase
                            </p>
                        </div>

                        <div className="flex justify-end gap-4 pt-4">
                            <Button type="button" variant="outline" onClick={() => router.back()}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Crear Ticket
                            </Button>
                        </div>

                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
