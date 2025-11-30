"use client";

import { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Receipt } from "@/types/schema";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ReceiptsPage() {
    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const q = query(collection(db, "receipts"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Receipt[];
            setReceipts(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const columns = [
        {
            header: "Número",
            accessorKey: "number" as keyof Receipt,
            className: "font-medium",
        },
        {
            header: "Cliente",
            accessorKey: "clientName" as keyof Receipt,
        },
        {
            header: "Fecha",
            cell: (item: Receipt) => new Date(item.date.seconds * 1000).toLocaleDateString(),
        },
        {
            header: "Concepto",
            accessorKey: "concept" as keyof Receipt,
        },
        {
            header: "Monto",
            cell: (item: Receipt) => `RD$ ${item.amount.toLocaleString()}`,
            className: "font-bold text-green-600",
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
                            <h1 className="text-2xl font-bold text-gray-900">Recibos de Pago</h1>
                            <p className="text-gray-500">Comprobantes de ingresos varios</p>
                        </div>
                    </div>
                    <Link href="/income/receipts/new">
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Nuevo Recibo
                        </Button>
                    </Link>
                </div>

                {loading ? (
                    <div className="text-center py-12">Cargando recibos...</div>
                ) : (
                    <DataTable
                        data={receipts}
                        columns={columns}
                        searchKey="clientName"
                        searchPlaceholder="Buscar por cliente..."
                        onRowClick={(item) => router.push(`/income/receipts/${item.id}`)}
                    />
                )}
            </div>
        </div>
    );
}
