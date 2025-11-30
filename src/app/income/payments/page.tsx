"use client";

import { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Payment } from "@/types/schema";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function PaymentsPage() {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const q = query(collection(db, "payments"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Payment[];
            setPayments(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const columns = [
        {
            header: "Cliente",
            accessorKey: "clientName" as keyof Payment,
            className: "font-medium",
        },
        {
            header: "Fecha",
            cell: (item: Payment) => new Date(item.date.seconds * 1000).toLocaleDateString(),
        },
        {
            header: "Método",
            accessorKey: "method" as keyof Payment,
        },
        {
            header: "Referencia",
            accessorKey: "reference" as keyof Payment,
        },
        {
            header: "Monto",
            cell: (item: Payment) => `RD$ ${item.amount.toLocaleString()}`,
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
                            <h1 className="text-2xl font-bold text-gray-900">Pagos Recibidos</h1>
                            <p className="text-gray-500">Historial de pagos y cobros</p>
                        </div>
                    </div>
                    <Link href="/income/payments/new">
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Registrar Pago
                        </Button>
                    </Link>
                </div>

                {loading ? (
                    <div className="text-center py-12">Cargando pagos...</div>
                ) : (
                    <DataTable
                        data={payments}
                        columns={columns}
                        searchKey="clientName"
                        searchPlaceholder="Buscar por cliente..."
                    />
                )}
            </div>
        </div>
    );
}
