"use client";

import { useState, useEffect } from "react";
import { Ticket } from "@/types/schema";
import { Purchase } from "@/types/purchase";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Zap, Receipt, CheckCircle2, FileText, Send, Loader2, Sparkles, DollarSign, Plus, Trash2 } from "lucide-react";
import { collection, addDoc, doc, updateDoc, serverTimestamp, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface InvoiceItemRow {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
}

interface TicketToInvoiceModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    ticket: Ticket;
    onInvoiceCreated?: (invoiceId: string) => void;
}

export function TicketToInvoiceModal({ open, onOpenChange, ticket, onInvoiceCreated }: TicketToInvoiceModalProps) {
    const [loading, setLoading] = useState(false);
    const [ncfType, setNcfType] = useState<string>("B02");
    const [clientRnc, setClientRnc] = useState<string>("");
    const [items, setItems] = useState<InvoiceItemRow[]>([]);
    const [itbisRate, setItbisRate] = useState<number>(0.18);
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [invoiceCreatedSuccess, setInvoiceCreatedSuccess] = useState<{ id: string; ncf: string; total: number } | null>(null);

    useEffect(() => {
        if (open && ticket) {
            setInvoiceCreatedSuccess(null);
            loadTicketCostsAndBuildItems();
        }
    }, [open, ticket]);

    const loadTicketCostsAndBuildItems = async () => {
        try {
            const qP = query(collection(db, "purchases"), where("ticketId", "==", ticket.id));
            const snap = await getDocs(qP);
            const ticketPurchases: Purchase[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as Purchase));
            setPurchases(ticketPurchases);

            const calculatedItems: InvoiceItemRow[] = [];

            const laborHrs = ticket.laborHours || 2;
            const laborRt = ticket.laborRate || 1500;
            const laborTotal = laborHrs * laborRt;
            calculatedItems.push({
                description: `Mano de Obra Especializada - ${ticket.serviceType || 'Servicio Técnico'} (${ticket.locationName || 'En sitio'})`,
                quantity: laborHrs,
                unitPrice: laborRt,
                total: laborTotal
            });

            if (ticket.vehicleMileageCost && ticket.vehicleMileageCost > 0) {
                calculatedItems.push({
                    description: `Cargos por Desplazamiento y Logística Vehicular (${ticket.assignedMileageKm || 0} KM)`,
                    quantity: 1,
                    unitPrice: ticket.vehicleMileageCost,
                    total: ticket.vehicleMileageCost
                });
            }

            if (ticketPurchases.length > 0) {
                ticketPurchases.forEach(p => {
                    (p.items || []).forEach(item => {
                        calculatedItems.push({
                            description: `Repuesto/Material: ${item.description || 'Insumo de Calle'}`,
                            quantity: item.quantity || 1,
                            unitPrice: item.unitPrice || 0,
                            total: (item.quantity || 1) * (item.unitPrice || 0)
                        });
                    });
                });
            } else if (ticket.materialsCost && ticket.materialsCost > 0) {
                calculatedItems.push({
                    description: `Insumos y Repuestos Utilizados en Servicio`,
                    quantity: 1,
                    unitPrice: ticket.materialsCost,
                    total: ticket.materialsCost
                });
            }

            setItems(calculatedItems);
        } catch (err) {
            console.error("Error generating invoice items from ticket:", err);
        }
    };

    const subtotal = items.reduce((acc, it) => acc + (it.total || 0), 0);
    const itbisAmount = Math.round(subtotal * itbisRate);
    const grandTotal = subtotal + itbisAmount;

    const handleCreateInvoice = async () => {
        setLoading(true);
        try {
            const randomSeq = Math.floor(10000000 + Math.random() * 90000000);
            const generatedNcf = `${ncfType}${randomSeq}`;

            const invoicePayload = {
                ticketId: ticket.id,
                clientName: ticket.clientName,
                clientId: ticket.clientId || null,
                clientRnc: clientRnc || "N/A",
                ncfType,
                ncf: generatedNcf,
                issueDate: serverTimestamp(),
                dueDate: serverTimestamp(),
                status: "UNPAID",
                items: items.map(i => ({
                    description: i.description,
                    quantity: i.quantity,
                    price: i.unitPrice,
                    total: i.total
                })),
                subtotal,
                tax: itbisAmount,
                total: grandTotal,
                paidAmount: 0,
                notes: `Factura generada automáticamente desde Ticket #${ticket.ticketNumber || ticket.id.slice(0, 6)} - ${ticket.serviceType || 'Servicio Técnico'}`,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            const docRef = await addDoc(collection(db, "invoices"), invoicePayload);

            const ticketRef = doc(db, "tickets", ticket.id);
            await updateDoc(ticketRef, {
                linkedInvoiceId: docRef.id,
                billingStatus: "BILLED",
                revenue: grandTotal,
                updatedAt: serverTimestamp()
            });

            setInvoiceCreatedSuccess({
                id: docRef.id,
                ncf: generatedNcf,
                total: grandTotal
            });

            if (onInvoiceCreated) {
                onInvoiceCreated(docRef.id);
            }
        } catch (error: any) {
            console.error("Error creating invoice from ticket:", error);
            alert("Error al generar factura: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleShareWhatsApp = () => {
        if (!invoiceCreatedSuccess) return;
        const msg = `*HECHO SRL - Factura & Informe de Servicio Técnico* 🛠️📄\n\n` +
            `Estimado cliente *${ticket.clientName}*,\n` +
            `Hemos completado satisfactoriamente el servicio en *${ticket.locationName || 'su localidad'}*.\n\n` +
            `📋 *Ticket:* #${ticket.ticketNumber || ticket.id.slice(0, 6)}\n` +
            `🧾 *Factura NCF:* ${invoiceCreatedSuccess.ncf}\n` +
            `💵 *Total a Pagar:* RD$ ${invoiceCreatedSuccess.total.toLocaleString("es-DO", { minimumFractionDigits: 2 })}\n\n` +
            `📸 *Ver Reporte Fotográfico y Factura:* \n${typeof window !== 'undefined' ? window.location.origin : ''}/tickets/${ticket.id}/report\n\n` +
            `Agradecemos su preferencia. Para transferencias: Banco Popular / Banreservas a nombre de HECHO SRL (RNC: 131947532).`;

        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl p-6 rounded-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-lg font-black flex items-center gap-2">
                        <Zap className="w-5 h-5 text-amber-500" />
                        Facturación & Cobro Inmediato de Ticket
                    </DialogTitle>
                </DialogHeader>

                {invoiceCreatedSuccess ? (
                    <div className="space-y-6 text-center py-6">
                        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                            <CheckCircle2 className="w-10 h-10" />
                        </div>

                        <div className="space-y-1">
                            <h3 className="text-xl font-black text-slate-900">¡Factura Generada con Éxito!</h3>
                            <p className="text-sm text-slate-500 font-medium">
                                Comprobante Fiscal: <strong className="font-mono text-blue-700">{invoiceCreatedSuccess.ncf}</strong>
                            </p>
                            <span className="text-2xl font-black font-mono text-emerald-700 block mt-2">
                                RD$ {invoiceCreatedSuccess.total.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                            </span>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                            <Button
                                onClick={handleShareWhatsApp}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl gap-2 shadow-md"
                            >
                                <Send className="w-4 h-4" /> Enviar Factura & Fotos por WhatsApp
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                className="rounded-2xl font-bold"
                            >
                                Cerrar
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-5 pt-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <div>
                                <span className="text-[10px] uppercase font-bold text-slate-400 block">Cliente</span>
                                <span className="text-sm font-bold text-slate-900">{ticket.clientName}</span>
                                <span className="text-xs text-slate-500 block">{ticket.locationName}</span>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs font-bold">Tipo de Comprobante Fiscal (DGII)</Label>
                                <Select value={ncfType} onValueChange={setNcfType}>
                                    <SelectTrigger className="h-9 rounded-xl text-xs bg-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="B02">B02 - Factura Consumo Final</SelectItem>
                                        <SelectItem value="B01">B01 - Crédito Fiscal (RNC Requerido)</SelectItem>
                                        <SelectItem value="E31">E31 - Factura Electrónica (e-CF)</SelectItem>
                                        <SelectItem value="B14">B14 - Régimen Especial</SelectItem>
                                        <SelectItem value="B15">B15 - Comprobante Gubernamental</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {ncfType === "B01" && (
                            <div className="space-y-1">
                                <Label className="text-xs font-bold">RNC del Cliente</Label>
                                <Input
                                    value={clientRnc}
                                    onChange={(e) => setClientRnc(e.target.value)}
                                    placeholder="Ej. 131947532"
                                    className="h-9 rounded-xl text-xs"
                                />
                            </div>
                        )}

                        <div className="border border-slate-200 rounded-2xl overflow-hidden">
                            <Table>
                                <TableHeader className="bg-slate-50 text-[11px]">
                                    <TableRow>
                                        <TableHead>Concepto / Partida</TableHead>
                                        <TableHead className="text-center w-20">Cant</TableHead>
                                        <TableHead className="text-right w-28">Precio (RD$)</TableHead>
                                        <TableHead className="text-right w-28">Total (RD$)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {items.map((it, idx) => (
                                        <TableRow key={idx} className="text-xs">
                                            <TableCell className="font-medium text-slate-800">{it.description}</TableCell>
                                            <TableCell className="text-center font-mono">{it.quantity}</TableCell>
                                            <TableCell className="text-right font-mono">{it.unitPrice.toLocaleString()}</TableCell>
                                            <TableCell className="text-right font-mono font-bold text-slate-900">{it.total.toLocaleString()}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                            <div className="flex justify-between text-xs text-slate-600">
                                <span>Subtotal Gravable:</span>
                                <span className="font-mono font-bold">RD$ {subtotal.toLocaleString("es-DO", { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between text-xs text-slate-600">
                                <span>ITBIS (18%):</span>
                                <span className="font-mono font-bold">RD$ {itbisAmount.toLocaleString("es-DO", { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
                                <span>Total General:</span>
                                <span className="font-mono text-emerald-700 text-base">
                                    RD$ {grandTotal.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>

                        <DialogFooter className="gap-2 pt-2">
                            <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl font-bold text-xs">
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleCreateInvoice}
                                disabled={loading || items.length === 0}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl gap-2 text-xs shadow-md"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Receipt className="w-4 h-4" />}
                                {loading ? "Emitiendo Factura..." : "Emitir Factura con NCF"}
                            </Button>
                        </DialogFooter>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
