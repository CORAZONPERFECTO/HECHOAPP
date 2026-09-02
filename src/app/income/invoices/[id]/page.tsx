"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Invoice, CompanySettings } from "@/types/schema";
import { InvoiceForm } from "@/components/income/invoice-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trash2 } from "lucide-react";
import { DocumentExportButton } from "@/components/documents/document-export-button";
import { mapInvoiceToDocument } from "@/lib/document-generator";
import { AppLayout } from "@/components/layout/app-layout";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

export default function InvoiceDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const { toast } = useToast();

    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);

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

    const handleDeleteInvoice = async () => {
        setDeleting(true);
        try {
            await deleteDoc(doc(db, "invoices", id));
            toast({
                title: "🗑️ Factura eliminada",
                description: "La factura ha sido eliminada exitosamente."
            });
            router.push("/income/invoices");
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error al eliminar", description: error.message });
        } finally {
            setDeleting(false);
        }
    };

    if (loading) {
        return (
            <AppLayout>
                <div className="flex justify-center items-center min-h-[60vh]">
                    <div className="animate-pulse flex flex-col items-center">
                        <div className="h-12 w-12 bg-gray-200 rounded-full mb-4"></div>
                        <div className="h-4 w-48 bg-gray-200 rounded"></div>
                    </div>
                </div>
            </AppLayout>
        );
    }

    if (!invoice) return null;

    return (
        <AppLayout>
            <div className="max-w-5xl mx-auto space-y-6">
                <Button variant="ghost" onClick={() => router.push("/income/invoices")} className="mb-2">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver a Facturas
                </Button>

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Editar Factura {invoice.number}</h1>
                        <p className="text-gray-500">Detalles, estados y modificación de factura</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {invoice && companySettings && (
                            <DocumentExportButton
                                data={mapInvoiceToDocument(invoice, companySettings)}
                                type="invoice"
                            />
                        )}
                        <Button
                            variant="outline"
                            onClick={() => setDeleteModalOpen(true)}
                            className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 gap-1.5"
                        >
                            <Trash2 className="h-4 w-4" />
                            Eliminar
                        </Button>
                    </div>
                </div>

                <InvoiceForm initialData={invoice} isEditing={true} />
            </div>

            {/* Confirm Delete Dialog */}
            <Dialog open={deleteModalOpen} onOpenChange={(open: boolean) => setDeleteModalOpen(open)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>¿Eliminar factura {invoice.number}?</DialogTitle>
                        <DialogDescription>
                            Esta acción no se puede deshacer. Se eliminará la factura de forma permanente del sistema.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteModalOpen(false)} disabled={deleting}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleDeleteInvoice}
                            disabled={deleting}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            {deleting ? "Eliminando..." : "Eliminar"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
