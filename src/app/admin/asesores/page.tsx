"use client";

import { useState, useEffect } from "react";
import { AdvisoryMetrics, AIAdvisoryAuditResult } from "@/types/advisory";
import { calculateAdvisoryMetrics } from "@/lib/advisory-service";
import { runAIAdvisoryAuditAction } from "@/app/actions/advisory-ai";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, RefreshCw, Zap } from "lucide-react";
import { FinancialLeaksBanner } from "@/components/advisory/financial-leaks-banner";
import { OperationsAdvisoryPanel } from "@/components/advisory/operations-advisory-panel";
import { FinancialAdvisoryPanel } from "@/components/advisory/financial-advisory-panel";
import { TalentAdvisoryPanel } from "@/components/advisory/talent-advisory-panel";

export default function AsesoresPage() {
    const [metrics, setMetrics] = useState<AdvisoryMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("overview");

    const [auditResult, setAuditResult] = useState<AIAdvisoryAuditResult | null>(null);
    const [auditing, setAuditing] = useState(false);

    useEffect(() => {
        loadMetrics();
    }, []);

    const loadMetrics = async () => {
        setLoading(true);
        try {
            const data = await calculateAdvisoryMetrics();
            setMetrics(data);
        } catch (error) {
            console.error("Error loading advisory metrics:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleRunAIAudit = async () => {
        if (!metrics) return;
        setAuditing(true);
        try {
            const res = await runAIAdvisoryAuditAction(metrics);
            if (res.success && res.data) {
                setAuditResult(res.data);
                setActiveTab("overview");
            } else {
                alert("Error ejecutando auditoría IA: " + (res.error || "Verifica tu GEMINI_API_KEY"));
            }
        } catch (error: any) {
            console.error(error);
            alert("Error: " + error.message);
        } finally {
            setAuditing(false);
        }
    };

    if (loading || !metrics) {
        return (
            <div className="p-8 max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[60vh] gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <p className="text-sm font-semibold text-slate-600">Calculando indicadores del Consejo Asesor...</p>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Executive Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-6 md:p-8 rounded-3xl shadow-lg">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 bg-blue-500/30 text-blue-300 text-[10px] font-black rounded-full uppercase tracking-wider border border-blue-400/30">
                            Gobierno Corporativo & Estrategia
                        </span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight">Consejo Asesor Ejecutivo IA</h1>
                    <p className="text-xs md:text-sm text-slate-300 max-w-xl">
                        Supervisión integral de Operaciones, Finanzas, Precios y Talento de HECHO SRL basada en números reales.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        onClick={loadMetrics}
                        variant="outline"
                        size="sm"
                        className="bg-white/10 hover:bg-white/20 text-white border-white/20 h-10 rounded-2xl gap-2 text-xs"
                    >
                        <RefreshCw className="w-3.5 h-3.5" /> Actualizar Datos
                    </Button>
                    <Button
                        onClick={handleRunAIAudit}
                        disabled={auditing}
                        className="h-10 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-bold rounded-2xl shadow-md gap-2 text-xs"
                    >
                        {auditing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-amber-300" />}
                        {auditing ? "Consultando Consejo IA..." : "✨ Ejecutar Auditoría IA"}
                    </Button>
                </div>
            </div>

            {/* Financial Leaks Banner */}
            <FinancialLeaksBanner alerts={metrics.alerts} totalLeaks={metrics.totalEstimatedLeaks} />

            {/* Tabs Navigation */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="bg-white dark:bg-zinc-900 p-1 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap h-auto gap-1">
                    <TabsTrigger value="overview" className="rounded-xl text-xs font-bold py-2 px-4 gap-2">
                        🏛️ Visión General
                    </TabsTrigger>
                    <TabsTrigger value="operations" className="rounded-xl text-xs font-bold py-2 px-4 gap-2">
                        🔄 Operaciones & Ciclos
                    </TabsTrigger>
                    <TabsTrigger value="finance" className="rounded-xl text-xs font-bold py-2 px-4 gap-2">
                        💰 Finanzas & Compras
                    </TabsTrigger>
                    <TabsTrigger value="talent" className="rounded-xl text-xs font-bold py-2 px-4 gap-2">
                        👥 Talento & Incentivos
                    </TabsTrigger>
                </TabsList>

                {/* OVERVIEW TAB */}
                <TabsContent value="overview" className="space-y-6">
                    {/* Scores Matrix */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Card className="border-slate-200 rounded-3xl bg-gradient-to-br from-blue-50/70 to-indigo-50/70 border p-5 space-y-2">
                            <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">🔄 Eficiencia Operativa</span>
                            <div className="flex items-baseline justify-between">
                                <span className="text-3xl font-black font-mono text-blue-950">{metrics.operations.score}/100</span>
                                <span className="text-xs text-blue-700 font-semibold">{metrics.operations.openTickets} tickets activos</span>
                            </div>
                        </Card>

                        <Card className="border-slate-200 rounded-3xl bg-gradient-to-br from-emerald-50/70 to-teal-50/70 border p-5 space-y-2">
                            <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">💰 Salud Financiera</span>
                            <div className="flex items-baseline justify-between">
                                <span className="text-3xl font-black font-mono text-emerald-950">{metrics.finance.score}/100</span>
                                <span className="text-xs text-emerald-700 font-semibold">{metrics.finance.profitMargin}% margen neto</span>
                            </div>
                        </Card>

                        <Card className="border-slate-200 rounded-3xl bg-gradient-to-br from-purple-50/70 to-pink-50/70 border p-5 space-y-2">
                            <span className="text-xs font-bold text-purple-900 uppercase tracking-wider">👥 Desempeño del Personal</span>
                            <div className="flex items-baseline justify-between">
                                <span className="text-3xl font-black font-mono text-purple-950">{metrics.talent.score}/100</span>
                                <span className="text-xs text-purple-700 font-semibold">{metrics.talent.totalTechnicians} técnicos</span>
                            </div>
                        </Card>
                    </div>

                    {/* AI Audit Result if available */}
                    {auditResult ? (
                        <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50/60 via-white to-blue-50/60 rounded-3xl shadow-sm border p-6 space-y-6">
                            <div className="flex items-center gap-2 pb-3 border-b border-indigo-100">
                                <Sparkles className="w-5 h-5 text-indigo-600" />
                                <h3 className="text-base font-black text-slate-900">Dictamen Estratégico del Consejo Directivo con IA</h3>
                            </div>

                            <div className="text-xs md:text-sm text-slate-700 leading-relaxed space-y-2 bg-white/80 p-4 rounded-2xl border border-indigo-100">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900">Resumen Ejecutivo</h4>
                                <p className="whitespace-pre-line">{auditResult.executiveSummary}</p>
                            </div>

                            {/* Action Plan Table */}
                            {auditResult.actionPlan && auditResult.actionPlan.length > 0 ? (
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                                        <Zap className="w-4 h-4 text-amber-500" /> Plan de Acción Inmediato Priorizado
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        {auditResult.actionPlan.map((action, idx) => (
                                            <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                                        action.priority === 'ALTA' ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'
                                                    }`}>
                                                        Prioridad {action.priority}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-bold">{action.responsible}</span>
                                                </div>
                                                <h5 className="text-xs font-bold text-slate-900">{action.title}</h5>
                                                <p className="text-[11px] text-emerald-700 font-medium bg-emerald-50 p-2 rounded-lg">
                                                    🎯 {action.expectedImpact}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : null}
                        </Card>
                    ) : null}
                </TabsContent>

                {/* OPERATIONS TAB */}
                <TabsContent value="operations">
                    <OperationsAdvisoryPanel metrics={metrics} />
                </TabsContent>

                {/* FINANCE TAB */}
                <TabsContent value="finance">
                    <FinancialAdvisoryPanel metrics={metrics} />
                </TabsContent>

                {/* TALENT TAB */}
                <TabsContent value="talent">
                    <TalentAdvisoryPanel metrics={metrics} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
