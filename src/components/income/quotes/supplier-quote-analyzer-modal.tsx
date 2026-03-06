"use client";

import { useState, useEffect } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, PlusCircle, Check } from "lucide-react";
import { SupplierFile, Quote } from "@/types/finance";
import { Checkbox } from "@/components/ui/checkbox";

interface SupplierQuoteAnalyzerModalProps {
    isOpen: boolean;
    onClose: () => void;
    file: SupplierFile | null;
    quoteId: string;
    onItemAdded: () => void;
}

interface ParsedItem {
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    selected?: boolean;
}

interface ParsedResult {
    supplierName: string;
    items: ParsedItem[];
    subtotal: number;
    taxes: number;
    grandTotal: number;
    currency: string;
}

export function SupplierQuoteAnalyzerModal({ isOpen, onClose, file, quoteId, onItemAdded }: SupplierQuoteAnalyzerModalProps) {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<ParsedResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [margin, setMargin] = useState<number>(30); // Default 30% margin
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        if (isOpen && file && !result && !loading && !error) {
            handleAnalyze();
        }
    }, [isOpen, file]);

    const handleAnalyze = async () => {
        if (!file) return;
        setLoading(true);
        setError(null);
        try {
            const functions = getFunctions();
            const analyzeQuote = httpsCallable(functions, 'analyzeSupplierQuote');

            // Pass the filePath which relative to the bucket
            const response = await analyzeQuote({ filePath: file.path });
            const data = response.data as ParsedResult;

            // Mark all items as selected by default
            if (data && data.items) {
                data.items = data.items.map(item => ({ ...item, selected: true }));
            }
            setResult(data);
        } catch (err: any) {
            console.error("Analysis failed:", err);
            setError(err.message || "Error al analizar el documento con IA.");
        } finally {
            setLoading(false);
        }
    };

    const toggleItemSelection = (index: number) => {
        if (!result) return;
        const newItems = [...result.items];
        newItems[index].selected = !newItems[index].selected;
        setResult({ ...result, items: newItems });
    };

    const toggleAll = (select: boolean) => {
        if (!result) return;
        const newItems = result.items.map(item => ({ ...item, selected: select }));
        setResult({ ...result, items: newItems });
    };

    const handleAddSelectedToQuote = async () => {
        if (!result || !quoteId) return;
        setAdding(true);
        try {
            const quoteRef = doc(db, "quotes", quoteId);
            const quoteSnap = await getDoc(quoteRef);
            if (!quoteSnap.exists()) throw new Error("Cotización no encontrada");

            const quoteData = quoteSnap.data() as Quote;
            // Existing items or empty array
            const existingItems = quoteData.items || [];

            const selectedItems = result.items.filter(i => i.selected);
            if (selectedItems.length === 0) {
                alert("Selecciona al menos un ítem.");
                setAdding(false);
                return;
            }

            const newItemsToApp = selectedItems.map(item => {
                const finalUnitPrice = item.unitPrice * (1 + margin / 100);
                const finalAmount = finalUnitPrice * item.quantity;
                return {
                    item_code: "MISC", // Placeholder genérico, en ERPNext se necesita un item_code válido o uno misceláneo
                    item_name: item.description.substring(0, 50),
                    description: `(Prov: ${result.supplierName}) ${item.description}`,
                    qty: item.quantity,
                    uom: "Nos", // Unit of measure default
                    rate: finalUnitPrice,
                    amount: finalAmount
                };
            });

            const mergedItems = [...existingItems, ...newItemsToApp];

            // Update the array in Firestore. 
            // Note: Cloud Functions (ERPNext sync) will recalculate totals or they will be recalculated locally.
            // For now, we just append to the `items` array.
            await updateDoc(quoteRef, {
                items: mergedItems
            });

            onItemAdded();
            onClose();
        } catch (err: any) {
            console.error("Error adding items:", err);
            alert("Error al añadir ítems a la cotización.");
        } finally {
            setAdding(false);
        }
    };

    const formatMoney = (val: number, currency = 'DOP') => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'DOP' }).format(val);
    };

    // Reset state on close entirely
    const handleClose = () => {
        setResult(null);
        setError(null);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl text-blue-900">
                        <Sparkles className="h-6 w-6 text-yellow-500" />
                        Análisis Inteligente de Cotización
                    </DialogTitle>
                    <DialogDescription>
                        Archivo: {file?.name}
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex flex-col items-center justify-center p-12 space-y-4">
                        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
                        <p className="text-gray-500 animate-pulse text-lg">La IA está leyendo y procesando el documento...</p>
                        <p className="text-xs text-gray-400">Esto puede tomar entre 5 a 15 segundos dependiendo del tamaño.</p>
                    </div>
                ) : error ? (
                    <div className="p-6 bg-red-50 text-red-700 rounded-lg border border-red-200">
                        <h4 className="font-semibold mb-2">Ha ocurrido un error en el análisis</h4>
                        <p className="text-sm">{error}</p>
                        <Button variant="outline" className="mt-4" onClick={handleAnalyze}>Reintentar Análisis</Button>
                    </div>
                ) : result ? (
                    <div className="space-y-6">
                        <div className="flex bg-blue-50 border border-blue-100 p-4 rounded-lg justify-between items-center">
                            <div>
                                <p className="text-sm text-gray-500 font-medium">Proveedor Detectado</p>
                                <p className="text-lg font-bold text-blue-900">{result.supplierName}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-gray-500 font-medium">Total Original ({result.currency})</p>
                                <p className="text-lg font-bold text-gray-900">{formatMoney(result.grandTotal, result.currency)}</p>
                            </div>
                        </div>

                        <div className="bg-white border rounded-lg shadow-sm p-4 space-y-4">
                            <div className="flex flex-col md:flex-row justify-between md:items-center border-b pb-4 gap-4">
                                <div>
                                    <h4 className="font-semibold text-gray-900 text-lg">Ítems Extraídos</h4>
                                    <p className="text-sm text-gray-500">Aplica un margen para calcular el precio final al cliente.</p>
                                </div>
                                <div className="flex items-center gap-3 bg-gray-50 rounded-md p-2 border">
                                    <Label htmlFor="margin" className="font-semibold text-gray-700 whitespace-nowrap">
                                        Margen de Ganancia (%)
                                    </Label>
                                    <Input
                                        id="margin"
                                        type="number"
                                        value={margin}
                                        onChange={(e) => setMargin(Number(e.target.value))}
                                        className="w-24 text-right font-bold text-blue-700"
                                        min={0}
                                    />
                                </div>
                            </div>

                            <div className="overflow-x-auto rounded-lg border">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-600 border-b">
                                        <tr>
                                            <th className="p-3 w-12 text-center">
                                                <Checkbox
                                                    checked={result.items.every(i => i.selected)}
                                                    onCheckedChange={(checked) => toggleAll(!!checked)}
                                                />
                                            </th>
                                            <th className="p-3">Descripción</th>
                                            <th className="p-3 text-center">Cant.</th>
                                            <th className="p-3 text-right">Costo (Prov)</th>
                                            <th className="p-3 text-right bg-blue-50/50 font-bold text-blue-900 border-l">Precio Sugerido</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {result.items.map((item, idx) => {
                                            const suggestedPrice = item.unitPrice * (1 + margin / 100);
                                            return (
                                                <tr key={idx} className={item.selected ? "bg-blue-50/20" : "bg-gray-50/50 opacity-60"}>
                                                    <td className="p-3 text-center">
                                                        <Checkbox
                                                            checked={item.selected}
                                                            onCheckedChange={() => toggleItemSelection(idx)}
                                                        />
                                                    </td>
                                                    <td className="p-3 font-medium text-gray-800">{item.description}</td>
                                                    <td className="p-3 text-center">{item.quantity}</td>
                                                    <td className="p-3 text-right text-gray-500">
                                                        {formatMoney(item.unitPrice, result.currency)}
                                                    </td>
                                                    <td className="p-3 text-right font-bold text-blue-700 border-l">
                                                        {formatMoney(suggestedPrice, result.currency)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ) : null}

                <DialogFooter className="mt-4 gap-2 md:gap-0">
                    <Button variant="outline" onClick={handleClose} disabled={loading || adding}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleAddSelectedToQuote}
                        disabled={loading || !result || adding || result.items.filter(i => i.selected).length === 0}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md"
                    >
                        {adding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                        Añadir Seleccionados a la Cotización
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
