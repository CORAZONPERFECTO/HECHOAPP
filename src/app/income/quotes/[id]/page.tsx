
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, addDoc, updateDoc, collection, serverTimestamp, Timestamp, arrayUnion } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Quote, Invoice } from "@/types/schema";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/income/status-badge";
import { ArrowLeft, FileCheck, Printer, Mail, XCircle, CheckCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { generateQuotePDF } from "@/lib/export-utils";
import { QuoteTimeline } from "@/components/income/quotes/quote-timeline";
import { DocumentExportButton } from "@/components/documents/document-export-button";
import { mapQuoteToDocument } from "@/lib/document-generator";
import { CompanySettings } from "@/types/schema";
import { getDoc, doc } from "firebase/firestore";

export default function QuoteDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const { toast } = useToast();

    const [quote, setQuote] = useState<Quote | null>(null);
    const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [converting, setConverting] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;
            try {
                const docRef = doc(db, "quotes", id);
                const docSnap = await getDoc(docRef);

                // Fetch Company Settings
                const settingsRef = doc(db, "settings", "company");
                const settingsSnap = await getDoc(settingsRef);
                if (settingsSnap.exists()) {
                    setCompanySettings(settingsSnap.data() as CompanySettings);
                }

                if (docSnap.exists()) {
                    setQuote({ id: docSnap.id, ...docSnap.data() } as Quote);
                } else {
                    router.push("/income/quotes");
                }
            } catch (error) {
                console.error("Error getting data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id, router]);

    const handleConvert = async () => {
        if (!quote) return;
        setConverting(true);
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) throw new Error("User not authenticated");

            // 1. Create Invoice from Quote data
            const invoiceData: Partial<Invoice> = {
                clientId: quote.clientId,
                clientName: quote.clientName,
                // clientRnc: quote.clientRnc,
                number: "", // Should use NumberingService in future
                items: quote.items,
                subtotal: quote.subtotal,
                taxTotal: quote.taxTotal,
                total: quote.total,
                balance: quote.total,
                currency: quote.currency || 'DOP', // Copied currency
                status: 'DRAFT',
                issueDate: Timestamp.now(),
                dueDate: Timestamp.now(),
                notes: `Generada desde Cotización #${quote.number || 'N/A'}. ${quote.notes || ''}`,
                convertedFromQuoteId: quote.id,
                sellerId: quote.sellerId,
                sellerName: quote.sellerName,
                createdAt: serverTimestamp() as any,
                updatedAt: serverTimestamp() as any,
            };

            const docRef = await addDoc(collection(db, "invoices"), invoiceData);

            // 2. Mark Quote as Converted & Accepted
            await updateDoc(doc(db, "quotes", quote.id), {
                status: 'CONVERTED',
                convertedInvoiceId: docRef.id,
                timeline: arrayUnion({
                    status: 'CONVERTED',
                    timestamp: Timestamp.now(),
                    userId: currentUser.uid,
                    userName: currentUser.displayName || 'Usuario',
                    note: `Convertida a Factura (ID: ${docRef.id})`
                })
            });

            toast({
                title: "¡Conversión Exitosa!",
                description: "La cotización se ha convertido en factura correctamente.",
            });

            // 3. Redirect to new Invoice
            router.push(`/income/invoices/${docRef.id}`);

        } catch (error) {
            console.error("Conversion failed", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "No se pudo convertir la cotización.",
            });
        } finally {
            setConverting(false);
        }
    };

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

    if (!quote) return null;

    return (
        <AppLayout>
            <div className="space-y-6 max-w-5xl mx-auto">
                <Button variant="ghost" onClick={() => router.push("/income/quotes")}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver a Cotizaciones
                </Button>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-3xl font-bold text-gray-900">Cotización {quote.number}</h1>
                            <StatusBadge status={quote.status} type="quote" />
                        </div>
                        <p className="text-gray-500">Cliente: <span className="font-semibold text-gray-700">{quote.clientName}</span></p>
                    </div>

                    <div className="flex gap-2">
                        {quote && companySettings && (
                            <DocumentExportButton
                                data={mapQuoteToDocument(quote, companySettings)}
                                type="quote"
                            />
                        )}
                        <Button variant="outline" className="gap-2">
                            <Mail className="h-4 w-4" /> Enviar
                        </Button>
                        {quote.status !== 'CONVERTED' && (
                            <Button
                                onClick={handleConvert}
                                disabled={converting || quote.status === 'REJECTED'}
                                className="bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-500/20 gap-2"
                            >
                                {converting ? (
                                    <>Procesando...</>
                                ) : (
                                    <>
                                        <FileCheck className="h-4 w-4" /> Convertir a Factura
                                    </>
                                )}
                            </Button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Main Content: Items */}
                        <div className="md:col-span-2 space-y-6">
                            <Card className="p-6 glass-card overflow-hidden">
                                <h3 className="font-semibold mb-4 text-gray-900">Ítems Cotizados</h3>
                                <div className="rounded-lg border overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 text-gray-500 border-b">
                                            <tr>
                                                <th className="text-left py-3 px-4">Descripción</th>
                                                <th className="text-right py-3 px-4">Cant.</th>
                                                <th className="text-right py-3 px-4">Precio</th>
                                                <th className="text-right py-3 px-4">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {quote.items.map((item, idx) => (
                                                <tr key={idx} className="bg-white/50">
                                                    <td className="py-3 px-4">{item.description}</td>
                                                    <td className="text-right py-3 px-4">{item.quantity}</td>
                                                    <td className="text-right py-3 px-4">{quote.currency === 'USD' ? 'US$' : 'RD$'} {item.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                    <td className="text-right py-3 px-4 font-medium">{quote.currency === 'USD' ? 'US$' : 'RD$'} {item.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>

                            {quote.notes && (
                                <Card className="p-6 glass-card">
                                    <h3 className="font-semibold mb-2 text-gray-900">Notas</h3>
                                    <p className="text-gray-600 whitespace-pre-wrap">{quote.notes}</p>
                                </Card>
                            )}

                            {/* Timeline */}
                            {quote.timeline && quote.timeline.length > 0 && (
                                <QuoteTimeline timeline={quote.timeline} />
                            )}
                        </div>

                        {/* Sidebar: Totals & Info */}
                        <div className="space-y-6">
                            <Card className="p-6 glass-card bg-purple-50/50 border-purple-100">
                                <h3 className="font-semibold mb-4 text-purple-900">Resumen</h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between text-gray-600">
                                        <span>Subtotal</span>
                                        <span>{quote.currency === 'USD' ? 'US$' : 'RD$'} {quote.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-600">
                                        <span>ITBIS</span>
                                        <span>{quote.currency === 'USD' ? 'US$' : 'RD$'} {quote.taxTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="border-t pt-2 mt-2 flex justify-between font-bold text-lg text-gray-900">
                                        <span>Total</span>
                                        <span>{quote.currency === 'USD' ? 'US$' : 'RD$'} {quote.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                </div>
                            </Card>

                            <Card className="p-6 glass-card">
                                <h3 className="font-semibold mb-4 text-gray-900">Detalles</h3>
                                <div className="space-y-3 text-sm text-gray-600">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="h-4 w-4 text-gray-400" />
                                        <span>Creado: {quote.createdAt ? new Date(quote.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <XCircle className="h-4 w-4 text-gray-400" />
                                        <span>Válido hasta: {quote.validUntil ? new Date(quote.validUntil.seconds * 1000).toLocaleDateString() : 'N/A'}</span>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </div>
                </div>
        </AppLayout>
    );
}
