"use client";

import { AdvisoryAlert } from "@/types/advisory";
import { AlertTriangle, ShieldAlert, ArrowRight, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface FinancialLeaksBannerProps {
    alerts: AdvisoryAlert[];
    totalLeaks: number;
}

export function FinancialLeaksBanner({ alerts, totalLeaks }: FinancialLeaksBannerProps) {
    const criticalAlerts = alerts.filter(a => a.type === 'CRITICAL' || a.type === 'WARNING');

    if (criticalAlerts.length === 0 && totalLeaks === 0) {
        return (
            <Card className="border-emerald-200 bg-emerald-50/50 rounded-2xl shadow-sm">
                <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-emerald-950">Sin Fugas Financieras Críticas Detectadas</h4>
                            <p className="text-xs text-emerald-700">Tus compras, márgenes y procesos de tickets están operando dentro de los parámetros saludables.</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-rose-200 bg-gradient-to-r from-rose-50 via-red-50 to-orange-50 rounded-3xl shadow-sm overflow-hidden border">
            <CardContent className="p-5 md:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-3 border-b border-rose-200/60">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-rose-600 text-white rounded-2xl flex items-center justify-center shadow-md shadow-rose-200">
                            <ShieldAlert className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-black text-rose-950 tracking-tight">Monitor de Fugas de Capital & Compras</h3>
                                <span className="px-2 py-0.5 bg-rose-200 text-rose-800 text-[10px] font-black rounded-full uppercase tracking-wider">
                                    {criticalAlerts.length} Alertas Activas
                                </span>
                            </div>
                            <p className="text-xs text-rose-700">Detección automática de dinero perdido en compras informales, sobreprecio o tickets a pérdida.</p>
                        </div>
                    </div>

                    <div className="text-left sm:text-right bg-white/80 p-3 rounded-2xl border border-rose-200 shadow-sm">
                        <span className="text-[10px] uppercase font-bold text-rose-500 block">Fuga Estimada Total</span>
                        <span className="text-xl font-black font-mono text-rose-950">
                            RD$ {totalLeaks.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>

                {/* Alerts List */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {criticalAlerts.map(alert => (
                        <div key={alert.id} className="bg-white/90 backdrop-blur p-3.5 rounded-2xl border border-rose-100 shadow-sm space-y-2 flex flex-col justify-between">
                            <div className="space-y-1">
                                <div className="flex items-start justify-between gap-2">
                                    <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                        {alert.title}
                                    </h4>
                                    {alert.financialImpact ? (
                                        <span className="text-[10px] font-extrabold font-mono text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md shrink-0">
                                            -RD$ {alert.financialImpact.toLocaleString()}
                                        </span>
                                    ) : null}
                                </div>
                                <p className="text-[11px] text-slate-600 leading-relaxed">{alert.description}</p>
                            </div>

                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                                <span className="text-[10px] text-blue-700 font-semibold truncate max-w-[220px]">
                                    💡 {alert.suggestedAction}
                                </span>
                                {alert.link ? (
                                    <Link href={alert.link}>
                                        <Button variant="ghost" size="sm" className="h-6 text-[10px] font-bold text-blue-600 hover:text-blue-800 p-0 gap-1">
                                            Resolver <ArrowRight className="w-3 h-3" />
                                        </Button>
                                    </Link>
                                ) : null}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
