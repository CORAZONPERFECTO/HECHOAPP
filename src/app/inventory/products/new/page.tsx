
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { createProduct } from "@/lib/inventory-service";
import { InventoryProduct, UnitOfMeasure } from "@/types/inventory";

const CATEGORIES = ["Materiales", "Herramientas", "Equipos", "Consumibles", "Repuestos", "Otros"];
const UNITS: UnitOfMeasure[] = ['UNIDAD', 'PIE', 'METRO', 'ROLLO', 'GALON', 'LIBRA', 'CAJA', 'JUEGO', 'PAQUETE', 'OTRO'];

export default function NewProductPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<Partial<InventoryProduct>>({
        sku: "",
        name: "",
        category: "Materiales",
        unit: "UNIDAD",
        minStock: 5,
        averageCost: 0,
        tags: []
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Auto-generate SKU if empty? checking backend logic, for now require it or simple generate
            const productToSave = {
                sku: formData.sku || `SKU-${Date.now().toString().slice(-6)}`,
                name: formData.name!,
                category: formData.category!,
                unit: formData.unit as UnitOfMeasure,
                minStock: Number(formData.minStock) || 0,
                averageCost: Number(formData.averageCost) || 0,
                isActive: true
            };

            await createProduct(productToSave as any);
            router.push("/inventory/products");
        } catch (error) {
            console.error(error);
            alert("Error al crear producto");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-8 space-y-8">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">Nuevo Producto</h1>
                    <p className="text-gray-500">Registrar un nuevo ítem en el catálogo</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border shadow-sm space-y-6">

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>SKU (Código)</Label>
                        <Input
                            placeholder="Autogenerado si vacío"
                            value={formData.sku}
                            onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Categoría</Label>
                        <Select
                            value={formData.category}
                            onValueChange={(val) => setFormData({ ...formData, category: val })}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>Nombre del Producto</Label>
                    <Input
                        required
                        placeholder="Ej. Gas Refrigerante R410A"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Unidad de Medida</Label>
                        <Select
                            value={formData.unit}
                            onValueChange={(val) => setFormData({ ...formData, unit: val as any })}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Stock Mínimo (Alerta)</Label>
                        <Input
                            type="number"
                            min="0"
                            value={formData.minStock}
                            onChange={(e) => setFormData({ ...formData, minStock: Number(e.target.value) })}
                        />
                    </div>
                </div>

                <div className="pt-4 flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
                    <Button type="submit" disabled={loading || !formData.name}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Save className="mr-2 h-4 w-4" /> Guardar Producto
                    </Button>
                </div>
            </form>
        </div>
    );
}
