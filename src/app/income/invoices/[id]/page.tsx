"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Invoice } from "@/types/schema";
import { InvoiceForm } from "@/components/income/invoice-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { DocumentExportButton } from "@/components/documents/document-export-button";
import { mapInvoiceToDocument } from "@/lib/document-generator";
import { CompanySettings } from "@/types/schema";

export default function InvoiceDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchInvoice = async () => {
            if (!id) return;
            try {
                const docRef = doc(db, "invoices", id);
                const docSnap = await getDoc(docRef);

                // Fetch Company Settings
                const settingsRef = doc(db, "settings", "company");
                const settingsSnap = await getDoc(settingsRef);
                if (settingsSnap.exists()) {
                    setCompanySettings(settingsSnap.data() as CompanySettings);
                }

                if (docSnap.exists()) {
                    setInvoice({ id: docSnap.id, ...docSnap.data() } as Invoice);
                } else {
                    console.log("No such document!");
                    router.push("/income/invoices");
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
                <Button variant="ghost" onClick={() => router.push("/income/invoices")} className="mb-4">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver a Facturas
                </Button>

                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Editar Factura {invoice.number}</h1>
                        <p className="text-gray-500">Detalles y edición de factura</p>
                    </div>
                    {invoice && companySettings && (
                        <DocumentExportButton
                            data={mapInvoiceToDocument(invoice, companySettings)}
                            type="invoice"
                        />
                    )}
                </div>

                <InvoiceForm initialData={invoice} isEditing={true} />
            </div>
        </div>
    );
}
