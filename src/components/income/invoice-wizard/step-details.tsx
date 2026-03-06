"use client";

/**
 * StepDetails — Detalles de Cotización / Factura
 * Campos ERP (cotizaciones):
 *   transaction_date   → Date
 *   valid_till         → Date  (solo cotizaciones)
 *   currency           → Link → Currency
 *   selling_price_list → Link → Price List
 *   terms              → Text Editor (condiciones visibles al cliente)
 *   note               → Small Text (nota interna)
 */

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { CalendarDays, FileText, DollarSign, List } from "lucide-react";

interface StepDetailsProps {
    data: any;
    updateData: (key: string, value: any) => void;
    mode?: "invoice" | "quote";
}

const PRICE_LISTS = ["Standard Selling", "USD selling", "Export"];

export function StepDetails({ data, updateData, mode = "invoice" }: StepDetailsProps) {
    const isQuote = mode === "quote";

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold text-gray-900">
                    {isQuote ? "Detalles de la Cotización" : "Detalles de la Factura"}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                    {isQuote
                        ? "Configura las fechas y condiciones. Los fieldnames corresponden al DocType Quotation de ERPNext."
                        : "Configura las fechas y condiciones de pago."}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* transaction_date — fecha de emisión */}
                <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-medium">
                        <CalendarDays className="h-4 w-4 text-gray-400" />
                        {isQuote ? "Fecha de Emisión" : "Fecha de Emisión"}
                        <span className="text-xs font-normal text-gray-400 font-mono ml-1">
                            {isQuote ? "transaction_date" : "issue_date"}
                        </span>
                    </Label>
                    <Input
                        type="date"
                        value={isQuote ? data.transaction_date || "" : data.issueDate || ""}
                        onChange={(e) =>
                            updateData(isQuote ? "transaction_date" : "issueDate", e.target.value)
                        }
                    />
                </div>

                {/* valid_till (solo cotizaciones) / dueDate (facturas) */}
                <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-medium">
                        <CalendarDays className="h-4 w-4 text-gray-400" />
                        {isQuote ? "Válida Hasta" : "Fecha de Vencimiento"}
                        <span className="text-xs font-normal text-gray-400 font-mono ml-1">
                            {isQuote ? "valid_till" : "due_date"}
                        </span>
                    </Label>
                    <Input
                        type="date"
                        value={isQuote ? data.valid_till || "" : data.dueDate || ""}
                        onChange={(e) =>
                            updateData(isQuote ? "valid_till" : "dueDate", e.target.value)
                        }
                    />
                    {isQuote && (
                        <p className="text-xs text-gray-400">
                            Cuando expire, el estado cambia automáticamente a <strong>Expired</strong> en ERP.
                        </p>
                    )}
                </div>

                {/* currency */}
                <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-medium">
                        <DollarSign className="h-4 w-4 text-gray-400" />
                        Moneda
                        <span className="text-xs font-normal text-gray-400 font-mono ml-1">currency</span>
                    </Label>
                    <select
                        value={data.currency || "DOP"}
                        onChange={(e) => updateData("currency", e.target.value)}
                        className="w-full h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                    >
                        <option value="DOP">🇩🇴 DOP — Peso Dominicano</option>
                        <option value="USD">🇺🇸 USD — Dólar Americano</option>
                    </select>
                </div>

                {/* selling_price_list (solo cotizaciones) */}
                {isQuote && (
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm font-medium">
                            <List className="h-4 w-4 text-gray-400" />
                            Lista de Precios
                            <span className="text-xs font-normal text-gray-400 font-mono ml-1">
                                selling_price_list
                            </span>
                        </Label>
                        <select
                            value={data.selling_price_list || "Standard Selling"}
                            onChange={(e) => updateData("selling_price_list", e.target.value)}
                            className="w-full h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                        >
                            {PRICE_LISTS.map((pl) => (
                                <option key={pl} value={pl}>{pl}</option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-400">
                            Debe existir en ERPNext → Configuración de Ventas → Lista de Precios
                        </p>
                    </div>
                )}

                {/* Condiciones comerciales (terms) — visible al cliente */}
                <div className={cn("space-y-2", isQuote ? "md:col-span-2" : "")}>
                    <Label className="flex items-center gap-2 text-sm font-medium">
                        <FileText className="h-4 w-4 text-gray-400" />
                        {isQuote ? "Condiciones Comerciales" : "Notas"}
                        <span className="text-xs font-normal text-gray-400 font-mono ml-1">
                            {isQuote ? "terms" : "notes"}
                        </span>
                    </Label>
                    <Textarea
                        placeholder={
                            isQuote
                                ? "Ej: Esta cotización es válida por 15 días. Los precios no incluyen instalación..."
                                : "Notas adicionales para el cliente..."
                        }
                        value={isQuote ? data.terms || "" : data.notes || ""}
                        onChange={(e) =>
                            updateData(isQuote ? "terms" : "notes", e.target.value)
                        }
                        rows={3}
                    />
                    {isQuote && (
                        <p className="text-xs text-gray-400">
                            Se mostrará como condiciones en el PDF de ERPNext ({" "}
                            <code className="font-mono">terms</code> del DocType).
                        </p>
                    )}
                </div>

                {/* Nota interna (note) — solo cotizaciones */}
                {isQuote && (
                    <div className="space-y-2 md:col-span-2">
                        <Label className="flex items-center gap-2 text-sm font-medium">
                            <FileText className="h-4 w-4 text-gray-400" />
                            Nota Interna
                            <span className="text-xs font-normal text-gray-400 font-mono ml-1">note</span>
                        </Label>
                        <Textarea
                            placeholder="Nota interna para el equipo (no visible al cliente)..."
                            value={data.note || ""}
                            onChange={(e) => updateData("note", e.target.value)}
                            rows={2}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
