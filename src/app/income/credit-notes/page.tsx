"use client";

import { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { CreditNote } from "@/types/schema";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/income/status-badge";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function CreditNotesPage() {
    const [notes, setNotes] = useState<CreditNote[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const q = query(collection(db, "creditNotes"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as CreditNote[];
            setNotes(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const columns = [
        {
            header: "Número",
            accessorKey: "number" as keyof CreditNote,
            className: "font-medium",
        },
        {
            header: "Cliente",
            accessorKey: "clientName" as keyof CreditNote,
        },
        {
            header: "Fecha",
            cell: (item: CreditNote) => new Date(item.issueDate.seconds * 1000).toLocaleDateString(),
        },
        {
            header: "Razón",
            accessorKey: "reason" as keyof CreditNote,
        },
        {
            header: "Total",
            cell: (item: CreditNote) => `RD$ ${item.total.toLocaleString()}`,
            className: "text-red-600 font-medium",
        },
        {
            header: "Estado",
            cell: (item: CreditNote) => <StatusBadge status={item.status} />,
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
                            <h1 className="text-2xl font-bold text-gray-900">Notas de Crédito</h1>
                            <p className="text-gray-500">Gestión de devoluciones y correcciones</p>
                        </div>
                    </div>
                    <Link href="/income/credit-notes/new">
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Nueva Nota de Crédito
                        </Button>
                    </Link>
                </div>

                {loading ? (
                    <div className="text-center py-12">Cargando notas de crédito...</div>
                ) : (
                    <DataTable
                        data={notes}
                        columns={columns}
                        searchKey="clientName"
                        searchPlaceholder="Buscar por cliente..."
                        onRowClick={(item) => router.push(`/income/credit-notes/${item.id}`)}
                    />
                )}
            </div>
        </div>
    );
}
