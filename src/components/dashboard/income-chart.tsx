"use client";

import { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Payment } from "@/types/schema";
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from "date-fns";
import { es } from "date-fns/locale";
import { Loader2 } from "lucide-react";

import { DateRange } from "react-day-picker";
import { differenceInDays, eachDayOfInterval } from "date-fns";

interface ChartData {
    name: string;
    total: number;
}

interface IncomeChartProps {
    dateRange?: DateRange;
}

export function IncomeChart({ dateRange }: IncomeChartProps) {
    const [data, setData] = useState<ChartData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchIncomeData = async () => {
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

                // Fetch payments
                const q = query(
                    collection(db, "payments"),
                    where("date", ">=", Timestamp.fromDate(start)),
                    where("date", "<=", Timestamp.fromDate(new Date(end.setHours(23, 59, 59, 999)))),
                    orderBy("date", "asc")
                );

                const snapshot = await getDocs(q);
                const payments = snapshot.docs.map(doc => doc.data() as Payment);

                // Group Data
                let chartData;
                if (isDaily) {
                    const days = eachDayOfInterval({ start, end });
                    chartData = days.map(day => {
                        const dayKey = format(day, "dd/MM/yyyy");
                        const dayLabel = format(day, "d MMM", { locale: es });

                        const dailyTotal = payments
                            .filter(p => {
                                const pDate = p.date.toDate();
                                return format(pDate, "dd/MM/yyyy") === dayKey;
                            })
                            .reduce((sum, p) => sum + p.amount, 0);

                        return {
                            name: dayLabel,
                            total: dailyTotal
                        };
                    });
                } else {
                    const months = eachMonthOfInterval({ start, end });
                    chartData = months.map(month => {
                        const monthKey = format(month, "MM/yyyy");
                        const monthLabel = format(month, "MMM", { locale: es });

                        const monthlyTotal = payments
                            .filter(p => {
                                const pDate = p.date.toDate();
                                return format(pDate, "MM/yyyy") === monthKey;
                            })
                            .reduce((sum, p) => sum + p.amount, 0);

                        return {
                            name: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
                            total: monthlyTotal
                        };
                    });
                }

                setData(chartData);
            } catch (error) {
                console.error("Error loading chart data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchIncomeData();
    }, [dateRange]);

    if (loading) {
        return (
            <div className="h-[300px] flex items-center justify-center bg-white/50 rounded-xl border border-gray-100">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <Card className="col-span-2">
            <CardHeader>
                <CardTitle>Ingresos {dateRange ? "(Filtrado)" : "Semestrales"}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                            data={data}
                            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                        >
                            <defs>
                                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
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
                                tickFormatter={(value) => `RD$${value.toLocaleString()}`}
                            />
                            <Tooltip
                                formatter={(value: number | undefined) => [value ? `RD$ ${value.toLocaleString()}` : "RD$ 0", "Ingresos"]}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="total"
                                stroke="#16a34a"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorTotal)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
