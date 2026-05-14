"use client";

import { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Ticket, TicketEvent } from "@/types/tickets";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Wrench, Send, Loader2, AlertTriangle, ShieldAlert } from "lucide-react";
import { TicketTimeline } from "./ticket-timeline";

interface TicketToolsReportProps {
    ticket: Ticket;
    currentUser: { id: string; name: string };
    events: TicketEvent[];
}

export function TicketToolsReport({ ticket, currentUser, events }: TicketToolsReportProps) {
    const [toolName, setToolName] = useState("");
    const [toolStatus, setToolStatus] = useState<string>("DAÑADA");
    const [description, setDescription] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleReportTool = async () => {
        if (!toolName.trim() || !description.trim()) return;

        setIsSubmitting(true);
        try {
            const fullDescription = `🛠️ REPORTE DE HERRAMIENTA: ${toolName}\nESTADO: ${toolStatus}\n\nDetalles: ${description}`;

            await addDoc(collection(db, "ticketEvents"), {
                ticketId: ticket.id,
                userId: currentUser.id,
                userName: currentUser.name || "Técnico",
                type: 'TOOL_REPORT',
                description: fullDescription,
                metadata: {
                    toolName,
                    toolStatus,
                    reportedAt: new Date().toISOString()
                },
                timestamp: serverTimestamp()
            });

            setToolName("");
            setDescription("");
            alert("Herramienta reportada exitosamente. El administrador ha sido notificado.");
        } catch (error) {
            console.error("Error reporting tool:", error);
            alert("Error al reportar la herramienta.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Filter events to only show TOOL_REPORT and COMMENTs so they can chat
    const relevantEvents = events.filter(e => e.type === 'TOOL_REPORT' || e.type === 'COMMENT');

    return (
        <div className="space-y-6">
            <Card className="border-orange-200 bg-orange-50/50">
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2 text-orange-800">
                        <Wrench className="h-5 w-5" />
                        Reporte de Herramientas
                    </CardTitle>
                    <CardDescription className="text-orange-700/80">
                        Usa esta sección para reportar herramientas de trabajo que están fallando, se dañaron o necesitas solicitar para futuros servicios (No usar para caja chica/consumibles).
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">Nombre de la Herramienta</label>
                            <input 
                                className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background"
                                placeholder="Ej: Taladro Dewalt, Manómetro..."
                                value={toolName}
                                onChange={(e) => setToolName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">Estado / Situación</label>
                            <Select value={toolStatus} onValueChange={setToolStatus}>
                                <SelectTrigger className="bg-white">
                                    <SelectValue placeholder="Selecciona el estado" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="DAÑADA">🔴 Dañada (No Funciona)</SelectItem>
                                    <SelectItem value="FALLANDO">🟠 Fallando (Requiere Taller)</SelectItem>
                                    <SelectItem value="PERDIDA">⚫ Perdida / Extraviada</SelectItem>
                                    <SelectItem value="NUEVA_SOLICITUD">🟢 Solicitar Nueva Herramienta</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Descripción detallada</label>
                        <Textarea 
                            placeholder="Explica qué le pasó a la herramienta o por qué la necesitas..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="bg-white min-h-[80px]"
                        />
                    </div>

                    <Button 
                        onClick={handleReportTool} 
                        disabled={isSubmitting || !toolName.trim() || !description.trim()}
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white gap-2"
                    >
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
                        {isSubmitting ? "Enviando..." : "Enviar Reporte Oficial"}
                    </Button>
                </CardContent>
            </Card>

            <div className="pt-4 border-t">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-gray-500" />
                    Historial y Respuestas
                </h3>
                <TicketTimeline 
                    events={relevantEvents} 
                    ticketId={ticket.id} 
                    currentUserId={currentUser.id}
                    currentUserName={currentUser.name}
                />
            </div>
        </div>
    );
}
