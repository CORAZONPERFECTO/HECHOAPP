"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getCountFromServer, Timestamp, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent } from "@/components/ui/card";
import { Ticket, AlertCircle, CheckCircle2, Banknote, Clock, TrendingUp } from "lucide-react";
import { DateRange } from "react-day-picker";

interface DashboardStatsProps {
    dateRange?: DateRange;
}

export function DashboardStats({ dateRange }: DashboardStatsProps) {
    const [stats, setStats] = useState({
        open: 0,
        urgent: 0,
        completedToday: 0,
        income: 0,
        pendingReceivables: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // 1. Open Tickets
                const openQuery = query(collection(db, "tickets"), where("status", "in", ["OPEN", "ASSIGNED", "IN_PROGRESS", "ON_ROUTE", "ON_SITE", "WAITING_CLIENT", "WAITING_PARTS"]));
                const openSnapshot = await getCountFromServer(openQuery);

                // 2. Urgent Tickets
                const urgentQuery = query(
                    collection(db, "tickets"),
                    where("priority", "in", ["URGENT", "HIGH"]),
                    where("status", "in", ["OPEN", "ASSIGNED", "IN_PROGRESS", "ON_ROUTE", "ON_SITE", "WAITING_CLIENT", "WAITING_PARTS"])
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

                // 4. Income (Filtered by DateRange or Month)
                let incomeQuery;
                if (dateRange?.from) {
                    const start = Timestamp.fromDate(dateRange.from);
                    const end = dateRange.to ? Timestamp.fromDate(new Date(dateRange.to.setHours(23, 59, 59, 999))) : Timestamp.now();

                    incomeQuery = query(
                        collection(db, "payments"),
                        where("date", ">=", start),
                        where("date", "<=", end)
                    );
                } else {
                    const startMonth = new Date();
                    startMonth.setDate(1);
                    startMonth.setHours(0, 0, 0, 0);
                    incomeQuery = query(
                        collection(db, "payments"),
                        where("date", ">=", Timestamp.fromDate(startMonth))
                    );
                }

                const incomeSnap = await getDocs(incomeQuery);
                const totalIncome = incomeSnap.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);

                // 5. Cuentas por Cobrar (Invoices not fully paid)
                const invoicesSnap = await getDocs(query(collection(db, "invoices")));
                let totalPending = 0;
                invoicesSnap.docs.forEach((doc) => {
                    const inv = doc.data();
                    if (inv.status !== "PAID" && inv.status !== "CANCELLED") {
                        const balance = (inv.total || 0) - (inv.paidAmount || 0);
                        if (balance > 0) totalPending += balance;
                    }
                });

                setStats({
                    open: openSnapshot.data().count,
                    urgent: urgentSnapshot.data().count,
                    completedToday: completedSnapshot.data().count,
                    income: totalIncome,
                    pendingReceivables: totalPending,
                });
            } catch (error) {
                console.error("Error fetching dashboard stats:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [dateRange]);

    const statCards = [
        {
            title: dateRange?.from ? "Cobrado (Periodo)" : "Cobrado (Mes)",
            value: `RD$ ${stats.income.toLocaleString()}`,
            icon: Banknote,
            color: "text-emerald-600",
            bg: "bg-emerald-50 border border-emerald-100 dark:bg-emerald-950/30"
        },
        {
            title: "Por Cobrar (Pendiente)",
            value: `RD$ ${stats.pendingReceivables.toLocaleString()}`,
            icon: Clock,
            color: "text-amber-600",
            bg: "bg-amber-50 border border-amber-100 dark:bg-amber-950/30"
        },
        {
            title: "Tickets Activos",
            value: stats.open,
            subtitle: stats.urgent > 0 ? `${stats.urgent} de alta prioridad` : "Al día",
            icon: Ticket,
            color: "text-blue-600",
            bg: "bg-blue-50 border border-blue-100 dark:bg-blue-950/30"
        },
        {
            title: "Terminados Hoy",
            value: stats.completedToday,
            subtitle: "Servicios cerrados",
            icon: CheckCircle2,
            color: "text-purple-600",
            bg: "bg-purple-50 border border-purple-100 dark:bg-purple-950/30"
        }
    ];

    if (loading) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-24 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {statCards.map((stat, index) => (
                <Card key={index} className="border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all rounded-2xl bg-white/90 dark:bg-slate-900/90 overflow-hidden">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div className="space-y-0.5">
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{stat.title}</p>
                            <h3 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white font-mono">{stat.value}</h3>
                            {stat.subtitle && (
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">{stat.subtitle}</p>
                            )}
                        </div>
                        <div className={`p-3 rounded-2xl ${stat.bg} shadow-sm`}>
                            <stat.icon className={`h-6 w-6 ${stat.color}`} />
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
