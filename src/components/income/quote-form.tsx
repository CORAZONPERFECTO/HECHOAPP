"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { collection, addDoc, updateDoc, doc, serverTimestamp, Timestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Quote, InvoiceItem, Client } from "@/types/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Loader2, Save, Send, ChevronDown } from "lucide-react";
import { ClientSelector } from "@/components/shared/client-selector";
import { generateNextNumber } from "@/lib/numbering-service";
import { useErpCatalog } from "@/hooks/use-erp-catalog";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useToast } from "@/components/ui/use-toast";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface QuoteFormProps {
    initialData?: Quote;
    isEditing?: boolean;
}

export function QuoteForm({ initialData, isEditing = false }: QuoteFormProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [savedId, setSavedId] = useState<string | null>(initialData?.id || null);

    const { items: erpItems, getPriceForItem, loading: catalogLoading } = useErpCatalog();

    const [formData, setFormData] = useState<Partial<Quote>>({
        number: initialData?.number || "",
        clientId: initialData?.clientId || "",
        clientName: initialData?.clientName || "",
        status: initialData?.status || "DRAFT",
        items: initialData?.items || [],
        notes: initialData?.notes || "",
        validUntil: initialData?.validUntil || Timestamp.now(),
        currency: initialData?.currency || "DOP",
        exchangeRate: initialData?.exchangeRate || 1,
        discountTotal: initialData?.discountTotal || 0,
        timeline: initialData?.timeline || [],
    });

    const totals = (formData.items || []).reduce(
        (acc, item) => {
            const sub = item.quantity * item.unitPrice;
            const tax = sub * item.taxRate;
            return { subtotal: acc.subtotal + sub, taxTotal: acc.taxTotal + tax, total: acc.total + sub + tax };
        },
        { subtotal: 0, taxTotal: 0, total: 0 }
    );

    const handleClientSelect = (client: Client) => {
        setFormData(prev => ({
            ...prev,
            clientId: client.id,
            clientName: client.nombreComercial,
            clientRnc: client.rnc,
        }));
    };

    const addItem = () => {
        setFormData(prev => ({
            ...prev,
            items: [...(prev.items || []), { description: "", quantity: 1, unitPrice: 0, taxRate: 0.18, taxAmount: 0, total: 0 }]
        }));
    };

    const selectErpItem = (index: number, itemCode: string) => {
        const erpItem = erpItems.find(i => i.name === itemCode);
        if (!erpItem) return;
        const price = getPriceForItem(itemCode);
        const newItems = [...(formData.items || [])];
        const qty = newItems[index].quantity || 1;
        const sub = qty * price;
        newItems[index] = {
            ...newItems[index],
            description: erpItem.item_name || erpItem.name,
            itemCode,
            unitPrice: price,
            taxAmount: sub * newItems[index].taxRate,
            total: sub + sub * newItems[index].taxRate,
        };
        setFormData(prev => ({ ...prev, items: newItems }));
    };

    const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
        const newItems = [...(formData.items || [])];
        newItems[index] = { ...newItems[index], [field]: value };
        const sub = newItems[index].quantity * newItems[index].unitPrice;
        newItems[index].taxAmount = sub * newItems[index].taxRate;
        newItems[index].total = sub + newItems[index].taxAmount;
        setFormData(prev => ({ ...prev, items: newItems }));
    };

    const removeItem = (index: number) => {
        setFormData(prev => ({
            ...prev,
            items: (prev.items || []).filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) throw new Error("No authenticated user");

            const quoteData = {
                ...formData,
                subtotal: totals.subtotal,
                taxTotal: totals.taxTotal,
                total: totals.total,
                updatedAt: serverTimestamp(),
                updatedBy: currentUser.uid,
            };

            if (isEditing && initialData?.id) {
                await updateDoc(doc(db, "quotes", initialData.id), quoteData);
                toast({ title: "Cotización guardada" });
            } else {
                const newQuoteData = {
                    ...quoteData,
                    number: await generateNextNumber("COT"),
                    createdBy: currentUser.uid,
                    createdAt: serverTimestamp(),
                    sellerId: currentUser.uid,
                    issueDate: serverTimestamp(),
                    timeline: [{
                        status: "DRAFT",
                        timestamp: Timestamp.now(),
                        userId: currentUser.uid,
                        userName: currentUser.displayName || "Usuario",
                        note: "Cotización creada"
                    }]
                };
                const ref = await addDoc(collection(db, "quotes"), newQuoteData);
                setSavedId(ref.id);
                toast({ title: "Cotización creada", description: "Usa 'Enviar a ERPNext' para sincronizarla." });
            }
            router.push("/income/quotes");
            router.refresh();
        } catch (error) {
            console.error("Error saving quote:", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudo guardar la cotización." });
        } finally {
            setLoading(false);
        }
    };

    const handleSyncToErp = async () => {
        const id = savedId || initialData?.id;
        if (!id) {
            toast({ variant: "destructive", title: "Guarda primero", description: "Guarda la cotización antes de sincronizar." });
            return;
        }
        setSyncing(true);
        try {
            const fn = httpsCallable(getFunctions(), "syncQuoteToErp");
            const result: any = await fn({ quoteId: id });
            toast({
                title: "✅ Sincronizado con ERPNext",
                description: `Cotización creada en ERP: ${result.data.erpQuotationId}`,
            });
        } catch (error: any) {
            toast({ variant: "destructive", title: "❌ Error ERPNext", description: error.message });
        } finally {
            setSyncing(false);
        }
    };

    const currencySymbol = formData.currency === "USD" ? "US$" : "RD$";

    return (
        <form onSubmit={handleSubmit} className="space-y-8 bg-white p-8 rounded-lg shadow">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2 md:col-span-2">
                    <Label>Cliente</Label>
                    <ClientSelector value={formData.clientId} onSelect={handleClientSelect} />
                </div>

                <div className="space-y-2">
                    <Label>Número de Cotización</Label>
                    <Input
                        value={formData.number}
                        onChange={e => setFormData(prev => ({ ...prev, number: e.target.value }))}
                        placeholder={isEditing ? "COT-000000" : "(Auto-generado al guardar)"}
                        required={isEditing}
                        disabled={!isEditing}
                        className={!isEditing ? "bg-gray-100 text-gray-500" : ""}
                    />
                </div>

                <div className="space-y-2">
                    <Label>Moneda</Label>
                    <Select
                        value={formData.currency}
                        onValueChange={(val: "DOP" | "USD") => setFormData(prev => ({ ...prev, currency: val }))}
                    >
                        <SelectTrigger><SelectValue placeholder="Seleccionar moneda" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="DOP">Peso Dominicano (DOP)</SelectItem>
                            <SelectItem value="USD">Dólar Estadounidense (USD)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Items Section */}
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Ítems de la Cotización</h3>
                    <Button type="button" variant="outline" size="sm" onClick={addItem}>
                        <Plus className="mr-2 h-4 w-4" /> Agregar Ítem
                    </Button>
                </div>

                <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="p-3 text-left">Descripción / Catálogo ERP</th>
                                <th className="p-3 text-right w-20">Cant.</th>
                                <th className="p-3 text-right w-32">Precio Unit.</th>
                                <th className="p-3 text-right w-32">Total</th>
                                <th className="p-3 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {(formData.items || []).map((item, index) => (
                                <tr key={index}>
                                    <td className="p-3 space-y-1">
                                        <Input
                                            value={item.description}
                                            onChange={e => updateItem(index, "description", e.target.value)}
                                            placeholder="Descripción del servicio o producto"
                                        />
                                        {!catalogLoading && erpItems.length > 0 && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button type="button" variant="ghost" size="sm" className="h-6 text-xs text-blue-600 px-1">
                                                        <ChevronDown className="h-3 w-3 mr-1" />
                                                        {(item as any).itemCode ? `ERP: ${(item as any).itemCode}` : "Elegir del catálogo ERP"}
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent className="max-h-52 overflow-y-auto w-72">
                                                    {erpItems.map(ei => (
                                                        <DropdownMenuItem
                                                            key={ei.name}
                                                            onSelect={() => selectErpItem(index, ei.name)}
                                                            className="flex justify-between gap-4"
                                                        >
                                                            <span className="truncate">{ei.item_name || ei.name}</span>
                                                            {getPriceForItem(ei.name) > 0 && (
                                                                <span className="text-gray-400 text-xs shrink-0">
                                                                    RD$ {getPriceForItem(ei.name).toLocaleString()}
                                                                </span>
                                                            )}
                                                        </DropdownMenuItem>
                                                    ))}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </td>
                                    <td className="p-3">
                                        <Input
                                            type="number" min="1"
                                            value={item.quantity}
                                            onChange={e => updateItem(index, "quantity", parseFloat(e.target.value) || 0)}
                                            className="text-right"
                                        />
                                    </td>
                                    <td className="p-3">
                                        <Input
                                            type="number" min="0" step="0.01"
                                            value={item.unitPrice}
                                            onChange={e => updateItem(index, "unitPrice", parseFloat(e.target.value) || 0)}
                                            className="text-right"
                                        />
                                    </td>
                                    <td className="p-3 text-right font-medium">
                                        {currencySymbol} {item.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="p-3 text-center">
                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)}>
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {(formData.items || []).length === 0 && (
                        <div className="p-8 text-center text-gray-400">
                            Haz clic en <strong>Agregar Ítem</strong> y selecciona del catálogo de ERP para autocompletar precio.
                        </div>
                    )}
                </div>
            </div>

            {/* Totals */}
            <div className="flex justify-end">
                <div className="w-72 space-y-2 bg-slate-50 rounded-lg p-4">
                    <div className="flex justify-between text-sm text-gray-600">
                        <span>Subtotal:</span>
                        <span>{currencySymbol} {totals.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                        <span>ITBIS (18%):</span>
                        <span>{currencySymbol} {totals.taxTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg border-t pt-2">
                        <span>Total:</span>
                        <span>{currencySymbol} {totals.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
                    Cancelar
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    onClick={handleSyncToErp}
                    disabled={syncing || loading}
                    className="border-blue-300 text-blue-700 hover:bg-blue-50"
                >
                    {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Enviar a ERPNext
                </Button>
                <Button type="submit" disabled={loading} className="bg-gradient-to-r from-blue-600 to-purple-600">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" />
                    {isEditing ? "Guardar Cambios" : "Crear Cotización"}
                </Button>
            </div>
        </form>
    );
}
