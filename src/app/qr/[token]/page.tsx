"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
    CheckCircle2, 
    AlertTriangle, 
    Wrench, 
    FileText, 
    Building2, 
    ArrowRight, 
    ShieldCheck, 
    Loader2,
    QrCode
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EquipmentPassport } from "@/types/equipment";
import { getEquipmentByCodeOrQr } from "@/lib/equipment-service";

export default function QRResolverPage() {
    const params = useParams();
    const router = useRouter();
    const token = params?.token as string;

    const [equipment, setEquipment] = useState<EquipmentPassport | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const resolve = async () => {
            if (!token) return;
            setLoading(true);
            try {
                const resolved = await getEquipmentByCodeOrQr(token);
                setEquipment(resolved);
            } catch (err) {
                console.error("Error resolving QR token:", err);
            } finally {
                setLoading(false);
            }
        };

        resolve();
    }, [token]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-4">
                <div className="text-center space-y-3">
                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto" />
                    <p className="text-sm font-semibold tracking-wide">Identificando equipo HECHO SRL...</p>
                </div>
            </div>
        );
    }

    if (!equipment) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
                <Card className="max-w-md w-full text-center p-6 border-slate-300 shadow-md">
                    <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                    <h2 className="text-lg font-bold text-slate-900">Código QR no registrado</h2>
                    <p className="text-xs text-slate-500 mt-1 mb-5">
                        El código escaneado <strong>{token}</strong> no coincide con ningún equipo activo en el sistema.
                    </p>
                    <Button onClick={() => router.push("/tickets")} variant="default" className="w-full">
                        Ir al Panel de Tickets
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-4 sm:p-6">
            {/* Encabezado Institucional */}
            <div className="max-w-md w-full mx-auto space-y-4 pt-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-black text-sm text-white">
                            H
                        </div>
                        <div>
                            <h2 className="text-xs font-black tracking-wider text-slate-200 uppercase">HECHO SRL</h2>
                            <p className="text-[10px] text-slate-400 font-medium">Climatización & Mantenimiento</p>
                        </div>
                    </div>
                    <span className="font-mono text-xs font-black bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded">
                        {equipment.code}
                    </span>
                </div>

                {/* Tarjeta de Identificación del Activo */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                    <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 block">
                            Activo Identificado
                        </span>
                        <h1 className="text-xl font-black text-white">
                            {equipment.areaName || equipment.name}
                        </h1>
                        <p className="text-xs text-slate-400 flex items-center gap-1.5 pt-0.5">
                            <Building2 className="w-3.5 h-3.5 text-slate-500" />
                            <span>{equipment.locationName || 'Villa'}</span>
                            {equipment.locationArea && <span>• {equipment.locationArea}</span>}
                        </p>
                    </div>

                    {/* Resumen Técnico */}
                    <div className="grid grid-cols-2 gap-2.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 text-xs">
                        <div>
                            <span className="text-[10px] text-slate-500 font-medium block">Marca</span>
                            <span className="font-bold text-slate-200">{equipment.specs.brand || "Genérica"}</span>
                        </div>
                        <div>
                            <span className="text-[10px] text-slate-500 font-medium block">Capacidad</span>
                            <span className="font-bold text-slate-200">
                                {equipment.specs.btu ? `${equipment.specs.btu} BTU` : "N/D"}
                            </span>
                        </div>
                        <div>
                            <span className="text-[10px] text-slate-500 font-medium block">Refrigerante</span>
                            <span className="font-bold text-slate-200">{equipment.specs.refrigerant || "R410A"}</span>
                        </div>
                        <div>
                            <span className="text-[10px] text-slate-500 font-medium block">Estado</span>
                            <span className="font-bold text-emerald-400">
                                {equipment.status === "OPERATIONAL" ? "Operacional" : equipment.status}
                            </span>
                        </div>
                    </div>

                    {/* Botones de Acción Inmediata para el Técnico o Cliente */}
                    <div className="space-y-2 pt-2">
                        <Link href={`/equipment/${equipment.id}`} className="block">
                            <Button className="w-full bg-blue-600 hover:bg-blue-700 font-bold text-xs h-11 justify-between shadow-lg shadow-blue-600/20">
                                <span className="flex items-center gap-2">
                                    <FileText className="w-4 h-4" />
                                    Ver Pasaporte Digital e Historial
                                </span>
                                <ArrowRight className="w-4 h-4" />
                            </Button>
                        </Link>

                        <Link href={`/technician/tickets?equipmentId=${equipment.id}`} className="block">
                            <Button variant="outline" className="w-full border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-200 font-bold text-xs h-10 justify-between">
                                <span className="flex items-center gap-2">
                                    <Wrench className="w-3.5 h-3.5 text-blue-400" />
                                    Atender en Ticket Técnico
                                </span>
                                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Pie de Página */}
            <div className="text-center py-4 text-[11px] text-slate-500">
                Sistema Operativo HECHO SRL • Pasaporte Digital de Activos
            </div>
        </div>
    );
}
