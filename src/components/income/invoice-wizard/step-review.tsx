"use client";

/**
 * StepReview — Resumen final de la Cotización / Factura
 * Muestra los totales calculados por ERPNext (net_total, total_taxes_and_charges, grand_total).
 * Estados oficiales del DocType: Draft | Open | Expired | Ordered
 */

import { QuotationItem } from "@/types/finance";
import { ErpTotals, quoteStatusLabel, quoteStatusColor } from "@/hooks/use-erp-quotation";
import { Badge } from "@/components/ui/badge";
import { Calculator, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepReviewProps {
    data: any;
    tots: { subtotal: number; taxTotal: number; total: number }; // legacy para facturas
    mode?: "invoice" | "quote";
    erpTotals?: ErpTotals | null;
    calculating?: boolean;
}

export function StepReview({
    data,
    tots,
    mode = "invoice",
    erpTotals,
    calculating = false,
}: StepReviewProps) {
    const isQuote = mode === "quote";
    const items: QuotationItem[] = data.items || [];
    const currencySymbol = data.currency === "USD" ? "US$" : "RD$";

    // Para quotes usamos totales form (que pueden ser ERP o local fallback); para facturas, totales de tots
    const net = isQuote ? data.net_total : tots.subtotal;
    const itbis = isQuote ? data.total_taxes_and_charges : tots.taxTotal;
    const grand = isQuote ? data.grand_total : tots.total;

    const fmt = (n: number) =>
        `${currencySymbol} ${n.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">
                        {isQuote ? "Revisar Cotización" : "Revisar Factura"}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Confirma los datos antes de guardar.
                    </p>
                </div>
                {/* Estado del DocType */}
                <span
                    className={cn(
                        "px-3 py-1 rounded-full text-xs font-semibold",
                        quoteStatusColor("Draft")
                    )}
                >
                    {quoteStatusLabel("Draft")} — Draft
                </span>
            </div>

            {/* Datos del cliente */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-2">
                <p className="text-xs font-semibold uppercase text-gray-400 tracking-wide">
                    {isQuote ? "party_name / customer" : "Cliente"}
                </p>
                <p className="text-lg font-bold text-gray-900">
                    {isQuote ? data.party_name || "—" : data.clientName || "—"}
                </p>
                {isQuote && (
                    <div className="grid grid-cols-2 gap-3 text-sm text-gray-500 pt-1">
                        <div>
                            <span className="font-mono text-xs text-gray-400">transaction_date: </span>
                            {data.transaction_date || "—"}
                        </div>
                        <div>
                            <span className="font-mono text-xs text-gray-400">valid_till: </span>
                            {data.valid_till || "—"}
                        </div>
                        <div>
                            <span className="font-mono text-xs text-gray-400">currency: </span>
                            {data.currency || "DOP"}
                        </div>
                        <div>
                            <span className="font-mono text-xs text-gray-400">selling_price_list: </span>
                            {data.selling_price_list || "Standard Selling"}
                        </div>
                    </div>
                )}
            </div>

            {/* Tabla de ítems */}
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div className="px-5 py-3 border-b bg-gray-50">
                    <p className="text-xs font-semibold uppercase text-gray-400 tracking-wide">
                        items — Quotation Item
                    </p>
                </div>
                <div className="divide-y">
                    {items.map((item, i) => (
                        <div key={i} className="px-5 py-3 flex items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="font-medium text-sm text-gray-900 truncate">
                                        {item.item_name || item.item_code || "Sin nombre"}
                                    </p>
                                    {item.item_code && (
                                        <Badge
                                            variant="secondary"
                                            className="text-xs font-mono shrink-0 bg-blue-50 text-blue-700 border-blue-100"
                                        >
                                            {item.item_code}
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {item.description || "—"}
                                </p>
                                <p className="text-xs text-gray-400 font-mono">
                                    qty: {item.qty} {item.uom} · rate: {fmt(item.rate)}
                                </p>
                            </div>
                            <div className="text-right shrink-0">
                                <p className="font-semibold text-sm text-gray-900">{fmt(item.amount)}</p>
                                <p className="text-xs text-gray-400 font-mono">amount</p>
                            </div>
                        </div>
                    ))}
                    {items.length === 0 && (
                        <div className="px-5 py-6 text-center text-sm text-gray-400">
                            Sin ítems agregados
                        </div>
                    )}
                </div>
            </div>

            {/* Totales — ITBIS calculado por ERP */}
            <div className={cn(
                "rounded-xl border-t-4 p-5 space-y-3",
                isQuote
                    ? "border-t-blue-600 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100"
                    : "border-t-purple-600 bg-gradient-to-br from-purple-50 to-fuchsia-50 border border-purple-100"
            )}>
                {/* Indicador de origen del cálculo */}
                {isQuote && (
                    <div className="flex items-center gap-2 text-xs mb-2">
                        {calculating ? (
                            <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
                                <span className="text-blue-600">Calculando ITBIS en ERPNext...</span>
                            </>
                        ) : erpTotals ? (
                            <>
                                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                                <span className="text-green-700">Totales calculados por ERPNext ✓</span>
                            </>
                        ) : grand > 0 ? (
                            <>
                                <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />
                                <span className="text-blue-700">Totales calculados localmente (Fallback)</span>
                            </>
                        ) : (
                            <>
                                <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                                <span className="text-amber-700">
                                    Totales pendientes — completa los ítems y el cliente
                                </span>
                            </>
                        )}
                    </div>
                )}

                <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-gray-600">
                        <span className="font-mono text-xs">net_total</span>
                        <span>{fmt(net)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                        <span className="font-mono text-xs">
                            total_taxes_and_charges{" "}
                            {isQuote && erpTotals?.taxes?.[0] && (
                                <span className="text-gray-400">
                                    ({erpTotals.taxes[0].rate}% ITBIS)
                                </span>
                            )}
                        </span>
                        <span>{fmt(itbis)}</span>
                    </div>
                    <div className="h-px bg-gray-200 my-2" />
                    <div className="flex justify-between font-bold text-lg">
                        <span className="font-mono text-sm">grand_total</span>
                        <span className={isQuote ? "text-blue-800" : "text-purple-800"}>
                            {fmt(grand)}
                        </span>
                    </div>
                </div>

                {/* Detalle de líneas de impuesto */}
                {isQuote && erpTotals?.taxes && erpTotals.taxes.length > 0 && (
                    <div className="pt-2 border-t border-blue-200">
                        <p className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
                            Detalle Fiscal (taxes_and_charges)
                        </p>
                        {erpTotals.taxes.map((tax, i) => (
                            <div key={i} className="flex justify-between text-xs text-gray-500">
                                <span>{tax.description || tax.account_head}</span>
                                <span>{fmt(tax.tax_amount)}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Condiciones si hay */}
            {isQuote && data.terms && (
                <div className="rounded-xl border border-gray-200 bg-white p-5">
                    <p className="text-xs font-semibold uppercase text-gray-400 tracking-wide mb-2">
                        terms — Condiciones Comerciales
                    </p>
                    <p className="text-sm text-gray-700 whitespace-pre-line">{data.terms}</p>
                </div>
            )}
        </div>
    );
}

// ── Utilitario ────────────────────────────────────────────────────────────────
function tot(items: QuotationItem[]): number {
    return items.reduce((acc, i) => acc + i.amount, 0);
}
