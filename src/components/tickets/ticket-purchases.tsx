
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch-ui";
import { Loader2, Camera, Receipt, CheckCircle2, XCircle, Plus, AlertCircle, Trash2, ShoppingCart } from "lucide-react";
import { Purchase, PurchaseItem } from "@/types/purchase";
import { registerPurchase, getPurchasesByTicket } from "@/lib/purchase-service";
import { storage, auth } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { InventoryProduct, InventoryLocation } from "@/types/inventory";
import { getProducts, getLocations } from "@/lib/inventory-service";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useOfflineSync } from "@/hooks/use-offline-sync";
import { Timestamp } from "firebase/firestore";

// Keywords for auto-classification
const KW_INVENTORY = ['cobre', 'tubo', 'gas', 'r410', 'alambre', 'breaker', 'tornillo', 'cinta', 'varilla', 'capacit', 'soldadura', 'filtro', 'compresor', 'valvula'];
const KW_EXPENSE = ['comida', 'almuerzo', 'desayuno', 'cena', 'gasolina', 'combustible', 'parqueo', 'peaje', 'transporte', 'uber', 'taxi', 'propina', 'agua', 'refresco', 'hielo'];

interface TicketPurchasesProps {
    ticketId: string;
    ticketNumber?: string;
    currentUserRole?: string;
    userId?: string; // We need this for createdBy
}

export function TicketPurchases({ ticketId, ticketNumber, currentUserRole, userId }: TicketPurchasesProps) {
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const { isOnline, queuePurchaseCreation } = useOfflineSync();

    // Form State
    const [step, setStep] = useState<1 | 2>(1); // 1: Upload, 2: Review
    const [analyzing, setAnalyzing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    // Purchase Data
    const [formData, setFormData] = useState({
        providerName: "",
        rnc: "",
        ncf: "",
        eNcf: "",
        buyerRnc: "131947532",
        buyerName: "HECHO SRL",
        status: "ACEPTADA",
        date: new Date().toISOString().split('T')[0],
        tax: 0,
        total: 0,
        manualTotal: 0,       // ← Total ingresado manualmente por el técnico
        useManualTotal: false, // ← Si true, omite el cálculo de items y usa manualTotal
        items: [] as PurchaseItem[],
        paymentMethod: "CASH" as "CASH" | "CARD" | "TRANSFER",
        addToInventory: false,
        targetLocationId: ""
    });

    // Catalog Data (for matching)
    const [products, setProducts] = useState<InventoryProduct[]>([]);
    const [locations, setLocations] = useState<InventoryLocation[]>([]);

    useEffect(() => {
        loadData();
    }, [ticketId]);

    const loadData = async () => {
        try {
            const [pData, prodData, locData] = await Promise.all([
                getPurchasesByTicket(ticketId),
                getProducts(),
                getLocations()
            ]);
            setPurchases(pData);
            setProducts(prodData);
            setLocations(locData);

            // Auto Select assigned vehicle logic could be reused here
            const currentUid = userId || auth.currentUser?.uid;

            if (currentUid) {
                const assigned = locData.find(l => l.responsibleUserId === currentUid);
                if (assigned) setFormData(prev => ({ ...prev, targetLocationId: assigned.id }));
                else if (locData.length > 0) setFormData(prev => ({ ...prev, targetLocationId: locData[0].id }));
            }

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const f = e.target.files[0];
            setFile(f);
            setPreviewUrl(URL.createObjectURL(f));
        }
    };

    const handleAnalyze = async () => {
        if (!file) return;
        setAnalyzing(true);
        try {
            // Compress the image before sending to Server Action to prevent Vercel 413 Payload Too Large / timeout
            const { compressImage } = await import("@/lib/image-utils");
            let compressedFile: Blob;
            try {
                compressedFile = await compressImage(file, 1600, 0.85);
            } catch (err) {
                console.warn("Failed to compress, using original", err);
                compressedFile = file;
            }

            // Import Server Action dynamically or use regular import if safe
            const { analyzeReceiptAction } = await import("@/app/actions/analyze-receipt");

            const reqData = new FormData();
            reqData.append("file", compressedFile, file.name);

            const result = await analyzeReceiptAction(reqData);

            if (!result.success || !result.data) {
                throw new Error(result.error || "Failed to analyze receipt");
            }

            const data = result.data;

            // Auto-Classify Logic
            const processedItems = (data.items || []).map((item: any) => {
                const desc = (item.description || "").toLowerCase();
                let isInv = false;

                // Check Keywords
                if (KW_INVENTORY.some(k => desc.includes(k))) isInv = true;
                if (KW_EXPENSE.some(k => desc.includes(k))) isInv = false;

                // Attempt to match existing product
                let matchedId = undefined;
                if (isInv) {
                    // Simple name match
                    const match = products.find(p => p.name.toLowerCase().includes(desc) || desc.includes(p.name.toLowerCase()));
                    if (match) matchedId = match.id;
                }

                return {
                    description: item.description || "Item Nuevo",
                    quantity: item.quantity || 1,
                    unitPrice: item.unitPrice || 0,
                    total: item.total || 0,
                    isInventory: isInv,
                    matchedProductId: matchedId
                } as PurchaseItem;
            });

            // If empty items, add one default
            if (processedItems.length === 0) {
                processedItems.push({
                    description: "Detalle de compra",
                    quantity: 1,
                    unitPrice: 0,
                    total: 0,
                    isInventory: false
                });
            }

            setFormData(prev => ({
                ...prev,
                providerName: data.providerName || data.provider || "",
                rnc: data.rnc || data.rncEmisor || data.rnc_emisor || "",
                ncf: data.ncf || "",
                eNcf: data.eNcf || data.eNCF || data.encf || data.e_ncf || "",
                buyerRnc: data.buyerRnc || data.buyerRNC || data.buyer_rnc || data.rncComprador || "131947532",
                buyerName: data.buyerName || data.buyer_name || data.razonSocialComprador || "HECHO SRL",
                status: data.status || "ACEPTADA",
                date: data.date || new Date().toISOString().split('T')[0],
                tax: data.tax || 0,
                // We trust sum of items or AI total? Let's act smart:
                // If items were found, let UI recalc total. If not, use AI total.
                total: data.total || 0,
                items: processedItems,
                manualTotal: 0,
                useManualTotal: false
            }));

            setStep(2);
        } catch (error) {
            console.error(error);
            alert("Error analizando imagen (AI): " + (error as Error).message);
        } finally {
            setAnalyzing(false);
        }
    };

    const updateItem = (index: number, updates: Partial<PurchaseItem>) => {
        const newItems = [...formData.items];
        newItems[index] = { ...newItems[index], ...updates };

        // Recalculate total if unitPrice/Qty changes?
        // Let's assume user inputs totals directly usually for quickness or we implement basic calc
        if (updates.quantity || updates.unitPrice) {
            newItems[index].total = newItems[index].quantity * newItems[index].unitPrice;
        }

        setFormData({ ...formData, items: newItems });
    };

    const toggleItemType = (index: number) => {
        const item = formData.items[index];
        updateItem(index, { isInventory: !item.isInventory });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Upload image to Firebase Storage
            let receiptUrl = "";
            if (file) {
                try {
                    const ext = file.name.split('.').pop() || 'jpg';
                    const storageRef = ref(storage, `receipts/${ticketId}/${Date.now()}.${ext}`);
                    await uploadBytes(storageRef, file);
                    receiptUrl = await getDownloadURL(storageRef);
                } catch (uploadErr) {
                    console.warn("Storage upload failed, continuing without image URL:", uploadErr);
                }
            }

            // Recalculate items to make sure item.total = item.quantity * item.unitPrice
            const recalcItems = formData.items.map(item => ({
                ...item,
                total: item.quantity * item.unitPrice
            }));

            // If items list is empty, create a single summary item using the manual total
            const finalItems = recalcItems.length > 0 ? recalcItems : [
                {
                    description: "Compra registrada manualmente",
                    quantity: 1,
                    unitPrice: formData.manualTotal > 0 ? formData.manualTotal : 0,
                    total: formData.manualTotal > 0 ? formData.manualTotal : 0,
                    isInventory: false
                }
            ];

            const effectiveSubtotal = finalItems.reduce((acc, i) => acc + i.total, 0);
            const total = effectiveSubtotal + (formData.tax || 0);

            const parsedDate = formData.date ? new Date(formData.date + "T12:00:00") : new Date();

            const purchaseParams = {
                ticketId,
                ticketNumber: ticketNumber || undefined,
                providerName: formData.providerName || "Proveedor General",
                rnc: formData.rnc || undefined,
                ncf: formData.ncf || undefined,
                eNcf: formData.eNcf || undefined,
                buyerRnc: formData.buyerRnc || undefined,
                buyerName: formData.buyerName || undefined,
                status: formData.status || undefined,
                date: parsedDate as any,
                subtotal: effectiveSubtotal,
                tax: formData.tax || 0,
                total: total,
                items: finalItems,
                paymentMethod: formData.paymentMethod,
                evidenceUrls: receiptUrl ? [receiptUrl] : [],
                userId: userId || auth.currentUser?.uid || 'unknown',
                addToInventory: formData.addToInventory,
                inventoryTargetLocationId: formData.targetLocationId
            };

            if (isOnline) {
                await registerPurchase(purchaseParams);
            } else {
                // Offline Logic
                const tempId = `temp_${Date.now()}`;
                const offlinePurchase: Purchase = {
                    ...purchaseParams,
                    id: tempId,
                    date: Timestamp.fromDate(parsedDate),
                    createdAt: Timestamp.now(),
                    createdByUserId: userId || 'unknown',
                } as unknown as Purchase;

                await queuePurchaseCreation(purchaseParams, offlinePurchase);

                // Optimistic UI Update
                setPurchases(prev => [offlinePurchase, ...prev]);
            }

            setIsDialogOpen(false);
            setFile(null);
            setStep(1);
            setFormData({
                providerName: "",
                rnc: "",
                ncf: "",
                eNcf: "",
                buyerRnc: "131947532",
                buyerName: "HECHO SRL",
                status: "ACEPTADA",
                date: new Date().toISOString().split('T')[0],
                tax: 0,
                total: 0,
                manualTotal: 0,
                useManualTotal: false,
                items: [],
                paymentMethod: "CASH",
                addToInventory: false,
                targetLocationId: formData.targetLocationId
            });
            if (isOnline) loadData(); // Reload if online, otherwise we did optimistic update
        } catch (error: any) {
            console.error(error);
            alert(`Error guardando compra: ${error.message || "Verifica los datos."}`);
        } finally {
            setSaving(false);
        }
    };

    // Calculate Summaries
    const invTotal = formData.items.filter(i => i.isInventory).reduce((acc, i) => acc + i.total, 0);
    const expTotal = formData.items.filter(i => !i.isInventory).reduce((acc, i) => acc + i.total, 0);

    return (
        <div className="space-y-6">
            {/* Action Button at the top */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                    <Button className="w-full h-12 dashed border-2 border-dashed bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-300">
                        <Receipt className="mr-2" /> Registrar Compra en Calle
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Registrar Compra Rápida</DialogTitle>
                    </DialogHeader>

                    {step === 1 && (
                        <div className="flex flex-col items-center gap-4 py-6">
                            {/* Total Manual — campo rápido prominente */}
                            <div className="w-full bg-amber-50 border-2 border-amber-300 rounded-xl p-4">
                                <label className="text-xs font-bold text-amber-700 uppercase tracking-wide block mb-1">Total de la Factura (RD$)</label>
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl font-bold text-amber-600">$</span>
                                    <input
                                        type="number"
                                        inputMode="decimal"
                                        placeholder="0.00"
                                        value={formData.manualTotal || ""}
                                        onChange={e => setFormData(prev => ({ ...prev, manualTotal: Number(e.target.value), useManualTotal: Number(e.target.value) > 0 }))}
                                        className="flex-1 text-3xl font-bold bg-transparent border-none outline-none text-amber-900 placeholder-amber-300"
                                    />
                                </div>
                                {formData.manualTotal > 0 && (
                                    <p className="text-xs text-amber-600 mt-1">✓ Total confirmado: RD$ {formData.manualTotal.toLocaleString()}</p>
                                )}
                            </div>

                            {/* Foto del bauche */}
                            <div className="w-full h-44 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed relative overflow-hidden">
                                {previewUrl ? (
                                    <img src={previewUrl} className="object-contain h-full w-full" />
                                ) : (
                                    <div className="flex flex-col items-center gap-2 text-gray-400">
                                        <Camera className="h-10 w-10" />
                                        <span className="text-xs">Toca para tomar foto del bauche</span>
                                    </div>
                                )}
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={handleFileSelect}
                                />
                            </div>

                            <div className="flex gap-2 w-full">
                                <Button
                                    onClick={handleAnalyze}
                                    disabled={!file || analyzing}
                                    size="lg"
                                    variant="outline"
                                    className="flex-1"
                                >
                                    {analyzing ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2" />}
                                    Analizar con IA
                                </Button>
                                <Button
                                    onClick={() => {
                                        // Skip AI and go directly to review with manual total
                                        if (formData.manualTotal <= 0) {
                                            alert("Ingresa el total de la factura primero.");
                                            return;
                                        }
                                        if (formData.items.length === 0) {
                                            setFormData(prev => ({ ...prev, items: [{ description: "Compra en calle", quantity: 1, unitPrice: prev.manualTotal, total: prev.manualTotal, isInventory: false }] }));
                                        }
                                        setStep(2);
                                    }}
                                    size="lg"
                                    className="flex-1 bg-green-600 hover:bg-green-700"
                                    disabled={formData.manualTotal <= 0}
                                >
                                    <CheckCircle2 className="mr-2" />
                                    Confirmar Total
                                </Button>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6">
                            {/* Grid de Datos Generales */}
                            <div className="space-y-4">
                                {/* Sección Emisor */}
                                <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-3">
                                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Datos del Emisor</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-slate-600">Proveedor (Razón Social Emisor)</Label>
                                            <Input
                                                value={formData.providerName}
                                                onChange={e => setFormData({ ...formData, providerName: e.target.value })}
                                                placeholder="Ej. Ferretería Popular"
                                                className="bg-white"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-slate-600">RNC Emisor</Label>
                                            <Input
                                                value={formData.rnc}
                                                onChange={e => setFormData({ ...formData, rnc: e.target.value })}
                                                placeholder="001-0000000-0"
                                                className="bg-white font-mono"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Sección Comprador */}
                                <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-3">
                                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Datos del Comprador</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-slate-600">Comprador (Razón Social)</Label>
                                            <Input
                                                value={formData.buyerName}
                                                onChange={e => setFormData({ ...formData, buyerName: e.target.value })}
                                                placeholder="HECHO SRL"
                                                className="bg-white"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-slate-600">RNC Comprador</Label>
                                            <Input
                                                value={formData.buyerRnc}
                                                onChange={e => setFormData({ ...formData, buyerRnc: e.target.value })}
                                                placeholder="131947532"
                                                className="bg-white font-mono"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Sección Comprobantes */}
                                <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-3">
                                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Comprobantes y Fecha</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-slate-600">NCF (Tradicional)</Label>
                                            <Input
                                                value={formData.ncf}
                                                onChange={e => setFormData({ ...formData, ncf: e.target.value })}
                                                placeholder="B0100000001"
                                                className="bg-white font-mono"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-slate-600 font-medium text-blue-600">e-NCF (Electrónico)</Label>
                                            <Input
                                                value={formData.eNcf}
                                                onChange={e => setFormData({ ...formData, eNcf: e.target.value })}
                                                placeholder="E3100000001"
                                                className="bg-white border-blue-200 focus-visible:ring-blue-500 font-mono"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-slate-600">Fecha Emisión</Label>
                                            <Input
                                                type="date"
                                                value={formData.date}
                                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                                                className="bg-white"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Sección Pago y Estado */}
                                <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-3">
                                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Método y Estado</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-slate-600">Método de Pago</Label>
                                            <Select
                                                value={formData.paymentMethod}
                                                onValueChange={(val: any) => setFormData({ ...formData, paymentMethod: val })}
                                            >
                                                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="CASH">Efectivo</SelectItem>
                                                    <SelectItem value="CARD">Tarjeta</SelectItem>
                                                    <SelectItem value="TRANSFER">Transferencia</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-slate-600">Estado de Factura Electrónica</Label>
                                            <Select
                                                value={formData.status}
                                                onValueChange={(val: string) => setFormData({ ...formData, status: val })}
                                            >
                                                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="ACEPTADA">ACEPTADA (Válida)</SelectItem>
                                                    <SelectItem value="PENDIENTE">PENDIENTE</SelectItem>
                                                    <SelectItem value="RECHAZADA">RECHAZADA</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Items Review */}
                            <div className="space-y-3">
                                <Label>Revisión de Items</Label>
                                {formData.items.map((item, idx) => (
                                    <div key={idx} className={`p-3 rounded-lg border flex flex-col gap-2 ${item.isInventory ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                                        <div className="flex justify-between items-start">
                                            <Input
                                                value={item.description}
                                                onChange={e => updateItem(idx, { description: e.target.value })}
                                                className="h-8 text-sm font-medium w-full mr-2"
                                                placeholder="Descripción del item"
                                            />
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400" onClick={() => {
                                                const newItems = formData.items.filter((_, i) => i !== idx);
                                                setFormData({ ...formData, items: newItems });
                                            }}>
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>

                                        <div className="flex justify-between items-center gap-2">
                                            <div className="flex items-center gap-2 text-sm">
                                                <div className="flex items-center">
                                                    <span className="text-xs text-gray-500 mr-1">Cant:</span>
                                                    <Input type="number" className="w-16 h-8" value={item.quantity} onChange={e => updateItem(idx, { quantity: Number(e.target.value) })} />
                                                </div>
                                                <span className="text-gray-400">x</span>
                                                <div className="flex items-center">
                                                    <span className="text-xs text-gray-500 mr-1">Precio:</span>
                                                    <Input type="number" className="w-24 h-8" value={item.unitPrice} onChange={e => updateItem(idx, { unitPrice: Number(e.target.value) })} />
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold min-w-[60px] text-right">${(item.quantity * item.unitPrice).toLocaleString()}</span>
                                                <div
                                                    onClick={() => toggleItemType(idx)}
                                                    className={`cursor-pointer px-3 py-1 rounded-full text-[10px] font-bold transition-all select-none uppercase tracking-wider ${item.isInventory ? 'bg-green-500 text-white shadow-green-200' : 'bg-gray-300 text-gray-700'}`}
                                                >
                                                    {item.isInventory ? 'Inventario' : 'Gasto'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <Button variant="outline" size="sm" onClick={() => setFormData(prev => ({ ...prev, items: [...prev.items, { description: "", quantity: 1, unitPrice: 0, total: 0, isInventory: false }] }))}>
                                    <Plus className="h-3 w-3 mr-1" /> Agregar Item Manual
                                </Button>
                            </div>

                            {/* Summary & Inventory Toggle */}
                            <div className="space-y-4 pt-4 border-t">
                                <div className="flex flex-col gap-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Subtotal (Items):</span>
                                        <span>${(invTotal + expTotal).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-sm items-center">
                                        <span className="text-gray-500">ITBIS / Impuestos:</span>
                                        <Input
                                            type="number"
                                            className="w-24 h-8 text-right"
                                            value={formData.tax}
                                            onChange={e => setFormData({ ...formData, tax: Number(e.target.value) })}
                                        />
                                    </div>
                                    <div className="flex justify-between text-xl font-bold border-t pt-2 mt-2">
                                        <span>TOTAL A PAGAR:</span>
                                        <span>${(invTotal + expTotal + (formData.tax || 0)).toLocaleString()}</span>
                                    </div>
                                </div>

                                {invTotal > 0 && (
                                    <div className="bg-blue-50 p-4 rounded-lg flex items-start gap-3 border border-blue-100">
                                        <Switch
                                            checked={formData.addToInventory}
                                            onCheckedChange={v => setFormData({ ...formData, addToInventory: v })}
                                        />
                                        <div className="space-y-2 w-full">
                                            <Label className="font-bold text-blue-900 cursor-pointer" onClick={() => setFormData(prev => ({ ...prev, addToInventory: !prev.addToInventory }))}>
                                                Ingresar a Inventario
                                            </Label>
                                            <p className="text-xs text-blue-700">
                                                Se crearán movimientos de ENTRADA para los {formData.items.filter(i => i.isInventory).length} items marcados.
                                            </p>
                                            {formData.addToInventory && (
                                                <div className="pt-2">
                                                    <Select value={formData.targetLocationId} onValueChange={v => setFormData({ ...formData, targetLocationId: v })}>
                                                        <SelectTrigger className="h-9 bg-white border-blue-200"><SelectValue placeholder="Seleccionar Almacén / Vehículo..." /></SelectTrigger>
                                                        <SelectContent>
                                                            {locations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <Button onClick={handleSave} disabled={saving} className="w-full h-12 text-lg font-bold shadow-lg" size="lg">
                                {saving ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2" />}
                                Guardar Compra Completa
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* List View of past purchases */}
            {purchases.length > 0 && (
                <div className="space-y-3">
                    <h3 className="font-semibold text-gray-700 flex items-center gap-2 text-sm uppercase">
                        <ShoppingCart className="h-4 w-4" /> Compras Registradas
                    </h3>
                    <div className="space-y-3">
                        {purchases.map(p => {
                            // Helper to format timestamps/dates safely
                            const getFormattedDate = (timestampOrDate: any) => {
                                if (!timestampOrDate) return null;
                                if (timestampOrDate.seconds) {
                                    return new Date(timestampOrDate.seconds * 1000).toLocaleDateString("es-DO", { year: 'numeric', month: '2-digit', day: '2-digit' });
                                }
                                if (timestampOrDate instanceof Date) {
                                    return timestampOrDate.toLocaleDateString("es-DO", { year: 'numeric', month: '2-digit', day: '2-digit' });
                                }
                                if (typeof timestampOrDate === "string") {
                                    return new Date(timestampOrDate).toLocaleDateString("es-DO", { year: 'numeric', month: '2-digit', day: '2-digit' });
                                }
                                return null;
                            };

                            const emissionDateStr = getFormattedDate(p.date);
                            const registerDateStr = getFormattedDate(p.createdAt);
                            
                            const statusStyle = p.status === "RECHAZADA"
                                ? "bg-red-50 text-red-700 border-red-200"
                                : p.status === "PENDIENTE"
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : "bg-green-50 text-green-700 border-green-200"; // ACEPTADA

                            return (
                                <Card key={p.id} className="overflow-hidden border border-slate-100 hover:shadow-md transition-shadow">
                                    <CardContent className="p-4 space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-1">
                                                <div className="font-bold text-slate-900 text-base">{p.providerName || "Proveedor No Definido"}</div>
                                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                                                    <span>RNC: <strong className="font-mono">{p.rnc || "N/D"}</strong></span>
                                                    <span className="text-slate-300">•</span>
                                                    <span>Para: <strong>{p.buyerName || "HECHO SRL"}</strong> ({p.buyerRnc || "131947532"})</span>
                                                </div>
                                            </div>
                                            <div className="text-right space-y-1">
                                                <div className="font-bold text-lg text-slate-900">${p.total.toLocaleString("es-DO", { minimumFractionDigits: 2 })}</div>
                                                <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{p.paymentMethod === "CASH" ? "Efectivo" : p.paymentMethod === "CARD" ? "Tarjeta" : "Transferencia"}</div>
                                            </div>
                                        </div>

                                        {/* Comprobantes & Estado */}
                                        <div className="flex flex-wrap gap-2 items-center justify-between border-t pt-3">
                                            <div className="flex flex-wrap gap-2">
                                                {p.eNcf ? (
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-100">
                                                        e-NCF: {p.eNcf}
                                                    </span>
                                                ) : null}
                                                {p.ncf ? (
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-50 text-slate-700 border border-slate-100">
                                                        NCF: {p.ncf}
                                                    </span>
                                                ) : null}
                                                {!p.eNcf && !p.ncf ? (
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-100">
                                                        Sin Comprobante
                                                    </span>
                                                ) : null}
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {p.status && (
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${statusStyle} uppercase tracking-wide flex items-center gap-1`}>
                                                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                                                        {p.status}
                                                    </span>
                                                )}
                                                <span className="text-[11px] text-slate-500 font-medium">
                                                    {emissionDateStr ? `Emitida: ${emissionDateStr}` : (registerDateStr ? `Reg: ${registerDateStr}` : "Sin fecha")}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Acciones de Foto y Detalles de Items */}
                                        <div className="flex items-center justify-between pt-1">
                                            <span className="text-xs text-slate-400">{p.items?.length || 0} {p.items?.length === 1 ? 'item' : 'items'} registrados</span>
                                            {p.evidenceUrls && p.evidenceUrls.length > 0 && (
                                                <a 
                                                    href={p.evidenceUrls[0]} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-xs text-blue-600 font-medium hover:underline bg-blue-50/50 hover:bg-blue-50 px-2.5 py-1 rounded-md transition-colors"
                                                >
                                                    <Camera className="h-3 w-3" /> Ver Foto de Factura
                                                </a>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
