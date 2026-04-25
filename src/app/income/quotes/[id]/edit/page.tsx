"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AppLayout } from "@/components/layout/app-layout";
import { InvoiceWizard } from "@/components/income/invoice-wizard/invoice-wizard";
import { Quote } from "@/types/schema";

export default function EditQuotePage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [loading, setLoading] = useState(true);
    const [initialData, setInitialData] = useState<any>(null);

    useEffect(() => {
        const fetchQuote = async () => {
            if (!id) return;
            try {
                const docSnap = await getDoc(doc(db, "quotes", id));
                if (docSnap.exists()) {
                    const data = docSnap.data() as Quote;
                    // Format explicitly for the wizard
                    setInitialData({
                        ...data,
                        quotation_to: (data as any).quotation_to || "Customer",
                        party_name: data.party_name || (data as any).clientName || "",
                        transaction_date: data.transaction_date || data.issueDate,
                        valid_till: data.valid_till || data.validUntil,
                        currency: data.currency || "DOP",
                        selling_price_list: (data as any).selling_price_list || "Standard Selling",
                        items: data.items || [],
                        terms: (data as any).terms || "",
                        note: data.note || (data as any).notes || "",
                    });
                } else {
                    router.push("/income/quotes");
                }
            } catch (error) {
                console.error("Error fetching quote for edit:", error);
                router.push("/income/quotes");
            } finally {
                setLoading(false);
            }
        };
        fetchQuote();
    }, [id, router]);

    if (loading) {
        return (
            <AppLayout>
                <div className="flex justify-center items-center h-[50vh]">
                    <div className="animate-pulse flex flex-col items-center">
                        <div className="h-12 w-12 bg-gray-200 rounded-full mb-4"></div>
                        <div className="h-4 w-48 bg-gray-200 rounded"></div>
                    </div>
                </div>
            </AppLayout>
        );
    }

    if (!initialData) return null;

    return (
        <AppLayout>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Editar Cotización</h1>
                <p className="text-gray-500">Modifica los detalles de la propuesta comercial.</p>
            </div>
            <InvoiceWizard mode="quote" initialData={initialData} editingId={id} />
        </AppLayout>
    );
}
