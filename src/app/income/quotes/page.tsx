
"use client";

import { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Quote } from "@/types/schema";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/income/status-badge";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/app-layout";
import { QuoteStats } from "@/components/income/quotes/quote-stats";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRange } from "react-day-picker";
import { addDays, isWithinInterval, startOfDay, endOfDay } from "date-fns";

export default function QuotesPage() {
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: addDays(new Date(), -30),
        to: new Date(),
    });
    const [statusFilter, setStatusFilter] = useState<string>("ALL");

    // Client-side filtering for demo speed (ideally would be Firestore query)
    const filteredQuotes = quotes.filter(quote => {
        // 1. Status Filter
        if (statusFilter !== "ALL" && quote.status !== statusFilter) return false;

        // 2. Date Filter
        if (!dateRange?.from) return true;
        const quoteDate = quote.createdAt?.seconds ? new Date(quote.createdAt.seconds * 1000) : new Date();
        const start = startOfDay(dateRange.from);
        const end = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);

        return isWithinInterval(quoteDate, { start, end });
    });

    useEffect(() => {
        const q = query(collection(db, "quotes"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Quote[];
            setQuotes(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const columns = [
        {
            header: "Número",
            accessorKey: "number" as keyof Quote,
            className: "font-medium",
        },
        {
            header: "Cliente",
            accessorKey: "clientName" as keyof Quote,
        },
        {
            header: "Fecha",
            cell: (item: Quote) => item.createdAt ? new Date(item.createdAt.seconds * 1000).toLocaleDateString() : 'N/A',
        },
        {
            header: "Total",
            cell: (item: Quote) => `${item.currency === 'USD' ? 'US$' : 'RD$'} ${item.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        },
        {
            header: "Estado",
            cell: (item: Quote) => <StatusBadge status={item.status} type="quote" />,
        },
        {
            header: "Vence",
            cell: (item: Quote) => item.validUntil ? new Date(item.validUntil.seconds * 1000).toLocaleDateString() : 'N/A',
        },
    ];

    return (
        <AppLayout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" onClick={() => router.push("/income")}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Volver
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Cotizaciones</h1>
                            <p className="text-gray-500">Gestiona propuestas y presupuestos</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Estado" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Todos los Estados</SelectItem>
                                <SelectItem value="DRAFT">Borrador</SelectItem>
                                <SelectItem value="SENT">Enviada</SelectItem>
                                <SelectItem value="ACCEPTED">Aceptada</SelectItem>
                                <SelectItem value="CONVERTED">Facturada</SelectItem>
                                <SelectItem value="REJECTED">Rechazada</SelectItem>
                                <SelectItem value="EXPIRED">Vencida</SelectItem>
                            </SelectContent>
                        </Select>

                        <DateRangePicker
                            date={dateRange}
                            setDate={setDateRange}
                        />
                        <Button asChild className="bg-gradient-to-r from-blue-600 to-purple-600 shadow-md">
                            <Link href="/income/quotes/new">
                                <Plus className="mr-2 h-4 w-4" />
                                Nueva Cotización
                            </Link>
                        </Button>
                    </div>
                </div>

                <QuoteStats quotes={filteredQuotes} />

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-pulse flex flex-col items-center">
                            <div className="h-12 w-12 bg-gray-200 rounded-full mb-4"></div>
                            <div className="h-4 w-48 bg-gray-200 rounded"></div>
                        </div>
                    </div>
                ) : (
                    <div className="glass-card rounded-xl overflow-hidden border border-gray-100 shadow-sm">
                        <DataTable
                            data={filteredQuotes}
                            columns={columns}
                            searchKey="clientName"
                            searchPlaceholder="Buscar por cliente..."
                            onRowClick={(item) => router.push(`/income/quotes/${item.id}`)}
                        />
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
