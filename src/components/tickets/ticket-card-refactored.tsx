// src/components/tickets/ticket-card-refactored.tsx
"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Ticket } from "@/types/schema";
import { Badge } from "@/components/ui/badge";
import { SyncStatus } from "@/components/shared/sync-status";
import { Clock, User, CheckCircle, Wrench, MoreVertical, X } from "lucide-react";

interface TicketCardProps {
    ticketId: string;
    initialData: Ticket;
    onClick?: () => void;
}

export function TicketCardRefactored({ ticketId, initialData, onClick }: TicketCardProps) {
    const [ticket, setTicket] = useState<Ticket>(initialData);
    const [hasPendingWrites, setHasPendingWrites] = useState(false);
    const [showQuickActions, setShowQuickActions] = useState(false);

    // 1. Offline-First: Escuchar cambios y el estado de sincronización de Firestore
    useEffect(() => {
        const unsubscribe = onSnapshot(
            doc(db, "tickets", ticketId),
            { includeMetadataChanges: true },
            (docSnapshot) => {
                if (docSnapshot.exists()) {
                    setTicket({ id: docSnapshot.id, ...docSnapshot.data() } as Ticket);
                    // Actualiza el estado visual del Sync
                    setHasPendingWrites(docSnapshot.metadata.hasPendingWrites);
                }
            }
        );
        return () => unsubscribe();
    }, [ticketId]);

    const handleStatusChange = async (newStatus: "IN_PROGRESS" | "COMPLETED") => {
        // La actualización de UI será instantánea gracias a Firestore Offline Cache
        await updateDoc(doc(db, "tickets", ticketId), {
            status: newStatus,
            updatedAt: serverTimestamp(),
        });
        setShowQuickActions(false);
    };

    const priorityColors = {
        LOW: "bg-green-100 text-green-800 border-green-200",
        MEDIUM: "bg-yellow-100 text-yellow-800 border-yellow-200",
        HIGH: "bg-orange-100 text-orange-800 border-orange-200",
        URGENT: "bg-red-100 text-red-800 border-red-200",
    };

    return (
        // 2. Container Queries: Definimos @container y container-type: inline-size
        <div className="@container w-full relative" onClick={onClick}>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col transition-all duration-200 hover:shadow-md h-full cursor-pointer">
                
                {/* Cabecera Responsiva */}
                <div className="p-4 border-b border-gray-50 flex items-center justify-between gap-3 bg-gray-50/50">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <span className="font-bold text-gray-900 truncate">
                            {ticket.ticketNumber || ticket.id.slice(0, 8)}
                        </span>
                        <Badge variant="outline" className={`${priorityColors[ticket.priority]}`}>
                            {ticket.priority}
                        </Badge>
                    </div>
                    <SyncStatus hasPendingWrites={hasPendingWrites} />
                </div>

                {/* Contenido Adaptativo basado en Container Queries (@) */}
                <div className="p-4 flex-1">
                    
                    {/* Oculto a menos de 350px. Usamos block solo en @min-[350px] */}
                    <div className="hidden @min-[350px]:block mb-3">
                        <h4 className="font-semibold text-gray-800 text-base">{ticket.clientName}</h4>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span>
                                SLA: {new Date(ticket.createdAt.seconds * 1000).toLocaleDateString()}
                            </span>
                        </div>
                    </div>

                    {/* Descripción con texto adaptativo / clamp */}
                    {/* Oculto en extremado pequeño, para optimizar espacio */}
                    <div className="hidden @min-[350px]:block overflow-hidden relative">
                        <p className="text-gray-600 line-clamp-2 md:line-clamp-3 leading-relaxed" 
                           style={{ fontSize: "clamp(0.85rem, 2.5cqw, 1rem)" }}>
                            {ticket.description || "Sin descripción proporcionada..."}
                        </p>
                    </div>

                    {/* Grilla Avanzada a más de 600px */}
                    <div className="hidden @min-[600px]:grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100">
                        <div className="space-y-2">
                            <span className="text-xs font-medium uppercase tracking-wider text-gray-400">Detalles Técnicos</span>
                            <div className="flex items-center gap-2 text-sm text-gray-700 bg-slate-50 p-2 rounded-lg">
                                <User className="w-4 h-4 text-blue-500" />
                                {ticket.technicianName || "Sin asignar"}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <span className="text-xs font-medium uppercase tracking-wider text-gray-400">Progreso Actual</span>
                            <div className="flex items-center gap-2 text-sm font-medium">
                                <Badge className={ticket.status === 'COMPLETED' ? "bg-green-500" : "bg-blue-500"}>
                                    {ticket.status.replace("_", " ")}
                                </Badge>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer simple (solo en @max-[599px] y @min-[350px]) */}
                <div className="p-3 bg-gray-50 flex items-center justify-between border-t border-gray-100 @min-[600px]:hidden @min-[350px]:flex hidden">
                    <span className="text-xs text-gray-500">{ticket.technicianName || "Sin asignar"}</span>
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowQuickActions(true);
                        }} 
                        className="p-1.5 bg-gray-200/50 rounded-md hover:bg-gray-200 transition-colors"
                    >
                        <MoreVertical className="w-4 h-4 text-gray-600" />
                    </button>
                </div>
            </div>

            {/* 3. Mobile-First: Quick Actions Bottom Sheet */}
            {/* Solo se monta si el técnico abre las acciones rápidas (optimizado para dedo pulgar) */}
            {showQuickActions && (
                <div className="absolute inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-[0_-8px_30px_rgb(0,0,0,0.12)] border border-gray-200 transform transition-transform duration-300 ease-out p-5 pb-8 animate-in slide-in-from-bottom-5">
                    <div className="flex justify-between items-center mb-5">
                        <h3 className="font-bold text-gray-900">Acciones de Ticket</h3>
                        <button 
                            onClick={() => setShowQuickActions(false)} 
                            className="p-2bg-gray-100 hover:bg-gray-200 rounded-full"
                        >
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            onClick={() => handleStatusChange("IN_PROGRESS")}
                            className="flex flex-col items-center justify-center p-4 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors active:scale-95"
                        >
                            <Wrench className="w-6 h-6 mb-2" />
                            <span className="font-semibold text-sm">En Proceso</span>
                        </button>

                        <button 
                            onClick={() => handleStatusChange("COMPLETED")}
                            className="flex flex-col items-center justify-center p-4 rounded-xl border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 transition-colors active:scale-95"
                        >
                            <CheckCircle className="w-6 h-6 mb-2" />
                            <span className="font-semibold text-sm">Finalizar</span>
                        </button>
                    </div>
                </div>
            )}
            
            {/* Overlay para el bottom sheet */}
            {showQuickActions && (
                <div 
                    className="absolute inset-0 bg-black/5 z-40 rounded-xl"
                    onClick={() => setShowQuickActions(false)}
                />
            )}
        </div>
    );
}
