
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch-ui";
import { Loader2, Camera, Receipt, CheckCircle2, XCircle, Plus, AlertCircle, Trash2 } from "lucide-react";
import { Purchase, PurchaseItem } from "@/types/purchase";
import { registerPurchase, getPurchasesByTicket, analyzeReceiptImage } from "@/lib/purchase-service";
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
        tax: 0,
        total: 0,
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
            // Importing auth directly here as it's client component logic if needed
            const { auth } = await import("@/lib/firebase");
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
            // Import Server Action dynamically or use regular import if safe
            // Ideally should be imported at top: import { analyzeReceiptAction } from "@/app/actions/analyze-receipt";
            const { analyzeReceiptAction } = await import("@/app/actions/analyze-receipt");

            const reqData = new FormData();
            reqData.append("file", file);

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
                providerName: data.provider || "",
                rnc: data.rnc || "",
                ncf: data.ncf || "",
                tax: data.tax || 0,
                // We trust sum of items or AI total? Let's act smart:
                // If items were found, let UI recalc total. If not, use AI total.
                total: data.total || 0,
                items: processedItems
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
            // Upload Image (Mock: we need to implement storage upload or use base64 for MVP? 
            // In integrated app we should use `storage`)
            // Skipping real upload for this snippet, focusing on logic.
            // Assuming `file` is uploaded and we get URL.
            const fakeUrl = previewUrl || "https://placeholder.com/receipt.jpg";

            const itemSubtotal = formData.items.reduce((acc, i) => acc + i.total, 0);
            const total = itemSubtotal + (formData.tax || 0);

            const purchaseParams = {
                ticketId,
                ticketNumber,
                providerName: formData.providerName || "Proveedor General",
                rnc: formData.rnc,
                ncf: formData.ncf,
                date: new Date() as any,
                subtotal: itemSubtotal,
                tax: formData.tax || 0,
                total: total,
                items: formData.items,
                paymentMethod: formData.paymentMethod,
                evidenceUrls: [fakeUrl],
                userId: userId || 'unknown',
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
                    date: { seconds: Date.now() / 1000, nanoseconds: 0 } as Timestamp,
                    createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as Timestamp,
                    createdByUserId: userId || 'unknown',
                    // Clean up extra params not in Purchase type
                    // (They are used in queuePurchaseCreation params, but strictly filtered for UI object)
                } as unknown as Purchase; // Cast to avoid strict type mismatch on 'addToInventory' if present in spread

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
                tax: 0,
                total: 0,
                items: [],
                paymentMethod: "CASH",
                addToInventory: false,
                targetLocationId: ""
            });
            if (isOnline) loadData(); // Reload if online, otherwise we did optimistic update
        } catch (error) {
            console.error(error);
            alert("Error guardando compra");
        } finally {
            setSaving(false);
        }
    };

    // Calculate Summaries
    const invTotal = formData.items.filter(i => i.isInventory).reduce((acc, i) => acc + i.total, 0);
    const expTotal = formData.items.filter(i => !i.isInventory).reduce((acc, i) => acc + i.total, 0);

    return (
        <div className="space-y-4">
            {/* List */}
            {purchases.map(p => (
                <div key={p.id} className="p-3 border rounded-lg bg-white flex justify-between items-center">
                    <div>
                        <div className="font-bold">{p.providerName}</div>
                        <div className="text-sm text-gray-500">{new Date((p.createdAt as any)?.seconds * 1000).toLocaleDateString()}</div>
                    </div>
                    <div className="text-right">
                        <div className="font-bold text-lg">${p.total.toLocaleString()}</div>
                        <div className="text-xs text-gray-500">{p.items.length} items</div>
                    </div>
                </div>
            ))}

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                    <Button className="w-full h-12 dashed border-2 border-dashed bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-300">
                        <Receipt className="mr-2" /> Registrar Compra en Calle
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Registrar Compra Rápid</DialogTitle>
                    </DialogHeader>

                    {step === 1 && (
                        <div className="flex flex-col items-center gap-6 py-8">
                            <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed relative overflow-hidden">
                                {previewUrl ? (
                                    <img src={previewUrl} className="object-contain h-full w-full" />
                                ) : (
                                    <Camera className="h-12 w-12 text-gray-400" />
                                )}
                                <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileSelect} />
                            </div>
                            <Button onClick={handleAnalyze} disabled={!file || analyzing} size="lg" className="w-full">
                                {analyzing ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2" />}
                                Analizar Factura
                            </Button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Proveedor</Label>
                                    <Input
                                        value={formData.providerName}
                                        onChange={e => setFormData({ ...formData, providerName: e.target.value })}
                                        placeholder="Ej. Ferretería Popular"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>RNC / Cédula</Label>
                                    <Input
                                        value={formData.rnc}
                                        onChange={e => setFormData({ ...formData, rnc: e.target.value })}
                                        placeholder="001-0000000-0"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>NCF (Comprobante)</Label>
                                    <Input
                                        value={formData.ncf}
                                        onChange={e => setFormData({ ...formData, ncf: e.target.value })}
                                        placeholder="B0100000001"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Método Pago</Label>
                                    <Select
                                        value={formData.paymentMethod}
                                        onValueChange={(val: any) => setFormData({ ...formData, paymentMethod: val })}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="CASH">Efectivo</SelectItem>
                                            <SelectItem value="CARD">Tarjeta</SelectItem>
                                            <SelectItem value="TRANSFER">Transferencia</SelectItem>
                                        </SelectContent>
                                    </Select>
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
        </div>
    );
}
