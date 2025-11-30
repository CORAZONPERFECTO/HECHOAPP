"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Receipt } from "@/types/schema";
import { ReceiptForm } from "@/components/income/receipt-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function ReceiptDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [receipt, setReceipt] = useState<Receipt | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReceipt = async () => {
            if (!id) return;
            try {
                const docRef = doc(db, "receipts", id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setReceipt({ id: docSnap.id, ...docSnap.data() } as Receipt);
                } else {
                    console.log("No such document!");
                    router.push("/income/receipts");
                }
            } catch (error) {
                console.error("Error getting document:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchReceipt();
    }, [id, router]);

    if (loading) {
        return <div className="flex justify-center items-center min-h-screen">Cargando...</div>;
    }

    if (!receipt) return null;

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                <Button variant="ghost" onClick={() => router.push("/income/receipts")} className="mb-4">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver
                </Button>

                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Editar Recibo {receipt.number}</h1>
                        <p className="text-gray-500">Detalles del comprobante</p>
                    </div>
                </div>

                <ReceiptForm initialData={receipt} isEditing={true} />
            </div>
        </div>
    );
}
