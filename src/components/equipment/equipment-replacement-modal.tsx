"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";
import { EquipmentPassport } from "@/types/equipment";
import { replaceEquipment } from "@/lib/equipment-service";

interface EquipmentReplacementModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    equipment: EquipmentPassport;
    onReplaced?: (newEquipmentId: string) => void;
}

const REFRIGERANTS = ["R410A", "R32", "R22", "R134a", "R404A"];
const COMMON_BRANDS = ["Carrier", "Daikin", "Lennox", "TCL", "Midea", "York", "Trane", "Innova", "Frigidaire", "Otra"];
const BTU_CAPACITIES = ["9,000", "12,000", "18,000", "24,000", "36,000", "48,000", "60,000"];

export function EquipmentReplacementModal({
    open,
    onOpenChange,
    equipment,
    onReplaced
}: EquipmentReplacementModalProps) {
    const [loading, setLoading] = useState(false);
    const [successId, setSuccessId] = useState<string | null>(null);

    const [reason, setReason] = useState("");
    const [brand, setBrand] = useState(equipment.specs.brand || "Carrier");
    const [model, setModel] = useState("");
    const [serialNumber, setSerialNumber] = useState("");
    const [btu, setBtu] = useState(String(equipment.specs.btu || "18,000"));
    const [refrigerant, setRefrigerant] = useState(equipment.specs.refrigerant || "R410A");
    const [voltage, setVoltage] = useState(equipment.specs.voltage || "220V");
    const [notes, setNotes] = useState("");

    const handleReplace = async () => {
        if (!reason.trim()) {
            alert("Por favor describe el motivo de la sustitución del equipo.");
            return;
        }

        setLoading(true);
        try {
            const cleanBtu = parseInt(btu.replace(/[^0-9]/g, ""), 10) || 18000;

            const newDocId = await replaceEquipment(
                equipment.id,
                {
                    clientId: equipment.clientId,
                    clientName: equipment.clientName,
                    locationId: equipment.locationId,
                    locationName: equipment.locationName,
                    locationArea: equipment.locationArea,
                    areaId: equipment.areaId,
                    areaName: equipment.areaName,
                    name: `AC ${equipment.areaName}`,
                    specs: {
                        brand,
                        model,
                        serialNumber,
                        btu: cleanBtu,
                        voltage,
                        refrigerant,
                        type: equipment.specs.type || "SPLIT_INVERTER"
                    },
                    notes
                },
                reason.trim()
            );

            setSuccessId(newDocId);
            if (onReplaced) {
                onReplaced(newDocId);
            }
        } catch (error) {
            console.error("Error replacing equipment:", error);
            alert("Error al registrar la sustitución del equipo.");
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setSuccessId(null);
        setReason("");
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-slate-900">
                        <RefreshCw className="w-5 h-5 text-blue-600" />
                        Sustitución de Equipo ({equipment.code})
                    </DialogTitle>
                    <DialogDescription>
                        Esta acción registrará la baja del equipo actual y creará el nuevo activo con su propio pasaporte y código QR, preservando el historial completo de intervenciones pasadas.
                    </DialogDescription>
                </DialogHeader>

                {successId ? (
                    <div className="py-6 text-center space-y-3">
                        <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                        <h3 className="text-base font-bold text-slate-800">¡Equipo Reemplazado con Éxito!</h3>
                        <p className="text-xs text-slate-600">
                            La unidad anterior fue archivada como <strong>REEMPLAZADA</strong>. Se ha generado un nuevo pasaporte digital para la unidad entrante.
                        </p>
                        <Button onClick={handleClose} className="mt-4">
                            Entendido y Cerrar
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4 py-2">
                        {/* Resumen del equipo saliente */}
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-1">
                            <div className="flex items-center gap-1.5 font-bold text-amber-900">
                                <AlertTriangle className="w-4 h-4 text-amber-600" />
                                Equipo a dar de baja: {equipment.code} • {equipment.areaName}
                            </div>
                            <p className="text-amber-800">
                                Actual: {equipment.specs.brand} {equipment.specs.model ? `(${equipment.specs.model})` : ''} • {equipment.specs.btu} BTU
                            </p>
                        </div>

                        {/* Motivo de la sustitución */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-700">
                                Motivo del Reemplazo / Causa de Baja <span className="text-red-500">*</span>
                            </Label>
                            <Textarea
                                value={reason}
                                onChange={e => setReason(e.target.value)}
                                placeholder="Ej: Compresor trancado / Fuga irreparable en evaporador / Renovación a Inverter..."
                                className="text-xs"
                                rows={2}
                            />
                        </div>

                        <div className="border-t pt-3">
                            <h4 className="text-xs font-bold text-slate-800 mb-2">Ficha Técnica del Nuevo Equipo Entrante</h4>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-xs">Marca</Label>
                                    <Select value={brand} onValueChange={setBrand}>
                                        <SelectTrigger className="h-8 text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {COMMON_BRANDS.map(b => (
                                                <SelectItem key={b} value={b}>{b}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-xs">Capacidad (BTU)</Label>
                                    <Select value={btu} onValueChange={setBtu}>
                                        <SelectTrigger className="h-8 text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {BTU_CAPACITIES.map(c => (
                                                <SelectItem key={c} value={c}>{c} BTU</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-xs">Modelo</Label>
                                    <Input
                                        value={model}
                                        onChange={e => setModel(e.target.value)}
                                        placeholder="Ej: 42QHG018..."
                                        className="h-8 text-xs"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-xs">Número de Serie</Label>
                                    <Input
                                        value={serialNumber}
                                        onChange={e => setSerialNumber(e.target.value)}
                                        placeholder="Ej: SN-8823719..."
                                        className="h-8 text-xs font-mono"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-xs">Refrigerante</Label>
                                    <Select value={refrigerant} onValueChange={setRefrigerant}>
                                        <SelectTrigger className="h-8 text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {REFRIGERANTS.map(r => (
                                                <SelectItem key={r} value={r}>{r}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-xs">Voltaje</Label>
                                    <Input
                                        value={voltage}
                                        onChange={e => setVoltage(e.target.value)}
                                        placeholder="220V"
                                        className="h-8 text-xs"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs">Notas Adicionales de Instalación</Label>
                            <Input
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                placeholder="Garantía, técnico que instaló, etc."
                                className="h-8 text-xs"
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button variant="outline" onClick={handleClose} disabled={loading}>
                                Cancelar
                            </Button>
                            <Button onClick={handleReplace} disabled={loading || !reason.trim()} className="bg-blue-600 hover:bg-blue-700">
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Guardando Sustitución...
                                    </>
                                ) : (
                                    "Confirmar y Generar Nuevo Pasaporte"
                                )}
                            </Button>
                        </DialogFooter>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
