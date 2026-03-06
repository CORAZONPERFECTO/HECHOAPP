/**
 * useErpQuotation
 * ---------------
 * Puente entre el formulario local y el DocType Quotation de ERPNext v16.
 *
 * Flujo:
 *   1. El usuario llena el formulario (campos 1:1 con ERP fieldnames).
 *   2. Al hacer "Calcular" o "Guardar", se llama a `calculateTotals()`.
 *      Esto crea/actualiza un Quotation Draft en ERP y devuelve los totales
 *      con el ITBIS 18% calculado por Frappe (no localmente).
 *   3. Al confirmar, `saveQuote()` persiste en Firestore con los totales ERP.
 */
"use client";

import { useState, useCallback, useRef } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import type { QuotationItem } from "@/types/finance";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface ErpQuotationDraft {
    quotation_to: "Customer" | "Lead";
    party_name: string;
    transaction_date: string;  // YYYY-MM-DD
    valid_till: string;         // YYYY-MM-DD
    currency: "DOP" | "USD";
    selling_price_list?: string;
    items: QuotationItem[];
    terms?: string;
    note?: string;
}

export interface ErpTotals {
    net_total: number;           // Subtotal sin impuestos
    total_taxes_and_charges: number; // ITBIS 18%
    grand_total: number;         // Total final
    total_qty: number;
    rounded_total: number;
    currency: string;
    taxes: ErpTaxLine[];         // Detalle de impuestos
}

export interface ErpTaxLine {
    account_head: string;        // ej. "ITBIS 18% - H"
    rate: number;                // 18
    tax_amount: number;
    total: number;
    description: string;
}

export interface UseErpQuotationResult {
    totals: ErpTotals | null;
    erpName: string | null;      // SAL-QTN-2026-00001
    calculating: boolean;
    error: string | null;
    calculateTotals: (draft: ErpQuotationDraft) => Promise<ErpTotals | null>;
    clearTotals: () => void;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

/** Precio de lista por defecto (debe existir en ERP) */
const DEFAULT_PRICE_LIST = "Standard Selling";

/** Plantilla de impuesto por defecto — debe coincidir con la configurada en ERP */
const DEFAULT_TAX_TEMPLATE = "ITBIS 18%";

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useErpQuotation(): UseErpQuotationResult {
    const [totals, setTotals] = useState<ErpTotals | null>(null);
    const [erpName, setErpName] = useState<string | null>(null);
    const [calculating, setCalculating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const calculateTotals = useCallback(
        async (draft: ErpQuotationDraft): Promise<ErpTotals | null> => {
            // Validación mínima
            if (!draft.party_name || draft.items.length === 0) return null;
            if (draft.items.some((i) => !i.item_code)) return null;

            // Debounce de 600ms para no llamar en cada keystroke
            if (debounceRef.current) clearTimeout(debounceRef.current);

            return new Promise((resolve) => {
                debounceRef.current = setTimeout(async () => {
                    setCalculating(true);
                    setError(null);
                    try {
                        const fn = httpsCallable<
                            { draft: ErpQuotationDraft; existingErpName?: string },
                            { totals: ErpTotals; erpName: string }
                        >(functions, "calculateErpQuotationTotals");

                        const result = await fn({
                            draft: {
                                ...draft,
                                selling_price_list: draft.selling_price_list || DEFAULT_PRICE_LIST,
                            },
                            existingErpName: erpName || undefined,
                        });

                        setTotals(result.data.totals);
                        setErpName(result.data.erpName);
                        resolve(result.data.totals);
                    } catch (err: any) {
                        const msg = err?.message || "Error calculando totales en ERPNext";
                        setError(msg);
                        resolve(null);
                    } finally {
                        setCalculating(false);
                    }
                }, 600);
            });
        },
        [erpName]
    );

    const clearTotals = useCallback(() => {
        setTotals(null);
        setErpName(null);
        setError(null);
    }, []);

    return { totals, erpName, calculating, error, calculateTotals, clearTotals };
}

// ─── Helpers de UI ────────────────────────────────────────────────────────────

/** Etiqueta legible del estado ERP */
export function quoteStatusLabel(status: string): string {
    const labels: Record<string, string> = {
        Draft: "Borrador",
        Open: "Abierta",
        Expired: "Vencida",
        Cancelled: "Cancelada",
        Ordered: "Convertida",
        CONVERTED: "Convertida",
    };
    return labels[status] ?? status;
}

/** Color del badge según el estado ERP */
export function quoteStatusColor(status: string): string {
    const colors: Record<string, string> = {
        Draft: "bg-gray-100 text-gray-600",
        Open: "bg-blue-100 text-blue-700",
        Expired: "bg-red-100 text-red-700",
        Cancelled: "bg-gray-200 text-gray-500",
        Ordered: "bg-green-100 text-green-700",
        CONVERTED: "bg-green-100 text-green-700",
    };
    return colors[status] ?? "bg-gray-100 text-gray-600";
}
