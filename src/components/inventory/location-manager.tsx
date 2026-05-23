
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Truck, Warehouse, MapPin, Trash2, User } from "lucide-react";
import { getLocations, createLocation, updateLocation, deleteLocation, ensureDefaultLocations, getProducts, getStockByLocation, registerMovement } from "@/lib/inventory-service";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { InventoryLocation, InventoryLocationType } from "@/types/inventory";
import { useToast } from "@/components/ui/use-toast";

interface UserProfile {
    id: string;
    displayName: string;
    email: string;
    role: string;
}

export function LocationManager() {
    const [locations, setLocations] = useState<InventoryLocation[]>([]);
    const [technicians, setTechnicians] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const { toast } = useToast();

    // Form
    const [newItem, setNewItem] = useState({
        name: "",
        type: "VEHICULO" as InventoryLocationType,
        responsibleUserId: ""
    });

    // Stock Dialog State
    const [isStockDialogOpen, setIsStockDialogOpen] = useState(false);
    const [selectedLocationForStock, setSelectedLocationForStock] = useState<InventoryLocation | null>(null);
    const [stockList, setStockList] = useState<{ productId: string; productName: string; quantity: number }[]>([]);
    const [allProductsList, setAllProductsList] = useState<any[]>([]);
    const [loadingStock, setLoadingStock] = useState(false);
    
    // Adjustment Form
    const [adjustProductId, setAdjustProductId] = useState("");
    const [adjustType, setAdjustType] = useState<'ENTRADA' | 'AJUSTE'>("ENTRADA");
    const [adjustQty, setAdjustQty] = useState<number>(0);
    const [adjustCost, setAdjustCost] = useState<number>(0);
    const [adjustReason, setAdjustReason] = useState("");
    const [submittingAdjustment, setSubmittingAdjustment] = useState(false);

    const loadLocationStock = async (locationId: string) => {
        setLoadingStock(true);
        try {
            const [stockSnap, prods] = await Promise.all([
                getStockByLocation(locationId),
                getProducts()
            ]);
            
            // Map stock to include product names
            const mappedStock = stockSnap.map(s => {
                const prod = prods.find(p => p.id === s.productId);
                return {
                    productId: s.productId,
                    productName: prod ? prod.name : "Producto Desconocido",
                    quantity: s.quantity
                };
            }).filter(s => s.quantity > 0); // only show positive stock
            
            setStockList(mappedStock);
            setAllProductsList(prods);
        } catch (error) {
            console.error("Error loading location stock:", error);
            toast({ title: "Error al cargar existencias", variant: "destructive" });
        } finally {
            setLoadingStock(false);
        }
    };

    const handleRegisterAdjustment = async () => {
        if (!selectedLocationForStock || !adjustProductId || adjustQty === 0) {
            toast({ title: "Datos incompletos", description: "Selecciona un producto y cantidad válida.", variant: "destructive" });
            return;
        }
        setSubmittingAdjustment(true);
        try {
            const movParams = {
                productId: adjustProductId,
                type: adjustType,
                quantity: adjustQty,
                destinationLocationId: adjustType === 'ENTRADA' ? selectedLocationForStock.id : undefined,
                originLocationId: adjustType === 'AJUSTE' ? selectedLocationForStock.id : undefined,
                reason: adjustReason || (adjustType === 'ENTRADA' ? "Carga Inicial" : "Ajuste de Stock"),
                unitCost: adjustCost || 0,
                createdByUserId: auth.currentUser?.uid || 'unknown',
                createdByType: 'ADMIN' as const
            };
            
            await registerMovement(movParams);
            
            toast({ title: "Movimiento registrado con éxito" });
            setAdjustProductId("");
            setAdjustQty(0);
            setAdjustCost(0);
            setAdjustReason("");
            loadLocationStock(selectedLocationForStock.id);
        } catch (error: any) {
            console.error("Error adjusting stock:", error);
            toast({ title: "Error al registrar movimiento", description: error.message, variant: "destructive" });
        } finally {
            setSubmittingAdjustment(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            await ensureDefaultLocations(); // Init defaults if missing

            const [locs, usersSnap] = await Promise.all([
                getLocations(),
                getDocs(query(collection(db, "users"), where("rol", "in", ["TECNICO", "CONTRATISTA"])))
            ]);

            setLocations(locs);
            setTechnicians(usersSnap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile)));

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!newItem.name) return;
        try {
            await createLocation({
                name: newItem.name,
                type: newItem.type,
                responsibleUserId: newItem.responsibleUserId || undefined,
                isActive: true
            });
            toast({ title: "Ubicación creada" });
            setIsDialogOpen(false);
            setNewItem({ name: "", type: "VEHICULO", responsibleUserId: "" });
            loadData();
        } catch (error) {
            console.error(error);
            toast({ title: "Error al crear", variant: "destructive" });
        }
    };

    const handleAssignUser = async (locationId: string, userId: string) => {
        try {
            await updateLocation(locationId, { responsibleUserId: userId });
            toast({ title: "Asignación actualizada" });
            loadData();
        } catch (error) {
            console.error(error);
            toast({ title: "Error al asignar", variant: "destructive" });
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'ALMACEN': return <Warehouse className="h-4 w-4 text-blue-600" />;
            case 'VEHICULO': return <Truck className="h-4 w-4 text-green-600" />;
            default: return <MapPin className="h-4 w-4 text-gray-600" />;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-semibold">Ubicaciones y Vehículos</h2>
                    <p className="text-sm text-gray-500">Administra almacenes y asigna camionetas a técnicos.</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> Nueva Ubicación
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Nueva Ubicación</DialogTitle>
                            <DialogDescription>Registra una camioneta, almacén u obra.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Nombre</Label>
                                <Input
                                    placeholder="Ej. Camioneta #5"
                                    value={newItem.name}
                                    onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Tipo</Label>
                                <Select
                                    value={newItem.type}
                                    onValueChange={(val) => setNewItem({ ...newItem, type: val as any })}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="VEHICULO">Vehículo</SelectItem>
                                        <SelectItem value="ALMACEN">Almacén</SelectItem>
                                        <SelectItem value="OBRA">Obra</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Responsable (Opcional)</Label>
                                <Select
                                    value={newItem.responsibleUserId}
                                    onValueChange={(val) => setNewItem({ ...newItem, responsibleUserId: val })}
                                >
                                    <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="_none">-- Sin asignar --</SelectItem>
                                        {technicians.map(t => (
                                            <SelectItem key={t.id} value={t.id}>{t.displayName || t.email}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button onClick={handleCreate} disabled={!newItem.name} className="w-full">Crear</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="border rounded-lg overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Responsable Asignado</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-600" />
                                </TableCell>
                            </TableRow>
                        ) : locations.map(loc => (
                            <TableRow key={loc.id}>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        {getTypeIcon(loc.type)}
                                        <span className="text-xs font-medium">{loc.type}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="font-medium">{loc.name}</TableCell>
                                <TableCell>
                                    {loc.type === 'VEHICULO' ? (
                                        <Select
                                            value={loc.responsibleUserId || "_none"}
                                            onValueChange={(val) => handleAssignUser(loc.id, val === "_none" ? "" : val)}
                                        >
                                            <SelectTrigger className="h-8 w-[200px]">
                                                <div className="flex items-center gap-2">
                                                    <User className="h-3 w-3 text-gray-500" />
                                                    <SelectValue placeholder="Asignar Técnico" />
                                                </div>
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="_none">-- Sin asignar --</SelectItem>
                                                {technicians.map(t => (
                                                    <SelectItem key={t.id} value={t.id}>{t.displayName || t.email}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <span className="text-gray-400 text-sm">-</span>
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setSelectedLocationForStock(loc);
                                                loadLocationStock(loc.id);
                                                setIsStockDialogOpen(true);
                                            }}
                                        >
                                            Ver Existencias
                                        </Button>
                                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => deleteLocation(loc.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Diálogo de existencias y carga de stock */}
            <Dialog open={isStockDialogOpen} onOpenChange={setIsStockDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                            {selectedLocationForStock?.type === 'VEHICULO' ? (
                                <Truck className="h-5 w-5 text-green-600" />
                            ) : (
                                <Warehouse className="h-5 w-5 text-blue-600" />
                            )}
                            Existencias en {selectedLocationForStock?.name}
                        </DialogTitle>
                        <DialogDescription>
                            Consulta el inventario actual y registra movimientos de carga o ajuste.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-4">
                        {/* Tabla de existencias */}
                        <div className="lg:col-span-3 space-y-4">
                            <h3 className="font-semibold text-sm uppercase tracking-wider text-slate-500">Materiales en Almacén</h3>
                            
                            <div className="border rounded-lg overflow-hidden bg-white max-h-[400px] overflow-y-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-50">
                                            <TableHead className="font-semibold">Material</TableHead>
                                            <TableHead className="font-semibold text-right">Cantidad</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loadingStock ? (
                                            <TableRow>
                                                <TableCell colSpan={2} className="h-24 text-center">
                                                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-slate-500" />
                                                </TableCell>
                                            </TableRow>
                                        ) : stockList.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={2} className="h-24 text-center text-gray-500 text-sm">
                                                    No hay existencias registradas en este vehículo.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            stockList.map(stock => (
                                                <TableRow key={stock.productId} className="hover:bg-slate-50/50">
                                                    <TableCell className="font-medium text-slate-800">{stock.productName}</TableCell>
                                                    <TableCell className="text-right font-mono font-semibold text-blue-700">
                                                        {stock.quantity}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>

                        {/* Formulario de Carga/Ajuste */}
                        <div className="lg:col-span-2 bg-slate-50/70 p-4 rounded-xl border border-slate-100 space-y-4">
                            <h3 className="font-semibold text-sm uppercase tracking-wider text-slate-500">Cargar Insumo / Ajustar</h3>
                            
                            <div className="space-y-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-slate-600">Material</Label>
                                    <Select
                                        value={adjustProductId}
                                        onValueChange={setAdjustProductId}
                                    >
                                        <SelectTrigger className="bg-white"><SelectValue placeholder="Selecciona un material" /></SelectTrigger>
                                        <SelectContent>
                                            {allProductsList.map(prod => (
                                                <SelectItem key={prod.id} value={prod.id}>
                                                    {prod.name} ({prod.unit})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs text-slate-600">Tipo de Movimiento</Label>
                                    <Select
                                        value={adjustType}
                                        onValueChange={(val: any) => setAdjustType(val)}
                                    >
                                        <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ENTRADA">Carga Inicial (Entrada)</SelectItem>
                                            <SelectItem value="AJUSTE">Ajuste de Stock (+ o -)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <p className="text-[10px] text-slate-400">
                                        {adjustType === 'ENTRADA' 
                                            ? "Se agregará la cantidad indicada al stock de este vehículo." 
                                            : "Ajuste manual del stock. Usa valores negativos para disminuir existencias."
                                        }
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-slate-600">Cantidad</Label>
                                        <Input
                                            type="number"
                                            value={adjustQty || ""}
                                            onChange={e => setAdjustQty(parseFloat(e.target.value) || 0)}
                                            placeholder={adjustType === 'AJUSTE' ? "+/- Cantidad" : "Cantidad"}
                                            className="bg-white"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-slate-600">Costo Unitario</Label>
                                        <Input
                                            type="number"
                                            value={adjustCost || ""}
                                            onChange={e => setAdjustCost(parseFloat(e.target.value) || 0)}
                                            placeholder="Costo (opcional)"
                                            className="bg-white"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs text-slate-600">Concepto / Razón</Label>
                                    <Input
                                        value={adjustReason}
                                        onChange={e => setAdjustReason(e.target.value)}
                                        placeholder={adjustType === 'ENTRADA' ? "Ej. Carga semanal" : "Ej. Corrección por merma"}
                                        className="bg-white"
                                    />
                                </div>

                                <Button 
                                    onClick={handleRegisterAdjustment} 
                                    disabled={submittingAdjustment || !adjustProductId || adjustQty === 0}
                                    className="w-full bg-blue-600 hover:bg-blue-700"
                                >
                                    {submittingAdjustment ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Procesando...
                                        </>
                                    ) : (
                                        "Registrar Movimiento"
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
