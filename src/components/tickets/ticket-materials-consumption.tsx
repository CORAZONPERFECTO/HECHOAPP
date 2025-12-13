
"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, PackageCheck, AlertTriangle } from "lucide-react";
import { getProducts, getLocations, registerMovement } from "@/lib/inventory-service";
import { InventoryProduct, InventoryLocation, InventoryMovement } from "@/types/inventory";

interface TicketMaterialsConsumptionProps {
    ticketId: string;
    ticketNumber?: string;
    currentUserRole?: string;
}

export function TicketMaterialsConsumption({ ticketId, ticketNumber, currentUserRole }: TicketMaterialsConsumptionProps) {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Data
    const [products, setProducts] = useState<InventoryProduct[]>([]);
    const [locations, setLocations] = useState<InventoryLocation[]>([]);
    const [movements, setMovements] = useState<InventoryMovement[]>([]);

    // Form
    const [selectedProduct, setSelectedProduct] = useState("");
    const [selectedLocation, setSelectedLocation] = useState("");
    const [quantity, setQuantity] = useState(1);

    // Auth context (in real app passed via props or context)
    // We assume we have the current user ID. If not passed in props, we might need to fetch it or use a hook.
    // For now, let's assume we can find the location by querying with checking the user context if available, 
    // or we query ALL locations and find the one where responsibleUserId matches.
    // But we don't have the current user ID in props? `currentUserRole` is passed. 
    // I should probably fetch the current user ID inside the component or pass it.
    // Let's assume we can access `auth.currentUser` here since this is a client component.

    useEffect(() => {
        loadData();
    }, [ticketId]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Load Catalog
            const [pData, lData] = await Promise.all([getProducts(), getLocations()]);
            setProducts(pData);
            setLocations(lData);

            // AUTO-SELECT LOGIC: Find location assigned to current user
            // We need current user ID. 
            // Importing auth directly here as it's client component
            const { auth } = await import("@/lib/firebase");
            const userId = auth.currentUser?.uid;

            let defaultLoc = "";
            if (userId && lData.length > 0) {
                const assigned = lData.find(l => l.responsibleUserId === userId);
                if (assigned) {
                    defaultLoc = assigned.id;
                } else if (lData.length > 0) {
                    // Fallback to first location (usually Warehouse)? Or maybe none to force selection?
                    // User request says "Si tiene asignada, automática". 
                    // Let's fallback to first one if not assigned, strictly.
                    defaultLoc = lData[0].id;
                }
            } else if (lData.length > 0) {
                defaultLoc = lData[0].id;
            }
            setSelectedLocation(defaultLoc);

            // Load Existing Consumption (Movements linked to this ticket)
            // Note: In a real app we might want a compound index or just fetch all movements and filter (not scalable)
            // Or better, fetch movements where ticketId == ticketId
            // The service `getMovements` doesn't support ticketId filter yet, let's query directly here or update service
            const q = query(
                collection(db, "inventory_movements"),
                where("ticketId", "==", ticketId)
            );
            const snap = await getDocs(q);
            const movs = snap.docs.map(d => ({ id: d.id, ...d.data() } as InventoryMovement));
            setMovements(movs);

        } catch (error) {
            console.error("Error loading consumption:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddMaterial = async () => {
        if (!selectedProduct || !selectedLocation || quantity <= 0) return;
        setSubmitting(true);
        try {
            // Logic changes based on mode
            const type = mode === 'CONSUME' ? 'SALIDA' : 'ENTRADA';
            const reason = mode === 'CONSUME'
                ? `Consumo Ticket #${ticketNumber || ticketId}`
                : `Devolución Ticket #${ticketNumber || ticketId}`;

            await registerMovement({
                type: type,
                productId: selectedProduct,
                quantity: quantity,
                // If CONSUME: Origin = Selected (Van), Dest = Null
                // If RETURN: Origin = Null?, Dest = Selected (Warehouse?)
                originLocationId: mode === 'CONSUME' ? selectedLocation : undefined,
                destinationLocationId: mode === 'RETURN' ? selectedLocation : undefined,
                reason: reason,
                ticketId: ticketId,
                createdByUserId: 'CURRENT_USER', // Replace with real ID context
                createdByType: currentUserRole === 'TECNICO' ? 'TECHNICIAN' : 'ADMIN'
            });

            // Refresh list
            loadData();

            // Reset
            setQuantity(1);
            // Don't reset Product to allow fast entry? Maybe yes.
            setSelectedProduct("");

        } catch (error: any) {
            console.error(error);
            alert("Error al registrar: " + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    // Calculate total cost (Net Consumption)
    const totalCost = movements.reduce((acc, mov) => {
        const prod = products.find(p => p.id === mov.productId);
        const cost = (mov.quantity * (prod?.averageCost || 0));
        return mov.type === 'SALIDA' ? acc + cost : acc - cost;
    }, 0);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <PackageCheck className="text-blue-600" />
                                {mode === 'CONSUME' ? 'Registrar Consumo' : 'Devolver Material'}
                            </CardTitle>
                            <CardDescription>
                                {mode === 'CONSUME' ? 'Material utilizado en el trabajo' : 'Material sobrante devuelto al almacén'}
                            </CardDescription>
                        </div>
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            <button
                                onClick={() => {
                                    setMode('CONSUME');
                                    // Auto-select Assigned Van logic again if needed, or keep current
                                    // Re-apply default location logic for CONSUME mode
                                    const { auth } = require("@/lib/firebase"); // Use require for client-side dynamic import
                                    const userId = auth.currentUser?.uid;
                                    let defaultLoc = "";
                                    if (userId && locations.length > 0) {
                                        const assigned = locations.find(l => l.responsibleUserId === userId);
                                        if (assigned) {
                                            defaultLoc = assigned.id;
                                        } else if (locations.length > 0) {
                                            defaultLoc = locations[0].id;
                                        }
                                    } else if (locations.length > 0) {
                                        defaultLoc = locations[0].id;
                                    }
                                    setSelectedLocation(defaultLoc);
                                }}
                                className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${mode === 'CONSUME' ? 'bg-white shadow text-blue-700' : 'text-gray-500'}`}
                            >
                                Consumir
                            </button>
                            <button
                                onClick={() => {
                                    setMode('RETURN');
                                    // Auto-select Warehouse for return
                                    const warehouse = locations.find(l => l.type === 'ALMACEN');
                                    if (warehouse) setSelectedLocation(warehouse.id);
                                    else setSelectedLocation(""); // Clear if no warehouse found
                                }}
                                className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${mode === 'RETURN' ? 'bg-white shadow text-green-700' : 'text-gray-500'}`}
                            >
                                Devolver
                            </button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Form */}
                    <div className={`p-4 border rounded-lg space-y-4 ${mode === 'RETURN' ? 'bg-green-50 border-green-200' : 'bg-slate-50'}`}>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Producto</Label>
                                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Buscar material..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {products.map(p => (
                                            <SelectItem key={p.id} value={p.id}>{p.name} ({p.unit})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>{mode === 'CONSUME' ? 'Desde (Origen)' : 'Hacia (Destino)'}</Label>
                                <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {locations.map(l => (
                                            <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="flex items-end gap-4">
                            <div className="space-y-2 w-32">
                                <Label>Cantidad</Label>
                                <Input
                                    type="number"
                                    min="0.1"
                                    step="0.1"
                                    value={quantity}
                                    onChange={e => setQuantity(Number(e.target.value))}
                                />
                            </div>
                            <Button
                                className={`flex-1 ${mode === 'RETURN' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                                onClick={handleAddMaterial}
                                disabled={submitting || !selectedProduct || !selectedLocation}
                            >
                                {submitting ? <Loader2 className="animate-spin mr-2" /> : <Plus className="mr-2 h-4 w-4" />}
                                {mode === 'CONSUME' ? 'Agregar al Ticket' : 'Registrar Devolución'}
                            </Button>
                        </div>
                    </div>

                    {/* List */}
                    <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Historial de Consumo</h3>
                        {loading && <div className="text-center py-4 text-gray-500">Cargando...</div>}

                        {!loading && movements.length === 0 && (
                            <div className="text-center py-8 border-2 border-dashed rounded-lg text-gray-400">
                                No se han registrado materiales.
                            </div>
                        )}

                        <div className="space-y-2">
                            {movements.map(mov => {
                                const prod = products.find(p => p.id === mov.productId);
                                const loc = locations.find(l => l.id === (mov.type === 'SALIDA' ? mov.originLocationId : mov.destinationLocationId));
                                const isReturn = mov.type === 'ENTRADA';

                                return (
                                    <div key={mov.id} className={`flex items-center justify-between p-3 border rounded shadow-sm ${isReturn ? 'bg-green-50 border-green-200' : 'bg-white'}`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`h-8 w-8 rounded flex items-center justify-center font-bold text-xs ${isReturn ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                                {isReturn ? '+' : '-'}{mov.quantity}
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-900">{prod?.name || 'Producto desconocido'}</div>
                                                <div className="text-xs text-gray-500">
                                                    {isReturn ? 'Devuelto a:' : 'Desde:'} {loc?.name || 'Desconocido'}
                                                </div>
                                            </div>
                                        </div>
                                        {/* Cost display only for admin? For now showing to all or hidden */}
                                        {currentUserRole === 'ADMIN' && (
                                            <div className={`text-xs ${isReturn ? 'text-green-600' : 'text-gray-500'}`}>
                                                {isReturn ? '(Crédito)' : 'Est:'} ${(prod?.averageCost || 0) * mov.quantity}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {currentUserRole === 'ADMIN' && movements.length > 0 && (
                            <div className="pt-4 mt-4 border-t flex justify-between items-center text-sm">
                                <span>Costo Total Estimado:</span>
                                <span className="font-bold text-lg">RD$ {totalCost.toLocaleString()}</span>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
