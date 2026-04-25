"use client";

import { useState, useEffect } from "react";
import { collection, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface ErpItem {
    name: string;      // ERPNext item code (e.g. "Servicio de Mantenimiento")
    item_name: string; // Display name
    item_group?: string;
    description?: string;
    standard_rate?: number;
    stock_uom?: string;
}

export interface ErpItemPrice {
    item_code: string;
    price_list_rate: number;
    uom?: string;
}

/**
 * Loads the ERPNext item catalog and prices from the Firestore cache
 * (populated by the `getCatalog` function in Cloud Functions).
 * Falls back to empty arrays if the cache is missing.
 */
export function useErpCatalog() {
    const [items, setItems] = useState<ErpItem[]>([]);
    const [itemPrices, setItemPrices] = useState<ErpItemPrice[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            try {
                const [itemsSnap, pricesSnap] = await Promise.all([
                    getDoc(doc(db, "erpCache", "items")),
                    getDoc(doc(db, "erpCache", "item_prices")),
                ]);

                setItems(itemsSnap.exists() ? (itemsSnap.data()?.data as ErpItem[]) ?? [] : []);
                setItemPrices(pricesSnap.exists() ? (pricesSnap.data()?.data as ErpItemPrice[]) ?? [] : []);
            } catch (e: any) {
                console.error("useErpCatalog error:", e);
                setError("No se pudo cargar el catálogo de ERPNext.");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    /** Looks up the price for a given item code from the cached prices. */
    const getPriceForItem = (itemCode: string): number => {
        const match = itemPrices.find((p) => p.item_code === itemCode);
        return match?.price_list_rate ?? 0;
    };

    return { items, itemPrices, loading, error, getPriceForItem };
}
