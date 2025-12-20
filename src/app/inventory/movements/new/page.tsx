"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2 } from "lucide-react";
import { getLocations, getProducts, registerMovement } from "@/lib/inventory-service";
import { InventoryProduct, InventoryLocation, MovementType } from "@/types/inventory";
import { useToast } from "@/components/ui/use-toast";

// Simple location mock if db is empty
const DEFAULT_LOCATIONS = [
    { id: "almacen-principal", name: "Almacén Principal", type: "ALMACEN" },
    { id: "camioneta-1", name: "Camioneta 1", type: "VEHICULO" }
];

function NewMovementForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const defaultType = searchParams.get("type") as MovementType || "SALIDA";
    const { toast } = useToast();

    const [loading, setLoading] = useState(false);
    const [products, setProducts] = useState<InventoryProduct[]>([]);
    const [locations, setLocations] = useState<InventoryLocation[]>([]);

    const [formData, setFormData] = useState({
        type: defaultType,
        productId: "",
        originLocationId: "",
        destinationLocationId: "",
        quantity: 1,
        reason: "",
        note: ""
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const [pData, lData] = await Promise.all([getProducts(), getLocations()]);
        setProducts(pData);
        // Fallback for demo if no locations yet
        setLocations(lData.length > 0 ? lData : DEFAULT_LOCATIONS as any);

        // Auto-select main location as origin for SALIDA, or Dest for Entrada
        if (lData.length > 0) {
            if (defaultType === 'SALIDA') {
                setFormData(prev => ({ ...prev, originLocationId: lData[0].id }));
            } else {
                setFormData(prev => ({ ...prev, destinationLocationId: lData[0].id }));
            }
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            // Validate
            if (formData.type === 'SALIDA' && !formData.originLocationId) throw new Error("Debes elegir Origen");
            if (formData.type === 'ENTRADA' && !formData.destinationLocationId) throw new Error("Debes elegir Destino");
            if (!formData.productId) throw new Error("Elige un producto");
            if (formData.quantity <= 0) throw new Error("Cantidad debe ser mayor a 0");

            await registerMovement({
                type: formData.type as MovementType,
                productId: formData.productId,
                quantity: Number(formData.quantity),
                originLocationId: formData.originLocationId || undefined,
                destinationLocationId: formData.destinationLocationId || undefined,
                reason: formData.reason || (formData.type === 'SALIDA' ? 'Consumo' : 'Compra'),
                note: formData.note,
                createdByUserId: 'CURRENT_USER', // In real app use auth.currentUser.uid
                createdByType: 'ADMIN' // or based on role
            });

            toast({ title: "Movimiento registrado", description: "El inventario ha sido actualizado." });
            router.push("/inventory");
        } catch (error: any) {
            console.error(error);
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const selectedProduct = products.find(p => p.id === formData.productId);

    return (
        <div className="max-w-md mx-auto p-6 space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-xl font-bold">Registrar Movimiento</h1>
                    <p className="text-gray-500">Entrada, Salida o Transferencia</p>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl border shadow-sm space-y-6">

                {/* 1. Review Type selection */}
                <div className="grid grid-cols-3 gap-2">
                    {['ENTRADA', 'SALIDA', 'TRANSFERENCIA'].map(t => (
                        <button
                            key={t}
                            onClick={() => setFormData({ ...formData, type: t as any })}
                            className={`p-2 text-xs font-bold rounded border ${formData.type === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-600'}`}
                        >
                            {t}
                        </button>
                    ))}
                </div>

                {/* 2. Product */}
                <div className="space-y-2">
                    <Label>Producto</Label>
                    <Select
                        value={formData.productId}
                        onValueChange={(val) => setFormData({ ...formData, productId: val })}
                    >
                        <SelectTrigger className="h-14">
                            <SelectValue placeholder="Buscar producto..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px]">
                            {products.map(p => (
                                <SelectItem key={p.id} value={p.id}>
                                    <div className="text-left">
                                        <div className="font-semibold">{p.name}</div>
                                        <div className="text-xs text-gray-500">{p.sku} | {p.unit}</div>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {selectedProduct && (
                        <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                            Unidad: {selectedProduct.unit}
                        </div>
                    )}
                </div>

                {/* 3. Locations */}
                {formData.type !== 'ENTRADA' && (
                    <div className="space-y-2">
                        <Label>Origen (¿De dónde sale?)</Label>
                        <Select
                            value={formData.originLocationId}
                            onValueChange={(val) => setFormData({ ...formData, originLocationId: val })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar Origen" />
                            </SelectTrigger>
                            <SelectContent>
                                {locations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {formData.type !== 'SALIDA' && (
                    <div className="space-y-2">
                        <Label>Destino (¿A dónde entra?)</Label>
                        <Select
                            value={formData.destinationLocationId}
                            onValueChange={(val) => setFormData({ ...formData, destinationLocationId: val })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar Destino" />
                            </SelectTrigger>
                            <SelectContent>
                                {locations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {/* 4. Quantity & Reason */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Cantidad</Label>
                        <Input
                            type="number"
                            min="0"
                            className="text-lg font-bold"
                            value={formData.quantity}
                            onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Motivo</Label>
                        <Input
                            placeholder={formData.type === 'SALIDA' ? 'Consumo ticket...' : 'Compra...'}
                            value={formData.reason}
                            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>Nota (Opcional)</Label>
                    <Input
                        placeholder="Detalles adicionales..."
                        value={formData.note}
                        onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    />
                </div>

                <Button
                    className="w-full h-12 text-lg"
                    onClick={handleSubmit}
                    disabled={loading || !formData.productId}
                >
                    {loading ? <Loader2 className="animate-spin" /> : "Confirmar Movimiento"}
                </Button>
            </div>
        </div>
    );
}

export default function NewMovementPage() {
    return (
        <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>}>
            <NewMovementForm />
        </Suspense>
    );
}
