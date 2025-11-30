"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, addDoc, updateDoc, doc, getDocs, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Receipt, Client } from "@/types/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save } from "lucide-react";

interface ReceiptFormProps {
    initialData?: Receipt;
    isEditing?: boolean;
}

export function ReceiptForm({ initialData, isEditing = false }: ReceiptFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [clients, setClients] = useState<Client[]>([]);

    const [formData, setFormData] = useState<Partial<Receipt>>({
        number: initialData?.number || "",
        clientId: initialData?.clientId || "",
        clientName: initialData?.clientName || "",
        amount: initialData?.amount || 0,
        concept: initialData?.concept || "",
        notes: initialData?.notes || "",
        date: initialData?.date || Timestamp.now(),
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
            }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const receiptData = {
                ...formData,
                updatedAt: serverTimestamp(),
            };

            if (isEditing && initialData?.id) {
                await updateDoc(doc(db, "receipts", initialData.id), receiptData);
            } else {
                await addDoc(collection(db, "receipts"), {
                    ...receiptData,
                    createdAt: serverTimestamp(),
                });
            }
            router.push("/income/receipts");
            router.refresh();
        } catch (error) {
            console.error("Error saving receipt:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8 bg-white p-8 rounded-lg shadow max-w-2xl mx-auto">
            <div className="space-y-6">
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
                    <Label>Número de Recibo</Label>
                    <Input
                        value={formData.number}
                        onChange={e => setFormData(prev => ({ ...prev, number: e.target.value }))}
                        placeholder="Ej. REC-001"
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label>Monto</Label>
                    <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={formData.amount}
                        onChange={e => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label>Concepto</Label>
                    <Input
                        value={formData.concept}
                        onChange={e => setFormData(prev => ({ ...prev, concept: e.target.value }))}
                        placeholder="Ej. Anticipo de servicios"
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label>Notas</Label>
                    <Input
                        value={formData.notes}
                        onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    />
                </div>
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
                    Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" />
                    {isEditing ? "Guardar Cambios" : "Crear Recibo"}
                </Button>
            </div>
        </form>
    );
}
