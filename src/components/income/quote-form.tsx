"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, addDoc, updateDoc, doc, getDocs, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Quote, InvoiceItem, Client } from "@/types/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Loader2, Save } from "lucide-react";

import { auth } from "@/lib/firebase";
import { generateNextNumber } from "@/lib/numbering-service";

interface QuoteFormProps {
    initialData?: Quote;
    isEditing?: boolean;
}

export function QuoteForm({ initialData, isEditing = false }: QuoteFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [clients, setClients] = useState<Client[]>([]);

    const [formData, setFormData] = useState<Partial<Quote>>({
        number: initialData?.number || "",
        clientId: initialData?.clientId || "",
        clientName: initialData?.clientName || "",
        status: initialData?.status || "DRAFT",
        items: initialData?.items || [],
        notes: initialData?.notes || "",
        validUntil: initialData?.validUntil || Timestamp.now(),
        currency: initialData?.currency || 'DOP',
        exchangeRate: initialData?.exchangeRate || 1,
        discountTotal: initialData?.discountTotal || 0,
        timeline: initialData?.timeline || [],
    });

    // Load clients
    useEffect(() => {
        const fetchClients = async () => {
            const querySnapshot = await getDocs(collection(db, "clients"));
            const clientsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Client[];
            setClients(clientsData);
        };
        fetchClients();
    }, []);

    // Calculate totals
    const totals = (formData.items || []).reduce(
        (acc, item) => {
            const sub = item.quantity * item.unitPrice;
            const tax = sub * item.taxRate;
            return {
                subtotal: acc.subtotal + sub,
                taxTotal: acc.taxTotal + tax,
                total: acc.total + sub + tax,
            };
        },
        { subtotal: 0, taxTotal: 0, total: 0 }
    );

    const handleClientChange = (clientId: string) => {
        const client = clients.find(c => c.id === clientId);
        if (client) {
            setFormData(prev => ({
                ...prev,
                clientId: client.id,
                clientName: client.nombreComercial,
            }));
        }
    };

    const addItem = () => {
        setFormData(prev => ({
            ...prev,
            items: [
                ...(prev.items || []),
                { description: "", quantity: 1, unitPrice: 0, taxRate: 0.18, taxAmount: 0, total: 0 }
            ]
        }));
    };

    const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
        const newItems = [...(formData.items || [])];
        newItems[index] = { ...newItems[index], [field]: value };

        // Recalculate item total
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
                // Update implementation
                await updateDoc(doc(db, "quotes", initialData.id), quoteData);
            } else {
                const newQuoteData = {
                    ...quoteData,
                    number: await generateNextNumber('COT'), // Auto-generate
                    createdBy: currentUser.uid,
                    createdAt: serverTimestamp(),
                    sellerId: currentUser.uid, // Default to creator for now
                    issueDate: serverTimestamp(),
                    timeline: [{
                        status: 'DRAFT',
                        timestamp: Timestamp.now(),
                        userId: currentUser.uid,
                        userName: currentUser.displayName || 'Usuario',
                        note: 'Cotización creada'
                    }]
                };
                await addDoc(collection(db, "quotes"), newQuoteData);
            }
            router.push("/income/quotes");
            router.refresh();
        } catch (error) {
            console.error("Error saving quote:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8 bg-white p-8 rounded-lg shadow">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label>Cliente</Label>
                    <Select
                        value={formData.clientId}
                        onValueChange={handleClientChange}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Seleccionar cliente" />
                        </SelectTrigger>
                        <SelectContent>
                            {clients.map(client => (
                                <SelectItem key={client.id} value={client.id}>
                                    {client.nombreComercial}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>Número de Cotización</Label>
                    <Input
                        value={formData.number}
                        onChange={e => setFormData(prev => ({ ...prev, number: e.target.value }))}
                        placeholder={isEditing ? "COT-000000" : "(Auto-generado al guardar)"}
                        required={isEditing}
                        disabled={!isEditing} // Disable for new quotes, allow edit if correcting
                        className={!isEditing ? "bg-gray-100 text-gray-500" : ""}
                    />
                </div>

                <div className="space-y-2">
                    <Label>Moneda</Label>
                    <Select
                        value={formData.currency}
                        onValueChange={(val: 'DOP' | 'USD') => setFormData(prev => ({ ...prev, currency: val }))}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Seleccionar moneda" />
                        </SelectTrigger>
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
                    <h3 className="text-lg font-medium">Items</h3>
                    <Button type="button" variant="outline" size="sm" onClick={addItem}>
                        <Plus className="mr-2 h-4 w-4" /> Agregar Item
                    </Button>
                </div>

                <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="p-3 text-left">Descripción</th>
                                <th className="p-3 text-right w-24">Cant.</th>
                                <th className="p-3 text-right w-32">Precio</th>
                                <th className="p-3 text-right w-32">Total</th>
                                <th className="p-3 w-12"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {(formData.items || []).map((item, index) => (
                                <tr key={index}>
                                    <td className="p-3">
                                        <Input
                                            value={item.description}
                                            onChange={e => updateItem(index, 'description', e.target.value)}
                                            placeholder="Descripción"
                                        />
                                    </td>
                                    <td className="p-3">
                                        <Input
                                            type="number"
                                            min="1"
                                            value={item.quantity}
                                            onChange={e => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                                            className="text-right"
                                        />
                                    </td>
                                    <td className="p-3">
                                        <Input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={item.unitPrice}
                                            onChange={e => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                            className="text-right"
                                        />
                                    </td>
                                    <td className="p-3 text-right font-medium">
                                        {formData.currency === 'USD' ? 'US$' : 'RD$'} {item.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
                        <div className="p-8 text-center text-gray-500">
                            No hay items en la cotización.
                        </div>
                    )}
                </div>
            </div>

            {/* Totals */}
            <div className="flex justify-end">
                <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Subtotal:</span>
                        <span>{formData.currency === 'USD' ? 'US$' : 'RD$'} {totals.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">ITBIS (18%):</span>
                        <span>{formData.currency === 'USD' ? 'US$' : 'RD$'} {totals.taxTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg border-t pt-2">
                        <span>Total:</span>
                        <span>{formData.currency === 'USD' ? 'US$' : 'RD$'} {totals.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
                    Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" />
                    {isEditing ? "Guardar Cambios" : "Crear Cotización"}
                </Button>
            </div>
        </form>
    );
}
