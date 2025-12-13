
"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Filter, Package } from "lucide-react";
import Link from "next/link";
import { getProducts } from "@/lib/inventory-service";
import { InventoryProduct } from "@/types/inventory";
import { Badge } from "@/components/ui/badge";
import { ExcelImporter } from "@/components/inventory/excel-importer";

export default function ProductsPage() {
    const [products, setProducts] = useState<InventoryProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => {
        loadProducts();
    }, []);

    const loadProducts = async () => {
        setLoading(true);
        try {
            const data = await getProducts();
            setProducts(data);
        } catch (error) {
            console.error("Failed to load products", error);
        } finally {
            setLoading(false);
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
                                        {/* Real stock would go here */}
                                    </div>
                                    <Badge variant={product.isActive ? 'default' : 'secondary'}>
                                        {product.isActive ? 'Activo' : 'Inactivo'}
                                    </Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
