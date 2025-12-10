import { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot, where, getDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Payment } from "@/types/schema";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft, FileText, Banknote } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PaymentDialog } from "@/components/income/payment-dialog";
import { Badge } from "@/components/ui/badge";

export default function PaymentsPage() {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    // Use a key to force re-render if needed or just rely on real-time listener
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
            header: "Recibo #",
            accessorKey: "number",
            className: "font-mono text-sm",
        },
        {
            header: "Cliente",
            accessorKey: "clientName",
            className: "font-medium",
        },
        {
            header: "Fecha",
            cell: (item: Payment) => new Date(item.date.seconds * 1000).toLocaleDateString(),
        },
        {
            header: "Método",
            cell: (item: Payment) => (
                <Badge variant="outline" className="text-xs">
                    {item.method}
                </Badge>
            )
        },
        {
            header: "Monto",
            cell: (item: Payment) => (
                <span className="font-bold text-green-600">
                    RD$ {item.amount.toLocaleString()}
                </span>
            ),
        },
        {
            header: "Factura",
            cell: (item: Payment) => item.invoiceId ? (
                <Link href={`/income/invoices/${item.invoiceId}`} className="flex items-center text-blue-600 hover:underline text-xs">
                    <FileText className="h-3 w-3 mr-1" />
                    Ver Factura
                </Link>
            ) : <span className="text-gray-400 text-xs">A cuenta</span>
        }
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
                            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                <Banknote className="h-6 w-6 text-green-600" />
                                Pagos Recibidos
                            </h1>
                            <p className="text-gray-500">Gestión de cobros y abonos</p>
                        </div>
                    </div>
                    {/* Integrated Payment Dialog */}
                    <PaymentDialog />
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
