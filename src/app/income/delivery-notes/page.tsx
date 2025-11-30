"use client";

import { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DeliveryNote } from "@/types/schema";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";

export default function DeliveryNotesPage() {
    const [notes, setNotes] = useState<DeliveryNote[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const q = query(collection(db, "deliveryNotes"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as DeliveryNote[];
            setNotes(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const columns = [
        {
            header: "Número",
            accessorKey: "number" as keyof DeliveryNote,
            className: "font-medium",
        },
        {
            header: "Cliente",
            accessorKey: "clientName" as keyof DeliveryNote,
        },
        {
            header: "Fecha Entrega",
            cell: (item: DeliveryNote) => new Date(item.deliveryDate?.seconds * 1000 || item.issueDate.seconds * 1000).toLocaleDateString(),
        },
        {
            header: "Dirección",
            accessorKey: "address" as keyof DeliveryNote,
            className: "max-w-xs truncate",
        },
        {
            header: "Estado",
            cell: (item: DeliveryNote) => (
                <Badge variant={item.status === 'DELIVERED' ? 'default' : 'secondary'}>
                    {item.status === 'DELIVERED' ? 'Entregado' : item.status === 'SENT' ? 'Enviado' : item.status === 'DRAFT' ? 'Borrador' : 'Cancelado'}
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
                            <h1 className="text-2xl font-bold text-gray-900">Conduces</h1>
                            <p className="text-gray-500">Gestión de entregas y despachos</p>
                        </div>
                    </div>
                    <Link href="/income/delivery-notes/new">
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Nuevo Conduce
                        </Button>
                    </Link>
                </div>

                {loading ? (
                    <div className="text-center py-12">Cargando conduces...</div>
                ) : (
                    <DataTable
                        data={notes}
                        columns={columns}
                        searchKey="clientName"
                        searchPlaceholder="Buscar por cliente..."
                        onRowClick={(item) => router.push(`/income/delivery-notes/${item.id}`)}
                    />
                )}
            </div>
        </div>
    );
}
