"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, query, orderBy, onSnapshot, Timestamp, getDoc, doc, deleteDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Ticket } from "@/types/schema";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { TokenGenerator } from "@/components/tickets/token-generator";
import { DispatchOrderModal } from "@/components/tickets/dispatch-order-modal";
import { Plus, ArrowLeft, LayoutGrid, Calendar as CalendarIcon, List, Map as MapIcon, ShieldCheck, Filter, TrendingUp, AlertCircle, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TicketStatusBadge } from "@/components/tickets/ticket-status-badge";
import { TicketKanban } from "@/components/tickets/ticket-kanban";
import { TicketCalendar } from "@/components/tickets/ticket-calendar";
import { TicketMap } from "@/components/tickets/ticket-map";
import { SLAIndicator } from "@/components/tickets/sla-indicator";
import { SLADashboard } from "@/components/tickets/sla-dashboard";
import { startOfDay, endOfDay, addDays, isSameDay, isAfter, isBefore, startOfWeek, endOfWeek } from "date-fns";

type DateFilterType = "ALL" | "TODAY" | "TOMORROW" | "THIS_WEEK" | "UNSCHEDULED" | "OVERDUE" | "HISTORY" | "PENDING_BILLING";

import { useToast } from "@/components/ui/use-toast";

export default function TicketsPage() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [activeView, setActiveView] = useState("list");
    const [dateFilter, setDateFilter] = useState<DateFilterType>("ALL");
    const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        const unsub = auth.onAuthStateChanged(async (user) => {
            if (user) {
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (userDoc.exists()) {
                    setCurrentUserRole(userDoc.data().rol || null);
                }
            } else {
                setCurrentUserRole(null);
            }
        });
        return () => unsub();
    }, []);

    useEffect(() => {
        const q = query(collection(db, "tickets")); // Removed orderBy to allow pending serverTimestamps to render immediately
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Ticket[];
            setTickets(data);
            setLoading(false);
            setErrorMsg(null);
        }, (error) => {
            console.error("Firestore onSnapshot error:", error);
            setErrorMsg(error.message);
            setLoading(false);
            toast({
                variant: "destructive",
                title: "Error cargando tickets",
                description: error.message
            });
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

        const filtered = tickets.filter(ticket => {
            const isClosed = ["COMPLETED", "CANCELLED", "RESOLVED"].includes(ticket.status);
            const needsBilling = ticket.status === 'COMPLETED' && ticket.billingStatus !== 'BILLED' && ticket.billingStatus !== 'PAID';

            // Si estamos en Por Facturar, SOLO mostrar los completados no facturados
            if (dateFilter === "PENDING_BILLING") {
                return needsBilling;
            }

            // Si estamos en Histórico, SOLO mostrar los cerrados
            if (dateFilter === "HISTORY") {
                return isClosed;
            }

            // Para cualquier otro filtro (Activos), OCULTAR los cerrados
            if (isClosed) {
                return false;
            }

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
        // 1. Unscheduled (Requires action) -> Top
        // 2. Scheduled ASC (Earliest first)
        return filtered.sort((a, b) => {
            const dateA = a.scheduledStart ? a.scheduledStart.toDate().getTime() : 0;
            const dateB = b.scheduledStart ? b.scheduledStart.toDate().getTime() : 0;

            if (dateA !== dateB) {
                return dateA - dateB;
            }
            // Fallback to creation date, safely handle Firebase serverTimestamp local pending state
            const createdA = a.createdAt?.toMillis ? a.createdAt.toMillis() : Date.now();
            const createdB = b.createdAt?.toMillis ? b.createdAt.toMillis() : Date.now();
            return createdB - createdA;
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
            accessorKey: "scheduledStart" as keyof Ticket,
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
                    <span className="text-xs text-gray-500">Creado: {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString() : 'Justo ahora'}</span>
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
            cell: (item: Ticket) => <TicketStatusBadge status={item.status} ticket={item} />,
        },
        {
            header: "SLA",
            cell: (item: Ticket) => <SLAIndicator ticket={item} />,
        },
        {
            header: "",
            id: "actions",
            cell: (item: Ticket) => {
                const isSuperUser = auth.currentUser?.email?.toLowerCase() === 'lcaa27@gmail.com';
                const hasRole = currentUserRole === 'ADMIN' || currentUserRole === 'GERENTE' || currentUserRole === 'GERENTE_TICKETS';
                if (!isSuperUser && !hasRole) return null;
                
                return (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"
                        onClick={async (e) => {
                            e.stopPropagation();
                            if (confirm(`¿Eliminar ticket ${item.ticketNumber}?`)) {
                                try {
                                    await deleteDoc(doc(db, "tickets", item.id));
                                } catch (error) {
                                    console.error("Error deleting:", error);
                                    alert("No se pudo eliminar.");
                                }
                            }
                        }}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                );
            },
        },
    ];

    const handleTicketClick = (ticket: Ticket) => {
        router.push(`/tickets/${ticket.id}`);
    };

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8">
            <div className="max-w-[1600px] mx-auto space-y-4 md:space-y-6">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-start md:items-center gap-3">
                        <Button variant="ghost" size="icon" onClick={() => router.push("/")} className="mt-1 md:mt-0 flex-shrink-0">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <div className="flex items-center flex-wrap gap-2">
                                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight">Tickets de Servicio</h1>
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                    <div className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></div>
                                    Online
                                </Badge>
                            </div>
                            <p className="text-sm md:text-base text-gray-500 mt-1">Gestión operativa y seguimiento</p>
                        </div>
                    </div>
                </div>

                {/* Filters Section */}
                <div className="flex flex-col xl:flex-row xl:items-center gap-4 bg-white p-3 md:p-4 rounded-xl border shadow-sm">
                    <div className="flex items-center gap-2 mb-1 xl:mb-0 flex-shrink-0">
                        <Filter className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">Filtros:</span>
                    </div>
                    
                    {/* Botones de Filtro - Hacen wrap automáticamente */}
                    <div className="flex flex-wrap gap-2 flex-1">
                        {[
                            { id: "ALL", label: "Todos (Activos)" },
                            { id: "PENDING_BILLING", label: "Por Facturar", color: "text-orange-700 bg-orange-100 border-orange-300 font-bold" },
                            { id: "TODAY", label: "Hoy" },
                            { id: "TOMORROW", label: "Mañana" },
                            { id: "THIS_WEEK", label: "Esta Semana" },
                            { id: "UNSCHEDULED", label: "Sin Programar" },
                            { id: "OVERDUE", label: "Vencidos", color: "text-red-600 bg-red-50 border-red-200" },
                            { id: "HISTORY", label: "Histórico (Cerrados)", color: "text-gray-600 bg-gray-100 border-gray-300" }
                        ].map((filter) => (
                            <Button
                                key={filter.id}
                                variant={dateFilter === filter.id ? "default" : "outline"}
                                size="sm"
                                onClick={() => setDateFilter(filter.id as DateFilterType)}
                                className={`flex-grow sm:flex-grow-0 whitespace-nowrap ${filter.color && dateFilter !== filter.id ? filter.color : ""}`}
                            >
                                {filter.label}
                            </Button>
                        ))}
                    </div>

                    {/* Botones de Acción */}
                    <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full xl:w-auto mt-2 xl:mt-0 border-t xl:border-t-0 xl:border-l pt-3 xl:pt-0 xl:pl-4">
                        <Link href="/tickets/analytics" className="flex-1 sm:flex-none">
                            <Button variant="outline" size="sm" className="w-full gap-2">
                                <TrendingUp className="h-4 w-4" />
                                <span className="hidden sm:inline">Analítica</span>
                            </Button>
                        </Link>
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
                                    <ShieldCheck className="mr-2 h-4 w-4" />
                                    <span className="hidden sm:inline">Link Externo</span>
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                                <TokenGenerator />
                            </DialogContent>
                        </Dialog>
                        <DispatchOrderModal />
                        <Link href="/tickets/new" className="flex-1 sm:flex-none">
                            <Button size="sm" className="w-full">
                                <Plus className="mr-2 h-4 w-4" />
                                Nuevo Ticket
                            </Button>
                        </Link>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-16">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-500">Cargando tickets...</p>
                    </div>
                ) : errorMsg ? (
                    <div className="text-center py-16 bg-red-50 rounded-xl border border-red-100">
                        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-red-900 mb-2">Error al cargar tickets</h3>
                        <p className="text-red-700">{errorMsg}</p>
                    </div>
                ) : (
                    <>
                        <SLADashboard />

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
                                    Operaciones
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

