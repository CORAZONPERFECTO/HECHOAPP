"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { RecurringInvoice } from "@/types/schema";
import { RecurringInvoiceForm } from "@/components/income/recurring-invoice-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function RecurringInvoiceDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [invoice, setInvoice] = useState<RecurringInvoice | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchInvoice = async () => {
            if (!id) return;
            try {
                const docRef = doc(db, "recurringInvoices", id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setInvoice({ id: docSnap.id, ...docSnap.data() } as RecurringInvoice);
                } else {
                    console.log("No such document!");
                    router.push("/income/recurring");
                }
            } catch (error) {
                console.error("Error getting document:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchInvoice();
    }, [id, router]);

    if (loading) {
        return <div className="flex justify-center items-center min-h-screen">Cargando...</div>;
    }

    if (!invoice) return null;

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                <Button variant="ghost" onClick={() => router.push("/income/recurring")} className="mb-4">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver
                </Button>

                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Editar Recurrencia</h1>
                        <p className="text-gray-500">Modificar configuración de facturación automática</p>
                    </div>
                </div>

                <RecurringInvoiceForm initialData={invoice} isEditing={true} />
            </div>
        </div>
    );
}
