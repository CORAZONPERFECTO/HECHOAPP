"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, query, orderBy, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Ticket } from "@/types/schema";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { TokenGenerator } from "@/components/tickets/token-generator";
import { Plus, ArrowLeft, LayoutGrid, Calendar as CalendarIcon, List, Map as MapIcon, ShieldCheck, Filter } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TicketStatusBadge } from "@/components/tickets/ticket-status-badge";
import { TicketKanban } from "@/components/tickets/ticket-kanban";
import { TicketCalendar } from "@/components/tickets/ticket-calendar";
import { TicketMap } from "@/components/tickets/ticket-map";
import { SLAIndicator } from "@/components/tickets/sla-indicator";
import { SLADashboard } from "@/components/tickets/sla-dashboard";
import { startOfDay, endOfDay, addDays, isSameDay, isAfter, isBefore, startOfWeek, endOfWeek } from "date-fns";

type DateFilterType = "ALL" | "TODAY" | "TOMORROW" | "THIS_WEEK" | "UNSCHEDULED" | "OVERDUE";

export default function TicketsPage() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeView, setActiveView] = useState("list");
    const [dateFilter, setDateFilter] = useState<DateFilterType>("ALL");
    const router = useRouter();

    useEffect(() => {
        const q = query(collection(db, "tickets"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Ticket[];
            setTickets(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const filteredTickets = useMemo(() => {
        const now = new Date();
        const todayStart = startOfDay(now);
        const todayEnd = endOfDay(now);
        const tomorrowStart = startOfDay(addDays(now, 1));
        const tomorrowEnd = endOfDay(addDays(now, 1));
        const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
        const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

        let filtered = tickets.filter(ticket => {
            if (dateFilter === "ALL") return true;

            const scheduledDate = ticket.scheduledStart ? ticket.scheduledStart.toDate() : null;

            if (dateFilter === "UNSCHEDULED") return !scheduledDate;

            if (!scheduledDate) return false; // Other filters require a date

            if (dateFilter === "TODAY") {
                return isSameDay(scheduledDate, now);
            }
            if (dateFilter === "TOMORROW") {
                return isSameDay(scheduledDate, addDays(now, 1));
            }
            if (dateFilter === "THIS_WEEK") {
                return scheduledDate >= weekStart && scheduledDate <= weekEnd;
            }
            if (dateFilter === "OVERDUE") {
                // Scheduled in past and NOT closed/completed
                const isClosed = ["COMPLETED", "CANCELLED", "RESOLVED"].includes(ticket.status);
                return isBefore(scheduledDate, now) && !isClosed;
            }

            return true;
        });

        // SORTING:
        // 1. Scheduled ASC (Earliest first)
        // 2. Unscheduled (Newest created first)
        return filtered.sort((a, b) => {
            const dateA = a.scheduledStart ? a.scheduledStart.toDate().getTime() : Number.MAX_SAFE_INTEGER;
            const dateB = b.scheduledStart ? b.scheduledStart.toDate().getTime() : Number.MAX_SAFE_INTEGER;

            if (dateA !== dateB) {
                return dateA - dateB;
            }
            // Fallback to creation date
            return b.createdAt.toMillis() - a.createdAt.toMillis();
        });

    }, [tickets, dateFilter]);

    const columns = [
        {
            header: "ID",
            accessorKey: "number" as keyof Ticket,
            className: "font-medium w-[100px]",
        },
        {
            header: "Programado",
            accessorKey: "scheduledStart",
            cell: (item: Ticket) => {
                if (!item.scheduledStart) return <span className="text-gray-400 text-xs italic">No programado</span>;
                const date = item.scheduledStart.toDate();
                const isOverdue = isBefore(date, new Date()) && !["COMPLETED", "CANCELLED"].includes(item.status);
                return (
                    <div className="flex flex-col">
                        <span className={`text-sm font-medium ${isOverdue ? "text-red-600" : "text-gray-700"}`}>
                            {date.toLocaleDateString("es-DO", { day: '2-digit', month: '2-digit' })}
                        </span>
                        <span className="text-xs text-gray-500">
                            {date.toLocaleTimeString("es-DO", { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                );
            }
        },
        {
            header: "Cliente",
            accessorKey: "clientName" as keyof Ticket,
            cell: (item: Ticket) => (
                <div className="flex flex-col">
                    <span className="font-medium">{item.clientName}</span>
                    <span className="text-xs text-gray-500">Creado: {item.createdAt.toDate().toLocaleDateString()}</span>
                </div>
            )
        },
        {
            header: "Servicio",
            accessorKey: "serviceType" as keyof Ticket,
            cell: (item: Ticket) => (
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                    {item.serviceType.replace(/_/g, ' ')}
                </span>
            )
        },
        {
            header: "Técnico",
            accessorKey: "technicianName" as keyof Ticket,
            cell: (item: Ticket) => item.technicianName || <span className="text-gray-400 italic">Sin asignar</span>
        },
        {
            header: "Prioridad",
            accessorKey: "priority" as keyof Ticket,
            cell: (item: Ticket) => {
                const colors = {
                    'LOW': 'text-green-600',
                    'MEDIUM': 'text-yellow-600',
                    'HIGH': 'text-orange-600',
                    'URGENT': 'text-red-600 font-bold'
                };
                return <span className={colors[item.priority as keyof typeof colors] || ''}>{item.priority}</span>;
            }
        },
        {
            header: "Estado",
            cell: (item: Ticket) => <TicketStatusBadge status={item.status} />,
        },
        {
            header: "SLA",
            cell: (item: Ticket) => <SLAIndicator ticket={item} />,
        },
    ];

    const handleTicketClick = (ticket: Ticket) => {
        router.push(`/tickets/${ticket.id}`);
    };

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-[1600px] mx-auto space-y-6">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" onClick={() => router.push("/")}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Volver
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Tickets de Servicio</h1>
                            <p className="text-gray-500">Gestión operativa y seguimiento</p>
                        </div>
                    </div>
                </div>

                {/* Filters Section */}
                <div className="flex flex-wrap items-center gap-2 pb-2 bg-white p-2 rounded-lg border shadow-sm">
                    <div className="flex items-center gap-2 mr-2">
                        <Filter className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">Filtros:</span>
                    </div>
                    {[
                        { id: "ALL", label: "Todos" },
                        { id: "TODAY", label: "Hoy" },
                        { id: "TOMORROW", label: "Mañana" },
                        { id: "THIS_WEEK", label: "Esta Semana" },
                        { id: "UNSCHEDULED", label: "Sin Programar" },
                        { id: "OVERDUE", label: "Vencidos", color: "text-red-600 bg-red-50 border-red-200" }
                    ].map((filter) => (
                        <Button
                            key={filter.id}
                            variant={dateFilter === filter.id ? "default" : "outline"}
                            size="sm"
                            onClick={() => setDateFilter(filter.id as DateFilterType)}
                            className={filter.color && dateFilter !== filter.id ? filter.color : ""}
                        >
                            {filter.label}
                        </Button>
                    ))}

                    <div className="ml-auto flex gap-2">
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                    <ShieldCheck className="mr-2 h-4 w-4" />
                                    Link Externo
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                                <TokenGenerator />
                            </DialogContent>
                        </Dialog>
                        <Link href="/tickets/new">
                            <Button size="sm">
                                <Plus className="mr-2 h-4 w-4" />
                                Nuevo Ticket
                            </Button>
                        </Link>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-12">Cargando tickets...</div>
                ) : (
                    <>
                        <SLADashboard tickets={filteredTickets} />

                        <Tabs value={activeView} onValueChange={setActiveView} className="w-full">
                            <TabsList className="grid w-full max-w-2xl grid-cols-4 mb-6">
                                <TabsTrigger value="list" className="flex items-center gap-2">
                                    <List className="h-4 w-4" />
                                    Lista
                                </TabsTrigger>
                                <TabsTrigger value="kanban" className="flex items-center gap-2">
                                    <LayoutGrid className="h-4 w-4" />
                                    Kanban
                                </TabsTrigger>
                                <TabsTrigger value="calendar" className="flex items-center gap-2">
                                    <CalendarIcon className="h-4 w-4" />
                                    Calendario
                                </TabsTrigger>
                                <TabsTrigger value="map" className="flex items-center gap-2">
                                    <MapIcon className="h-4 w-4" />
                                    Mapa
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="list">
                                <DataTable
                                    data={filteredTickets}
                                    columns={columns}
                                    searchKey="clientName"
                                    searchPlaceholder="Buscar por cliente..."
                                    onRowClick={handleTicketClick}
                                />
                            </TabsContent>

                            <TabsContent value="kanban">
                                <TicketKanban tickets={filteredTickets} onTicketClick={handleTicketClick} />
                            </TabsContent>

                            <TabsContent value="calendar">
                                <TicketCalendar tickets={filteredTickets} onTicketClick={handleTicketClick} />
                            </TabsContent>

                            <TabsContent value="map">
                                <TicketMap tickets={filteredTickets} onTicketClick={handleTicketClick} />
                            </TabsContent>
                        </Tabs>
                    </>
                )}
            </div>
        </div>
    );
}

