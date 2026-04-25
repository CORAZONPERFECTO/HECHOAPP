"use client";

import { useState } from "react";
import { Ticket, TicketStatus } from "@/types/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Clock, User, AlertCircle } from "lucide-react";
import { TicketCardRefactored } from "./ticket-card-refactored";

interface TicketKanbanProps {
    tickets: Ticket[];
    onTicketClick: (ticket: Ticket) => void;
}

const COLUMNS: { id: TicketStatus; title: string; color: string }[] = [
    { id: "OPEN", title: "Abierto", color: "bg-slate-100" },
    { id: "IN_PROGRESS", title: "En Progreso", color: "bg-blue-100" },
    { id: "WAITING_CLIENT", title: "Esperando Cliente", color: "bg-yellow-100" },
    { id: "WAITING_PARTS", title: "Esperando Repuestos", color: "bg-orange-100" },
    { id: "COMPLETED", title: "Completado", color: "bg-green-100" },
    { id: "CANCELLED", title: "Cancelado", color: "bg-red-100" },
];

// Se ha eliminado el TicketCard local para usar el TicketCardRefactored importado

function SortableTicketCard({ ticket, onTicketClick }: { ticket: Ticket; onTicketClick: (ticket: Ticket) => void }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: ticket.id,
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} onClick={() => onTicketClick(ticket)} className={isDragging ? "opacity-50" : ""}>
            <TicketCardRefactored ticketId={ticket.id} initialData={ticket} />
        </div>
    );
}

export function TicketKanban({ tickets, onTicketClick }: TicketKanbanProps) {
    const [activeId, setActiveId] = useState<string | null>(null);
    const sensors = useSensors(useSensor(PointerSensor));

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const ticketId = active.id as string;
        const newStatus = over.id as TicketStatus;

        // Update ticket status in Firebase
        try {
            await updateDoc(doc(db, "tickets", ticketId), {
                status: newStatus,
                updatedAt: new Date(),
            });
        } catch (error) {
            console.error("Error updating ticket status:", error);
        }
    };

    const activeTicket = activeId ? tickets.find((t) => t.id === activeId) : null;

    return (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {COLUMNS.map((column) => {
                    const columnTickets = tickets.filter((t) => t.status === column.id);
                    return (
                        <div key={column.id} className="flex flex-col">
                            <div className={`${column.color} rounded-t-lg p-3 border-b-2 border-gray-300`}>
                                <h3 className="font-semibold text-sm text-gray-800">{column.title}</h3>
                                <span className="text-xs text-gray-600">{columnTickets.length} tickets</span>
                            </div>
                            <SortableContext id={column.id} items={columnTickets.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                                <div className="bg-slate-50 p-2 space-y-2 min-h-[400px] rounded-b-lg">
                                    {columnTickets.map((ticket) => (
                                        <SortableTicketCard key={ticket.id} ticket={ticket} onTicketClick={onTicketClick} />
                                    ))}
                                    {columnTickets.length === 0 && (
                                        <div className="text-center py-8 text-gray-400 text-sm">
                                            <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                            Sin tickets
                                        </div>
                                    )}
                                </div>
                            </SortableContext>
                        </div>
                    );
                })}
            </div>
            <DragOverlay>{activeTicket ? <div className="opacity-80 scale-105"><TicketCardRefactored ticketId={activeTicket.id} initialData={activeTicket} /></div> : null}</DragOverlay>
        </DndContext>
    );
}
