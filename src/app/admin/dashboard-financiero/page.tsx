"use client";

import { useState, useEffect } from "react";
import { collection, query, getDocs, orderBy, where, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { RoleGuard } from "@/components/layout/role-guard";
import { AppLayout } from "@/components/layout/app-layout";
import { Expense } from "@/types/finance";
import { Purchase } from "@/types/purchase";
import { Invoice, Ticket } from "@/types/schema";
import { getOperationalCosts, computeHourlyRates } from "@/lib/costs-service";
import { 
    exportFormato606Txt, 
    exportFormato606Excel, 
    exportFormato607Txt, 
    exportFormato607Excel 
} from "@/lib/dgii-tax-service";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
    PieChart, 
    Pie, 
    Cell, 
    Tooltip, 
    ResponsiveContainer, 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Legend 
} from "recharts";
import { 
    DollarSign, 
    TrendingUp, 
    TrendingDown, 
    BrainCircuit, 
    Loader2, 
    AlertTriangle, 
    ArrowUpRight, 
    Download, 
    FileSpreadsheet, 
    Building2, 
    Layers, 
    ShieldCheck, 
    Sparkles, 
    ExternalLink, 
    CheckCircle2,
    Calendar
} from "lucide-react";

interface TicketMarginRow {
    ticketId: string;
    ticketNumber: string;
    clientName: string;
    technicianName: string;
    billedAmount: number;
    materialsCost: number;
    laborHours: number;
    laborCost: number;
    totalCost: number;
    netMargin: number;
    marginPercent: number;
    date: Date;
}

export default function DashboardFinancieroPage() {
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<"MONTH" | "WEEK" | "ALL">("MONTH");
    
    // Financial State
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [tickets, setTickets] = useState<Ticket[]>([]);
    
    const [summary, setSummary] = useState({
        totalBilled: 0,
        totalMaterialsOpex: 0,
        totalLaborOpex: 0,
        totalFixedOpex: 0,
        totalCapex: 0,
        totalFuel: 0,
        grossProfit: 0,
        netProfit: 0,
        grossMarginPercent: 0,
        hourlyRate: 1378
    });

    const [ticketMargins, setTicketMargins] = useState<TicketMarginRow[]>([]);
    const [pieData, setPieData] = useState<any[]>([]);
    const [barData, setBarData] = useState<any[]>([]);

    // AI State
    const [aiLoading, setAiLoading] = useState(false);
    const [aiReport, setAiReport] = useState<string | null>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            // 1. Cargar costos fijos base (RD$ 516k) y calcular tasa horaria productiva
            const opCosts = await getOperationalCosts();
            const rates = computeHourlyRates(opCosts);
            const hourlyRate = Math.round(rates.costoHoraProductiva) || 1378;
            const monthlyFixedCost = rates.totalRegisteredCosts || 516000;

            // 2. Fetch Invoices (Ventas / 607)
            const invSnap = await getDocs(query(collection(db, "invoices"), orderBy("createdAt", "desc")));
            const invList: Invoice[] = [];
            let totalIncome = 0;
            invSnap.forEach(doc => {
                const inv = { id: doc.id, ...doc.data() } as Invoice;
                invList.push(inv);
                totalIncome += Number(inv.total || 0);
            });
            setInvoices(invList);

            // 3. Fetch Purchases (Egresos, Materiales, CAPEX, Combustible / 606)
            const purSnap = await getDocs(query(collection(db, "purchases"), orderBy("createdAt", "desc")));
            const purList: Purchase[] = [];
            let matOpex = 0;
            let capexTotal = 0;
            let fuelTotal = 0;
            let generalOpex = 0;

            purSnap.forEach(doc => {
                const p = { id: doc.id, ...doc.data() } as Purchase;
                purList.push(p);
                const tot = Number(p.total || 0);

                if (p.expenseType === "CAPEX_EQUIPO") capexTotal += tot;
                else if (p.expenseType === "COMBUSTIBLE") fuelTotal += tot;
                else if (p.expenseType === "OPEX_GENERAL") generalOpex += tot;
                else matOpex += tot; // OPEX_TICKET o sin clasificar
            });
            setPurchases(purList);

            // 4. Fetch Tickets (Para calcular Horas y Margen Real por Ticket)
            const tickSnap = await getDocs(query(collection(db, "tickets"), orderBy("createdAt", "desc")));
            const tickList: Ticket[] = [];
            const marginRows: TicketMarginRow[] = [];
            let totalLaborCost = 0;

            tickSnap.forEach(doc => {
                const t = { id: doc.id, ...doc.data() } as Ticket;
                tickList.push(t);

                // Calcular horas de trabajo (estimadas o registradas en bitácora)
                const hours = (t as any).totalHoursSpent || (t as any).durationHours || 2.5; // 2.5h promedio si no hay bitácora
                const laborCost = hours * hourlyRate;
                totalLaborCost += laborCost;

                // Compras asociadas a este ticket
                const ticketPurchases = purList.filter(p => p.ticketId === t.id);
                const materialsCost = ticketPurchases.reduce((acc, p) => acc + (p.total || 0), 0);

                // Facturación asociada (si existe)
                const ticketInvoice = invList.find(i => (i as any).ticketId === t.id);
                const billedAmount = ticketInvoice ? Number(ticketInvoice.total || 0) : ((t as any).totalAmount || (materialsCost + laborCost) * 1.4);

                const totalCost = materialsCost + laborCost;
                const netMargin = billedAmount - totalCost;
                const marginPercent = billedAmount > 0 ? (netMargin / billedAmount) * 100 : 0;

                marginRows.push({
                    ticketId: t.id || "",
                    ticketNumber: t.ticketNumber || t.id?.slice(0, 8) || "S/N",
                    clientName: t.clientName || "Cliente General",
                    technicianName: (t as any).technicianName || "Cuadrilla Asignada",
                    billedAmount,
                    materialsCost,
                    laborHours: hours,
                    laborCost,
                    totalCost,
                    netMargin,
                    marginPercent,
                    date: t.createdAt ? (t.createdAt as any).toDate ? (t.createdAt as any).toDate() : new Date(t.createdAt as any) : new Date()
                });
            });

            setTickets(tickList);
            setTicketMargins(marginRows);

            // 5. Consolidación P&L Total
            const totalDirectCost = matOpex + totalLaborCost;
            const grossProfit = totalIncome - totalDirectCost;
            const netProfit = grossProfit - (monthlyFixedCost + fuelTotal + generalOpex);
            const grossMarginPercent = totalIncome > 0 ? (grossProfit / totalIncome) * 100 : 0;

            setSummary({
                totalBilled: totalIncome,
                totalMaterialsOpex: matOpex,
                totalLaborOpex: totalLaborCost,
                totalFixedOpex: monthlyFixedCost,
                totalCapex: capexTotal,
                totalFuel: fuelTotal,
                grossProfit,
                netProfit,
                grossMarginPercent,
                hourlyRate
            });

            // 6. Preparar Gráficos
            setPieData([
                { name: "Mano de Obra (Campo)", value: Math.round(totalLaborCost), color: "#3b82f6" },
                { name: "Materiales de Tickets", value: Math.round(matOpex), color: "#ef4444" },
                { name: "Estructura Fija (Flota/Local)", value: Math.round(monthlyFixedCost), color: "#8b5cf6" },
                { name: "Combustible", value: Math.round(fuelTotal), color: "#f59e0b" },
                { name: "CAPEX (Equipos)", value: Math.round(capexTotal), color: "#10b981" },
            ].filter(d => d.value > 0));

            setBarData([
                {
                    name: "P&L Consolidado",
                    "Ingresos Facturados": totalIncome,
                    "Costos Directos": totalDirectCost,
                    "Utilidad Bruta": Math.max(0, grossProfit)
                }
            ]);

        } catch (error) {
            console.error("Error al cargar datos financieros consolidados:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const generateAiReport = async () => {
        setAiLoading(true);
        try {
            const prompt = `Analiza como Director Financiero experto en climatización (HVAC) y operaciones de campo los siguientes números de HECHO SRL (República Dominicana):
- Total Facturado: RD$ ${summary.totalBilled.toLocaleString()}
- Costo Materiales Tickets: RD$ ${summary.totalMaterialsOpex.toLocaleString()}
- Costo Mano de Obra Aplicada (a RD$ ${summary.hourlyRate}/h): RD$ ${summary.totalLaborOpex.toLocaleString()}
- Estructura Fija Operativa (3 Flotillas): RD$ ${summary.totalFixedOpex.toLocaleString()}
- Inversión en Activos/CAPEX: RD$ ${summary.totalCapex.toLocaleString()}
- Combustible: RD$ ${summary.totalFuel.toLocaleString()}
- Margen Bruto: ${summary.grossMarginPercent.toFixed(1)}%
- Total Tickets Evaluados: ${ticketMargins.length}

Entrega un análisis ejecutivo en 4 secciones concretas:
1. Diagnóstico de Salud Financiera y Rentabilidad Real.
2. Detección de Fugas de Dinero (Materiales vs. Horas en Calle).
3. Recomendación de Precios / Tarifa Mínima por Ticket.
4. Plan de Acción Inmediato para maximizar el margen neto.`;

            const res = await fetch("/api/gemini", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt })
            });

            const data = await res.json();
            setAiReport(data.response || data.text || "Reporte generado.");
        } catch (err: any) {
            alert("Error al generar análisis IA: " + err.message);
        } finally {
            setAiLoading(false);
        }
    };

    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('es-DO', {
            style: 'currency',
            currency: 'DOP'
        }).format(amount || 0);
    };

    return (
        <RoleGuard allowedRoles={["ADMIN", "SUPERVISOR", "GERENTE"]}>
            <AppLayout>
                <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
                    {/* Header Banner */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl shadow-xl">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="px-2.5 py-0.5 bg-indigo-500/30 text-indigo-300 text-[10px] font-black rounded-full uppercase tracking-wider border border-indigo-400/30">
                                    Consolidación Financiera & P&L
                                </span>
                                <Badge variant="outline" className="text-emerald-400 border-emerald-500/40 text-[10px]">
                                    Base Productiva: RD$ {summary.hourlyRate}/h
                                </Badge>
                            </div>
                            <h1 className="text-2xl md:text-3xl font-black tracking-tight">Tablero Financiero & Margen Real</h1>
                            <p className="text-xs md:text-sm text-slate-300 mt-1">
                                P&L operativo en tiempo real, margen exacto por ticket, activos CAPEX y formatos fiscales DGII.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <Button 
                                onClick={generateAiReport} 
                                disabled={aiLoading}
                                className="bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl shadow-lg gap-2 text-xs h-10"
                            >
                                {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BrainCircuit className="w-4 h-4" />}
                                Diagnóstico IA 2026
                            </Button>
                        </div>
                    </div>

                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card className="rounded-2xl border-slate-200 shadow-sm bg-gradient-to-br from-emerald-50/50 to-white">
                            <CardContent className="p-4 space-y-1">
                                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> Ingresos Facturados
                                </span>
                                <div className="text-2xl font-black text-emerald-700">{formatMoney(summary.totalBilled)}</div>
                                <span className="text-[10px] text-emerald-600 font-semibold">{invoices.length} facturas (607)</span>
                            </CardContent>
                        </Card>

                        <Card className="rounded-2xl border-slate-200 shadow-sm">
                            <CardContent className="p-4 space-y-1">
                                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                    <Layers className="w-3.5 h-3.5 text-rose-600" /> Costos Directos Tickets
                                </span>
                                <div className="text-2xl font-black text-rose-700">
                                    {formatMoney(summary.totalMaterialsOpex + summary.totalLaborOpex)}
                                </div>
                                <span className="text-[10px] text-slate-400">Materiales + Horas Campo</span>
                            </CardContent>
                        </Card>

                        <Card className="rounded-2xl border-slate-200 shadow-sm">
                            <CardContent className="p-4 space-y-1">
                                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                    <DollarSign className="w-3.5 h-3.5 text-blue-600" /> Margen Bruto Real
                                </span>
                                <div className="text-2xl font-black text-blue-700">{formatMoney(summary.grossProfit)}</div>
                                <span className="text-[10px] font-bold text-blue-600">{summary.grossMarginPercent.toFixed(1)}% margen bruto</span>
                            </CardContent>
                        </Card>

                        <Card className="rounded-2xl border-slate-200 shadow-sm bg-gradient-to-br from-indigo-50/50 to-white">
                            <CardContent className="p-4 space-y-1">
                                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                    <Building2 className="w-3.5 h-3.5 text-indigo-600" /> Activos / CAPEX
                                </span>
                                <div className="text-2xl font-black text-indigo-700">{formatMoney(summary.totalCapex)}</div>
                                <span className="text-[10px] text-slate-400">Equipos & Flotilla</span>
                            </CardContent>
                        </Card>
                    </div>

                    {/* AI Executive Report Modal / Banner */}
                    {aiReport && (
                        <Card className="rounded-3xl border-2 border-purple-200 bg-gradient-to-br from-purple-50/70 via-white to-indigo-50/50 shadow-md">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base font-black text-purple-950 flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-purple-600" /> Consejo Asesor Financiero IA (HECHO SRL 2026)
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                                {aiReport}
                            </CardContent>
                        </Card>
                    )}

                    {/* Main Tabs */}
                    <Tabs defaultValue="tickets-margin" className="space-y-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                            <TabsList className="bg-white border rounded-2xl p-1 shadow-sm">
                                <TabsTrigger value="tickets-margin" className="rounded-xl text-xs font-bold">Margen Real por Ticket</TabsTrigger>
                                <TabsTrigger value="pl-consolidado" className="rounded-xl text-xs font-bold">P&L & Desglose de Costos</TabsTrigger>
                                <TabsTrigger value="capex-activos" className="rounded-xl text-xs font-bold">Activos & CAPEX</TabsTrigger>
                                <TabsTrigger value="dgii-fiscal" className="rounded-xl text-xs font-bold flex items-center gap-1">
                                    <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" /> Formatos DGII (606 & 607)
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        {/* TAB 1: MARGEN REAL POR TICKET */}
                        <TabsContent value="tickets-margin">
                            <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
                                <CardHeader className="bg-slate-50 border-b p-4">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <CardTitle className="text-sm font-black text-slate-900">Análisis de Rentabilidad por Ticket Cerrado</CardTitle>
                                            <CardDescription className="text-xs text-slate-500">
                                                Compara lo cobrado contra el costo real de materiales y horas hombre a RD$ {summary.hourlyRate}/h.
                                            </CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader className="bg-slate-50/50">
                                            <TableRow>
                                                <TableHead>Ticket / Cliente</TableHead>
                                                <TableHead>Técnico</TableHead>
                                                <TableHead className="text-right">Cobrado</TableHead>
                                                <TableHead className="text-right">Materiales</TableHead>
                                                <TableHead className="text-right">Mano de Obra</TableHead>
                                                <TableHead className="text-right">Costo Total</TableHead>
                                                <TableHead className="text-right">Margen Neto</TableHead>
                                                <TableHead className="text-center">Estado</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {loading ? (
                                                <TableRow>
                                                    <TableCell colSpan={8} className="h-40 text-center">
                                                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-500" />
                                                        <p className="mt-2 text-xs text-slate-500">Calculando márgenes de tickets...</p>
                                                    </TableCell>
                                                </TableRow>
                                            ) : ticketMargins.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={8} className="h-32 text-center text-xs text-slate-500">
                                                        No hay tickets registrados para calcular margen.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                ticketMargins.map((row) => {
                                                    const isGood = row.marginPercent >= 35;
                                                    const isWarning = row.marginPercent > 0 && row.marginPercent < 35;
                                                    const isLoss = row.marginPercent <= 0;

                                                    return (
                                                        <TableRow key={row.ticketId} className="hover:bg-slate-50">
                                                            <TableCell>
                                                                <a href={`/tickets/${row.ticketId}`} className="text-xs font-bold text-blue-700 hover:underline flex items-center gap-1" target="_blank">
                                                                    #{row.ticketNumber}
                                                                    <ExternalLink className="h-3 w-3" />
                                                                </a>
                                                                <div className="text-[11px] text-slate-500 truncate max-w-[160px]">{row.clientName}</div>
                                                            </TableCell>
                                                            <TableCell className="text-xs text-slate-700">
                                                                {row.technicianName}
                                                            </TableCell>
                                                            <TableCell className="text-right font-bold text-xs font-mono text-slate-900">
                                                                {formatMoney(row.billedAmount)}
                                                            </TableCell>
                                                            <TableCell className="text-right text-xs font-mono text-rose-700">
                                                                {formatMoney(row.materialsCost)}
                                                            </TableCell>
                                                            <TableCell className="text-right text-xs font-mono text-indigo-700">
                                                                {formatMoney(row.laborCost)}
                                                                <div className="text-[9px] text-slate-400">({row.laborHours}h)</div>
                                                            </TableCell>
                                                            <TableCell className="text-right font-bold text-xs font-mono text-slate-800">
                                                                {formatMoney(row.totalCost)}
                                                            </TableCell>
                                                            <TableCell className="text-right font-bold text-xs font-mono">
                                                                <span className={isLoss ? "text-rose-600" : isWarning ? "text-amber-600" : "text-emerald-600"}>
                                                                    {formatMoney(row.netMargin)} ({row.marginPercent.toFixed(0)}%)
                                                                </span>
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                {isGood && <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">Rentable</Badge>}
                                                                {isWarning && <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">Ajustado</Badge>}
                                                                {isLoss && <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-[10px]">Pérdida</Badge>}
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </Card>
                        </TabsContent>

                        {/* TAB 2: P&L CONSOLIDADO & GRAFICOS */}
                        <TabsContent value="pl-consolidado">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Card className="rounded-3xl border-slate-200 shadow-sm p-4 space-y-4">
                                    <h3 className="text-sm font-black text-slate-900">Desglose de Costos & Fugas (OPEX + Fijo)</h3>
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                                                    {pieData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip formatter={(val: any) => formatMoney(Number(val))} />
                                                <Legend wrapperStyle={{ fontSize: '11px' }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </Card>

                                <Card className="rounded-3xl border-slate-200 shadow-sm p-4 space-y-4">
                                    <h3 className="text-sm font-black text-slate-900">Comparativa Ingresos vs. Costos Directos</h3>
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={barData}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="name" style={{ fontSize: '11px' }} />
                                                <YAxis style={{ fontSize: '11px' }} />
                                                <Tooltip formatter={(val: any) => formatMoney(Number(val))} />
                                                <Legend wrapperStyle={{ fontSize: '11px' }} />
                                                <Bar dataKey="Ingresos Facturados" fill="#10b981" radius={[8, 8, 0, 0]} />
                                                <Bar dataKey="Costos Directos" fill="#ef4444" radius={[8, 8, 0, 0]} />
                                                <Bar dataKey="Utilidad Bruta" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </Card>
                            </div>
                        </TabsContent>

                        {/* TAB 3: CAPEX & ACTIVOS */}
                        <TabsContent value="capex-activos">
                            <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden p-6 space-y-4">
                                <div>
                                    <h3 className="text-sm font-black text-slate-900">Registro y Depreciación de Activos (CAPEX)</h3>
                                    <p className="text-xs text-slate-500">
                                        Los equipos mayores de climatización, herramientas pesadas y vehículos se amortizan mensualmente sin castigar la pérdida de un solo mes.
                                    </p>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200">
                                        <span className="text-[11px] font-bold text-amber-900">Inversión Acumulada en Activos</span>
                                        <div className="text-xl font-black text-amber-900 mt-1">{formatMoney(summary.totalCapex)}</div>
                                    </div>
                                    <div className="p-4 bg-blue-50 rounded-2xl border border-blue-200">
                                        <span className="text-[11px] font-bold text-blue-900">Depreciación Mensual Estimada</span>
                                        <div className="text-xl font-black text-blue-900 mt-1">{formatMoney(summary.totalCapex / 60)}/mes</div>
                                    </div>
                                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
                                        <span className="text-[11px] font-bold text-emerald-900">Vida Útil Promedio</span>
                                        <div className="text-xl font-black text-emerald-900 mt-1">5 Años (60 Meses)</div>
                                    </div>
                                </div>
                            </Card>
                        </TabsContent>

                        {/* TAB 4: FORMATOS FISCALES DGII 606 & 607 */}
                        <TabsContent value="dgii-fiscal">
                            <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden p-6 space-y-6">
                                <div>
                                    <h3 className="text-base font-black text-slate-900">Generación Oficial de Reportes Fiscales (DGII República Dominicana)</h3>
                                    <p className="text-xs text-slate-500">
                                        Exporta los archivos oficiales requeridos por la DGII con 100% de cumplimiento en estructura y campos obligatorios.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Formato 606 */}
                                    <div className="p-5 bg-indigo-50/50 rounded-3xl border border-indigo-200 space-y-3">
                                        <div className="flex items-center gap-2 font-bold text-indigo-950">
                                            <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                                            <span>Formato 606 (Compras de Bienes y Servicios)</span>
                                        </div>
                                        <p className="text-xs text-indigo-900 leading-relaxed">
                                            Contiene todas las compras registradas con RNC, NCF o e-NCF, ITBIS facturado y forma de pago.
                                        </p>
                                        <div className="flex gap-2 pt-2">
                                            <Button 
                                                onClick={() => exportFormato606Txt(purchases, "131947532")} 
                                                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold gap-1 rounded-xl h-9"
                                            >
                                                <Download className="w-3.5 h-3.5" /> Descargar TXT (DGII)
                                            </Button>
                                            <Button 
                                                onClick={() => exportFormato606Excel(purchases, "131947532")} 
                                                variant="outline" 
                                                className="text-xs font-bold gap-1 rounded-xl h-9 border-indigo-300 text-indigo-800"
                                            >
                                                <FileSpreadsheet className="w-3.5 h-3.5" /> Excel 606
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Formato 607 */}
                                    <div className="p-5 bg-emerald-50/50 rounded-3xl border border-emerald-200 space-y-3">
                                        <div className="flex items-center gap-2 font-bold text-emerald-950">
                                            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                                            <span>Formato 607 (Ventas e Ingresos Facturados)</span>
                                        </div>
                                        <p className="text-xs text-emerald-900 leading-relaxed">
                                            Contiene todas las facturas fiscales emitidas por HECHO SRL con desglose de ITBIS y método de cobro.
                                        </p>
                                        <div className="flex gap-2 pt-2">
                                            <Button 
                                                onClick={() => exportFormato607Txt(invoices, "131947532")} 
                                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1 rounded-xl h-9"
                                            >
                                                <Download className="w-3.5 h-3.5" /> Descargar TXT (DGII)
                                            </Button>
                                            <Button 
                                                onClick={() => exportFormato607Excel(invoices, "131947532")} 
                                                variant="outline" 
                                                className="text-xs font-bold gap-1 rounded-xl h-9 border-emerald-300 text-emerald-800"
                                            >
                                                <FileSpreadsheet className="w-3.5 h-3.5" /> Excel 607
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </AppLayout>
        </RoleGuard>
    );
}
