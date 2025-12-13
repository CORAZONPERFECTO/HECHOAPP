
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
            
            // Auto-select first location if available
            if (lData.length > 0) setSelectedLocation(lData[0].id);

            // Load Existing Consumption (Movements linked to this ticket)
            // Note: In a real app we might want a compound index or just fetch all movements and filter (not scalable)
            // Or better, fetch movements where ticketId == ticketId
            // The service `getMovements` doesn't support ticketId filter yet, let's query directly here or update service
            const q = query(
                collection(db, "inventory_movements"), 
                where("ticketId", "==", ticketId),
                where("type", "==", "SALIDA")
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
            const product = products.find(p => p.id === selectedProduct);
            
            await registerMovement({
                type: 'SALIDA',
                productId: selectedProduct,
                quantity: quantity,
                originLocationId: selectedLocation,
                reason: `Consumo Ticket #${ticketNumber || ticketId}`,
                ticketId: ticketId,
                createdByUserId: 'CURRENT_USER', // Replace with real ID context
                createdByType: currentUserRole === 'TECNICO' ? 'TECHNICIAN' : 'ADMIN'
            });

            // Refresh list
            loadData();
            
            // Reset
            setQuantity(1);
            setSelectedProduct("");
            
        } catch (error: any) {
            console.error(error);
            alert("Error al registrar consumo: " + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    // Calculate total cost
    const totalCost = movements.reduce((acc, mov) => {
        const prod = products.find(p => p.id === mov.productId);
        return acc + (mov.quantity * (prod?.averageCost || 0));
    }, 0);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <PackageCheck className="text-blue-600" />
                        Materiales Utilizados
                    </CardTitle>
                    <CardDescription>
                        Registra todo lo que sacaste del inventario para este trabajo.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Form */}
                    <div className="p-4 bg-slate-50 border rounded-lg space-y-4">
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
                                <Label>Almacén / Vehículo</Label>
                                <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar origen..." />
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
                                className="flex-1" 
                                onClick={handleAddMaterial}
                                disabled={submitting || !selectedProduct || !selectedLocation}
                            >
                                {submitting ? <Loader2 className="animate-spin mr-2" /> : <Plus className="mr-2 h-4 w-4" />}
                                Agregar al Ticket
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
                                const loc = locations.find(l => l.id === mov.originLocationId);
                                return (
                                    <div key={mov.id} className="flex items-center justify-between p-3 bg-white border rounded shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 bg-blue-100 rounded flex items-center justify-center text-blue-700 font-bold text-xs">
                                                {mov.quantity}
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-900">{prod?.name || 'Producto desconocido'}</div>
                                                <div className="text-xs text-gray-500">
                                                    Desde: {loc?.name || 'Origen desconocido'}
                                                </div>
                                            </div>
                                        </div>
                                        {/* Cost display only for admin? For now showing to all or hidden */}
                                        {currentUserRole === 'ADMIN' && (
                                            <div className="text-xs text-gray-500">
                                                Est: ${(prod?.averageCost || 0) * mov.quantity}
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
