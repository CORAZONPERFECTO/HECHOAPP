
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
import { getLocations, createLocation, updateLocation, deleteLocation, ensureDefaultLocations } from "@/lib/inventory-service";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
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

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            await ensureDefaultLocations(); // Init defaults if missing

            const [locs, usersSnap] = await Promise.all([
                getLocations(),
                getDocs(query(collection(db, "users"), where("role", "==", "TECNICO")))
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
                                    {/* Delete/Edit actions could go here */}
                                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => deleteLocation(loc.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
