
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, AlertTriangle, ArrowUpRight, ArrowDownLeft, Plus } from "lucide-react";
import Link from "next/link";
import { getProducts } from "@/lib/inventory-service";
import { InventoryProduct } from "@/types/inventory";

export default function InventoryDashboard() {
    const [stats, setStats] = useState({
        totalProducts: 0,
        lowStock: 0,
        totalValue: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            const [products, allStock] = await Promise.all([
                getProducts(),
                import("@/lib/inventory-service").then(mod => mod.getAllStock())
            ]);

            const totalProducts = products.length;

            // Map stock by productId
            const stockMap = new Map<string, number>();
            allStock.forEach(s => {
                const current = stockMap.get(s.productId) || 0;
                stockMap.set(s.productId, current + s.quantity);
            });

            // Calculate low stock and value
            const lowStockCount = products.filter(p => {
                const totalStock = stockMap.get(p.id) || 0;
                // Consider low stock if defined minStock and current <= minStock
                return p.minStock !== undefined && totalStock <= p.minStock;
            }).length;

            const totalVal = products.reduce((acc, p) => {
                const totalStock = stockMap.get(p.id) || 0;
                return acc + (totalStock * (p.averageCost || 0));
            }, 0);

            setStats({
                totalProducts,
                lowStock: lowStockCount,
                totalValue: totalVal
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Inventario</h1>
                    <p className="text-gray-500">Gestión de existencias y movimientos</p>
                </div>
                <div className="flex gap-2">
                    <Link href="/inventory/movements/new">
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" />
                            Registrar Movimiento
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Productos</CardTitle>
                        <Package className="h-4 w-4 text-gray-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalProducts}</div>
                        <p className="text-xs text-gray-500">Items registrados activos</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Alertas de Stock</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.lowStock}</div>
                        <p className="text-xs text-gray-500">Productos bajo mínimo</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Valor Estimado</CardTitle>
                        <div className="font-mono text-green-600 font-bold">$</div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">RD$ {stats.totalValue.toLocaleString()}</div>
                        <p className="text-xs text-gray-500">En base a costo promedio</p>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions / Recent */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="h-full">
                    <CardHeader>
                        <CardTitle>Acciones Rápidas</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        <Link href="/inventory/products/new">
                            <Button variant="outline" className="w-full justify-start h-12">
                                <Plus className="mr-2 h-4 w-4" /> Nuevo Producto
                            </Button>
                        </Link>
                        <Link href="/inventory/movements/new?type=ENTRADA">
                            <Button variant="outline" className="w-full justify-start h-12 hover:bg-green-50 hover:text-green-700 hover:border-green-200">
                                <ArrowDownLeft className="mr-2 h-4 w-4" /> Registrar Entrada (Compra)
                            </Button>
                        </Link>
                        <Link href="/inventory/movements/new?type=SALIDA">
                            <Button variant="outline" className="w-full justify-start h-12 hover:bg-red-50 hover:text-red-700 hover:border-red-200">
                                <ArrowUpRight className="mr-2 h-4 w-4" /> Registrar Salida (Consumo)
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
