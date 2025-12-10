"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getCountFromServer, Timestamp, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent } from "@/components/ui/card";
import { Ticket, AlertCircle, CheckCircle2, Banknote } from "lucide-react";

export function DashboardStats() {
    const [stats, setStats] = useState({
        open: 0,
        urgent: 0,
        completedToday: 0,
        income: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // 1. Open Tickets
                const openQuery = query(collection(db, "tickets"), where("status", "in", ["OPEN", "ASSIGNED", "IN_PROGRESS", "ON_ROUTE", "ON_SITE"]));
                const openSnapshot = await getCountFromServer(openQuery);

                // 2. Urgent Tickets (Open & Urgent)
                const urgentQuery = query(
                    collection(db, "tickets"),
                    where("priority", "==", "URGENT"),
                    where("status", "in", ["OPEN", "ASSIGNED", "IN_PROGRESS", "ON_ROUTE", "ON_SITE"])
                );
                const urgentSnapshot = await getCountFromServer(urgentQuery);

                // 3. Completed Today
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const completedQuery = query(
                    collection(db, "tickets"),
                    where("status", "==", "COMPLETED"),
                    where("updatedAt", ">=", Timestamp.fromDate(today))
                );
                const completedSnapshot = await getCountFromServer(completedQuery);

                // 4. Monthly Income
                const startMonth = new Date();
                startMonth.setDate(1);
                startMonth.setHours(0, 0, 0, 0);

                const incomeQuery = query(
                    collection(db, "payments"),
                    where("date", ">=", Timestamp.fromDate(startMonth))
                );
                const incomeSnap = await getDocs(incomeQuery);
                const totalIncome = incomeSnap.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);

                setStats({
                    open: openSnapshot.data().count,
                    urgent: urgentSnapshot.data().count,
                    completedToday: completedSnapshot.data().count,
                    income: totalIncome
                });
            } catch (error) {
                console.error("Error fetching dashboard stats:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    const statCards = [
        {
            title: "Ingresos (Mes)",
            value: `RD$ ${stats.income.toLocaleString()}`,
            icon: Banknote,
            color: "text-green-600",
            bg: "bg-green-100"
        },
        {
            title: "Tickets Abiertos",
            value: stats.open,
            icon: Ticket,
            color: "text-blue-600",
            bg: "bg-blue-100"
        },
        {
            title: "Urgencias",
            value: stats.urgent,
            icon: AlertCircle,
            color: "text-red-600",
            bg: "bg-red-100"
        },
        {
            title: "Terminados Hoy",
            value: stats.completedToday,
            icon: CheckCircle2,
            color: "text-purple-600",
            bg: "bg-purple-100"
        }
    ];

    if (loading) {
        return <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
            ))}
        </div>;
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {statCards.map((stat, index) => (
                <Card key={index} className="border-none shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                            <h3 className="text-2xl font-bold mt-1 text-gray-900">{stat.value}</h3>
                        </div>
                        <div className={`p-3 rounded-full ${stat.bg}`}>
                            <stat.icon className={`h-6 w-6 ${stat.color}`} />
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
