"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Ticket } from "@/types/schema";
import { collection, query, where, getDocs, doc, writeBatch, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2, Route, GripVertical } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableItem({ ticket }: { ticket: Ticket }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: ticket.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} className="flex items-center gap-3 bg-white border rounded-lg p-3 shadow-sm mb-2 z-50">
            <button className="touch-none cursor-grab active:cursor-grabbing text-gray-400" {...attributes} {...listeners}>
                <GripVertical className="h-5 w-5" />
            </button>
            <div className="flex-1 overflow-hidden">
                <p className="font-semibold text-sm truncate">{ticket.ticketNumber || ticket.id.slice(0, 6)} - {ticket.clientName}</p>
                <p className="text-xs text-gray-500 truncate">{ticket.serviceType}</p>
            </div>
            <div className={`px-2 py-1 rounded text-xs font-bold shrink-0 ${ticket.priority === 'URGENT' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                {ticket.priority}
            </div>
        </div>
    );
}

export function DispatchOrderModal() {
    const [technicians, setTechnicians] = useState<User[]>([]);
    const [selectedTechId, setSelectedTechId] = useState<string>("");
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [open, setOpen] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Fetch technicians only when opened
    useEffect(() => {
        if (!open) return;
        const fetchTechs = async () => {
            const q = query(collection(db, "users"), where("rol", "in", ["TECNICO"]));
            // We should ideally fetch all who can have tickets, maybe SUPERVISOR too.
            // But let's fetch everyone that has rol TECNICO. If needed, we can expand.
            const snap = await getDocs(q);
            setTechnicians(snap.docs.map(d => ({ id: d.id, ...d.data() } as User)));
        };
        fetchTechs();
    }, [open]);

    // Listen to tech's tickets
    useEffect(() => {
        if (!selectedTechId || !open) {
            setTickets([]);
            return;
        }
        setLoading(true);
        const q = query(
            collection(db, "tickets"),
            where("technicianId", "==", selectedTechId),
            where("status", "in", ["OPEN", "IN_PROGRESS", "WAITING_CLIENT", "WAITING_PARTS"])
        );
        const unsub = onSnapshot(q, (snap) => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Ticket));
            
            // Sort by existing executionOrder, then fallback to priority/date
            const priorityWeight = { "URGENT": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1 };
            data.sort((a, b) => {
                const orderA = a.executionOrder !== undefined ? a.executionOrder : Number.MAX_SAFE_INTEGER;
                const orderB = b.executionOrder !== undefined ? b.executionOrder : Number.MAX_SAFE_INTEGER;
                if (orderA !== orderB) return orderA - orderB;

                const weightA = priorityWeight[a.priority as keyof typeof priorityWeight] || 0;
                const weightB = priorityWeight[b.priority as keyof typeof priorityWeight] || 0;
                if (weightA !== weightB) return weightB - weightA;

                return (a.createdAt?.toMillis ? a.createdAt.toMillis() : 0) - (b.createdAt?.toMillis ? b.createdAt.toMillis() : 0);
            });
            setTickets(data);
            setLoading(false);
        });
        return () => unsub();
    }, [selectedTechId, open]);

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setTickets((items) => {
                const oldIndex = items.findIndex((t) => t.id === active.id);
                const newIndex = items.findIndex((t) => t.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const handleSaveOrder = async () => {
        setSaving(true);
        try {
            const batch = writeBatch(db);
            tickets.forEach((ticket, index) => {
                const ref = doc(db, "tickets", ticket.id);
                batch.update(ref, { executionOrder: index });
            });
            await batch.commit();
            alert("Orden de despacho actualizado correctamente. El técnico lo verá reflejado inmediatamente.");
            setOpen(false); // Close modal on success
        } catch (error) {
            console.error("Error saving order:", error);
            alert("Error al guardar el orden.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Route className="h-4 w-4 text-purple-600" />
                    <span className="hidden sm:inline">Despacho</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Orden de Despacho Diario</DialogTitle>
                </DialogHeader>
                
                <div className="py-2 z-50">
                    <Select value={selectedTechId} onValueChange={setSelectedTechId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Seleccionar Técnico..." />
                        </SelectTrigger>
                        <SelectContent className="z-50">
                            {technicians.map(t => (
                                <SelectItem key={t.id} value={t.id}>{t.nombre}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 bg-slate-50 rounded-lg p-2 z-10">
                    {loading ? (
                        <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
                    ) : tickets.length === 0 ? (
                        <p className="text-center text-gray-500 mt-10">No hay tickets activos para este técnico.</p>
                    ) : (
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext items={tickets.map(t => t.id)} strategy={verticalListSortingStrategy}>
                                {tickets.map(ticket => <SortableItem key={ticket.id} ticket={ticket} />)}
                            </SortableContext>
                        </DndContext>
                    )}
                </div>

                <div className="pt-4 border-t mt-auto">
                    <Button onClick={handleSaveOrder} disabled={saving || tickets.length === 0} className="w-full bg-purple-600 hover:bg-purple-700">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Guardar Orden de Despacho
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
