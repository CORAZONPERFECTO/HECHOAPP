"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { AppLayout } from "@/components/layout/app-layout";
import { RoleGuard } from "@/components/layout/role-guard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
    getIncentives, 
    getIncentiveTypes, 
    registerIncentive, 
    updateIncentiveStatus, 
    addIncentiveType 
} from "@/lib/incentives-service";
import { IncentiveRecord, IncentiveType, IncentiveStatus } from "@/types/incentives";
import { 
    Award, 
    Plus, 
    CheckCircle2, 
    Clock, 
    CheckCheck, 
    DollarSign, 
    FileText, 
    Download, 
    Wrench, 
    Sparkles, 
    AlertTriangle,
    Loader2
} from "lucide-react";

export default function IncentivosAdminPage() {
    const router = useRouter();
    const [incentives, setIncentives] = useState<IncentiveRecord[]>([]);
    const [types, setTypes] = useState<IncentiveType[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("all");

    // Modal states
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isAddTypeOpen, setIsAddTypeOpen] = useState(false);

    // New Incentive Form
    const [incForm, setIncForm] = useState({
        beneficiaryId: "",
        beneficiaryName: "",
        beneficiaryCedula: "",
        typeKey: "PASANTES",
        quantity: 1,
        rate: 500,
        ticketIds: "",
        primaryTicketId: "",
        ticketNumber: "",
        fleetName: "Flotilla 1",
        observations: ""
    });

    // New Incentive Type Form
    const [typeForm, setTypeForm] = useState({
        key: "",
        name: "",
        description: "",
        defaultRate: 1000,
        hasQualityComponent: true,
        productivityRatio: 0.70,
        qualityRatio: 0.30,
        qualityHoldPeriodDays: 30
    });

    const loadData = async () => {
        setLoading(true);
        try {
            const [iData, tData] = await Promise.all([
                getIncentives(),
                getIncentiveTypes()
            ]);
            setIncentives(iData);
            setTypes(tData);
        } catch (e) {
            console.error("Error loading incentives:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleCreateIncentive = async (e: React.FormEvent) => {
        e.preventDefault();
        const user = auth.currentUser;
        if (!user) return;

        const incType = types.find(t => t.key === incForm.typeKey) || types[0];
        const ticketList = incForm.ticketIds.split(",").map(t => t.trim()).filter(Boolean);
        if (ticketList.length === 0) {
            alert("⚠️ REGLA OBLIGATORIA: Debes ingresar al menos un ID o Número de Ticket justificativo.");
            return;
        }

        try {
            await registerIncentive({
                beneficiaryId: incForm.beneficiaryId || "tech-1",
                beneficiaryName: incForm.beneficiaryName,
                beneficiaryCedula: incForm.beneficiaryCedula,
                typeKey: incType.key,
                typeName: incType.name,
                quantity: Number(incForm.quantity),
                rate: Number(incForm.rate),
                totalAmount: Number(incForm.quantity) * Number(incForm.rate),
                ticketIds: ticketList,
                primaryTicketId: ticketList[0],
                ticketNumber: incForm.ticketNumber || ticketList[0],
                fleetName: incForm.fleetName,
                periodId: new Date().toISOString().slice(0, 7),
                status: "PENDING_VALIDATION",
                observations: incForm.observations
            }, incType, {
                id: user.uid,
                name: user.displayName || "Supervisor",
                email: user.email || ""
            });

            setIsCreateOpen(false);
            setIncForm({
                beneficiaryId: "",
                beneficiaryName: "",
                beneficiaryCedula: "",
                typeKey: "PASANTES",
                quantity: 1,
                rate: 500,
                ticketIds: "",
                primaryTicketId: "",
                ticketNumber: "",
                fleetName: "Flotilla 1",
                observations: ""
            });
            await loadData();
        } catch (err: any) {
            alert("Error: " + err.message);
        }
    };

    const handleCreateType = async (e: React.FormEvent) => {
        e.preventDefault();
        const user = auth.currentUser;
        if (!user) return;
        try {
            await addIncentiveType({
                key: typeForm.key.toUpperCase().replace(/\s+/g, "_"),
                name: typeForm.name,
                description: typeForm.description,
                defaultRate: Number(typeForm.defaultRate),
                hasQualityComponent: typeForm.hasQualityComponent,
                productivityRatio: Number(typeForm.productivityRatio),
                qualityRatio: Number(typeForm.qualityRatio),
                qualityHoldPeriodDays: Number(typeForm.qualityHoldPeriodDays),
                requiresTicket: true,
                requiresPhotoEvidence: true,
                active: true
            }, {
                id: user.uid,
                name: user.displayName || "Admin",
                email: user.email || ""
            });
            setIsAddTypeOpen(false);
            await loadData();
        } catch (err: any) {
            alert("Error: " + err.message);
        }
    };

    const handleUpdateStatus = async (id: string, status: IncentiveStatus) => {
        const user = auth.currentUser;
        if (!user) return;
        try {
            await updateIncentiveStatus(id, status, {
                id: user.uid,
                name: user.displayName || "Admin",
                email: user.email || ""
            });
            await loadData();
        } catch (e: any) {
            alert("Error al actualizar estado: " + e.message);
        }
    };

    // Metrics
    const totalGenerated = incentives.reduce((sum, i) => sum + (i.totalAmount || 0), 0);
    const totalApproved = incentives.filter(i => i.status === "APPROVED_FOR_PAYMENT" || i.status === "PAID").reduce((sum, i) => sum + (i.totalAmount || 0), 0);
    const totalPaid = incentives.filter(i => i.status === "PAID").reduce((sum, i) => sum + (i.totalAmount || 0), 0);
    const pendingCount = incentives.filter(i => i.status === "PENDING_VALIDATION" || i.status === "GENERATED").length;

    // Export to Excel
    const handleExportExcel = async () => {
        try {
            const XLSX = await import("xlsx");
            const workbook = XLSX.utils.book_new();

            const rows = incentives.map((i, idx) => ({
                No: idx + 1,
                ID_Incentivo: i.id,
                Beneficiario: i.beneficiaryName,
                Cedula: i.beneficiaryCedula || "N/A",
                Concepto: i.typeName,
                Cantidad: i.quantity,
                Tarifa_RD$: i.rate,
                Monto_Bruto_RD$: i.totalAmount,
                Productividad_RD$: i.productivityAmount || i.totalAmount,
                Retencion_Calidad_RD$: i.qualityAmount || 0,
                Ajuste_Calidad_RD$: i.qualityAdjustedAmount || 0,
                Total_Neto_RD$: (i.totalAmount || 0) - (i.qualityAdjustedAmount || 0),
                Tickets_Justificativos: i.ticketIds.join(", "),
                Estado: i.status,
                Periodo: i.periodId
            }));

            const sheet = XLSX.utils.json_to_sheet(rows);
            XLSX.utils.book_append_sheet(workbook, sheet, "Incentivos Operacionales");
            XLSX.writeFile(workbook, `Reporte_Incentivos_HECHO_${new Date().toISOString().slice(0, 10)}.xlsx`);
        } catch (e: any) {
            alert("Error al exportar: " + e.message);
        }
    };

    if (loading) {
        return (
            <RoleGuard allowedRoles={["ADMIN", "SUPERVISOR", "GERENTE"]}>
                <AppLayout>
                    <div className="flex items-center justify-center min-h-[60vh]">
                        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                    </div>
                </AppLayout>
            </RoleGuard>
        );
    }

    return (
        <RoleGuard allowedRoles={["ADMIN", "SUPERVISOR", "GERENTE"]}>
            <AppLayout>
                <div className="space-y-6 max-w-7xl mx-auto pb-12">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-0.5 rounded-full">Gestión de Personal</span>
                                <span className="bg-purple-100 text-purple-800 text-xs font-bold px-2.5 py-0.5 rounded-full">Trazabilidad Total</span>
                            </div>
                            <h1 className="text-2xl md:text-3xl font-black text-slate-900 mt-1">Motor de Incentivos y Pasantes</h1>
                            <p className="text-slate-500 text-sm">Validación operacional, cálculo de incentivos compuestos y justificación para Contabilidad</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Button onClick={handleExportExcel} variant="outline" className="text-xs font-semibold">
                                <Download className="h-3.5 w-3.5 mr-1" /> Exportar Excel
                            </Button>
                            <Button onClick={() => setIsAddTypeOpen(true)} variant="outline" className="text-xs font-semibold">
                                <Plus className="h-3.5 w-3.5 mr-1" /> Crear Tipo Incentivo
                            </Button>
                            <Button onClick={() => setIsCreateOpen(true)} className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md">
                                <Plus className="h-4 w-4 mr-1" /> Registrar Incentivo
                            </Button>
                        </div>
                    </div>

                    {/* Top 4 KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card className="border-l-4 border-l-slate-900 shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Generado</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-black text-slate-900">RD$ {totalGenerated.toLocaleString()}</div>
                                <p className="text-[11px] text-slate-500 mt-1">{incentives.length} incentivos en sistema</p>
                            </CardContent>
                        </Card>

                        <Card className="border-l-4 border-l-amber-500 shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Por Validar / Aprobar</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-black text-amber-600">{pendingCount}</div>
                                <p className="text-[11px] text-slate-500 mt-1">Requieren firma de supervisión</p>
                            </CardContent>
                        </Card>

                        <Card className="border-l-4 border-l-blue-600 shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Aprobados para Pago</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-black text-blue-700">RD$ {totalApproved.toLocaleString()}</div>
                                <p className="text-[11px] text-blue-600 font-semibold mt-1">Listos para tesorería</p>
                            </CardContent>
                        </Card>

                        <Card className="border-l-4 border-l-emerald-600 shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Pagado</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-black text-emerald-600">RD$ {totalPaid.toLocaleString()}</div>
                                <p className="text-[11px] text-emerald-700 font-semibold mt-1">Con soporte contable</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Main Tabs */}
                    <Tabs defaultValue="list" className="w-full">
                        <TabsList className="grid grid-cols-3 max-w-md mb-6">
                            <TabsTrigger value="list">Incentivos</TabsTrigger>
                            <TabsTrigger value="pasantes">Módulo Pasantes</TabsTrigger>
                            <TabsTrigger value="types">Reglas y Tipos</TabsTrigger>
                        </TabsList>

                        {/* Tab 1: Incentives Table */}
                        <TabsContent value="list" className="space-y-4">
                            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                                            <tr>
                                                <th className="p-4">Beneficiario / Técnico</th>
                                                <th className="p-4">Concepto / Tipo</th>
                                                <th className="p-4">Tickets Justificativos</th>
                                                <th className="p-4 text-center">Cant. × Tarifa</th>
                                                <th className="p-4 text-right">Total RD$</th>
                                                <th className="p-4">Componente Calidad</th>
                                                <th className="p-4 text-center">Estado</th>
                                                <th className="p-4 text-center">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {incentives.length === 0 ? (
                                                <tr>
                                                    <td colSpan={8} className="p-8 text-center text-slate-400">
                                                        No hay registros de incentivos aún. Haz clic en "Registrar Incentivo" para crear el primero.
                                                    </td>
                                                </tr>
                                            ) : (
                                                incentives.map(inc => (
                                                    <tr key={inc.id} className="hover:bg-slate-50/80 transition-colors">
                                                        <td className="p-4">
                                                            <div className="font-bold text-slate-900">{inc.beneficiaryName}</div>
                                                            {inc.beneficiaryCedula && <div className="text-[10px] text-slate-400">Cédula: {inc.beneficiaryCedula}</div>}
                                                            {inc.fleetName && <div className="text-[10px] text-amber-700 font-medium">{inc.fleetName}</div>}
                                                        </td>
                                                        <td className="p-4 font-semibold text-slate-800">
                                                            {inc.typeName}
                                                        </td>
                                                        <td className="p-4">
                                                            <div className="flex flex-wrap gap-1">
                                                                {inc.ticketIds.map(tId => (
                                                                    <span key={tId} className="bg-slate-100 border text-slate-700 font-bold px-1.5 py-0.5 rounded text-[10px]">
                                                                        Ticket #{tId.substring(0, 8)}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </td>
                                                        <td className="p-4 text-center">
                                                            <span className="font-medium text-slate-700">{inc.quantity} × RD$ {inc.rate.toLocaleString()}</span>
                                                        </td>
                                                        <td className="p-4 text-right font-black text-slate-900 text-sm">
                                                            RD$ {inc.totalAmount.toLocaleString()}
                                                        </td>
                                                        <td className="p-4 text-[11px]">
                                                            <div>Prod: <strong className="text-blue-700">RD$ {(inc.productivityAmount || inc.totalAmount).toLocaleString()}</strong></div>
                                                            {inc.qualityAmount ? (
                                                                <div className="text-purple-700">Calidad: <strong>RD$ {inc.qualityAmount.toLocaleString()}</strong></div>
                                                            ) : null}
                                                        </td>
                                                        <td className="p-4 text-center">
                                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                                                inc.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' :
                                                                inc.status === 'APPROVED_FOR_PAYMENT' ? 'bg-blue-100 text-blue-800' :
                                                                inc.status === 'VALIDATED' ? 'bg-indigo-100 text-indigo-800' :
                                                                inc.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                                                                'bg-amber-100 text-amber-800'
                                                            }`}>
                                                                {inc.status.replace(/_/g, ' ')}
                                                            </span>
                                                        </td>
                                                        <td className="p-4 text-center">
                                                            <div className="flex items-center justify-center gap-1">
                                                                {inc.status === 'PENDING_VALIDATION' && (
                                                                    <Button size="sm" onClick={() => handleUpdateStatus(inc.id, 'VALIDATED')} className="h-7 text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white">
                                                                        Validar
                                                                    </Button>
                                                                )}
                                                                {inc.status === 'VALIDATED' && (
                                                                    <Button size="sm" onClick={() => handleUpdateStatus(inc.id, 'APPROVED_FOR_PAYMENT')} className="h-7 text-[10px] bg-blue-600 hover:bg-blue-700 text-white">
                                                                        Aprobar Pago
                                                                    </Button>
                                                                )}
                                                                {inc.status === 'APPROVED_FOR_PAYMENT' && (
                                                                    <Button size="sm" onClick={() => handleUpdateStatus(inc.id, 'PAID')} className="h-7 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white">
                                                                        Marcar Pagado
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </TabsContent>

                        {/* Tab 2: Pasantes */}
                        <TabsContent value="pasantes" className="space-y-4">
                            <Card className="border border-slate-200 rounded-2xl shadow-sm p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <div>
                                        <h3 className="font-bold text-slate-900 text-base">Registro Operacional de Pasantes</h3>
                                        <p className="text-xs text-slate-500">Cada pasante de tubería o cableado genera incentivo directo al técnico ejecutor</p>
                                    </div>
                                    <Button onClick={() => setIsCreateOpen(true)} size="sm" className="bg-amber-600 text-white text-xs font-bold">
                                        <Plus className="h-3.5 w-3.5 mr-1" /> Registrar Pasante
                                    </Button>
                                </div>

                                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
                                    <div className="font-bold">Reglas de Asignación de Pasantes:</div>
                                    <div>• El incentivo pertenece al técnico que realmente perforó/ejecutó el pasante (no se divide entre cuadrilla).</div>
                                    <div>• Tarifa estándar: <strong>RD$ 500 por pasante</strong> (70% productividad inmediata / 30% retenido a 30 días de calidad).</div>
                                    <div>• Un mismo pasante no puede generar doble pago sin autorización de supervisión.</div>
                                </div>
                            </Card>
                        </TabsContent>

                        {/* Tab 3: Types */}
                        <TabsContent value="types" className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {types.map(t => (
                                    <Card key={t.id} className="border border-slate-200 rounded-2xl shadow-sm p-5 space-y-3">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-bold text-slate-900 text-sm">{t.name}</h4>
                                            <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded">
                                                RD$ {t.defaultRate.toLocaleString()}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500">{t.description}</p>
                                        <div className="pt-2 border-t text-xs space-y-1 text-slate-600">
                                            <div className="flex justify-between">
                                                <span>Componente Calidad:</span>
                                                <span className="font-bold">{t.hasQualityComponent ? "Sí (30 Días Retención)" : "No"}</span>
                                            </div>
                                            {t.hasQualityComponent && (
                                                <div className="flex justify-between text-purple-700">
                                                    <span>Distribución:</span>
                                                    <span>{(t.productivityRatio * 100).toFixed(0)}% Prod / {(t.qualityRatio * 100).toFixed(0)}% Calidad</span>
                                                </div>
                                            )}
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </TabsContent>
                    </Tabs>

                    {/* MODAL: Registrar Incentivo */}
                    {isCreateOpen && (
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
                                <div className="flex justify-between items-center border-b pb-3">
                                    <h3 className="text-lg font-bold text-slate-900">Registrar Incentivo Operacional</h3>
                                    <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">✕</button>
                                </div>
                                <form onSubmit={handleCreateIncentive} className="space-y-3 text-xs">
                                    <div>
                                        <Label>Nombre del Técnico / Beneficiario</Label>
                                        <Input
                                            required
                                            placeholder="ej: Juan Pérez"
                                            value={incForm.beneficiaryName}
                                            onChange={(e) => setIncForm({ ...incForm, beneficiaryName: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <Label>Cédula (para Contabilidad)</Label>
                                            <Input
                                                placeholder="001-0000000-0"
                                                value={incForm.beneficiaryCedula}
                                                onChange={(e) => setIncForm({ ...incForm, beneficiaryCedula: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <Label>Tipo de Incentivo</Label>
                                            <select
                                                required
                                                className="w-full border rounded-lg p-2 h-10 bg-white"
                                                value={incForm.typeKey}
                                                onChange={(e) => {
                                                    const sel = types.find(t => t.key === e.target.value);
                                                    setIncForm({ 
                                                        ...incForm, 
                                                        typeKey: e.target.value,
                                                        rate: sel ? sel.defaultRate : incForm.rate 
                                                    });
                                                }}
                                            >
                                                {types.map(t => (
                                                    <option key={t.id} value={t.key}>{t.name} (RD$ {t.defaultRate})</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <Label>Cantidad</Label>
                                            <Input
                                                type="number"
                                                min="1"
                                                required
                                                value={incForm.quantity}
                                                onChange={(e) => setIncForm({ ...incForm, quantity: Number(e.target.value) })}
                                            />
                                        </div>
                                        <div>
                                            <Label>Tarifa Unitaria (RD$)</Label>
                                            <Input
                                                type="number"
                                                required
                                                value={incForm.rate}
                                                onChange={(e) => setIncForm({ ...incForm, rate: Number(e.target.value) })}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="font-bold text-amber-900">Tickets Justificativos (OBLIGATORIO)</Label>
                                        <Input
                                            required
                                            placeholder="Ingresa IDs o números de tickets separados por coma (ej: TCK-101, TCK-102)"
                                            value={incForm.ticketIds}
                                            onChange={(e) => setIncForm({ ...incForm, ticketIds: e.target.value })}
                                        />
                                        <p className="text-[10px] text-slate-400 mt-0.5">Ningún incentivo puede pagarse sin justificación de ticket en campo.</p>
                                    </div>
                                    <div>
                                        <Label>Observaciones / Detalle del Trabajo</Label>
                                        <Input
                                            placeholder="ej: 3 pasantes de 4 pulgadas en losa de concreto..."
                                            value={incForm.observations}
                                            onChange={(e) => setIncForm({ ...incForm, observations: e.target.value })}
                                        />
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-xl flex justify-between items-center">
                                        <span className="text-slate-600 font-semibold">Total Calculado:</span>
                                        <span className="text-lg font-black text-slate-900">RD$ {(incForm.quantity * incForm.rate).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-end gap-2 pt-3 border-t">
                                        <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                                        <Button type="submit" className="bg-amber-600 text-white font-bold">Generar Incentivo</Button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </AppLayout>
        </RoleGuard>
    );
}
