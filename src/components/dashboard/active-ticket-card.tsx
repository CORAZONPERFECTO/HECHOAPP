"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs, limit, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Ticket } from "@/types/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, ArrowRight, Clock } from "lucide-react";
import { useRouter } from "next/navigation";

export function ActiveTicketCard() {
    const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    // Quick auth check - in real app use context
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        // Dynamic import to avoid SSR issues with auth
        import("@/lib/firebase").then(({ auth }) => {
            const unsubscribe = auth.onAuthStateChanged((user) => {
                if (user) {
                    setUserId(user.uid);
                } else {
                    setLoading(false);
                }
            });
            return () => unsubscribe();
        });
    }, []);

    useEffect(() => {
        if (!userId) return;

        const fetchActiveTicket = async () => {
            try {
                // Modified query to avoid "Index Required" error.
                // We fetch all active tickets for the user and sort/limit in client-side.
                const q = query(
                    collection(db, "tickets"),
                    where("technicianId", "==", userId),
                    where("status", "in", ["ASSIGNED", "ON_ROUTE", "ON_SITE", "IN_PROGRESS"])
                    // Removed orderBy and limit to bypass index requirement
                );

                const snapshot = await getDocs(q);
                if (!snapshot.empty) {
                    // Sort by updatedAt desc in memory
                    const tickets = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Ticket));
                    tickets.sort((a, b) => {
                        const dateA = a.updatedAt instanceof Date ? a.updatedAt.getTime() : (a.updatedAt as any)?.seconds * 1000 || 0;
                        const dateB = b.updatedAt instanceof Date ? b.updatedAt.getTime() : (b.updatedAt as any)?.seconds * 1000 || 0;
                        return dateB - dateA;
                    });

                    setActiveTicket(tickets[0]);
                }
            } catch (error) {
                console.error("Error fetching active ticket:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchActiveTicket();
    }, [userId]);

    if (loading) return null;
    if (!activeTicket) return null; // Don't show if no active ticket

    const statusColors = {
        'ASSIGNED': 'bg-blue-100 text-blue-800',
        'ON_ROUTE': 'bg-yellow-100 text-yellow-800',
        'ON_SITE': 'bg-purple-100 text-purple-800',
        'IN_PROGRESS': 'bg-green-100 text-green-800'
    };

    const statusLabels = {
        'ASSIGNED': 'Asignado',
        'ON_ROUTE': 'En Camino',
        'ON_SITE': 'En Sitio',
        'IN_PROGRESS': 'Trabajando'
    };

    return (
        <Card className="bg-blue-50 border-blue-200 mb-8">
            <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-lg font-bold text-blue-900 flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Tu Misión Actual
                    </CardTitle>
                    <Badge variant="outline" className={`${statusColors[activeTicket.status as keyof typeof statusColors]} border-transparent ${['ON_ROUTE', 'ON_SITE', 'IN_PROGRESS'].includes(activeTicket.status) ? 'animate-pulse' : ''}`}>
                        {statusLabels[activeTicket.status as keyof typeof statusLabels] || activeTicket.status}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
                    <div className="space-y-1">
                        <h3 className="font-bold text-xl text-gray-900">{activeTicket.clientName}</h3>
                        <div className="flex items-center text-gray-600 text-sm">
                            <MapPin className="h-4 w-4 mr-1" />
                            {activeTicket.locationName || "Sin dirección"}
                        </div>
                        <p className="text-sm text-gray-500 line-clamp-1">{activeTicket.description}</p>
                    </div>
                    <Button
                        onClick={() => router.push(`/technician/tickets/${activeTicket.id}`)}
                        className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 shadow-md"
                    >
                        Continuar
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
