"use client";

import { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Invoice } from "@/types/schema";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/income/status-badge";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft, Download } from "lucide-react";
import { exportToExcel, formatInvoiceForExport } from "@/lib/excel-utils";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function InvoicesPage() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const q = query(collection(db, "invoices"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Invoice[];
            setInvoices(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleExport = () => {
        exportToExcel(formatInvoiceForExport(invoices), "Reporte_Facturas_Nexus");
    };

    const columns = [
        {
            header: "Número",
            accessorKey: "number" as keyof Invoice,
            className: "font-medium",
        },
        {
            header: "Cliente",
            accessorKey: "clientName" as keyof Invoice,
        },
        {
            header: "Fecha",
            cell: (item: Invoice) => new Date(item.issueDate.seconds * 1000).toLocaleDateString(),
        },
        {
            header: "Total",
            cell: (item: Invoice) => `RD$ ${item.total.toLocaleString()}`,
        },
        {
            header: "Balance",
            cell: (item: Invoice) => `RD$ ${item.balance.toLocaleString()}`,
        },
        {
            header: "Estado",
            cell: (item: Invoice) => <StatusBadge status={item.status} />,
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
                            <h1 className="text-2xl font-bold text-gray-900">Facturas de Venta</h1>
                            <p className="text-gray-500">Gestiona tus facturas y cobros</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={handleExport}>
                            <Download className="mr-2 h-4 w-4" />
                            Exportar
                        </Button>
                        <Link href="/income/invoices/new">
                            <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                Nueva Factura
                            </Button>
                        </Link>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-12">Cargando facturas...</div>
                ) : (
                    <DataTable
                        data={invoices}
                        columns={columns}
                        searchKey="clientName"
                        searchPlaceholder="Buscar por cliente..."
                        onRowClick={(item) => router.push(`/income/invoices/${item.id}`)}
                    />
                )}
            </div>
        </div>
    );
}
