"use client";

import { AdvisoryMetrics } from "@/types/advisory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Camera, Truck, RotateCcw, ArrowUpRight, Zap, Target } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface OperationsAdvisoryPanelProps {
    metrics: AdvisoryMetrics;
}

export function OperationsAdvisoryPanel({ metrics }: OperationsAdvisoryPanelProps) {
    const { operations } = metrics;

    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-slate-200/80 rounded-2xl shadow-sm bg-white">
                    <CardContent className="p-4 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Salud Operativa</span>
                        <div className="flex items-center justify-between">
                            <span className="text-2xl font-black font-mono text-slate-900">{operations.score}/100</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                operations.score >= 80 ? 'bg-emerald-100 text-emerald-800' : operations.score >= 60 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                                {operations.score >= 80 ? 'Excelente' : operations.score >= 60 ? 'Aceptable' : 'Riesgo'}
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-500">Cierre de ciclo y cumplimiento</p>
                    </CardContent>
                </Card>

                <Card className="border-slate-200/80 rounded-2xl shadow-sm bg-white">
                    <CardContent className="p-4 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Tickets Estancados (&gt;24h)</span>
                        <div className="flex items-center justify-between">
                            <span className="text-2xl font-black font-mono text-amber-600">{operations.stuckTicketsCount}</span>
                            <Clock className="w-5 h-5 text-amber-500" />
                        </div>
                        <p className="text-[11px] text-slate-500">De {operations.openTickets} tickets abiertos</p>
                    </CardContent>
                </Card>

                <Card className="border-slate-200/80 rounded-2xl shadow-sm bg-white">
                    <CardContent className="p-4 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Tasa de Garantía / Retorno</span>
                        <div className="flex items-center justify-between">
                            <span className="text-2xl font-black font-mono text-rose-600">{operations.warrantyReworkRate}%</span>
                            <RotateCcw className="w-5 h-5 text-rose-500" />
                        </div>
                        <p className="text-[11px] text-slate-500">{operations.warrantyReworkCount} visitas de retorno</p>
                    </CardContent>
                </Card>

                <Card className="border-slate-200/80 rounded-2xl shadow-sm bg-white">
                    <CardContent className="p-4 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Cumplimiento Fotográfico</span>
                        <div className="flex items-center justify-between">
                            <span className="text-2xl font-black font-mono text-blue-600">{operations.photoComplianceRate}%</span>
                            <Camera className="w-5 h-5 text-blue-500" />
                        </div>
                        <p className="text-[11px] text-slate-500">Fotos de antes / después</p>
                    </CardContent>
                </Card>
            </div>

            {/* Strategic Recommendations Card */}
            <Card className="border-slate-200 rounded-3xl shadow-sm overflow-hidden bg-white">
                <CardHeader className="bg-slate-50/80 border-b border-slate-100 p-5">
                    <CardTitle className="text-base font-extrabold text-slate-900 flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            <Target className="w-5 h-5 text-blue-600" />
                            Dictamen del Asesor de Operaciones & Eficiencia
                        </span>
                        <Link href="/tickets">
                            <Button size="sm" variant="outline" className="text-xs font-semibold gap-1 rounded-xl h-8">
                                Ir a Torre de Tickets <ArrowUpRight className="w-3.5 h-3.5" />
                            </Button>
                        </Link>
                    </CardTitle>
                </CardHeader>

                <CardContent className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Reglas de Cierre de Ciclo */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                                <Zap className="w-4 h-4 text-amber-500" />
                                Protocolos Recomendados para Cierre de Ciclos
                            </h4>
                            <div className="space-y-2.5 text-xs text-slate-700">
                                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                                    <strong className="text-slate-900 block font-semibold">1. Regla de Cierre en 24 Horas</strong>
                                    <p className="text-slate-600">Ningún técnico puede recibir nuevas asignaciones si tiene tickets marcados como ejecutados sin fotos ni reporte enviado al cliente.</p>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                                    <strong className="text-slate-900 block font-semibold">2. Clasificación de Causa Raíz en Garantías</strong>
                                    <p className="text-slate-600">Al abrir un retorno por garantía, exigir clasificar si la falla fue por defecto de repuesto nuevo, error de instalación o problema de voltaje del cliente.</p>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                                    <strong className="text-slate-900 block font-semibold">3. Optimización de Rutas Diarias</strong>
                                    <p className="text-slate-600">Promedio actual: <strong>{operations.avgKmPerTicket} km por servicio</strong>. Agrupar visitas por zona geográfica para reducir costo de combustible.</p>
                                </div>
                            </div>
                        </div>

                        {/* Telemetría de Rutas y Vehículos */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                                <Truck className="w-4 h-4 text-blue-600" />
                                Telemetría de Flota & Desplazamiento
                            </h4>
                            <div className="p-4 bg-gradient-to-br from-blue-50/60 to-indigo-50/60 rounded-2xl border border-blue-100 space-y-3">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-600">Kilómetros Totales Asignados:</span>
                                    <span className="font-mono font-bold text-slate-900">{operations.totalKmAssigned.toLocaleString()} KM</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-600">Promedio por Servicio:</span>
                                    <span className="font-mono font-bold text-blue-700">{operations.avgKmPerTicket} KM / ticket</span>
                                </div>
                                <div className="flex justify-between items-center text-xs pt-2 border-t border-blue-200/60">
                                    <span className="text-slate-600">Estado de Evidencia con Fotos:</span>
                                    <span className="font-bold text-emerald-700">{operations.photoComplianceRate}% Completo</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
