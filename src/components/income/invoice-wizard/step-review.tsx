
"use client";

import { InvoiceItem } from "@/types/schema";
import { CheckCircle2, Tag } from "lucide-react";

interface StepReviewProps {
    data: any;
    tots: { subtotal: number; taxTotal: number; total: number };
    mode?: "invoice" | "quote";
}

export function StepReview({ data, tots, mode = "invoice" }: StepReviewProps) {
    const isQuote = mode === "quote";
    const currencySymbol = data.currency === "USD" ? "US$" : "RD$";
    const accentColor = isQuote ? "border-t-blue-600" : "border-t-purple-600";
    const totalLabel = isQuote ? "Total Cotizado" : "Total a Pagar";

    return (
        <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
            <div className="text-center space-y-2">
                <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Todo Listo</h2>
                <p className="text-gray-500">
                    Revisa la información antes de {isQuote ? "crear la cotización" : "crear la factura"}.
                </p>
            </div>

            <div className={`glass-card p-8 max-w-2xl mx-auto space-y-8 border-t-4 ${accentColor}`}>
                {/* Header Info */}
                <div className="flex justify-between items-start border-b pb-6 gap-4">
                    <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Cliente</p>
                        <h3 className="text-xl font-bold text-gray-900">{data.clientName || "—"}</h3>
                        {data.clientRnc && (
                            <p className="text-sm text-gray-500 mt-0.5">RNC: {data.clientRnc}</p>
                        )}
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">
                            {isQuote ? "Cotización #" : "Factura #"}
                        </p>
                        <p className="text-sm font-mono text-gray-500">(Auto-generado)</p>
                        {data.currency && (
                            <span className="inline-block mt-1 text-xs font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                {data.currency}
                            </span>
                        )}
                    </div>
                </div>

                {/* Validity (Quotes only) */}
                {isQuote && data.validUntilDate && (
                    <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5">
                        <span className="font-medium">Válida hasta:</span>
                        <span>{new Date(data.validUntilDate + "T12:00:00").toLocaleDateString("es-DO", { year: "numeric", month: "long", day: "numeric" })}</span>
                    </div>
                )}

                {/* Items Summary */}
                <div className="space-y-3">
                    <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                        Ítems ({(data.items || []).length})
                    </p>
                    <div className="space-y-1">
                        {(data.items || []).map((item: InvoiceItem & { itemCode?: string }, idx: number) => (
                            <div key={idx} className="flex justify-between text-sm py-2 border-b border-dashed border-gray-100 last:border-0 gap-4">
                                <div className="flex-1 min-w-0">
                                    <span className="font-semibold text-gray-900">{item.quantity}×</span>{" "}
                                    <span className="text-gray-700">{item.description || "Sin descripción"}</span>
                                    {item.itemCode && (
                                        <span className="ml-2 inline-flex items-center gap-0.5 text-[10px] text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">
                                            <Tag className="h-2.5 w-2.5" />{item.itemCode}
                                        </span>
                                    )}
                                </div>
                                <span className="font-medium text-gray-900 shrink-0 font-mono">
                                    {currencySymbol} {item.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Notes preview */}
                {data.notes && (
                    <div className="bg-gray-50 border border-dashed border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-600">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Notas</p>
                        <p className="whitespace-pre-wrap line-clamp-3">{data.notes}</p>
                    </div>
                )}

                {/* Totals */}
                <div className="bg-gradient-to-br from-gray-50 to-slate-50 border border-gray-100 p-6 rounded-xl space-y-3">
                    <div className="flex justify-between text-sm text-gray-600">
                        <span>Subtotal</span>
                        <span className="font-mono">{currencySymbol} {tots.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                        <span>ITBIS (18%)</span>
                        <span className="font-mono">{currencySymbol} {tots.taxTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold text-gray-900 pt-3 border-t border-gray-200">
                        <span>{totalLabel}</span>
                        <span className={`font-mono ${isQuote ? "text-blue-700" : "text-purple-700"}`}>
                            {currencySymbol} {tots.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
