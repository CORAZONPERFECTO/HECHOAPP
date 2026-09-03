"use client";

import { AdvisoryMetrics } from "@/types/advisory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, AlertTriangle, ShoppingCart, Percent, Building2, ArrowUpRight, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface FinancialAdvisoryPanelProps {
    metrics: AdvisoryMetrics;
}

export function FinancialAdvisoryPanel({ metrics }: FinancialAdvisoryPanelProps) {
    const { finance } = metrics;

    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-slate-200/80 rounded-2xl shadow-sm bg-white">
                    <CardContent className="p-4 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Margen Neto Global</span>
                        <div className="flex items-center justify-between">
                            <span className="text-2xl font-black font-mono text-emerald-600">{finance.profitMargin}%</span>
                            <Percent className="w-5 h-5 text-emerald-500" />
                        </div>
                        <p className="text-[11px] text-slate-500">Rentabilidad sobre ingresos</p>
                    </CardContent>
                </Card>

                <Card className="border-slate-200/80 rounded-2xl shadow-sm bg-white">
                    <CardContent className="p-4 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Compras de Calle</span>
                        <div className="flex items-center justify-between">
                            <span className="text-2xl font-black font-mono text-slate-900">RD$ {finance.streetPurchasesTotal.toLocaleString()}</span>
                            <ShoppingCart className="w-5 h-5 text-blue-500" />
                        </div>
                        <p className="text-[11px] text-slate-500">Gastado por técnicos en calle</p>
                    </CardContent>
                </Card>

                <Card className="border-slate-200/80 rounded-2xl shadow-sm bg-white">
                    <CardContent className="p-4 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Pérdida Fiscal (Sin NCF)</span>
                        <div className="flex items-center justify-between">
                            <span className="text-2xl font-black font-mono text-rose-600">RD$ {finance.informalPurchasesTaxLoss.toLocaleString()}</span>
                            <AlertTriangle className="w-5 h-5 text-rose-500" />
                        </div>
                        <p className="text-[11px] text-slate-500">18% ITBIS no deducible</p>
                    </CardContent>
                </Card>

                <Card className="border-slate-200/80 rounded-2xl shadow-sm bg-white">
                    <CardContent className="p-4 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Tickets a Pérdida</span>
                        <div className="flex items-center justify-between">
                            <span className="text-2xl font-black font-mono text-rose-600">{finance.negativeMarginTicketsCount}</span>
                            <TrendingUp className="w-5 h-5 text-rose-500 rotate-180" />
                        </div>
                        <p className="text-[11px] text-slate-500">{finance.lowMarginTicketsCount} con margen &lt;20%</p>
                    </CardContent>
                </Card>
            </div>

            {/* Procurement & Pricing Matrix */}
            <Card className="border-slate-200 rounded-3xl shadow-sm overflow-hidden bg-white">
                <CardHeader className="bg-slate-50/80 border-b border-slate-100 p-5">
                    <CardTitle className="text-base font-extrabold text-slate-900 flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-emerald-600" />
                            Dictamen del Asesor Financiero, Precios & Compras
                        </span>
                        <Link href="/admin/gastos">
                            <Button size="sm" variant="outline" className="text-xs font-semibold gap-1 rounded-xl h-8">
                                Ver Control de Gastos <ArrowUpRight className="w-3.5 h-3.5" />
                            </Button>
                        </Link>
                    </CardTitle>
                </CardHeader>

                <CardContent className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Estrategias de Compras */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-blue-600" />
                                Oportunidades de Ahorro con Proveedores
                            </h4>
                            <div className="space-y-2.5 text-xs">
                                <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-1">
                                    <strong className="text-emerald-950 font-bold block">1. Cuenta Corporativa a Crédito (e-NCF Obligatorio)</strong>
                                    <p className="text-emerald-800">
                                        Migrar las compras de calle a 2 proveedores autorizados (ej. Ferretería Ochoa / Bellón). Esto recupera <strong>RD$ {finance.informalPurchasesTaxLoss.toLocaleString()}</strong> en crédito fiscal de ITBIS inmediatamente.
                                    </p>
                                </div>

                                <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-1">
                                    <strong className="text-blue-950 font-bold block">2. Stock Rodante en Vehículos de Técnicos</strong>
                                    <p className="text-blue-800">
                                        Asignar un kit estándar a cada camioneta (capacitores, gas R410A, soldadura, cinta, contactores). Evita compras de calle de emergencia que suelen costar entre un 20% y 35% más caras.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Política de Precios */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                Política de Fijación de Precios y Márgenes
                            </h4>
                            <div className="space-y-2.5 text-xs text-slate-700">
                                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                                    <strong className="text-slate-900 block font-semibold">Tarifa Mínima por Diagnóstico + Traslado</strong>
                                    <p className="text-slate-600">Establecer una tarifa base que cubra automáticamente el costo de combustible del vehículo (RD$ 15-25/km) más 1 hora de mano de obra técnica.</p>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                                    <strong className="text-slate-900 block font-semibold">Alerta de Margen Saludable (&gt;35%)</strong>
                                    <p className="text-slate-600">Si un presupuesto cotizado genera menos del 35% de margen bruto, el sistema debe alertar al supervisor antes de enviar la proforma al cliente.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
