"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, addDoc, updateDoc, doc, getDocs, serverTimestamp, Timestamp, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Payment, Client, Invoice } from "@/types/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save } from "lucide-react";

interface PaymentFormProps {
    initialData?: Payment;
    isEditing?: boolean;
}

export function PaymentForm({ initialData, isEditing = false }: PaymentFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [clients, setClients] = useState<Client[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);

    const [formData, setFormData] = useState<Partial<Payment>>({
        number: initialData?.number || "",
        clientId: initialData?.clientId || "",
        clientName: initialData?.clientName || "",
        invoiceId: initialData?.invoiceId || "",
        amount: initialData?.amount || 0,
        method: initialData?.method || "EFECTIVO",
        reference: initialData?.reference || "",
        date: initialData?.date || Timestamp.now(),
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

    // Load invoices when client changes
    useEffect(() => {
        const fetchInvoices = async () => {
            if (!formData.clientId) {
                setInvoices([]);
                return;
            }
            const q = query(
                collection(db, "invoices"),
                where("clientId", "==", formData.clientId),
                where("status", "in", ["SENT", "PARTIALLY_PAID", "OVERDUE"]) // Only unpaid invoices
            );
            const querySnapshot = await getDocs(q);
            const invoicesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Invoice[];
            setInvoices(invoicesData);
        };
        fetchInvoices();
    }, [formData.clientId]);

    const handleClientChange = (clientId: string) => {
        const client = clients.find(c => c.id === clientId);
        if (client) {
            setFormData(prev => ({
                ...prev,
                clientId: client.id,
                clientName: client.nombreComercial,
                invoiceId: "" // Reset invoice when client changes
            }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const paymentData = {
                ...formData,
                updatedAt: serverTimestamp(),
            };

            if (isEditing && initialData?.id) {
                // For edits, we currently only update the payment record
                // TODO: Handle balance adjustments if amount changes during edit
                await updateDoc(doc(db, "payments", initialData.id), paymentData);
            } else {
                // Use the utility to handle transaction and invoice updates
                const { registerPayment } = await import("@/lib/income-utils");
                await registerPayment(paymentData as any);
            }
            router.push("/income/payments");
            router.refresh();
        } catch (error) {
            console.error("Error saving payment:", error);
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
                    <Label>Factura a Pagar (Opcional)</Label>
                    <Select
                        value={formData.invoiceId}
                        onValueChange={(val) => setFormData(prev => ({ ...prev, invoiceId: val }))}
                        disabled={!formData.clientId || invoices.length === 0}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder={invoices.length === 0 ? "No hay facturas pendientes" : "Seleccionar factura"} />
                        </SelectTrigger>
                        <SelectContent>
                            {invoices.map(inv => (
                                <SelectItem key={inv.id} value={inv.id}>
                                    {inv.number} - Bal: RD$ {inv.balance.toLocaleString()}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                        <Label>Método de Pago</Label>
                        <Select
                            value={formData.method}
                            onValueChange={(val: any) => setFormData(prev => ({ ...prev, method: val }))}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                                <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                                <SelectItem value="CHEQUE">Cheque</SelectItem>
                                <SelectItem value="TARJETA">Tarjeta</SelectItem>
                                <SelectItem value="OTRO">Otro</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>Referencia / No. Comprobante</Label>
                    <Input
                        value={formData.reference}
                        onChange={e => setFormData(prev => ({ ...prev, reference: e.target.value }))}
                        placeholder="Ej. No. Transferencia o Cheque"
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
                    {isEditing ? "Guardar Cambios" : "Registrar Pago"}
                </Button>
            </div>
        </form>
    );
}
