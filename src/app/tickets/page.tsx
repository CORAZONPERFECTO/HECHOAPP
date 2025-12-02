"use client";

import { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Ticket } from "@/types/schema";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, ArrowLeft, LayoutGrid, Calendar as CalendarIcon, List, Map as MapIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TicketStatusBadge } from "@/components/tickets/ticket-status-badge";
import { TicketKanban } from "@/components/tickets/ticket-kanban";
import { TicketCalendar } from "@/components/tickets/ticket-calendar";
import { TicketMap } from "@/components/tickets/ticket-map";
import { SLAIndicator } from "@/components/tickets/sla-indicator";
import { SLADashboard } from "@/components/tickets/sla-dashboard";

export default function TicketsPage() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeView, setActiveView] = useState("list");
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

    const columns = [
        {
            header: "ID",
            accessorKey: "number" as keyof Ticket,
            className: "font-medium w-[100px]",
        },
        {
            header: "Cliente",
            accessorKey: "clientName" as keyof Ticket,
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
                <div className="flex justify-between items-center">
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
                    <Link href="/tickets/new">
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Crear Ticket
                        </Button>
                    </Link>
                </div>

                {loading ? (
                    <div className="text-center py-12">Cargando tickets...</div>
                ) : (
                    <>
                        <SLADashboard tickets={tickets} />

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
                                    data={tickets}
                                    columns={columns}
                                    searchKey="clientName"
                                    searchPlaceholder="Buscar por cliente..."
                                    onRowClick={handleTicketClick}
                                />
                            </TabsContent>

                            <TabsContent value="kanban">
                                <TicketKanban tickets={tickets} onTicketClick={handleTicketClick} />
                            </TabsContent>

                            <TabsContent value="calendar">
                                <TicketCalendar tickets={tickets} onTicketClick={handleTicketClick} />
                            </TabsContent>

                            <TabsContent value="map">
                                <TicketMap tickets={tickets} onTicketClick={handleTicketClick} />
                            </TabsContent>
                        </Tabs>
                    </>
                )}
            </div>
        </div>
    );
}
