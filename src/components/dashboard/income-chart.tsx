"use client";

import { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Payment } from "@/types/schema";
import { Purchase } from "@/types/purchase";
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from "date-fns";
import { es } from "date-fns/locale";
import { Loader2 } from "lucide-react";

import { DateRange } from "react-day-picker";
import { differenceInDays, eachDayOfInterval } from "date-fns";

interface ChartData {
    name: string;
    income: number;
    expense: number;
    profit: number;
}

interface IncomeChartProps {
    dateRange?: DateRange;
}

export function IncomeChart({ dateRange }: IncomeChartProps) {
    const [data, setData] = useState<ChartData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                let start, end;

                if (dateRange?.from) {
                    start = dateRange.from;
                    end = dateRange.to || new Date();
                } else {
                    // Default: Last 6 months
                    end = new Date();
                    start = subMonths(end, 5);
                    start = startOfMonth(start);
                }

                // Determine grouping: Daily if <= 60 days, Monthly otherwise
                const daysDiff = differenceInDays(end, start);
                const isDaily = daysDiff <= 60;

                const startTimestamp = Timestamp.fromDate(start);
                const endTimestamp = Timestamp.fromDate(new Date(end.setHours(23, 59, 59, 999)));

                // Parallel Fetching
                const [paymentsSnapshot, purchasesSnapshot] = await Promise.all([
                    getDocs(query(
                        collection(db, "payments"),
                        where("date", ">=", startTimestamp),
                        where("date", "<=", endTimestamp),
                        orderBy("date", "asc")
                    )),
                    getDocs(query(
                        collection(db, "purchases"),
                        where("date", ">=", startTimestamp),
                        where("date", "<=", endTimestamp),
                        orderBy("date", "asc")
                    ))
                ]);

                const payments = paymentsSnapshot.docs.map(doc => doc.data() as Payment);
                const purchases = purchasesSnapshot.docs.map(doc => doc.data() as Purchase);

                // Group Data
                let chartData: ChartData[] = [];

                if (isDaily) {
                    const days = eachDayOfInterval({ start, end });
                    chartData = days.map(day => {
                        const dayKey = format(day, "dd/MM/yyyy");
                        const dayLabel = format(day, "d MMM", { locale: es });

                        const dailyIncome = payments
                            .filter(p => format(p.date.toDate(), "dd/MM/yyyy") === dayKey)
                            .reduce((sum, p) => sum + p.amount, 0);

                        const dailyExpense = purchases
                            .filter(p => format(p.date.toDate(), "dd/MM/yyyy") === dayKey)
                            .reduce((sum, p) => sum + p.total, 0);

                        return {
                            name: dayLabel,
                            income: dailyIncome,
                            expense: dailyExpense,
                            profit: dailyIncome - dailyExpense
                        };
                    });
                } else {
                    const months = eachMonthOfInterval({ start, end });
                    chartData = months.map(month => {
                        const monthKey = format(month, "MM/yyyy");
                        const monthLabel = format(month, "MMM", { locale: es });

                        const monthlyIncome = payments
                            .filter(p => format(p.date.toDate(), "MM/yyyy") === monthKey)
                            .reduce((sum, p) => sum + p.amount, 0);

                        const monthlyExpense = purchases
                            .filter(p => format(p.date.toDate(), "MM/yyyy") === monthKey)
                            .reduce((sum, p) => sum + p.total, 0);

                        return {
                            name: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
                            income: monthlyIncome,
                            expense: monthlyExpense,
                            profit: monthlyIncome - monthlyExpense
                        };
                    });
                }

                setData(chartData);
            } catch (error) {
                console.error("Error loading financial data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [dateRange]);

    if (loading) {
        return (
            <div className="h-[300px] flex items-center justify-center bg-white/50 rounded-xl border border-gray-100">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    // Calculate totals for summary
    const totalIncome = data.reduce((acc, curr) => acc + curr.income, 0);
    const totalExpense = data.reduce((acc, curr) => acc + curr.expense, 0);
    const totalProfit = totalIncome - totalExpense;

    return (
        <Card className="col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle>Flujo de Caja {dateRange ? "(Filtrado)" : "Semestral"}</CardTitle>
                <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-gray-500">Ingresos: RD${totalIncome.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span className="text-gray-500">Gastos: RD${totalExpense.toLocaleString()}</span>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                            data={data}
                            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                        >
                            <defs>
                                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                            <XAxis
                                dataKey="name"
                                stroke="#9ca3af"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke="#9ca3af"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `RD$${(value / 1000).toFixed(0)}k`}
                            />
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                formatter={(value: number | undefined, name: string | number | undefined) => [
                                    value ? `RD$ ${value.toLocaleString()}` : "RD$ 0",
                                    name === 'income' ? 'Ingresos' : 'Gastos'
                                ]}
                                labelStyle={{ color: '#6b7280', marginBottom: '0.5rem' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="income"
                                stroke="#22c55e"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorIncome)"
                                stackId="1"
                            />
                            <Area
                                type="monotone"
                                dataKey="expense"
                                stroke="#ef4444"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorExpense)"
                                stackId="2"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
