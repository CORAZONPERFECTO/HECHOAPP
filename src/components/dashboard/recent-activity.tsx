"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Ticket, Payment } from "@/types/schema";
import { Banknote, Wrench, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

type ActivityItem = {
    id: string;
    type: 'TICKET' | 'PAYMENT';
    title: string;
    subtitle: string;
    amount?: number;
    date: Date;
    status?: string;
};

export function RecentActivity() {
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchActivity = async () => {
            try {
                // Fetch recent tickets
                const ticketsQuery = query(collection(db, "tickets"), orderBy("createdAt", "desc"), limit(5));
                const ticketsSnap = await getDocs(ticketsQuery);
                const tickets = ticketsSnap.docs.map(doc => {
                    const data = doc.data() as Ticket;
                    return {
                        id: doc.id,
                        type: 'TICKET',
                        title: `Ticket #${data.ticketNumber || 'N/A'}`,
                        subtitle: data.clientName,
                        date: data.createdAt.toDate(),
                        status: data.status
                    } as ActivityItem;
                });

                // Fetch recent payments
                const paymentsQuery = query(collection(db, "payments"), orderBy("createdAt", "desc"), limit(5));
                const paymentsSnap = await getDocs(paymentsQuery);
                const payments = paymentsSnap.docs.map(doc => {
                    const data = doc.data() as Payment;
                    return {
                        id: doc.id,
                        type: 'PAYMENT',
                        title: `Pago Recibido`,
                        subtitle: data.clientName,
                        amount: data.amount,
                        date: data.createdAt.toDate()
                    } as ActivityItem;
                });

                // Merge and sort
                const all = [...tickets, ...payments]
                    .sort((a, b) => b.date.getTime() - a.date.getTime())
                    .slice(0, 5);

                setActivities(all);
            } catch (error) {
                console.error("Error loading activity", error);
            } finally {
                setLoading(false);
            }
        };

        fetchActivity();
    }, []);

    if (loading) {
        return <div className="h-[300px] bg-slate-50 animate-pulse rounded-xl" />;
    }

    return (
        <Card className="h-[386px]">
            <CardHeader>
                <CardTitle className="text-base font-semibold">Actividad Reciente</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {activities.map((item) => (
                        <div key={item.id} className="flex items-start gap-4">
                            <div className={`p-2 rounded-full ${item.type === 'PAYMENT' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                                {item.type === 'PAYMENT' ? <Banknote className="h-4 w-4" /> : <Wrench className="h-4 w-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                    {item.title}
                                </p>
                                <p className="text-xs text-gray-500 truncate">
                                    {item.subtitle}
                                </p>
                            </div>
                            <div className="text-right">
                                {item.amount ? (
                                    <p className="text-sm font-bold text-green-600">
                                        +RD$ {item.amount.toLocaleString()}
                                    </p>
                                ) : (
                                    <p className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full inline-block">
                                        {item.status}
                                    </p>
                                )}
                                <p className="text-xs text-gray-400 mt-1 flex items-center justify-end gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatDistanceToNow(item.date, { addSuffix: true, locale: es })}
                                </p>
                            </div>
                        </div>
                    ))}
                    {activities.length === 0 && (
                        <p className="text-center text-gray-500 text-sm py-4">No hay actividad reciente</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
