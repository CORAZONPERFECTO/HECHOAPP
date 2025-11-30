"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, addDoc, updateDoc, doc, getDocs, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { RecurringInvoice, InvoiceItem, Client, RecurringFrequency, RecurringStatus } from "@/types/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Loader2, Save } from "lucide-react";

interface RecurringInvoiceFormProps {
    initialData?: RecurringInvoice;
    isEditing?: boolean;
}

export function RecurringInvoiceForm({ initialData, isEditing = false }: RecurringInvoiceFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [clients, setClients] = useState<Client[]>([]);

    const [formData, setFormData] = useState<Partial<RecurringInvoice>>({
        clientId: initialData?.clientId || "",
        clientName: initialData?.clientName || "",
        frequency: initialData?.frequency || "MONTHLY",
        status: initialData?.status || "ACTIVE",
        startDate: initialData?.startDate || Timestamp.now(),
        nextRunDate: initialData?.nextRunDate || Timestamp.now(),
        items: initialData?.items || [],
        notes: initialData?.notes || "",
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
            const recurringData = {
                ...formData,
                subtotal: totals.subtotal,
                taxTotal: totals.taxTotal,
                total: totals.total,
                updatedAt: serverTimestamp(),
            };

            if (isEditing && initialData?.id) {
                await updateDoc(doc(db, "recurringInvoices", initialData.id), recurringData);
            } else {
                await addDoc(collection(db, "recurringInvoices"), {
                    ...recurringData,
                    createdAt: serverTimestamp(),
                });
            }
            router.push("/income/recurring");
            router.refresh();
        } catch (error) {
            console.error("Error saving recurring invoice:", error);
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
                    <Label>Frecuencia</Label>
                    <Select
                        value={formData.frequency}
                        onValueChange={(val: RecurringFrequency) => setFormData(prev => ({ ...prev, frequency: val }))}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="WEEKLY">Semanal</SelectItem>
                            <SelectItem value="MONTHLY">Mensual</SelectItem>
                            <SelectItem value="QUARTERLY">Trimestral</SelectItem>
                            <SelectItem value="YEARLY">Anual</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>Estado</Label>
                    <Select
                        value={formData.status}
                        onValueChange={(val: RecurringStatus) => setFormData(prev => ({ ...prev, status: val }))}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ACTIVE">Activa</SelectItem>
                            <SelectItem value="PAUSED">Pausada</SelectItem>
                            <SelectItem value="CANCELLED">Cancelada</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Items Section */}
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Items Recurrentes</h3>
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
                                        RD$ {item.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
                            No hay items configurados.
                        </div>
                    )}
                </div>
            </div>

            {/* Totals */}
            <div className="flex justify-end">
                <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Subtotal:</span>
                        <span>RD$ {totals.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">ITBIS (18%):</span>
                        <span>RD$ {totals.taxTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg border-t pt-2">
                        <span>Total Recurrente:</span>
                        <span>RD$ {totals.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
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
                    {isEditing ? "Guardar Cambios" : "Crear Recurrencia"}
                </Button>
            </div>
        </form>
    );
}
