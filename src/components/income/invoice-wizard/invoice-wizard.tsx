"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, addDoc, updateDoc, doc, getDocs, serverTimestamp, Timestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Client } from "@/types/schema";
import { QuotationItem, Currency } from "@/types/finance";
import { generateNextNumber } from "@/lib/numbering-service";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
    ChevronRight, ChevronLeft, Save, Loader2,
    Check, Calculator, AlertCircle
} from "lucide-react";
import { StepClient } from "./step-client";
import { StepItems } from "./step-items";
import { StepDetails } from "./step-details";
import { StepReview } from "./step-review";
import { useErpQuotation, ErpQuotationDraft } from "@/hooks/use-erp-quotation";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface InvoiceWizardProps {
    mode?: "invoice" | "quote";
    initialData?: FormData | any;
    editingId?: string;
}

// Formulario espejo del DocType Quotation (ERPNext v16 fieldnames)
export interface QuoteFormData {
    // Campos ERP 1:1
    quotation_to: "Customer" | "Lead";
    party_name: string;          // nombre cliente en ERP
    transaction_date: string;    // YYYY-MM-DD
    valid_till: string;          // YYYY-MM-DD
    currency: Currency;
    selling_price_list: string;
    items: QuotationItem[];
    terms: string;
    note: string;

    // Totales — calculados por ERP (readonly)
    net_total: number;
    total_taxes_and_charges: number;
    grand_total: number;
    total_qty: number;

    // Campos locales HECHOAPP
    clientId: string;
    clientRnc?: string;
    ticketId?: string;
    ticketNumber?: string;
    sellerId?: string;
    sellerName?: string;
}

// Formulario para facturas (mantiene compatibilidad anterior)
interface InvoiceFormData {
    number: string;
    clientId: string;
    clientName: string;
    items: QuotationItem[];
    notes: string;
    status: string;
    currency: Currency;
    [key: string]: any;
}

type FormData = QuoteFormData | InvoiceFormData;

const STEPS = [
    { id: "client", title: "Cliente" },
    { id: "items", title: "Ítems" },
    { id: "details", title: "Detalles" },
    { id: "review", title: "Revisar" },
];

const today = () => new Date().toISOString().split("T")[0];
const in15days = () => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split("T")[0];
};

// ─── Wizard ───────────────────────────────────────────────────────────────────

const [formData, setFormData] = useState<FormData>(() => {
    if (initialData) return initialData;
    return isQuote
        ? ({
            quotation_to: "Customer",
            party_name: "",
            transaction_date: today(),
            valid_till: in15days(),
            currency: "DOP",
            selling_price_list: "Standard Selling",
            items: [],
            terms: "",
            note: "",
            net_total: 0,
            total_taxes_and_charges: 0,
            grand_total: 0,
            total_qty: 0,
            clientId: "",
            clientRnc: "",
        } as QuoteFormData)
        : ({
            number: "",
            clientId: "",
            clientName: "",
            items: [],
            notes: "",
            status: "DRAFT",
            currency: "DOP",
        } as InvoiceFormData);
});

// ── Load clients ─────────────────────────────────────────────────────────
useEffect(() => {
    getDocs(collection(db, "clients")).then((snap) =>
        setClients(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Client[])
    );
}, []);

// ── Pre-fill desde Ticket (solo cotizaciones) ─────────────────────────────
useEffect(() => {
    if (!isQuote) return;
    const raw = localStorage.getItem("quoteFromTicket");
    if (!raw) return;
    try {
        const data = JSON.parse(raw);
        updateData("clientId", data.clientId || "");
        updateData("party_name", data.clientName || "");
        updateData("ticketId", data.ticketId || "");
        updateData("ticketNumber", data.ticketNumber || "");
        updateData(
            "note",
            `Generada desde Ticket #${data.ticketNumber || "N/A"}\n\nServicio: ${(data.serviceType || "").replace(/_/g, " ")
            }\n\nDescripción: ${data.description || ""}`
        );
        localStorage.removeItem("quoteFromTicket");
    } catch { }
}, [isQuote]);

// ── Recalcular totales en ERP cuando cambian items, cliente o divisa ──────
useEffect(() => {
    if (!isQuote) return;
    const qf = formData as QuoteFormData;
    if (!qf.party_name || qf.items.length === 0) return;

    if (qf.items.some((i) => !i.item_code)) {
        // Si hay ítems manuales sin item_code de ERP, aplicamos el fallback local de una vez
        const net = qf.items.reduce((acc, i) => acc + (i.qty * i.rate), 0);
        const tax = net * 0.18;
        const totalQty = qf.items.reduce((acc, i) => acc + i.qty, 0);
        setFormData((prev) => ({
            ...prev,
            net_total: net,
            total_taxes_and_charges: tax,
            grand_total: net + tax,
            total_qty: totalQty,
        }));
        return;
    }

    const draft: ErpQuotationDraft = {
        quotation_to: qf.quotation_to,
        party_name: qf.party_name,
        transaction_date: qf.transaction_date,
        valid_till: qf.valid_till,
        currency: qf.currency,
        selling_price_list: qf.selling_price_list,
        items: qf.items,
    };
    calculateTotals(draft).then((t) => {
        if (t) {
            setFormData((prev) => ({
                ...prev,
                net_total: t.net_total,
                total_taxes_and_charges: t.total_taxes_and_charges,
                grand_total: t.grand_total,
                total_qty: t.total_qty,
            }));
        } else {
            // Fallback local si falla ERPNext
            const net = draft.items.reduce((acc, i) => acc + (i.qty * i.rate), 0);
            const tax = net * 0.18;
            const totalQty = draft.items.reduce((acc, i) => acc + i.qty, 0);
            setFormData((prev) => ({
                ...prev,
                net_total: net,
                total_taxes_and_charges: tax,
                grand_total: net + tax,
                total_qty: totalQty,
            }));
        }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
}, [
    (formData as QuoteFormData).party_name,
    (formData as QuoteFormData).currency,
    JSON.stringify((formData as QuoteFormData).items),
]);

const updateData = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
};

// ── Totales para el footer ────────────────────────────────────────────────
const displayTotal = isQuote
    ? erpTotals?.grand_total ?? (formData as QuoteFormData).grand_total ?? 0
    : /* factura: calcular localmente */ (formData as InvoiceFormData).items?.reduce(
        (acc, item) => acc + item.qty * item.rate * (1 + 0.18),
        0
    ) ?? 0;

const currencySymbol = formData.currency === "USD" ? "US$" : "RD$";

// ── Guardar ───────────────────────────────────────────────────────────────
const handleSave = async () => {
    setSaving(true);
    try {
        const firebaseUser = auth.currentUser;
        const user = firebaseUser || { uid: "local-user", displayName: "Usuario Local" };

        if (isQuote) {
            const qf = formData as QuoteFormData;
            const generatedNumber = await generateNextNumber("COT");

            const quoteDoc = {
                // ── Campos ERP (fieldnames exactos) ──────────────────────
                name: erpName || null,           // SAL-QTN-XXXX si ya se creó en ERP
                quotation_to: qf.quotation_to,
                party_name: qf.party_name,
                transaction_date: qf.transaction_date,
                valid_till: qf.valid_till,
                currency: qf.currency,
                selling_price_list: qf.selling_price_list,
                items: qf.items,
                terms: qf.terms || "",
                note: qf.note || "",

                // ── Totales de ERP (no calculados localmente) ─────────────
                net_total: erpTotals?.net_total ?? qf.net_total,
                total_taxes_and_charges:
                    erpTotals?.total_taxes_and_charges ?? qf.total_taxes_and_charges,
                grand_total: erpTotals?.grand_total ?? qf.grand_total,
                total_qty: erpTotals?.total_qty ?? qf.total_qty,

                // ── Estado ERP oficial ────────────────────────────────────
                status: "Draft",           // Estado ERP: Draft | Open | Expired | Ordered
                docstatus: 0,              // 0=Draft en ERPNext

                // ── Campos locales HECHOAPP ───────────────────────────────
                number: generatedNumber,
                clientId: qf.clientId,
                clientRnc: qf.clientRnc || null,
                ticketId: qf.ticketId || null,
                ticketNumber: qf.ticketNumber || null,
                erpQuotationId: erpName || null,
                erpSyncedAt: erpName ? serverTimestamp() : null,

                // ── Timeline ─────────────────────────────────────────────
                timeline: editingId
                    ? (initialData.timeline || []).concat([{
                        status: "Draft",
                        timestamp: Timestamp.now(),
                        userId: user.uid,
                        userName: user.displayName || "Usuario",
                        note: "Cotización actualizada",
                    }])
                    : [{
                        status: "Draft",
                        timestamp: Timestamp.now(),
                        userId: user.uid,
                        userName: user.displayName || "Usuario",
                        note: "Cotización creada (Wizard)",
                    }],

                // ── Audit ─────────────────────────────────────────────────
                sellerId: user.uid,
                sellerName: user.displayName || "Usuario",
                ...(editingId ? { updatedBy: user.uid, updatedAt: serverTimestamp() } : { createdBy: user.uid, createdAt: serverTimestamp(), updatedBy: user.uid, updatedAt: serverTimestamp() })
            };

            if (editingId) {
                await updateDoc(doc(db, "quotes", editingId), quoteDoc);
            } else {
                await addDoc(collection(db, "quotes"), quoteDoc);
            }
            router.push(editingId ? `/income/quotes/${editingId}` : "/income/quotes");
        } else {
            // ── Factura (mantiene flujo original) ────────────────────────
            const invF = formData as InvoiceFormData;
            const generatedNumber = await generateNextNumber("FACT");
            const localTotals = (invF.items || []).reduce(
                (acc, item) => ({
                    subtotal: acc.subtotal + item.qty * item.rate,
                    taxTotal: acc.taxTotal + item.qty * item.rate * 0.18,
                    total: acc.total + item.qty * item.rate * 1.18,
                }),
                { subtotal: 0, taxTotal: 0, total: 0 }
            );

            const invoiceDoc = {
                ...invF,
                number: generatedNumber,
                ...localTotals,
                balance: localTotals.total,
                status: "DRAFT",
                issueDate: editingId ? (initialData.issueDate || serverTimestamp()) : serverTimestamp(),
                dueDate: editingId ? (initialData.dueDate || serverTimestamp()) : serverTimestamp(),
                sellerId: user.uid,
                sellerName: user.displayName || "Usuario",
                updatedBy: user.uid,
                updatedAt: serverTimestamp(),
                ...(editingId ? {} : { createdBy: user.uid, createdAt: serverTimestamp() }),
            };

            if (editingId) {
                await updateDoc(doc(db, "invoices", editingId), invoiceDoc);
            } else {
                await addDoc(collection(db, "invoices"), invoiceDoc);
            }
            router.push(editingId ? `/income/invoices/${editingId}` : "/income/invoices");
        }
    } catch (error) {
        console.error(`Error creating ${mode}:`, error);
    } finally {
        setSaving(false);
    }
};

// ── Navigation ────────────────────────────────────────────────────────────
const handleNext = () => {
    if (currentStep < STEPS.length - 1) setCurrentStep((c) => c + 1);
};
const handleBack = () => {
    if (currentStep > 0) setCurrentStep((c) => c - 1);
};

const renderStep = () => {
    switch (currentStep) {
        case 0:
            return <StepClient data={formData} updateData={updateData} clients={clients} mode={mode} />;
        case 1:
            return <StepItems data={formData} updateData={updateData} clients={clients} mode={mode} />;
        case 2:
            return <StepDetails data={formData} updateData={updateData} mode={mode} />;
        case 3:
            return (
                <StepReview
                    data={formData}
                    tots={{
                        subtotal: erpTotals?.net_total ?? 0,
                        taxTotal: erpTotals?.total_taxes_and_charges ?? 0,
                        total: erpTotals?.grand_total ?? 0,
                    }}
                    mode={mode}
                    erpTotals={erpTotals}
                    calculating={calculating}
                />
            );
        default:
            return null;
    }
};

return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
        {/* Progress Bar */}
        <div className="relative">
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-200 -z-10" />
            <div className="flex justify-between">
                {STEPS.map((step, idx) => {
                    const isCompleted = currentStep > idx;
                    const isCurrent = currentStep === idx;
                    const accent = isQuote ? "purple" : "purple";
                    return (
                        <div key={idx} className="flex flex-col items-center gap-2 bg-slate-50 px-2">
                            <div
                                className={cn(
                                    "h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 border-2",
                                    isCompleted
                                        ? "bg-green-500 border-green-500 text-white"
                                        : isCurrent
                                            ? `bg-${accent}-600 border-${accent}-600 text-white shadow-lg shadow-${accent}-500/30 scale-110`
                                            : "bg-white border-gray-300 text-gray-400"
                                )}
                            >
                                {isCompleted ? <Check className="h-4 w-4" /> : idx + 1}
                            </div>
                            <span
                                className={cn(
                                    "text-xs font-medium transition-colors",
                                    isCurrent ? `text-${accent}-700` : "text-gray-400"
                                )}
                            >
                                {step.title}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>

        {/* ERP error banner */}
        {erpError && isQuote && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm text-amber-800">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>No se pudo calcular el ITBIS en ERP: {erpError}</span>
            </div>
        )}

        {/* Step Content */}
        <div className="min-h-[400px]">{renderStep()}</div>

        {/* Footer Navigation */}
        <div className="fixed bottom-0 left-0 w-full bg-white/80 backdrop-blur-md border-t p-4 flex justify-between items-center z-50 md:pl-20">
            <div className="max-w-4xl mx-auto w-full flex justify-between">
                <Button
                    variant="ghost"
                    onClick={handleBack}
                    disabled={currentStep === 0 || saving}
                    className="text-gray-500 hover:text-gray-900"
                >
                    <ChevronLeft className="mr-2 h-4 w-4" /> Atrás
                </Button>

                <div className="flex items-center gap-4">
                    {/* Total display */}
                    <div className="text-right hidden sm:block">
                        <p className="text-xs text-gray-500 uppercase">
                            {isQuote ? "Total Cotizado" : "Total Estimado"}
                        </p>
                        <div className="flex items-center gap-1.5">
                            {calculating && (
                                <Calculator className="h-3.5 w-3.5 animate-pulse text-blue-500" />
                            )}
                            <p className={cn(
                                "font-bold text-lg",
                                isQuote ? "text-blue-700" : "text-purple-700",
                                calculating && "opacity-50"
                            )}>
                                {currencySymbol}{" "}
                                {displayTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                        {isQuote && erpTotals && (
                            <p className="text-xs text-gray-400">
                                ITBIS: {currencySymbol}{" "}
                                {erpTotals.total_taxes_and_charges.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                })}
                            </p>
                        )}
                    </div>

                    {currentStep === STEPS.length - 1 ? (
                        <Button
                            onClick={handleSave}
                            disabled={saving || calculating}
                            className="bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/20"
                        >
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <Save className="mr-2 h-4 w-4" />
                            {isQuote ? "Finalizar Cotización" : "Finalizar Factura"}
                        </Button>
                    ) : (
                        <Button
                            onClick={handleNext}
                            className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/20"
                        >
                            Siguiente <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    </div>
);
}
