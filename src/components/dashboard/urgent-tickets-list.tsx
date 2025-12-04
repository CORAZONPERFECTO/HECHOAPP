"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs, limit, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Ticket } from "@/types/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

export function UrgentTicketsList() {
    const [urgentTickets, setUrgentTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const fetchUrgent = async () => {
            try {
                const q = query(
                    collection(db, "tickets"),
                    where("priority", "==", "URGENT"),
                    where("status", "in", ["OPEN", "ASSIGNED", "IN_PROGRESS"]),
                    orderBy("createdAt", "desc"),
                    limit(5)
                );

                const snapshot = await getDocs(q);
                setUrgentTickets(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Ticket)));
            } catch (error) {
                console.error("Error fetching urgent tickets:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchUrgent();
    }, []);

    if (loading) return <div className="h-40 bg-gray-100 animate-pulse rounded-xl"></div>;
    if (urgentTickets.length === 0) return null;

    return (
        <Card className="border-red-100 bg-red-50/50">
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold text-red-700 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Atención Requerida ({urgentTickets.length})
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    {urgentTickets.map(ticket => (
                        <div
                            key={ticket.id}
                            className="bg-white p-3 rounded-lg border border-red-100 shadow-sm flex justify-between items-center cursor-pointer hover:border-red-300 transition-colors"
                            onClick={() => router.push(`/tickets/${ticket.id}`)}
                        >
                            <div className="overflow-hidden">
                                <p className="font-medium text-gray-900 truncate">{ticket.clientName}</p>
                                <p className="text-xs text-gray-500 truncate">{ticket.serviceType.replace(/_/g, ' ')}</p>
                            </div>
                            <div className="flex items-center text-xs font-medium text-red-600 whitespace-nowrap">
                                Ver
                                <ArrowRight className="ml-1 h-3 w-3" />
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
