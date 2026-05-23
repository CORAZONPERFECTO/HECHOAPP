
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, AlertTriangle, ArrowUpRight, ArrowDownLeft, Plus, Loader2 } from "lucide-react";
import Link from "next/link";
import { getProducts, getLocations, getActiveAlerts } from "@/lib/inventory-service";
import { InventoryProduct, InventoryLocation, InventoryAlert } from "@/types/inventory";

interface ExtendedAlert extends InventoryAlert {
    productName: string;
    productUnit: string;
    locationName: string;
}

export default function InventoryDashboard() {
    const [stats, setStats] = useState({
        totalProducts: 0,
        lowStock: 0,
        totalValue: 0
    });
    const [activeAlerts, setActiveAlerts] = useState<ExtendedAlert[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            setLoading(true);
            const [products, locations, alerts, allStock] = await Promise.all([
                getProducts(),
                getLocations(),
                getActiveAlerts(),
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
                return p.minStock !== undefined && totalStock <= p.minStock;
            }).length;

            const totalVal = products.reduce((acc, p) => {
                const totalStock = stockMap.get(p.id) || 0;
                return acc + (totalStock * (p.averageCost || 0));
            }, 0);

            // Map alerts with names
            const mappedAlerts = alerts.map(alert => {
                const prod = products.find(p => p.id === alert.productId);
                const loc = locations.find(l => l.id === alert.locationId);
                return {
                    ...alert,
                    productName: prod?.name || "Producto desconocido",
                    productUnit: prod?.unit || "UNIDAD",
                    locationName: loc?.name || "Ubicación desconocida"
                };
            });

            setActiveAlerts(mappedAlerts);

            setStats({
                totalProducts,
                lowStock: lowStockCount,
                totalValue: totalVal
            });
        } catch (error) {
            console.error("Error loading inventory stats:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Inventario</h1>
                    <p className="text-gray-500">Gestión de existencias y movimientos</p>
                </div>
                <div className="flex gap-2">
                    <Link href="/inventory/movements/new">
                        <Button className="gap-2 shadow-sm transition-all duration-200 hover:shadow">
                            <Plus className="h-4 w-4" />
                            Registrar Movimiento
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="transition-all duration-200 hover:shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Productos</CardTitle>
                        <Package className="h-4 w-4 text-gray-500" />
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                        ) : (
                            <>
                                <div className="text-2xl font-bold">{stats.totalProducts}</div>
                                <p className="text-xs text-gray-500">Items registrados activos</p>
                            </>
                        )}
                    </CardContent>
                </Card>
                <Card className="transition-all duration-200 hover:shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Alertas de Stock</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                        ) : (
                            <>
                                <div className="text-2xl font-bold">{stats.lowStock}</div>
                                <p className="text-xs text-gray-500">Productos bajo mínimo</p>
                            </>
                        )}
                    </CardContent>
                </Card>
                <Card className="transition-all duration-200 hover:shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Valor Estimado</CardTitle>
                        <div className="font-mono text-green-600 font-bold">$</div>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                        ) : (
                            <>
                                <div className="text-2xl font-bold">RD$ {stats.totalValue.toLocaleString()}</div>
                                <p className="text-xs text-gray-500">En base a costo promedio</p>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions & Active Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="h-full transition-all duration-200 hover:shadow-md">
                    <CardHeader>
                        <CardTitle>Acciones Rápidas</CardTitle>
                        <CardDescription>Accesos directos para la administración</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        <Link href="/inventory/products/new">
                            <Button variant="outline" className="w-full justify-start h-12 transition-all duration-200 hover:bg-slate-50">
                                <Plus className="mr-2 h-4 w-4" /> Nuevo Producto
                            </Button>
                        </Link>
                        <Link href="/inventory/movements/new?type=ENTRADA">
                            <Button variant="outline" className="w-full justify-start h-12 hover:bg-green-50 hover:text-green-700 hover:border-green-200 transition-all duration-200">
                                <ArrowDownLeft className="mr-2 h-4 w-4 text-green-600" /> Registrar Entrada (Compra)
                            </Button>
                        </Link>
                        <Link href="/inventory/movements/new?type=SALIDA">
                            <Button variant="outline" className="w-full justify-start h-12 hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-all duration-200">
                                <ArrowUpRight className="mr-2 h-4 w-4 text-red-650" /> Registrar Salida (Consumo)
                            </Button>
                        </Link>
                    </CardContent>
                </Card>

                <Card className="h-full transition-all duration-200 hover:shadow-md flex flex-col">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-amber-500 animate-pulse" />
                            Alertas de Stock en Camionetas y Almacenes
                        </CardTitle>
                        <CardDescription>Existencias críticas por debajo del stock mínimo</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-2">
                                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                                <span className="text-sm">Cargando alertas de inventario...</span>
                            </div>
                        ) : activeAlerts.length === 0 ? (
                            <div className="text-center py-12 text-gray-500 border border-dashed rounded-xl bg-slate-50/50">
                                <Package className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                                <h4 className="font-semibold text-slate-700">Todo en Orden</h4>
                                <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">No hay alertas de stock activas en este momento.</p>
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                                {activeAlerts.map(alert => {
                                    const isOutOfStock = alert.type === 'OUT_OF_STOCK' || alert.currentQty === 0;
                                    return (
                                        <div 
                                            key={alert.id} 
                                            className={`flex items-center justify-between p-3.5 border rounded-xl transition-all duration-200 hover:scale-[1.01] ${
                                                isOutOfStock 
                                                    ? 'bg-rose-50/70 border-rose-100 hover:bg-rose-50 hover:border-rose-200' 
                                                    : 'bg-amber-55/40 border-amber-100 hover:bg-amber-50 hover:border-amber-200'
                                            }`}
                                        >
                                            <div className="space-y-1">
                                                <div className="font-semibold text-sm text-slate-800">{alert.productName}</div>
                                                <div className="text-xs text-slate-500 flex items-center gap-1">
                                                    Ubicación: <span className="font-semibold text-slate-750">{alert.locationName}</span>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mb-1.5 border ${
                                                    isOutOfStock 
                                                        ? 'bg-rose-100 text-rose-800 border-rose-200' 
                                                        : 'bg-amber-100 text-amber-900 border-amber-200'
                                                }`}>
                                                    {isOutOfStock ? 'Agotado' : 'Bajo Stock'}
                                                </span>
                                                <div className="text-xs text-slate-600 font-bold font-mono">
                                                    {alert.currentQty} <span className="text-[10px] font-normal text-slate-400">/ Min: {alert.threshold}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
