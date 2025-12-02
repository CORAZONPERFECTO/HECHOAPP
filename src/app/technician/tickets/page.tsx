"use client";

import { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot, where } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Ticket } from "@/types/schema";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { TicketStatusBadge } from "@/components/tickets/ticket-status-badge";
import { onAuthStateChanged } from "firebase/auth";

export default function TechnicianTicketsPage() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (user) {
                setUserId(user.uid);
            } else {
                router.push("/login");
            }
        });
        return () => unsubscribeAuth();
    }, [router]);

    useEffect(() => {
        if (!userId) return;

        // Query tickets where technicianId matches current user
        // Note: You might need a composite index for technicianId + createdAt
        // If it fails, try removing orderBy first to debug
        const q = query(
            collection(db, "tickets"),
            where("technicianId", "==", userId),
            orderBy("createdAt", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Ticket[];
            setTickets(data);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching tickets:", error);
            // Fallback if index is missing (client-side sort)
            if (error.code === 'failed-precondition') {
                const qSimple = query(
                    collection(db, "tickets"),
                    where("technicianId", "==", userId)
                );
                onSnapshot(qSimple, (snap) => {
                    const data = snap.docs.map((doc) => ({
                        id: doc.id,
                        ...doc.data(),
                    })) as Ticket[];
                    // Sort in memory
                    data.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
                    setTickets(data);
                    setLoading(false);
                });
            }
        });

        return () => unsubscribe();
    }, [userId]);

    const columns = [
        {
            header: "ID",
            accessorKey: "number" as keyof Ticket,
            className: "font-medium w-[100px]",
            cell: (item: Ticket) => item.ticketNumber || item.id.slice(0, 6)
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
            header: "Ubicación",
            accessorKey: "locationName" as keyof Ticket,
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
    ];

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" onClick={() => router.push("/")}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Volver
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Mis Tickets Asignados</h1>
                            <p className="text-gray-500">Tickets pendientes de atención</p>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-12">Cargando tickets...</div>
                ) : (
                    <DataTable
                        data={tickets}
                        columns={columns}
                        searchKey="clientName"
                        searchPlaceholder="Buscar por cliente..."
                        onRowClick={(item) => router.push(`/technician/tickets/${item.id}`)}
                    />
                )}
            </div>
        </div>
    );
}
