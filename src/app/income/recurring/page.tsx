"use client";

import { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { RecurringInvoice } from "@/types/schema";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";

export default function RecurringInvoicesPage() {
    const [invoices, setInvoices] = useState<RecurringInvoice[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const q = query(collection(db, "recurringInvoices"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as RecurringInvoice[];
            setInvoices(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const columns = [
        {
            header: "Cliente",
            accessorKey: "clientName" as keyof RecurringInvoice,
            className: "font-medium",
        },
        {
            header: "Frecuencia",
            cell: (item: RecurringInvoice) => {
                const map = { WEEKLY: 'Semanal', MONTHLY: 'Mensual', QUARTERLY: 'Trimestral', YEARLY: 'Anual' };
                return map[item.frequency] || item.frequency;
            }
        },
        {
            header: "Próxima Ejecución",
            cell: (item: RecurringInvoice) => new Date(item.nextRunDate.seconds * 1000).toLocaleDateString(),
        },
        {
            header: "Total",
            cell: (item: RecurringInvoice) => `RD$ ${item.total.toLocaleString()}`,
        },
        {
            header: "Estado",
            cell: (item: RecurringInvoice) => (
                <Badge variant={item.status === 'ACTIVE' ? 'default' : 'secondary'}>
                    {item.status === 'ACTIVE' ? 'Activa' : item.status === 'PAUSED' ? 'Pausada' : 'Cancelada'}
                </Badge>
            ),
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
                            <h1 className="text-2xl font-bold text-gray-900">Facturas Recurrentes</h1>
                            <p className="text-gray-500">Automatiza tu facturación periódica</p>
                        </div>
                    </div>
                    <Link href="/income/recurring/new">
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Nueva Recurrencia
                        </Button>
                    </Link>
                </div>

                {loading ? (
                    <div className="text-center py-12">Cargando recurrencias...</div>
                ) : (
                    <DataTable
                        data={invoices}
                        columns={columns}
                        searchKey="clientName"
                        searchPlaceholder="Buscar por cliente..."
                        onRowClick={(item) => router.push(`/income/recurring/${item.id}`)}
                    />
                )}
            </div>
        </div>
    );
}
