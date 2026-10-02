"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { getProducts, getLocations, registerMovement, getStockByLocation } from "@/lib/inventory-service";
import { InventoryProduct, InventoryLocation, InventoryMovement, InventoryStock } from "@/types/inventory";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
    Truck, 
    Flame, 
    Wrench, 
    Plus, 
    Minus, 
    Trash2, 
    CheckCircle2, 
    AlertCircle, 
    Loader2, 
    Sparkles, 
    PackageCheck,
    DollarSign
} from "lucide-react";

interface QuickVehicleConsumptionProps {
    ticketId: string;
    ticketNumber?: string;
    userId: string;
    userName: string;
    onConsumptionUpdated?: (movements: InventoryMovement[], totalCost: number) => void;
}

interface CommonQuickItem {
    label: string;
    searchKeyword: string;
    quantity: number;
    unit: string;
    icon: any;
    color: string;
}

const COMMON_QUICK_ITEMS: CommonQuickItem[] = [
    { label: "+1 lb R410A", searchKeyword: "R410A", quantity: 1, unit: "lb", icon: Flame, color: "border-pink-300 bg-pink-50 text-pink-700 hover:bg-pink-100" },
    { label: "+2 lbs R410A", searchKeyword: "R410A", quantity: 2, unit: "lbs", icon: Flame, color: "border-pink-400 bg-pink-100 text-pink-800 hover:bg-pink-200 font-bold" },
    { label: "+1 lb R22", searchKeyword: "R22", quantity: 1, unit: "lb", icon: Flame, color: "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" },
    { label: "+2 lbs R22", searchKeyword: "R22", quantity: 2, unit: "lbs", icon: Flame, color: "border-emerald-400 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 font-bold" },
    { label: "+1 Capacitor 45/5", searchKeyword: "Capacitor", quantity: 1, unit: "ud", icon: Wrench, color: "border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100" },
    { label: "+1 Contactor 30A", searchKeyword: "Contactor", quantity: 1, unit: "ud", icon: Wrench, color: "border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100" },
    { label: "+1 Cinta Térmica", searchKeyword: "Cinta", quantity: 1, unit: "rollo", icon: PackageCheck, color: "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100" }
];

export function QuickVehicleConsumption({
    ticketId,
    ticketNumber,
    userId,
    userName,
    onConsumptionUpdated
}: QuickVehicleConsumptionProps) {
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [vehicle, setVehicle] = useState<InventoryLocation | null>(null);
    const [locations, setLocations] = useState<InventoryLocation[]>([]);
    const [products, setProducts] = useState<InventoryProduct[]>([]);
    const [stock, setStock] = useState<InventoryStock[]>([]);
    const [movements, setMovements] = useState<InventoryMovement[]>([]);

    // Custom Item Form
    const [selectedProductId, setSelectedProductId] = useState<string>("");
    const [customQty, setCustomQty] = useState<number>(1);
    const [noPartsUsed, setNoPartsUsed] = useState(false);

    useEffect(() => {
        loadData();
    }, [ticketId, userId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [prods, locs] = await Promise.all([
                getProducts(),
                getLocations()
            ]);
            setProducts(prods);
            setLocations(locs);

            // Encontrar vehículo asignado al técnico
            let techVehicle = locs.find(l => l.type === 'VEHICULO' && l.responsibleUserId === userId);
            if (!techVehicle) {
                // Fallback: Cualquier ubicación tipo VEHICULO
                techVehicle = locs.find(l => l.type === 'VEHICULO');
            }
            if (!techVehicle && locs.length > 0) {
                techVehicle = locs[0];
            }
            setVehicle(techVehicle || null);

            // Cargar existencias del vehículo
            let vehicleStock: InventoryStock[] = [];
            if (techVehicle) {
                vehicleStock = await getStockByLocation(techVehicle.id);
                setStock(vehicleStock);
            }

            // Cargar consumos registrados en este ticket
            const movQuery = query(
                collection(db, "inventory_movements"),
                where("ticketId", "==", ticketId)
            );
            const movSnap = await getDocs(movQuery);
            const movs = movSnap.docs.map(d => ({ id: d.id, ...d.data() } as InventoryMovement));
            setMovements(movs);

            // Calcular costo total
            const netCost = calculateNetCost(movs, prods);
            if (onConsumptionUpdated) {
                onConsumptionUpdated(movs, netCost);
            }
        } catch (error) {
            console.error("Error loading vehicle stock data:", error);
        } finally {
            setLoading(false);
        }
    };

    const calculateNetCost = (movs: InventoryMovement[], prods: InventoryProduct[]) => {
        return movs.reduce((acc, mov) => {
            const prod = prods.find(p => p.id === mov.productId);
            const cost = (mov.quantity * (prod?.averageCost || 0));
            return mov.type === 'SALIDA' ? acc + cost : acc - cost;
        }, 0);
    };

    const handleQuickAdd = async (item: CommonQuickItem) => {
        if (!vehicle) {
            alert("No hay un vehículo o almacén asignado para descontar inventario.");
            return;
        }

        // Buscar producto en el catálogo por palabra clave
        const normalizedKw = item.searchKeyword.toLowerCase();
        let targetProd = products.find(p => 
            p.name.toLowerCase().includes(normalizedKw) || 
            (p.sku && p.sku.toLowerCase().includes(normalizedKw))
        );

        if (!targetProd) {
            alert(`No se encontró el producto '${item.searchKeyword}' en el catálogo de inventario.`);
            return;
        }

        // Verificar disponibilidad en vehículo
        const stockItem = stock.find(s => s.productId === targetProd!.id);
        const availableQty = stockItem ? stockItem.quantity : 0;

        if (availableQty < item.quantity) {
            const confirmDeficit = confirm(
                `Aviso: En la camioneta solo figuran ${availableQty} ${item.unit} de ${targetProd.name}.\n` +
                `¿Deseas registrar el consumo de ${item.quantity} ${item.unit} de todos modos?`
            );
            if (!confirmDeficit) return;
        }

        setActionLoading(true);
        try {
            await registerMovement({
                type: 'SALIDA',
                productId: targetProd.id,
                quantity: item.quantity,
                originLocationId: vehicle.id,
                reason: `Consumo en Ticket #${ticketNumber || ticketId.slice(0, 8)}`,
                ticketId: ticketId,
                technicianId: userId,
                technicianName: userName,
                createdByUserId: userId,
                createdByType: 'TECHNICIAN'
            });

            await loadData();
        } catch (error: any) {
            console.error("Error registering quick consumption:", error);
            alert("Error al descontar del inventario: " + error.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleCustomAdd = async () => {
        if (!selectedProductId || !vehicle || customQty <= 0) return;

        const targetProd = products.find(p => p.id === selectedProductId);
        if (!targetProd) return;

        const stockItem = stock.find(s => s.productId === selectedProductId);
        const availableQty = stockItem ? stockItem.quantity : 0;

        if (availableQty < customQty) {
            const proceed = confirm(
                `Solo hay ${availableQty} ${targetProd.unit} de ${targetProd.name} en el vehículo. ¿Continuar con la salida de ${customQty}?`
            );
            if (!proceed) return;
        }

        setActionLoading(true);
        try {
            await registerMovement({
                type: 'SALIDA',
                productId: targetProd.id,
                quantity: customQty,
                originLocationId: vehicle.id,
                reason: `Consumo en Ticket #${ticketNumber || ticketId.slice(0, 8)}`,
                ticketId: ticketId,
                technicianId: userId,
                technicianName: userName,
                createdByUserId: userId,
                createdByType: 'TECHNICIAN'
            });

            setSelectedProductId("");
            setCustomQty(1);
            await loadData();
        } catch (error: any) {
            console.error("Error registering custom material:", error);
            alert("Error al registrar material: " + error.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleReturnItem = async (mov: InventoryMovement) => {
        if (!vehicle) return;
        const confirmReturn = confirm(`¿Deseas devolver ${mov.quantity} unidades de este material a la camioneta?`);
        if (!confirmReturn) return;

        setActionLoading(true);
        try {
            await registerMovement({
                type: 'ENTRADA',
                productId: mov.productId,
                quantity: mov.quantity,
                destinationLocationId: vehicle.id,
                reason: `Devolución / Corrección de Ticket #${ticketNumber || ticketId.slice(0, 8)}`,
                ticketId: ticketId,
                technicianId: userId,
                technicianName: userName,
                createdByUserId: userId,
                createdByType: 'TECHNICIAN'
            });

            await loadData();
        } catch (error: any) {
            console.error("Error returning item:", error);
            alert("Error al devolver material: " + error.message);
        } finally {
            setActionLoading(false);
        }
    };

    const totalNetCost = calculateNetCost(movements, products);

    if (loading) {
        return (
            <div className="p-4 border rounded-xl bg-slate-50 flex items-center justify-center gap-2 text-slate-500 text-xs">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span>Verificando inventario del vehículo...</span>
            </div>
        );
    }

    return (
        <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
            <CardHeader className="bg-slate-50/80 border-b pb-3 pt-3">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
                            <Truck className="w-4 h-4" />
                        </div>
                        <div>
                            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                Control de Stock y Consumo de Camioneta
                                {vehicle && (
                                    <Badge variant="outline" className="text-[10px] bg-white border-blue-200 text-blue-700 font-mono">
                                        {vehicle.name}
                                    </Badge>
                                )}
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Registra el gas refrigerante y repuestos usados para descontarlos del inventario móvil.
                            </CardDescription>
                        </div>
                    </div>

                    {movements.length > 0 && (
                        <div className="flex items-center gap-2 self-start sm:self-auto bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-md border border-emerald-200 text-xs font-semibold">
                            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Costo Materiales: RD$ {totalNetCost.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                        </div>
                    )}
                </div>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
                {/* 1. Chips de Acceso Rápido (1-Toque) */}
                <div>
                    <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 block flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        Consumo Rápido (1 Toque)
                    </Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {COMMON_QUICK_ITEMS.map((item, idx) => {
                            const Icon = item.icon;
                            return (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => handleQuickAdd(item)}
                                    disabled={actionLoading}
                                    className={`flex items-center justify-between p-2 rounded-lg border text-xs font-medium transition-all shadow-2xs hover:scale-[1.02] active:scale-[0.98] ${item.color}`}
                                >
                                    <span className="flex items-center gap-1.5">
                                        <Icon className="w-3.5 h-3.5" />
                                        {item.label}
                                    </span>
                                    <Plus className="w-3 h-3 opacity-60" />
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* 2. Selector manual de catálogo para otros productos */}
                <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-end gap-2">
                    <div className="w-full sm:flex-1 space-y-1">
                        <Label className="text-[11px] text-slate-600 font-semibold">Otro repuesto o insumo del catálogo:</Label>
                        <select
                            value={selectedProductId}
                            onChange={(e) => setSelectedProductId(e.target.value)}
                            className="w-full h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-800 shadow-2xs focus:ring-1 focus:ring-blue-500"
                        >
                            <option value="">-- Seleccionar producto del vehículo --</option>
                            {products.map(p => {
                                const stockItem = stock.find(s => s.productId === p.id);
                                const qty = stockItem ? stockItem.quantity : 0;
                                return (
                                    <option key={p.id} value={p.id}>
                                        {p.name} {p.sku ? `(${p.sku})` : ''} - Disp: {qty} {p.unit}
                                    </option>
                                );
                            })}
                        </select>
                    </div>

                    <div className="w-24 space-y-1">
                        <Label className="text-[11px] text-slate-600 font-semibold">Cantidad:</Label>
                        <Input
                            type="number"
                            min="0.25"
                            step="0.25"
                            value={customQty}
                            onChange={(e) => setCustomQty(parseFloat(e.target.value) || 1)}
                            className="h-9 text-xs"
                        />
                    </div>

                    <Button
                        type="button"
                        onClick={handleCustomAdd}
                        disabled={!selectedProductId || actionLoading}
                        className="h-9 text-xs bg-slate-900 hover:bg-black text-white shrink-0"
                    >
                        {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
                        Agregar
                    </Button>
                </div>

                {/* 3. Listado de Insumos Registrados en este Ticket */}
                <div className="pt-2 border-t border-slate-100">
                    <div className="flex justify-between items-center mb-2">
                        <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <PackageCheck className="w-3.5 h-3.5 text-blue-600" />
                            Materiales Registrados en este Servicio ({movements.filter(m => m.type === 'SALIDA').length})
                        </Label>
                    </div>

                    {movements.length === 0 ? (
                        <div className="p-3 rounded-lg border border-dashed border-slate-200 text-center bg-slate-50/50">
                            <p className="text-xs text-slate-500">
                                No se han registrado materiales ni refrigerante en este ticket. Si fue servicio de solo mano de obra/limpieza, puedes continuar al cierre sin inconveniente.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                            {movements.map((mov) => {
                                const prod = products.find(p => p.id === mov.productId);
                                const isOut = mov.type === 'SALIDA';
                                const itemCost = (mov.quantity * (prod?.averageCost || 0));

                                return (
                                    <div
                                        key={mov.id}
                                        className={`flex items-center justify-between p-2 rounded-lg border text-xs ${
                                            isOut ? 'bg-white border-slate-200' : 'bg-green-50/60 border-green-200 text-green-900'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${isOut ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                                            <div>
                                                <p className="font-semibold text-slate-800">
                                                    {prod?.name || mov.productId}
                                                </p>
                                                <p className="text-[10px] text-slate-500 font-mono">
                                                    {isOut ? 'Descontado:' : 'Devuelto:'} {mov.quantity} {prod?.unit || 'ud'} 
                                                    {prod?.averageCost ? ` • RD$ ${itemCost.toLocaleString('es-DO', { minimumFractionDigits: 2 })}` : ''}
                                                </p>
                                            </div>
                                        </div>

                                        {isOut && (
                                            <button
                                                type="button"
                                                onClick={() => handleReturnItem(mov)}
                                                disabled={actionLoading}
                                                title="Devolver a la camioneta"
                                                className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-slate-100 transition-colors"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
