"use client";

import { useState, useEffect } from "react";
import { collection, query, getDocs, orderBy, where, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Expense } from "@/types/finance";
import { Purchase } from "@/types/purchase";
import { Invoice } from "@/types/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { DollarSign, TrendingUp, TrendingDown, BrainCircuit, Loader2, AlertTriangle, ArrowUpRight } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function DashboardFinancieroPage() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({
        ingresos: 0,
        gastosOperativos: 0,
        comprasTickets: 0,
        utilidad: 0
    });
    const [pieData, setPieData] = useState<any[]>([]);
    const [barData, setBarData] = useState<any[]>([]);
    
    // AI State
    const [aiLoading, setAiLoading] = useState(false);
    const [aiReport, setAiReport] = useState<string | null>(null);

    useEffect(() => {
        fetchFinancialData();
    }, []);

    const fetchFinancialData = async () => {
        setLoading(true);
        try {
            // Get dates for "This Week"
            const today = new Date();
            const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            const tsLastWeek = Timestamp.fromDate(lastWeek);

            // 1. Fetch Invoices (Ingresos)
            const qInvoices = query(collection(db, "invoices"), where("createdAt", ">=", tsLastWeek));
            const invSnap = await getDocs(qInvoices);
            let totalIncome = 0;
            invSnap.forEach(doc => {
                const inv = doc.data() as Invoice;
                totalIncome += inv.total || 0;
            });

            // 2. Fetch OPEX (Gastos Fijos, Nomina, Flotilla)
            const qOpex = query(collection(db, "expenses"), where("createdAt", ">=", tsLastWeek));
            const opexSnap = await getDocs(qOpex);
            let totalOpex = 0;
            let opexByCategory: Record<string, number> = {
                'FLOTILLA': 0, 'NOMINA': 0, 'GASTOS_FIJOS': 0, 'OTROS': 0
            };
            opexSnap.forEach(doc => {
                const exp = doc.data() as Expense;
                totalOpex += exp.amount || 0;
                opexByCategory[exp.category] = (opexByCategory[exp.category] || 0) + (exp.amount || 0);
            });

            // 3. Fetch Purchases (Materiales Técnicos)
            const qPurchases = query(collection(db, "purchases"), where("createdAt", ">=", tsLastWeek));
            const purSnap = await getDocs(qPurchases);
            let totalPurchases = 0;
            purSnap.forEach(doc => {
                const p = doc.data() as Purchase;
                totalPurchases += p.total || 0;
            });

            const totalExpenses = totalOpex + totalPurchases;
            const utility = totalIncome - totalExpenses;

            setData({
                ingresos: totalIncome,
                gastosOperativos: totalOpex,
                comprasTickets: totalPurchases,
                utilidad: utility
            });

            // Prepare Pie Chart (Fugas de Capital / Desglose de Gastos)
            setPieData([
                { name: 'Flotilla', value: opexByCategory['FLOTILLA'] || 0, color: '#3b82f6' },
                { name: 'Nómina', value: opexByCategory['NOMINA'] || 0, color: '#10b981' },
                { name: 'Fijos (Local)', value: opexByCategory['GASTOS_FIJOS'] || 0, color: '#8b5cf6' },
                { name: 'Materiales (Tickets)', value: totalPurchases, color: '#ef4444' },
                { name: 'Otros', value: opexByCategory['OTROS'] || 0, color: '#6b7280' },
            ].filter(d => d.value > 0));

            // Prepare Bar Chart (Income vs Expenses)
            setBarData([
                { name: 'Esta Semana', Ingresos: totalIncome, Egresos: totalExpenses }
            ]);

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const generateAIReport = async () => {
        setAiLoading(true);
        try {
            const contextData = {
                ingresosTotales: data.ingresos,
                gastosOperativos: data.gastosOperativos,
                comprasMateriales: data.comprasTickets,
                utilidadNeta: data.utilidad,
                desgloseGastos: pieData.reduce((acc, curr) => ({ ...acc, [curr.name]: curr.value }), {}),
                task: "Eres un Asesor Financiero experto para una empresa de Mantenimiento de Aires Acondicionados (HVAC). Analiza las métricas de esta semana. Genera un reporte corto y al grano (máximo 4 párrafos) que incluya: 1) Resumen general. 2) Detección de Fugas de capital (si algún gasto es anormalmente alto en proporción a los ingresos). 3) Recomendaciones accionables sobre precios, rutas de técnicos o recortes. Escríbelo en formato amigable usando viñetas."
            };

            const response = await fetch('/api/gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    context: JSON.stringify(contextData),
                    task: 'generate-report'
                })
            });

            if (!response.ok) throw new Error("Error en IA");
            const result = await response.json();
            if (result.output) {
                setAiReport(result.output);
            }
        } catch (error) {
            console.error(error);
            alert("No se pudo generar el reporte de IA.");
        } finally {
            setAiLoading(false);
        }
    };

    const formatMoney = (val: number) => {
        return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(val);
    };

    const getProfitStatus = () => {
        if (data.utilidad <= 0) return { color: 'bg-red-500', text: 'Pérdida', icon: <TrendingDown className="h-4 w-4" /> };
        if (data.utilidad < (data.ingresos * 0.15)) return { color: 'bg-yellow-500', text: 'Margen Bajo', icon: <AlertTriangle className="h-4 w-4" /> };
        return { color: 'bg-green-500', text: 'Rentable', icon: <TrendingUp className="h-4 w-4" /> };
    };

    if (loading) {
        return <div className="flex justify-center p-20"><Loader2 className="h-12 w-12 animate-spin text-blue-500" /></div>;
    }

    const profitStatus = getProfitStatus();

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard Financiero Semanal</h1>
                    <p className="text-gray-500 mt-1">Visión rápida de rentabilidad y fugas de capital (Últimos 7 días).</p>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between space-y-0 pb-2">
                            <p className="text-sm font-medium text-gray-500">Ingresos (Ventas)</p>
                            <DollarSign className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="text-2xl font-bold text-gray-900">{formatMoney(data.ingresos)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between space-y-0 pb-2">
                            <p className="text-sm font-medium text-gray-500">Egresos Totales</p>
                            <TrendingDown className="h-4 w-4 text-red-600" />
                        </div>
                        <div className="text-2xl font-bold text-gray-900">{formatMoney(data.gastosOperativos + data.comprasTickets)}</div>
                        <p className="text-xs text-gray-500 mt-1">OPEX + Materiales</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between space-y-0 pb-2">
                            <p className="text-sm font-medium text-gray-500">Utilidad Neta</p>
                            <ArrowUpRight className="h-4 w-4 text-green-600" />
                        </div>
                        <div className={`text-2xl font-bold ${data.utilidad >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatMoney(data.utilidad)}
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-slate-50 border-0 shadow-none">
                    <CardContent className="p-6 flex flex-col justify-center items-center h-full">
                        <p className="text-sm font-medium text-gray-500 mb-2">Semáforo de Rentabilidad</p>
                        <div className={`flex items-center gap-2 text-white px-4 py-2 rounded-full font-bold shadow-sm ${profitStatus.color}`}>
                            {profitStatus.icon}
                            {profitStatus.text}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Escapes de Capital (Distribución de Gastos)</CardTitle>
                    </CardHeader>
                    <CardContent className="h-80">
                        {pieData.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-gray-400">Sin datos de gastos</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={90}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value) => formatMoney(value as number)} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Balance Semanal</CardTitle>
                    </CardHeader>
                    <CardContent className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" />
                                <YAxis tickFormatter={(val) => `$${val/1000}k`} />
                                <Tooltip formatter={(value) => formatMoney(value as number)} cursor={{fill: 'transparent'}} />
                                <Legend />
                                <Bar dataKey="Ingresos" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Egresos" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* AI Advisor Tab */}
            <Card className="border-purple-200 shadow-md">
                <CardHeader className="bg-purple-50/50 border-b border-purple-100 rounded-t-xl pb-4">
                    <CardTitle className="text-xl flex items-center gap-2 text-purple-900">
                        <BrainCircuit className="h-6 w-6 text-purple-600" />
                        Asesor Financiero IA
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    {!aiReport ? (
                        <div className="text-center py-6">
                            <p className="text-gray-500 mb-4">La Inteligencia Artificial puede analizar tus números semanales y darte consejos sobre precios, fugas de capital y alertas predictivas.</p>
                            <Button 
                                onClick={generateAIReport} 
                                disabled={aiLoading}
                                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg"
                            >
                                {aiLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BrainCircuit className="mr-2 h-4 w-4" />}
                                {aiLoading ? "Analizando números..." : "Generar Reporte Inteligente"}
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="prose prose-purple max-w-none text-gray-700 bg-purple-50/30 p-6 rounded-lg border border-purple-100">
                                <ReactMarkdown>{aiReport}</ReactMarkdown>
                            </div>
                            <Button variant="outline" onClick={() => setAiReport(null)} className="text-gray-500">
                                Ocultar Reporte
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
