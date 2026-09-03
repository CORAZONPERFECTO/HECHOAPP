"use client";

import { useState, useEffect } from "react";
import { getDocs, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Truck, Sparkles, Package, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { getVehicleStock, replenishVehicleStandardKit, VehicleStockItem } from "@/lib/vehicle-stock-service";

export function VehicleStockView() {
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [selectedVehicle, setSelectedVehicle] = useState<any | null>(null);
    const [stockItems, setStockItems] = useState<VehicleStockItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [replenishing, setReplenishing] = useState(false);

    useEffect(() => {
        loadVehicles();
    }, []);

    const loadVehicles = async () => {
        setLoading(true);
        try {
            const snap = await getDocs(collection(db, "users"));
            const techs = snap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter((u: any) => (u.role === 'TECNICO' || u.rol === 'TECNICO') && u.vehicle);
            
            setVehicles(techs);
            if (techs.length > 0) {
                selectVehicle(techs[0]);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const selectVehicle = async (v: any) => {
        setSelectedVehicle(v);
        const vId = v.vehicle?.id || v.id;
        const items = await getVehicleStock(vId);
        setStockItems(items);
    };

    const handleReplenish = async () => {
        if (!selectedVehicle) return;
        setReplenishing(true);
        try {
            const vId = selectedVehicle.vehicle?.id || selectedVehicle.id;
            const plate = selectedVehicle.vehicle?.plate || "VEH-01";
            const techName = selectedVehicle.nombre || selectedVehicle.name || "Técnico";

            await replenishVehicleStandardKit(vId, plate, selectedVehicle.id, techName);
            const updated = await getVehicleStock(vId);
            setStockItems(updated);
            alert("✅ Kit Estándar Reabastecido con Éxito");
        } catch (err: any) {
            alert("Error: " + err.message);
        } finally {
            setReplenishing(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-xs font-semibold text-slate-500">Cargando flotilla y stock rodante...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-md">
                        <Truck className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-slate-900">Control de Stock Rodante en Camionetas</h2>
                        <p className="text-xs text-slate-500">Kits de repuestos e insumos asignados a cada vehículo de HECHO SRL.</p>
                    </div>
                </div>

                <Button
                    onClick={handleReplenish}
                    disabled={!selectedVehicle || replenishing}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl gap-2 text-xs shadow-sm h-10"
                >
                    {replenishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-amber-300" />}
                    Reabastecer Kit Estándar a Camioneta
                </Button>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2">
                {vehicles.map((v) => {
                    const isSelected = selectedVehicle?.id === v.id;
                    return (
                        <button
                            key={v.id}
                            onClick={() => selectVehicle(v)}
                            className={`p-3.5 rounded-2xl border text-left min-w-[180px] transition-all ${
                                isSelected 
                                    ? "bg-blue-600 text-white border-blue-600 shadow-md" 
                                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                            }`}
                        >
                            <span className={`text-[10px] uppercase font-bold block ${isSelected ? "text-blue-200" : "text-slate-400"}`}>
                                {v.vehicle?.model || "Camioneta"}
                            </span>
                            <span className="text-xs font-black block truncate">{v.nombre || v.name || "Técnico"}</span>
                            <span className="text-[11px] font-mono opacity-80">{v.vehicle?.plate || "Sin Placa"}</span>
                        </button>
                    );
                })}
            </div>

            <Card className="border-slate-200 rounded-3xl shadow-sm overflow-hidden bg-white">
                <CardHeader className="bg-slate-50/80 border-b border-slate-100 p-5">
                    <CardTitle className="text-base font-extrabold text-slate-900 flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            <Package className="w-5 h-5 text-blue-600" />
                            Inventario Asignado a: {selectedVehicle?.nombre || "Vehículo"} ({selectedVehicle?.vehicle?.plate || ""})
                        </span>
                        <Badge className="bg-blue-100 text-blue-800 font-mono text-xs">
                            {stockItems.length} Repuestos en Stock
                        </Badge>
                    </CardTitle>
                </CardHeader>

                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50 text-[11px]">
                            <TableRow>
                                <TableHead>Repuesto / Insumo</TableHead>
                                <TableHead className="text-center">Stock Actual</TableHead>
                                <TableHead className="text-center">Mínimo Recomendado</TableHead>
                                <TableHead className="text-right">Costo Estimado</TableHead>
                                <TableHead className="text-center">Estado</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {stockItems.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-32 text-center text-xs text-slate-400">
                                        Esta camioneta aún no tiene un kit registrado. Haz clic en "Reabastecer Kit Estándar" arriba.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                stockItems.map((item, idx) => {
                                    const isLow = item.quantity < item.minRecommended;
                                    return (
                                        <TableRow key={idx} className="hover:bg-slate-50/80 text-xs">
                                            <TableCell className="font-bold text-slate-900">{item.productName}</TableCell>
                                            <TableCell className="text-center font-mono font-black text-sm text-blue-700">
                                                {item.quantity}
                                            </TableCell>
                                            <TableCell className="text-center font-mono text-slate-500">
                                                {item.minRecommended}
                                            </TableCell>
                                            <TableCell className="text-right font-mono font-bold text-slate-900">
                                                RD$ {item.unitPrice.toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {isLow ? (
                                                    <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-bold rounded-full flex items-center gap-1 w-fit mx-auto">
                                                        <AlertTriangle className="w-3 h-3" /> Reabastecer
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full flex items-center gap-1 w-fit mx-auto">
                                                        <CheckCircle2 className="w-3 h-3" /> Completo
                                                    </span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
