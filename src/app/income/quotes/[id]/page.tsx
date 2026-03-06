
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, updateDoc, arrayUnion, Timestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Quote } from "@/types/schema";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/income/status-badge";
import {
    ArrowLeft, FileCheck, Mail, XCircle, CheckCircle,
    ExternalLink, RefreshCw, Loader2, Send, Edit
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { QuoteTimeline } from "@/components/income/quotes/quote-timeline";
import { DocumentExportButton } from "@/components/documents/document-export-button";
import { mapQuoteToDocument } from "@/lib/document-generator";
import { CompanySettings } from "@/types/schema";
import { getFunctions, httpsCallable } from "firebase/functions";
import { SupplierQuotesWidget } from "@/components/income/quotes/supplier-quotes-widget";


export default function QuoteDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const { toast } = useToast();

    const [quote, setQuote] = useState<Quote | null>(null);
    const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [converting, setConverting] = useState(false);
    const [syncing, setSyncing] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;
            try {
                const [docSnap, settingsSnap] = await Promise.all([
                    getDoc(doc(db, "quotes", id)),
                    getDoc(doc(db, "settings", "company")),
                ]);
                if (settingsSnap.exists()) setCompanySettings(settingsSnap.data() as CompanySettings);
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

    // ─── Sync to ERPNext only (no invoice created) ─────────────────────────
    const handleSyncToErp = async () => {
        if (!quote) return;
        setSyncing(true);
        try {
            const fn = httpsCallable(getFunctions(), "syncQuoteToErp");
            const result: any = await fn({ quoteId: quote.id });
            toast({
                title: "✅ Enviado a ERPNext",
                description: `Cotización ERP: ${result.data.erpQuotationId}`,
            });
            // Refresh from Firestore
            const snap = await getDoc(doc(db, "quotes", id));
            if (snap.exists()) setQuote({ id: snap.id, ...snap.data() } as Quote);
        } catch (error: any) {
            toast({ variant: "destructive", title: "❌ Error ERPNext", description: error.message });
        } finally {
            setSyncing(false);
        }
    };

    // ─── Convert to Invoice AND sync to ERPNext ─────────────────────────────
    const handleConvertWithErp = async () => {
        if (!quote) return;
        setConverting(true);
        try {
            const fn = httpsCallable(getFunctions(), "convertQuoteToInvoiceErp");
            const result: any = await fn({ quoteId: quote.id });
            toast({
                title: "✅ ¡Factura creada en ERPNext!",
                description: `Factura ERP: ${result.data.erpInvoiceId}`,
            });
            router.push(`/income/invoices/${result.data.invoiceId}`);
        } catch (error: any) {
            toast({ variant: "destructive", title: "❌ Error", description: error.message });
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

    const erpUrl = (quote as any).erpQuotationId
        ? `https://erpnext-pld-nic.v.frappe.cloud/app/quotation/${(quote as any).erpQuotationId}`
        : null;

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
                            <h1 className="text-3xl font-bold text-gray-900">Cotización {quote.name || (quote as any).number}</h1>
                            <StatusBadge status={quote.status} type="quote" />
                            {(quote as any).erpQuotationId && (
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                                    ERP: {(quote as any).erpQuotationId}
                                </span>
                            )}
                        </div>
                        <p className="text-gray-500">Cliente: <span className="font-semibold text-gray-700">{quote.party_name || (quote as any).clientName}</span></p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {quote && companySettings && (
                            <DocumentExportButton
                                data={mapQuoteToDocument(quote, companySettings)}
                                type="quote"
                            />
                        )}
                        <Button variant="outline" className="gap-2">
                            <Mail className="h-4 w-4" /> Enviar
                        </Button>

                        {/* Edit Button */}
                        {quote.status !== "CONVERTED" && quote.status !== "Cancelled" && (
                            <Button variant="outline" onClick={() => router.push(`/income/quotes/${id}/edit`)} className="gap-2 hover:bg-gray-100">
                                <Edit className="h-4 w-4" /> Editar
                            </Button>
                        )}

                        {/* Send to ERPNext as Quotation */}
                        {quote.status !== "CONVERTED" && !(quote as any).erpQuotationId && (
                            <Button
                                variant="outline"
                                onClick={handleSyncToErp}
                                disabled={syncing}
                                className="border-blue-300 text-blue-700 hover:bg-blue-50 gap-2"
                            >
                                {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                Enviar a ERPNext
                            </Button>
                        )}

                        {/* Open in ERP */}
                        {erpUrl && (
                            <Button variant="outline" asChild className="gap-2 border-green-300 text-green-700 hover:bg-green-50">
                                <a href={erpUrl} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="h-4 w-4" /> Ver en ERP
                                </a>
                            </Button>
                        )}

                        {/* Convert to Invoice (also creates ERP invoice) */}
                        {quote.status !== "CONVERTED" && (
                            <Button
                                onClick={handleConvertWithErp}
                                disabled={converting || quote.status === "Cancelled"}
                                className="bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-md gap-2"
                            >
                                {converting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck className="h-4 w-4" />}
                                Convertir a Factura
                            </Button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Main Content */}
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
                                                <td className="py-3 px-4">
                                                    <div>{item.description}</div>
                                                    {(item as any).itemCode && (
                                                        <div className="text-xs text-blue-500">ERP: {(item as any).itemCode}</div>
                                                    )}
                                                </td>
                                                <td className="text-right py-3 px-4">{item.qty}</td>
                                                <td className="text-right py-3 px-4">
                                                    {quote.currency === "USD" ? "US$" : "RD$"} {(item.rate ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="text-right py-3 px-4 font-medium">
                                                    {quote.currency === "USD" ? "US$" : "RD$"} {(item.amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>

                        {quote.note && (
                            <Card className="p-6 glass-card">
                                <h3 className="font-semibold mb-2 text-gray-900">Notas</h3>
                                <p className="text-gray-600 whitespace-pre-wrap">{quote.note}</p>
                            </Card>
                        )}

                        {quote.timeline && quote.timeline.length > 0 && (
                            <QuoteTimeline timeline={quote.timeline} />
                        )}

                        <SupplierQuotesWidget
                            quoteId={quote.id}
                            files={quote.supplierFiles || []}
                            onUpdate={async () => {
                                const snap = await getDoc(doc(db, "quotes", id));
                                if (snap.exists()) setQuote({ id: snap.id, ...snap.data() } as Quote);
                            }}
                        />
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <Card className="p-6 glass-card bg-purple-50/50 border-purple-100">
                            <h3 className="font-semibold mb-4 text-purple-900">Resumen</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between text-gray-600">
                                    <span>Subtotal</span>
                                    <span>{quote.currency === "USD" ? "US$" : "RD$"} {(quote.net_total ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between text-gray-600">
                                    <span>ITBIS</span>
                                    <span>{quote.currency === "USD" ? "US$" : "RD$"} {(quote.total_taxes_and_charges ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="border-t pt-2 mt-2 flex justify-between font-bold text-lg text-gray-900">
                                    <span>Total</span>
                                    <span>{quote.currency === "USD" ? "US$" : "RD$"} {(quote.grand_total ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                        </Card>

                        <Card className="p-6 glass-card">
                            <h3 className="font-semibold mb-4 text-gray-900">Detalles</h3>
                            <div className="space-y-3 text-sm text-gray-600">
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="h-4 w-4 text-gray-400" />
                                    <span>Creado: {quote.createdAt ? new Date(quote.createdAt.seconds * 1000).toLocaleDateString() : "N/A"}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <XCircle className="h-4 w-4 text-gray-400" />
                                    <span>Válido hasta: {quote.valid_till ? new Date(quote.valid_till).toLocaleDateString() : "N/A"}</span>
                                </div>
                            </div>
                        </Card>

                        {/* ERPNext Status Card */}
                        {((quote as any).erpQuotationId || (quote as any).erpInvoiceId) && (
                            <Card className="p-6 glass-card border-green-200 bg-green-50/50">
                                <h3 className="font-semibold mb-3 text-green-800 flex items-center gap-2">
                                    <RefreshCw className="h-4 w-4" /> ERPNext
                                </h3>
                                <div className="space-y-2 text-sm">
                                    {(quote as any).erpQuotationId && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-600">Cotización:</span>
                                            <a
                                                href={`https://erpnext-pld-nic.v.frappe.cloud/app/quotation/${(quote as any).erpQuotationId}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-green-700 font-medium flex items-center gap-1 hover:underline"
                                            >
                                                {(quote as any).erpQuotationId}
                                                <ExternalLink className="h-3 w-3" />
                                            </a>
                                        </div>
                                    )}
                                    {(quote as any).erpSyncedAt && (
                                        <div className="text-xs text-gray-500">
                                            Sincronizado: {new Date((quote as any).erpSyncedAt.seconds * 1000).toLocaleString()}
                                        </div>
                                    )}
                                </div>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
