"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Filter, Package, Edit2 } from "lucide-react";
import Link from "next/link";
import { getProducts, updateProduct } from "@/lib/inventory-service";
import { InventoryProduct, UnitOfMeasure } from "@/types/inventory";
import { Badge } from "@/components/ui/badge";
import { ExcelImporter } from "@/components/inventory/excel-importer";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CATEGORIES = ["Materiales", "Herramientas", "Equipos", "Consumibles", "Repuestos", "Otros"];
const UNITS: UnitOfMeasure[] = ['UNIDAD', 'PIE', 'METRO', 'ROLLO', 'GALON', 'LIBRA', 'CAJA', 'JUEGO', 'PAQUETE', 'OTRO'];

export default function ProductsPage() {
    const [products, setProducts] = useState<InventoryProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    // Editing states
    const [editingProduct, setEditingProduct] = useState<InventoryProduct | null>(null);
    const [editFormData, setEditFormData] = useState<Partial<InventoryProduct>>({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadProducts();
    }, []);

    const loadProducts = async () => {
        setLoading(true);
        try {
            const data = await getProducts(false); // get both active and inactive products
            setProducts(data);
        } catch (error) {
            console.error("Failed to load products", error);
        } finally {
            setLoading(false);
        }
    };

    const handleEditClick = (product: InventoryProduct, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingProduct(product);
        setEditFormData({
            sku: product.sku,
            name: product.name,
            category: product.category,
            unit: product.unit,
            minStock: product.minStock,
            averageCost: product.averageCost,
            isActive: product.isActive
        });
    };

    const handleSaveEdit = async () => {
        if (!editingProduct) return;
        setSaving(true);
        try {
            await updateProduct(editingProduct.id, {
                sku: editFormData.sku,
                name: editFormData.name,
                category: editFormData.category,
                unit: editFormData.unit,
                minStock: Number(editFormData.minStock) || 0,
                averageCost: Number(editFormData.averageCost) || 0,
                isActive: editFormData.isActive !== undefined ? editFormData.isActive : true
            });
            setEditingProduct(null);
            loadProducts();
        } catch (error) {
            console.error("Failed to update product", error);
            alert("Error al actualizar producto");
        } finally {
            setSaving(false);
        }
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-8 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Productos</h1>
                    <p className="text-gray-500">Catálogo maestro de materiales y equipos</p>
                </div>
                <div className="flex gap-2">
                    <ExcelImporter onImportSuccess={loadProducts} />
                    <Link href="/inventory/products/new">
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> Nuevo Producto
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Buscar por nombre, SKU..."
                        className="pl-9"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                {/* Future: Category Filter */}
                <Button variant="outline" size="icon">
                    <Filter className="h-4 w-4" />
                </Button>
            </div>

            {/* List */}
            <div className="bg-white rounded-lg border shadow-sm">
                {filteredProducts.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        {loading ? "Cargando..." : "No se encontraron productos."}
                    </div>
                ) : (
                    <div className="divide-y">
                        {filteredProducts.map(product => (
                            <div key={product.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center">
                                        <Package className="h-5 w-5 text-gray-500" />
                                    </div>
                                    <div>
                                        <div className="font-medium">{product.name}</div>
                                        <div className="text-xs text-gray-500 flex gap-2">
                                            <span className="font-mono bg-gray-100 px-1 rounded">{product.sku}</span>
                                            <span>• {product.category}</span>
                                            <span>• {product.unit}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    <div className="text-right hidden md:block">
                                        <div className="text-sm font-medium">Min: {product.minStock}</div>
                                    </div>
                                    <Badge variant={product.isActive ? 'default' : 'secondary'}>
                                        {product.isActive ? 'Activo' : 'Inactivo'}
                                    </Badge>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={(e) => handleEditClick(product, e)}
                                    >
                                        <Edit2 className="h-4 w-4 text-gray-500" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {editingProduct && (
                <Dialog open={!!editingProduct} onOpenChange={(open) => !open && setEditingProduct(null)}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Editar Producto</DialogTitle>
                            <DialogDescription>Modificar parámetros y reglas de stock para {editingProduct.name}</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>SKU (Código)</Label>
                                    <Input
                                        value={editFormData.sku || ""}
                                        onChange={(e) => setEditFormData({ ...editFormData, sku: e.target.value.toUpperCase() })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Categoría</Label>
                                    <Select
                                        value={editFormData.category || "Materiales"}
                                        onValueChange={(val) => setEditFormData({ ...editFormData, category: val })}
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
                                    value={editFormData.name || ""}
                                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Unidad de Medida</Label>
                                    <Select
                                        value={editFormData.unit || "UNIDAD"}
                                        onValueChange={(val) => setEditFormData({ ...editFormData, unit: val as any })}
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
                                        value={editFormData.minStock ?? 5}
                                        onChange={(e) => setEditFormData({ ...editFormData, minStock: Number(e.target.value) })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Costo Promedio (RD$)</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={editFormData.averageCost ?? 0}
                                        onChange={(e) => setEditFormData({ ...editFormData, averageCost: Number(e.target.value) })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Estado</Label>
                                    <Select
                                        value={editFormData.isActive ? "activo" : "inactivo"}
                                        onValueChange={(val) => setEditFormData({ ...editFormData, isActive: val === "activo" })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="activo">Activo</SelectItem>
                                            <SelectItem value="inactivo">Inactivo</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setEditingProduct(null)} disabled={saving}>
                                Cancelar
                            </Button>
                            <Button onClick={handleSaveEdit} disabled={saving || !editFormData.name}>
                                {saving ? "Guardando..." : "Guardar Cambios"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
