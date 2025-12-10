
"use client";

import { Button } from "@/components/ui/button";
import { InvoiceItem } from "@/types/schema";
import { CheckCircle2 } from "lucide-react";

interface StepReviewProps {
    data: any;
    tots: { subtotal: number; taxTotal: number; total: number };
}

export function StepReview({ data, tots }: StepReviewProps) {
    return (
        <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
            <div className="text-center space-y-2">
                <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Todo Listo</h2>
                <p className="text-gray-500">Revisa la información antes de crear la factura.</p>
            </div>

            <div className="glass-card p-8 max-w-2xl mx-auto space-y-8 border-t-4 border-t-purple-600">
                {/* Header Info */}
                <div className="flex justify-between items-start border-b pb-6">
                    <div>
                        <p className="text-sm text-gray-500 uppercase tracking-wider font-semibold">Cliente</p>
                        <h3 className="text-xl font-bold text-gray-900">{data.clientName || "Cliente Genérico"}</h3>
                        <p className="text-sm text-gray-600">{data.clientRnc}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-gray-500 uppercase tracking-wider font-semibold">Factura #</p>
                        <h3 className="text-xl font-mono text-gray-900">{data.number}</h3>
                    </div>
                </div>

                {/* Items Summary */}
                <div className="space-y-4">
                    <p className="text-sm text-gray-500 uppercase tracking-wider font-semibold">Resumen de Ítems</p>
                    <div className="space-y-2">
                        {(data.items || []).map((item: InvoiceItem, idx: number) => (
                            <div key={idx} className="flex justify-between text-sm py-1 border-b border-dashed border-gray-100 last:border-0">
                                <span className="text-gray-700">
                                    <span className="font-semibold text-gray-900">{item.quantity}x</span> {item.description}
                                </span>
                                <span className="font-medium text-gray-900">
                                    {item.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Totals */}
                <div className="bg-gray-50 p-6 rounded-xl space-y-3">
                    <div className="flex justify-between text-sm text-gray-600">
                        <span>Subtotal</span>
                        <span>{data.currency === 'USD' ? 'US$' : 'RD$'} {tots.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                        <span>ITBIS (18%)</span>
                        <span>{data.currency === 'USD' ? 'US$' : 'RD$'} {tots.taxTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold text-gray-900 pt-3 border-t border-gray-200">
                        <span>Total a Pagar</span>
                        <span className="text-purple-700">{data.currency === 'USD' ? 'US$' : 'RD$'} {tots.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
