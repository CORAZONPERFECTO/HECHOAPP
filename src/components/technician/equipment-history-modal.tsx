"use client";

import { useEffect, useState } from "react";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Ticket } from "@/types/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { History, Wrench, Calendar, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface EquipmentHistoryModalProps {
    equipmentId?: string;
    locationId?: string;
}

export function EquipmentHistoryModal({ equipmentId, locationId }: EquipmentHistoryModalProps) {
    const [open, setOpen] = useState(false);
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!open || (!equipmentId && !locationId)) return;

        const fetchHistory = async () => {
            setLoading(true);
            try {
                let q;
                if (equipmentId) {
                    q = query(
                        collection(db, "tickets"),
                        where("equipmentId", "==", equipmentId),
                        where("status", "==", "COMPLETED"),
                        orderBy("createdAt", "desc")
                    );
                } else if (locationId) {
                    q = query(
                        collection(db, "tickets"),
                        where("locationId", "==", locationId),
                        where("status", "==", "COMPLETED"),
                        orderBy("createdAt", "desc")
                    );
                }

                if (q) {
                    const snapshot = await getDocs(q);
                    const data = snapshot.docs.map((doc) => ({
                        id: doc.id,
                        ...doc.data(),
                    })) as Ticket[];
                    setTickets(data);
                }
            } catch (error) {
                console.error("Error fetching equipment history:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [open, equipmentId, locationId]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <History className="mr-2 h-4 w-4" />
                    Ver Historial
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <History className="h-5 w-5" />
                        Historial de Servicios
                    </DialogTitle>
                </DialogHeader>

                {loading ? (
                    <div className="text-center py-8 text-gray-500">Cargando historial...</div>
                ) : tickets.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <Wrench className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p>No hay servicios previos registrados</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {tickets.map((ticket) => (
                            <div key={ticket.id} className="border rounded-lg p-4 bg-slate-50">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <p className="font-semibold text-gray-900">
                                            {ticket.ticketNumber || ticket.id.slice(0, 8)}
                                        </p>
                                        <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                                            <Calendar className="h-3 w-3" />
                                            {new Date(ticket.createdAt.seconds * 1000).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <Badge variant="outline">{ticket.serviceType.replace(/_/g, " ")}</Badge>
                                </div>

                                {ticket.diagnosis && (
                                    <div className="mb-2">
                                        <p className="text-xs font-semibold text-gray-700 mb-1">Diagnóstico:</p>
                                        <p className="text-sm text-gray-600 bg-white p-2 rounded">{ticket.diagnosis}</p>
                                    </div>
                                )}

                                {ticket.solution && (
                                    <div className="mb-2">
                                        <p className="text-xs font-semibold text-gray-700 mb-1">Solución Aplicada:</p>
                                        <p className="text-sm text-gray-600 bg-white p-2 rounded">{ticket.solution}</p>
                                    </div>
                                )}

                                {ticket.technicianName && (
                                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-2">
                                        <User className="h-3 w-3" />
                                        Técnico: {ticket.technicianName}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
