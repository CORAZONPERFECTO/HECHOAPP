"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Loader2, Search, FileText } from "lucide-react";
import { Client, Invoice, PaymentMethod } from "@/types/schema";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { registerPayment } from "@/lib/income-utils";
import { Timestamp } from "firebase/firestore";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface PaymentDialogProps {
    onPaymentRegistered?: () => void;
}

export function PaymentDialog({ onPaymentRegistered }: PaymentDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // Search States
    const [searchTerm, setSearchTerm] = useState("");
    const [clients, setClients] = useState<Client[]>([]);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [pendingInvoices, setPendingInvoices] = useState<Invoice[]>([]);
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

    // Form States
    const [amount, setAmount] = useState("");
    const [method, setMethod] = useState<PaymentMethod>("EFECTIVO");
    const [reference, setReference] = useState("");
    const [notes, setNotes] = useState("");
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    // Buscar clientes
    useEffect(() => {
        const searchClients = async () => {
            if (searchTerm.length < 2) return;
            const q = query(
                collection(db, "clients"),
                where("nombreComercial", ">=", searchTerm),
                where("nombreComercial", "<=", searchTerm + "\uf8ff")
            );
            const snapshot = await getDocs(q);
            setClients(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Client)));
        };
        const timer = setTimeout(searchClients, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Buscar facturas pendientes cuando se selecciona cliente
    useEffect(() => {
        if (selectedClient) {
            const fetchInvoices = async () => {
                const q = query(
                    collection(db, "invoices"),
                    where("clientId", "==", selectedClient.id),
                    where("status", "in", ["SENT", "PARTIALLY_PAID", "OVERDUE"]),
                    orderBy("createdAt", "desc")
                );
                const snapshot = await getDocs(q);
                setPendingInvoices(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Invoice)));
            };
            fetchInvoices();
        } else {
            setPendingInvoices([]);
            setSelectedInvoice(null);
        }
    }, [selectedClient]);

    // Auto-fill monto si se selecciona factura
    useEffect(() => {
        if (selectedInvoice) {
            setAmount(selectedInvoice.balance.toString());
        }
    }, [selectedInvoice]);

    const handleRegister = async () => {
        if (!selectedClient || !amount) return;

        setLoading(true);
        try {
            await registerPayment({
                number: `REC-${Date.now()}`, // Simple ID generation
                clientId: selectedClient.id,
                clientName: selectedClient.nombreComercial,
                amount: parseFloat(amount),
                method,
                reference,
                date: Timestamp.fromDate(new Date(date)),
                notes,
                invoiceId: selectedInvoice?.id
            });

            setOpen(false);
            resetForm();
            onPaymentRegistered?.();
        } catch (error) {
            console.error(error);
            alert("Error al registrar pago");
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setSelectedClient(null);
        setSelectedInvoice(null);
        setAmount("");
        setReference("");
        setNotes("");
        setSearchTerm("");
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Registrar Pago
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Registrar Nuevo Pago</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* 1. Selección de Cliente */}
                    <div className="space-y-2">
                        <Label>Cliente</Label>
                        {!selectedClient ? (
                            <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar cliente..."
                                    className="pl-8"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                {clients.length > 0 && (
                                    <div className="absolute z-10 w-full bg-white border rounded-md mt-1 shadow-lg max-h-48 overflow-y-auto">
                                        {clients.map(client => (
                                            <div
                                                key={client.id}
                                                className="p-2 hover:bg-slate-100 cursor-pointer text-sm"
                                                onClick={() => {
                                                    setSelectedClient(client);
                                                    setSearchTerm("");
                                                    setClients([]);
                                                }}
                                            >
                                                {client.nombreComercial}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex justify-between items-center p-2 bg-slate-100 rounded border">
                                <span className="font-medium">{selectedClient.nombreComercial}</span>
                                <Button variant="ghost" size="sm" onClick={() => setSelectedClient(null)}>Cambiar</Button>
                            </div>
                        )}
                    </div>

                    {/* 2. Selección de Factura (Opcional) */}
                    {selectedClient && (
                        <div className="space-y-2">
                            <Label>Factura a Pagar (Opcional)</Label>
                            <Select
                                value={selectedInvoice?.id || "none"}
                                onValueChange={(val) => setSelectedInvoice(pendingInvoices.find(i => i.id === val) || null)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar factura..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Ninguna (Pago a cuenta)</SelectItem>
                                    {pendingInvoices.map(inv => (
                                        <SelectItem key={inv.id} value={inv.id}>
                                            {inv.number} - Bal: RD$ {inv.balance.toLocaleString()}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* 3. Detalles del Pago */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Monto</Label>
                            <Input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Fecha</Label>
                            <Input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Método</Label>
                            <Select value={method} onValueChange={(val) => setMethod(val as PaymentMethod)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                                    <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                                    <SelectItem value="CHEQUE">Cheque</SelectItem>
                                    <SelectItem value="TARJETA">Tarjeta</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Referencia</Label>
                            <Input
                                value={reference}
                                onChange={(e) => setReference(e.target.value)}
                                placeholder="# Cheque / Transf."
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Notas</Label>
                        <Textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Notas adicionales..."
                            rows={2}
                        />
                    </div>

                    <Button className="w-full bg-green-600 hover:bg-green-700" onClick={handleRegister} disabled={loading || !selectedClient || !amount}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Registrar Cobro
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
