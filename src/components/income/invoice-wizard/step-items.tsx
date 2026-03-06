"use client";

/**
 * StepItems — Tabla de ítems espejo del DocType "Quotation Item" de ERPNext v16.
 *
 * Campos 1:1 con ERP:
 *   item_code   → Link → Item
 *   item_name   → Data  (autofill)
 *   description → Text
 *   qty         → Float
 *   uom         → Link → UOM
 *   rate        → Currency (sin ITBIS)
 *   amount      → Currency = qty * rate (read-only, calculado)
 *
 * El ITBIS NO se calcula aquí — lo calcula ERPNext y lo devuelve el hook.
 */

import { useErpCatalog } from "@/hooks/use-erp-catalog";
import { QuotationItem } from "@/types/finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Plus, Trash2, ChevronDown, Package, Loader2,
    AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StepItemsProps {
    data: any;
    updateData: (key: string, value: any) => void;
    clients?: any[];
    mode?: "invoice" | "quote";
}

// UOMs más comunes en ERPNext (República Dominicana)
const COMMON_UOMS = ["Unit", "Nos", "Hour", "Day", "Month", "Kg", "Meter", "Ltr"];

// ─── Empty item plantilla (fieldnames ERP) ────────────────────────────────────
function emptyItem(): QuotationItem {
    return {
        item_code: "",
        item_name: "",
        description: "",
        qty: 1,
        uom: "Unit",
        rate: 0,
        amount: 0,
    };
}

export function StepItems({ data, updateData, mode = "invoice" }: StepItemsProps) {
    const isQuote = mode === "quote";
    const items: QuotationItem[] = data.items || [];

    // Catálogo ERP (items cacheados en Firestore desde ERPNext)
    const { items: erpItems, getPriceForItem, loading: catalogLoading } = useErpCatalog();

    // ── Mutadores ─────────────────────────────────────────────────────────────
    const updateItem = (index: number, field: keyof QuotationItem, value: any) => {
        const next = [...items];
        (next[index] as any)[field] = value;

        // Recalcular amount cuando cambia qty o rate
        if (field === "qty" || field === "rate") {
            next[index].amount = next[index].qty * next[index].rate;
        }
        updateData("items", next);
    };

    const addItem = () => updateData("items", [...items, emptyItem()]);

    const removeItem = (index: number) =>
        updateData("items", items.filter((_, i) => i !== index));

    // ── Seleccionar ítem del catálogo ERP ─────────────────────────────────────
    const handleSelectErpItem = (index: number, erpItemCode: string) => {
        const erpItem = erpItems.find((i) => i.name === erpItemCode);
        if (!erpItem) return;

        const price = getPriceForItem(erpItemCode);
        const next = [...items];
        const qty = next[index].qty || 1;

        next[index] = {
            ...next[index],
            item_code: erpItem.name,
            item_name: erpItem.item_name || erpItem.name,
            description: erpItem.description || erpItem.item_name || erpItem.name,
            uom: erpItem.stock_uom || "Unit",
            rate: price,
            amount: qty * price,
        };
        updateData("items", next);
    };

    const currencySymbol = data.currency === "USD" ? "US$" : "RD$";

    // ── Subtotal local (antes del ITBIS, que lo calcula ERP) ─────────────────
    const localSubtotal = items.reduce((sum, i) => sum + i.amount, 0);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold text-gray-900">
                    {isQuote ? "Ítems de la Cotización" : "Ítems de la Factura"}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                    Los ítems deben corresponder al catálogo de ERPNext.{" "}
                    {isQuote && "El ITBIS (18%) se calculará automáticamente en ERP."}
                </p>
            </div>

            {/* Tabla de ítems */}
            {items.length > 0 ? (
                <div className="space-y-3">
                    {/* Header */}
                    <div className="hidden md:grid grid-cols-12 gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wide px-1">
                        <div className="col-span-4">Ítem (item_code)</div>
                        <div className="col-span-2">Descripción</div>
                        <div className="col-span-1 text-center">Cant.</div>
                        <div className="col-span-1 text-center">UOM</div>
                        <div className="col-span-2 text-right">Precio Unit.</div>
                        <div className="col-span-1 text-right">Amount</div>
                        <div className="col-span-1" />
                    </div>

                    {items.map((item, index) => (
                        <div
                            key={index}
                            className="grid grid-cols-12 gap-2 items-start bg-white rounded-xl border border-gray-200 p-3 shadow-sm"
                        >
                            {/* item_code con selector de catálogo */}
                            <div className="col-span-12 md:col-span-4 space-y-1">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button
                                            className={cn(
                                                "w-full flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                                                item.item_code
                                                    ? "border-blue-300 bg-blue-50 text-blue-800 font-medium"
                                                    : "border-dashed border-gray-300 text-gray-400 hover:border-blue-400 hover:text-blue-600"
                                            )}
                                        >
                                            <span className="flex items-center gap-1.5 truncate">
                                                <Package className="h-3.5 w-3.5 shrink-0" />
                                                {item.item_code || "Elegir del catálogo ERP"}
                                            </span>
                                            {catalogLoading ? (
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            ) : (
                                                <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                                            )}
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="w-72">
                                        <DropdownMenuLabel className="text-xs text-gray-500">
                                            Catálogo ERPNext — /api/resource/Item
                                        </DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        {erpItems.length === 0 && !catalogLoading && (
                                            <div className="px-3 py-2 text-xs text-gray-500 flex items-center gap-2">
                                                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                                                Sin ítems en catálogo ERP
                                            </div>
                                        )}
                                        {erpItems.map((ei) => (
                                            <DropdownMenuItem
                                                key={ei.name}
                                                onSelect={() => handleSelectErpItem(index, ei.name)}
                                                className="flex flex-col items-start"
                                            >
                                                <span className="font-medium text-sm">{ei.item_name || ei.name}</span>
                                                <span className="text-xs text-gray-400">
                                                    {ei.name} · {currencySymbol}{" "}
                                                    {getPriceForItem(ei.name).toLocaleString()}
                                                </span>
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                {/* Campo manual item_code si no está en catálogo */}
                                {!item.item_code && (
                                    <Input
                                        placeholder="o escribe el item_code..."
                                        value={item.item_code}
                                        onChange={(e) => {
                                            updateItem(index, "item_code", e.target.value);
                                            updateItem(index, "item_name", e.target.value);
                                        }}
                                        className="text-xs h-7"
                                    />
                                )}
                            </div>

                            {/* Descripción */}
                            <div className="col-span-12 md:col-span-2">
                                <Input
                                    placeholder="Descripción"
                                    value={item.description}
                                    onChange={(e) => updateItem(index, "description", e.target.value)}
                                    className="text-sm"
                                />
                            </div>

                            {/* qty */}
                            <div className="col-span-3 md:col-span-1">
                                <Input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    value={item.qty}
                                    onChange={(e) =>
                                        updateItem(index, "qty", parseFloat(e.target.value) || 1)
                                    }
                                    className="text-center text-sm"
                                />
                            </div>

                            {/* UOM */}
                            <div className="col-span-3 md:col-span-1">
                                <select
                                    value={item.uom}
                                    onChange={(e) => updateItem(index, "uom", e.target.value)}
                                    className="w-full h-9 rounded-md border border-input bg-transparent px-2 text-xs"
                                >
                                    {COMMON_UOMS.map((u) => (
                                        <option key={u} value={u}>{u}</option>
                                    ))}
                                </select>
                            </div>

                            {/* rate (sin ITBIS) */}
                            <div className="col-span-3 md:col-span-2">
                                <div className="relative">
                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                                        {currencySymbol}
                                    </span>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={item.rate}
                                        onChange={(e) =>
                                            updateItem(index, "rate", parseFloat(e.target.value) || 0)
                                        }
                                        className="pl-8 text-right text-sm"
                                    />
                                </div>
                                <p className="text-xs text-gray-400 text-right mt-0.5">sin ITBIS</p>
                            </div>

                            {/* amount = qty * rate (calculado) */}
                            <div className="col-span-2 md:col-span-1 flex flex-col items-end justify-center">
                                <p className="text-sm font-semibold text-gray-900">
                                    {item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </p>
                                <p className="text-xs text-gray-400">amount</p>
                            </div>

                            {/* Delete */}
                            <div className="col-span-1 flex justify-end">
                                <button
                                    onClick={() => removeItem(index)}
                                    className="text-gray-300 hover:text-red-500 transition-colors p-1"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ))}

                    {/* Subtotal local (neto antes del ITBIS) */}
                    <div className="flex justify-end pr-2 pt-2 border-t">
                        <div className="text-right">
                            <p className="text-xs text-gray-400">
                                Neto (net_total) · ITBIS calculado por ERP al guardar
                            </p>
                            <p className="text-lg font-bold text-gray-800">
                                {currencySymbol}{" "}
                                {localSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                /* Empty state */
                <div className="border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center">
                    <Package className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500 font-medium mb-1">Sin ítems todavía</p>
                    <p className="text-sm text-gray-400 mb-6">
                        Agrega ítems del catálogo ERPNext o escribe el <code>item_code</code>
                    </p>
                    <Button
                        onClick={addItem}
                        variant="outline"
                        className="border-blue-300 text-blue-600 hover:bg-blue-50"
                    >
                        <Plus className="mr-2 h-4 w-4" /> Agregar Primer Ítem
                    </Button>
                </div>
            )}

            {/* Add button */}
            {items.length > 0 && (
                <Button
                    onClick={addItem}
                    variant="outline"
                    size="sm"
                    className="border-dashed border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-600"
                >
                    <Plus className="mr-2 h-4 w-4" /> Agregar Ítem
                </Button>
            )}

            {/* Nota ITBIS para cotizaciones */}
            {isQuote && items.length > 0 && (
                <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-700 flex items-start gap-2">
                    <span className="shrink-0 font-semibold">ITBIS 18%:</span>
                    <span>
                        No se calcula localmente. ERPNext aplica el template fiscal configurado
                        al crear la cotización. El total con ITBIS se mostrará en el paso Revisar.
                    </span>
                </div>
            )}
        </div>
    );
}
