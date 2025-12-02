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

function TicketCard({ ticket, isDragging }: { ticket: Ticket; isDragging?: boolean }) {
    const priorityColors = {
        LOW: "bg-green-100 text-green-800",
        MEDIUM: "bg-yellow-100 text-yellow-800",
        HIGH: "bg-orange-100 text-orange-800",
        URGENT: "bg-red-100 text-red-800",
    };

    return (
        <div
            className={`bg-white p-3 rounded-lg border shadow-sm hover:shadow-md transition-shadow cursor-pointer ${isDragging ? "opacity-50" : ""
                }`}
        >
            <div className="flex justify-between items-start mb-2">
                <span className="font-semibold text-sm text-gray-900">
                    {ticket.ticketNumber || ticket.id.slice(0, 6)}
                </span>
                <Badge className={`text-xs ${priorityColors[ticket.priority]}`}>
                    {ticket.priority}
                </Badge>
            </div>
            <p className="text-sm text-gray-700 font-medium mb-1">{ticket.clientName}</p>
            <p className="text-xs text-gray-500 mb-2 line-clamp-2">{ticket.description}</p>
            <div className="flex items-center justify-between text-xs text-gray-400">
                <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span>{ticket.technicianName || "Sin asignar"}</span>
                </div>
                <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{new Date(ticket.createdAt.seconds * 1000).toLocaleDateString()}</span>
                </div>
            </div>
        </div>
    );
}

function SortableTicketCard({ ticket, onTicketClick }: { ticket: Ticket; onTicketClick: (ticket: Ticket) => void }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: ticket.id,
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} onClick={() => onTicketClick(ticket)}>
            <TicketCard ticket={ticket} isDragging={isDragging} />
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
            <DragOverlay>{activeTicket ? <TicketCard ticket={activeTicket} isDragging /> : null}</DragOverlay>
        </DndContext>
    );
}
