"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, addDoc, updateDoc, doc, getDocs, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DeliveryNote, InvoiceItem, Client } from "@/types/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Loader2, Save } from "lucide-react";

interface DeliveryNoteFormProps {
    initialData?: DeliveryNote;
    isEditing?: boolean;
}

export function DeliveryNoteForm({ initialData, isEditing = false }: DeliveryNoteFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [clients, setClients] = useState<Client[]>([]);

    const [formData, setFormData] = useState<Partial<DeliveryNote>>({
        number: initialData?.number || "",
        clientId: initialData?.clientId || "",
        clientName: initialData?.clientName || "",
        status: initialData?.status || "DRAFT",
        items: initialData?.items || [],
        address: initialData?.address || "",
        notes: initialData?.notes || "",
        issueDate: initialData?.issueDate || Timestamp.now(),
        deliveryDate: initialData?.deliveryDate || Timestamp.now(),
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

    const handleClientChange = (clientId: string) => {
        const client = clients.find(c => c.id === clientId);
        if (client) {
            setFormData(prev => ({
                ...prev,
                clientId: client.id,
                clientName: client.nombreComercial,
                address: client.direccion || ""
            }));
        }
    };

    const addItem = () => {
        setFormData(prev => ({
            ...prev,
            items: [
                ...(prev.items || []),
                { description: "", quantity: 1, unitPrice: 0, taxRate: 0, taxAmount: 0, total: 0 }
            ]
        }));
    };

    const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
        const newItems = [...(formData.items || [])];
        newItems[index] = { ...newItems[index], [field]: value };
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
            const deliveryData = {
                ...formData,
                updatedAt: serverTimestamp(),
            };

            if (isEditing && initialData?.id) {
                await updateDoc(doc(db, "deliveryNotes", initialData.id), deliveryData);
            } else {
                await addDoc(collection(db, "deliveryNotes"), {
                    ...deliveryData,
                    createdAt: serverTimestamp(),
                });
            }
            router.push("/income/delivery-notes");
            router.refresh();
        } catch (error) {
            console.error("Error saving delivery note:", error);
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
                    <Label>Número de Conduce</Label>
                    <Input
                        value={formData.number}
                        onChange={e => setFormData(prev => ({ ...prev, number: e.target.value }))}
                        placeholder="Ej. COND-001"
                        required
                    />
                </div>

                <div className="col-span-2 space-y-2">
                    <Label>Dirección de Entrega</Label>
                    <Input
                        value={formData.address}
                        onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
                        placeholder="Dirección completa"
                    />
                </div>

                <div className="space-y-2">
                    <Label>Estado</Label>
                    <Select
                        value={formData.status}
                        onValueChange={(val: any) => setFormData(prev => ({ ...prev, status: val }))}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="DRAFT">Borrador</SelectItem>
                            <SelectItem value="SENT">Enviado</SelectItem>
                            <SelectItem value="DELIVERED">Entregado</SelectItem>
                            <SelectItem value="CANCELLED">Cancelado</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Items Section */}
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Items a Entregar</h3>
                    <Button type="button" variant="outline" size="sm" onClick={addItem}>
                        <Plus className="mr-2 h-4 w-4" /> Agregar Item
                    </Button>
                </div>

                <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="p-3 text-left">Descripción</th>
                                <th className="p-3 text-right w-32">Cant.</th>
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
                                    <td className="p-3 text-center">
                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)}>
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
                    Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" />
                    {isEditing ? "Guardar Cambios" : "Crear Conduce"}
                </Button>
            </div>
        </form>
    );
}
