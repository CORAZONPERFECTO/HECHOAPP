"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Package, AlertTriangle, ArrowUpRight, ArrowDownLeft, Plus, Loader2, Search, Database, Droplet, Layers, HelpCircle, Truck, Warehouse } from "lucide-react";
import Link from "next/link";
import { getProducts, getLocations, getActiveAlerts, createProduct } from "@/lib/inventory-service";
import { InventoryProduct, InventoryLocation, InventoryAlert } from "@/types/inventory";
import { useToast } from "@/components/ui/use-toast";
import { auth } from "@/lib/firebase";

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
    const [seeding, setSeeding] = useState(false);
    
    // States for complete inventory list
    const [products, setProducts] = useState<InventoryProduct[]>([]);
    const [locations, setLocations] = useState<InventoryLocation[]>([]);
    const [stockMap, setStockMap] = useState<Map<string, number>>(new Map());
    const [productStockDetails, setProductStockDetails] = useState<Map<string, { [locName: string]: number }>>(new Map());
    
    // Search and filters
    const [searchTerm, setSearchTerm] = useState("");
    const [activeTab, setActiveTab] = useState<"todos" | "gases" | "tuberias" | "otros">("todos");
    const { toast } = useToast();

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            setLoading(true);
            const [productsData, locationsData, alerts, allStock] = await Promise.all([
                getProducts(true), // get active products
                getLocations(),
                getActiveAlerts(),
                import("@/lib/inventory-service").then(mod => mod.getAllStock())
            ]);

            const totalProducts = productsData.length;

            // Map stock by productId
            const map = new Map<string, number>();
            const detailsMap = new Map<string, { [locName: string]: number }>();

            allStock.forEach(s => {
                const current = map.get(s.productId) || 0;
                map.set(s.productId, current + s.quantity);

                // Detail per location
                const loc = locationsData.find(l => l.id === s.locationId);
                const locName = loc ? loc.name : `Ubicación ${s.locationId}`;
                if (s.quantity > 0) {
                    if (!detailsMap.has(s.productId)) {
                        detailsMap.set(s.productId, {});
                    }
                    detailsMap.get(s.productId)![locName] = s.quantity;
                }
            });

            // Calculate low stock and value
            const lowStockCount = productsData.filter(p => {
                const totalStock = map.get(p.id) || 0;
                return p.minStock !== undefined && totalStock <= p.minStock;
            }).length;

            const totalVal = productsData.reduce((acc, p) => {
                const totalStock = map.get(p.id) || 0;
                return acc + (totalStock * (p.averageCost || 0));
            }, 0);

            // Map alerts with names
            const mappedAlerts = alerts.map(alert => {
                const prod = productsData.find(p => p.id === alert.productId);
                const loc = locationsData.find(l => l.id === alert.locationId);
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

            setProducts(productsData);
            setLocations(locationsData);
            setStockMap(map);
            setProductStockDetails(detailsMap);
        } catch (error) {
            console.error("Error loading inventory stats:", error);
            toast({
                title: "Error de carga",
                description: "No se pudieron obtener los datos de inventario.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSeedInventory = async () => {
        setSeeding(true);
        try {
            const defaultProducts = [
                { sku: "GAS-R410A", name: "Gas Refrigerante R-410A", category: "Materiales", unit: "LIBRA" as const, minStock: 10, averageCost: 450, isActive: true },
                { sku: "GAS-R22", name: "Gas Refrigerante R-22", category: "Materiales", unit: "LIBRA" as const, minStock: 5, averageCost: 650, isActive: true },
                { sku: "GAS-R134A", name: "Gas Refrigerante R-134A", category: "Materiales", unit: "LIBRA" as const, minStock: 5, averageCost: 400, isActive: true },
                { sku: "TUB-COBRE-1/4", name: "Tubería de cobre 1/4\" (por pie)", category: "Materiales", unit: "PIE" as const, minStock: 50, averageCost: 45, isActive: true },
                { sku: "TUB-COBRE-3/8", name: "Tubería de cobre 3/8\" (por pie)", category: "Materiales", unit: "PIE" as const, minStock: 50, averageCost: 60, isActive: true },
                { sku: "TUB-COBRE-1/2", name: "Tubería de cobre 1/2\" (por pie)", category: "Materiales", unit: "PIE" as const, minStock: 50, averageCost: 85, isActive: true },
                { sku: "TUB-COBRE-5/8", name: "Tubería de cobre 5/8\" (por pie)", category: "Materiales", unit: "PIE" as const, minStock: 30, averageCost: 110, isActive: true },
                { sku: "TUB-COBRE-3/4", name: "Tubería de cobre 3/4\" (por pie)", category: "Materiales", unit: "PIE" as const, minStock: 20, averageCost: 150, isActive: true },
                { sku: "FIL-DES-1/4", name: "Filtro deshidratador 1/4\" para soldar", category: "Materiales", unit: "UNIDAD" as const, minStock: 10, averageCost: 180, isActive: true },
                { sku: "CIN-AIS-NEGRA", name: "Cinta aislante negra (Tape)", category: "Consumibles", unit: "UNIDAD" as const, minStock: 15, averageCost: 50, isActive: true },
                { sku: "SOL-PLATA-15", name: "Varilla de soldadura de plata 15%", category: "Materiales", unit: "UNIDAD" as const, minStock: 20, averageCost: 120, isActive: true },
                { sku: "AIS-ARMA-1/2", name: "Aislante térmico (Armaflex) 1/2\" x 6 pies", category: "Materiales", unit: "UNIDAD" as const, minStock: 20, averageCost: 95, isActive: true }
            ];

            // 1. Create all products in Firestore
            const createdProducts = [];
            for (const p of defaultProducts) {
                const prodId = await createProduct(p);
                createdProducts.push({ ...p, id: prodId });
            }

            // 2. Add some initial stock if we have locations
            const almacenes = locations.filter(l => l.type === 'ALMACEN');
            const camionetas = locations.filter(l => l.type === 'VEHICULO');
            const targetWarehouse = almacenes[0];
            const targetTruck = camionetas[0];

            if (targetWarehouse || targetTruck) {
                const { registerMovement } = await import("@/lib/inventory-service");
                const userId = auth.currentUser?.uid || "system";

                for (const p of createdProducts) {
                    // Stock in warehouse
                    if (targetWarehouse) {
                        let qty = 0;
                        if (p.sku.startsWith("GAS")) qty = 50;
                        else if (p.sku.startsWith("TUB")) qty = 100;
                        else qty = 30;

                        await registerMovement({
                            productId: p.id,
                            type: 'ENTRADA',
                            quantity: qty,
                            destinationLocationId: targetWarehouse.id,
                            reason: "Carga Inicial de Inventario",
                            unitCost: p.averageCost,
                            createdByUserId: userId,
                            createdByType: 'ADMIN'
                        });
                    }

                    // Stock in truck
                    if (targetTruck) {
                        let qty = 0;
                        if (p.sku.startsWith("GAS")) qty = 15;
                        else if (p.sku.startsWith("TUB")) qty = 30;
                        else qty = 10;

                        await registerMovement({
                            productId: p.id,
                            type: 'ENTRADA',
                            quantity: qty,
                            destinationLocationId: targetTruck.id,
                            reason: "Carga Inicial de Vehículo",
                            unitCost: p.averageCost,
                            createdByUserId: userId,
                            createdByType: 'ADMIN'
                        });
                    }
                }
            }

            toast({
                title: "Catálogo inicializado con éxito",
                description: `Se crearon ${createdProducts.length} productos y se cargó stock de prueba.`,
            });
            await loadStats();
        } catch (e: any) {
            console.error(e);
            toast({
                title: "Error al inicializar",
                description: e.message || "Ocurrió un error al seedear el inventario.",
                variant: "destructive"
            });
        } finally {
            setSeeding(false);
        }
    };

    // Filter products list based on search and active tab
    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              p.sku.toLowerCase().includes(searchTerm.toLowerCase());
        
        if (!matchesSearch) return false;

        const nameLower = p.name.toLowerCase();
        const skuLower = p.sku.toLowerCase();
        
        const isGas = nameLower.includes("gas") || nameLower.includes("refrigerante") || p.unit === "LIBRA";
        const isTuberia = nameLower.includes("tuberia") || nameLower.includes("tubería") || nameLower.includes("tubo") || nameLower.includes("cobre") || skuLower.includes("tub");

        if (activeTab === "gases") return isGas;
        if (activeTab === "tuberias") return isTuberia;
        if (activeTab === "otros") return !isGas && !isTuberia;
        return true;
    });

    return (
        <div className="p-8 space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Inventario</h1>
                    <p className="text-gray-500">Gestión de existencias y movimientos</p>
                </div>
                <div className="flex gap-2">
                    <Link href="/inventory/products">
                        <Button variant="outline" className="shadow-sm">
                            Ver Catálogo
                        </Button>
                    </Link>
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
                <Card className="transition-all duration-200 hover:shadow-md border-l-4 border-l-blue-500">
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
                <Card className="transition-all duration-200 hover:shadow-md border-l-4 border-l-yellow-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Alertas de Stock</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                        ) : (
                            <>
                                <div className="text-2xl font-bold text-yellow-600">{stats.lowStock}</div>
                                <p className="text-xs text-gray-500">Productos bajo mínimo</p>
                            </>
                        )}
                    </CardContent>
                </Card>
                <Card className="transition-all duration-200 hover:shadow-md border-l-4 border-l-green-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Valor Estimado</CardTitle>
                        <div className="font-mono text-green-600 font-bold">$</div>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                        ) : (
                            <>
                                <div className="text-2xl font-bold text-green-600">RD$ {stats.totalValue.toLocaleString()}</div>
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
                                <Plus className="mr-2 h-4 w-4 text-blue-600" /> Nuevo Producto
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
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                            Alertas de Stock en Camionetas y Almacenes
                        </CardTitle>
                        <CardDescription>Existencias críticas por debajo del stock mínimo</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-2">
                                <Loader2 className="h-8 w-8 animate-spin text-blue-650" />
                                <span className="text-sm">Cargando alertas de inventario...</span>
                            </div>
                        ) : activeAlerts.length === 0 ? (
                            <div className="text-center py-12 text-gray-500 border border-dashed rounded-xl bg-slate-50/50">
                                <Package className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                                <h4 className="font-semibold text-slate-700">Todo en Orden</h4>
                                <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">No hay alertas de stock activas en este momento.</p>
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-[180px] overflow-y-auto pr-1">
                                {activeAlerts.map(alert => {
                                    const isOutOfStock = alert.type === 'OUT_OF_STOCK' || alert.currentQty === 0;
                                    return (
                                        <div 
                                            key={alert.id} 
                                            className={`flex items-center justify-between p-3.5 border rounded-xl transition-all duration-200 ${
                                                isOutOfStock 
                                                    ? 'bg-rose-50/70 border-rose-100 hover:bg-rose-50' 
                                                    : 'bg-amber-50/40 border-amber-100 hover:bg-amber-50'
                                            }`}
                                        >
                                            <div className="space-y-1">
                                                <div className="font-semibold text-sm text-slate-800">{alert.productName}</div>
                                                <div className="text-xs text-slate-500">
                                                    Ubicación: <span className="font-semibold text-slate-700">{alert.locationName}</span>
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

            {/* Existencias de Materiales */}
            <Card className="transition-all duration-200 hover:shadow-md">
                <CardHeader className="flex flex-col lg:flex-row lg:items-center justify-between pb-4 gap-4 border-b border-slate-100">
                    <div>
                        <CardTitle className="text-xl font-bold flex items-center gap-2">
                           <Layers className="h-5 w-5 text-blue-600" />
                           Existencias de Insumos y Materiales
                        </CardTitle>
                        <CardDescription>Visualiza el inventario consolidado y distribución por vehículo o almacén.</CardDescription>
                    </div>
                    {products.length === 0 && !loading && (
                        <Button 
                            onClick={handleSeedInventory} 
                            disabled={seeding}
                            variant="outline" 
                            className="text-blue-650 border-blue-200 hover:bg-blue-50/80 shadow-sm hover:scale-[1.01] transition-all duration-150"
                        >
                            {seeding ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Inicializando...
                                </>
                            ) : (
                                <>
                                    <Database className="mr-2 h-4 w-4 text-blue-600" />
                                    Inicializar Catálogo de Prueba
                                </>
                            )}
                        </Button>
                    )}
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                    {/* Filtros y Buscador */}
                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                        {/* Buscador */}
                        <div className="relative w-full md:max-w-xs">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Buscar material o SKU..."
                                className="pl-9"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {/* Tabs / Segmented Controls */}
                        <div className="flex flex-wrap gap-1.5 bg-slate-100/80 p-1 rounded-xl border border-slate-200/50">
                            <button
                                onClick={() => setActiveTab("todos")}
                                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                                    activeTab === "todos" 
                                        ? "bg-white text-slate-900 shadow-sm" 
                                        : "text-slate-500 hover:text-slate-800"
                                }`}
                            >
                                Todos
                            </button>
                            <button
                                onClick={() => setActiveTab("gases")}
                                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                                    activeTab === "gases" 
                                        ? "bg-blue-650 text-white shadow-sm" 
                                        : "text-slate-500 hover:text-slate-800"
                                }`}
                            >
                                <Droplet className="h-3 w-3" /> Gases (Lbs)
                            </button>
                            <button
                                onClick={() => setActiveTab("tuberias")}
                                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                                    activeTab === "tuberias" 
                                        ? "bg-amber-600 text-white shadow-sm" 
                                        : "text-slate-500 hover:text-slate-800"
                                }`}
                            >
                                <Layers className="h-3 w-3" /> Tuberías (Diámetro)
                            </button>
                            <button
                                onClick={() => setActiveTab("otros")}
                                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                                    activeTab === "otros" 
                                        ? "bg-white text-slate-900 shadow-sm" 
                                        : "text-slate-500 hover:text-slate-800"
                                }`}
                            >
                                Otros Insumos
                            </button>
                        </div>
                    </div>

                    {/* Tabla de existencias */}
                    <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm bg-white">
                        {loading ? (
                            <div className="p-16 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
                                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                                <span className="text-sm font-medium">Cargando existencias consolidadas...</span>
                            </div>
                        ) : filteredProducts.length === 0 ? (
                            <div className="p-16 text-center text-slate-500 bg-slate-50/50 border-t">
                                <Package className="h-10 w-10 text-slate-350 mx-auto mb-2" />
                                <h4 className="font-semibold text-slate-700">No se encontraron materiales</h4>
                                <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                                    {searchTerm 
                                        ? "Ningún producto del catálogo coincide con tu criterio de búsqueda." 
                                        : "El catálogo de esta categoría no tiene productos registrados."
                                    }
                                </p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader className="bg-slate-50">
                                    <TableRow>
                                        <TableHead className="font-semibold text-slate-700">Material / SKU</TableHead>
                                        <TableHead className="font-semibold text-slate-700">Categoría</TableHead>
                                        <TableHead className="font-semibold text-slate-700 text-right">Existencia Total</TableHead>
                                        <TableHead className="font-semibold text-slate-700">Distribución por Ubicación</TableHead>
                                        <TableHead className="font-semibold text-slate-700 text-right">Costo Promedio</TableHead>
                                        <TableHead className="font-semibold text-slate-700 text-right">Valor Estimado</TableHead>
                                        <TableHead className="font-semibold text-slate-700 text-center">Estado</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredProducts.map((p) => {
                                        const totalQty = stockMap.get(p.id) || 0;
                                        const details = productStockDetails.get(p.id) || {};
                                        
                                        // Stock status calculation
                                        let statusLabel = "OK";
                                        let statusVariant: 'default' | 'secondary' | 'destructive' = 'default';
                                        
                                        if (totalQty === 0) {
                                            statusLabel = "Agotado";
                                            statusVariant = "destructive";
                                        } else if (p.minStock !== undefined && totalQty <= p.minStock) {
                                            statusLabel = "Bajo Stock";
                                            statusVariant = "secondary"; // Will render as yellow/amber styled below
                                        }

                                        const valueEstim = totalQty * (p.averageCost || 0);

                                        return (
                                            <TableRow key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                                <TableCell>
                                                    <div className="space-y-0.5">
                                                        <div className="font-semibold text-slate-900">{p.name}</div>
                                                        <div className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded w-max">
                                                            {p.sku}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="inline-block text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200/50">
                                                        {p.category}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right font-mono font-bold text-slate-800">
                                                    {totalQty.toLocaleString()} <span className="text-[10px] font-medium text-slate-400">{p.unit}</span>
                                                </TableCell>
                                                <TableCell className="max-w-xs">
                                                    {Object.keys(details).length === 0 ? (
                                                        <span className="text-xs text-slate-400 italic">Sin existencias asignadas</span>
                                                    ) : (
                                                        <div className="flex flex-wrap gap-1.5 max-h-[60px] overflow-y-auto">
                                                            {Object.entries(details).map(([locName, qty]) => {
                                                                const isVehicle = locName.toLowerCase().includes("camioneta") || locName.toLowerCase().includes("vehículo") || locName.toLowerCase().includes("flotilla");
                                                                return (
                                                                    <span 
                                                                        key={locName} 
                                                                        className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border ${
                                                                            isVehicle 
                                                                                ? "bg-emerald-50 text-emerald-800 border-emerald-100" 
                                                                                : "bg-blue-50 text-blue-800 border-blue-100"
                                                                        }`}
                                                                    >
                                                                        {isVehicle ? (
                                                                            <Truck className="h-2.5 w-2.5 shrink-0 text-emerald-600" />
                                                                        ) : (
                                                                            <Warehouse className="h-2.5 w-2.5 shrink-0 text-blue-600" />
                                                                        )}
                                                                        {locName}: <span className="font-bold">{qty}</span>
                                                                    </span>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-xs text-slate-500">
                                                    RD$ {(p.averageCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-xs font-semibold text-slate-700">
                                                    RD$ {valueEstim.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                                        statusLabel === "Agotado"
                                                            ? "bg-rose-100 text-rose-800 border-rose-200"
                                                            : statusLabel === "Bajo Stock"
                                                            ? "bg-amber-100 text-amber-800 border-amber-200"
                                                            : "bg-emerald-100 text-emerald-800 border-emerald-200"
                                                    }`}>
                                                        {statusLabel}
                                                    </span>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
