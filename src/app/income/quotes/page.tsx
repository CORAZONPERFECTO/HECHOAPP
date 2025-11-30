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

export default function QuotesPage() {
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

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
            cell: (item: Quote) => new Date(item.createdAt.seconds * 1000).toLocaleDateString(),
        },
        {
            header: "Total",
            cell: (item: Quote) => `RD$ ${item.total.toLocaleString()}`,
        },
        {
            header: "Estado",
            cell: (item: Quote) => <StatusBadge status={item.status} type="quote" />,
        },
    ];

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" onClick={() => router.push("/income")}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Volver
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Cotizaciones</h1>
                            <p className="text-gray-500">Gestión de presupuestos</p>
                        </div>
                    </div>
                    <Link href="/income/quotes/new">
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Nueva Cotización
                        </Button>
                    </Link>
                </div>

                {loading ? (
                    <div className="text-center py-12">Cargando cotizaciones...</div>
                ) : (
                    <DataTable
                        data={quotes}
                        columns={columns}
                        searchKey="clientName"
                        searchPlaceholder="Buscar por cliente..."
                        onRowClick={(item) => router.push(`/income/quotes/${item.id}`)}
                    />
                )}
            </div>
        </div>
    );
}
