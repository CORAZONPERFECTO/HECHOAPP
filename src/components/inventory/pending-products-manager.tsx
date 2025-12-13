
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Check, X, Search, Link as LinkIcon, Plus } from "lucide-react";
import { PendingProduct, InventoryProduct } from "@/types/inventory";
import { getPendingProducts, resolvePendingProduct } from "@/lib/pending-product-service";
import { getProducts, createProduct } from "@/lib/inventory-service";

export function PendingProductsManager() {
    const [pending, setPending] = useState<(PendingProduct & { quantity: number, targetLocationId: string })[]>([]);
    const [products, setProducts] = useState<InventoryProduct[]>([]);
    const [loading, setLoading] = useState(true);

    // Resolution State
    const [selectedItem, setSelectedItem] = useState<(PendingProduct & { quantity: number, targetLocationId: string }) | null>(null);
    const [action, setAction] = useState<'LINK' | 'CREATE' | null>(null);

    // Form Data
    const [linkProductId, setLinkProductId] = useState("");
    const [newProductData, setNewProductData] = useState({
        name: "",
        sku: "",
        category: "MATERIAL",
        minimumStock: 5,
        unit: "UND",
        averageCost: 0
    });

    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [pData, prodData] = await Promise.all([
                getPendingProducts(),
                getProducts()
            ]);
            // Cast strictly
            setPending(pData as any[]);
            setProducts(prodData);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleResolve = async () => {
        if (!selectedItem || !action) return;
        setProcessing(true);
        try {
            let finalProductId = linkProductId;

            if (action === 'CREATE') {
                // Create new product
                finalProductId = await createProduct({
                    ...newProductData,
                    averageCost: selectedItem.detectedPrice || 0
                });
            }

            if (action === 'LINK' && !finalProductId) {
                alert("Selecciona un producto");
                setProcessing(false);
                return;
            }

            await resolvePendingProduct(selectedItem, 'APPROVE', finalProductId);

            // Cleanup
            setSelectedItem(null);
            setAction(null);
            loadData();
        } catch (error) {
            console.error(error);
            alert("Error al resolver");
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async (item: any) => {
        if (!confirm("¿Rechazar este item? No se ingresará al inventario.")) return;
        setProcessing(true);
        try {
            await resolvePendingProduct(item, 'REJECT');
            loadData();
        } catch (e) { console.error(e); }
        finally { setProcessing(false); }
    };

    const openResolve = (item: any, mode: 'LINK' | 'CREATE') => {
        setSelectedItem(item);
        setAction(mode);
        if (mode === 'CREATE') {
            setNewProductData({
                name: item.detectedName,
                sku: `GEN-${Math.floor(Math.random() * 10000)}`,
                category: "MATERIAL",
                minimumStock: 5,
                unit: item.suggestedUnit || "UND",
                averageCost: item.detectedPrice || 0
            });
        }
        setLinkProductId("");
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Productos Provisionales</CardTitle>
                    <CardDescription>
                        Items comprados que necesitan ser vinculados al catálogo oficial.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? <Loader2 className="animate-spin" /> : (
                        <div className="space-y-4">
                            {pending.length === 0 && <p className="text-gray-500 text-center py-8">No hay productos pendientes.</p>}

                            {pending.map(item => (
                                <div key={item.id} className="border p-4 rounded-lg flex flex-col md:flex-row justify-between items-center gap-4 bg-orange-50 border-orange-200">
                                    <div>
                                        <div className="font-bold text-lg">{item.detectedName}</div>
                                        <div className="text-sm text-gray-600">
                                            Prov: {item.providerName || 'N/A'} • Costo: ${item.detectedPrice} • Cant: {item.quantity}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={() => openResolve(item, 'LINK')}>
                                            <LinkIcon className="mr-2 h-4 w-4" /> Vincular
                                        </Button>
                                        <Button variant="default" size="sm" onClick={() => openResolve(item, 'CREATE')}>
                                            <Plus className="mr-2 h-4 w-4" /> Crear Nuevo
                                        </Button>
                                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => handleReject(item)}>
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={!!selectedItem} onOpenChange={(o) => !o && setSelectedItem(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {action === 'LINK' ? 'Vincular a Existente' : 'Crear Nuevo Producto'}
                        </DialogTitle>
                    </DialogHeader>

                    {action === 'LINK' && (
                        <div className="space-y-4 py-4">
                            <Label>Buscar Producto</Label>
                            <Select value={linkProductId} onValueChange={setLinkProductId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {products.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {action === 'CREATE' && (
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Nombre</Label>
                                    <Input value={newProductData.name} onChange={e => setNewProductData({ ...newProductData, name: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>SKU</Label>
                                    <Input value={newProductData.sku} onChange={e => setNewProductData({ ...newProductData, sku: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Unidad</Label>
                                    <Input value={newProductData.unit} onChange={e => setNewProductData({ ...newProductData, unit: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Categoría</Label>
                                    <Select value={newProductData.category} onValueChange={v => setNewProductData({ ...newProductData, category: v })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="MATERIAL">Material</SelectItem>
                                            <SelectItem value="HERRAMIENTA">Herramienta</SelectItem>
                                            <SelectItem value="EPP">EPP</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="secondary" onClick={() => setSelectedItem(null)}>Cancelar</Button>
                        <Button onClick={handleResolve} disabled={processing}>
                            {processing && <Loader2 className="animate-spin mr-2" />} Confirmar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
