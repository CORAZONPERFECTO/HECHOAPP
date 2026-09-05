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
    getWarrantyRecords, 
    registerWarrantyReturn, 
    applyQualityAdjustment 
} from "@/lib/quality-service";
import { WarrantyTicketRecord, WarrantyResponsibility, QualityAdjustment } from "@/types/quality";
import { 
    ShieldCheck, 
    Plus, 
    AlertOctagon, 
    RotateCcw, 
    TrendingDown, 
    Wrench, 
    FileText, 
    Sparkles, 
    CheckCircle2,
    Loader2
} from "lucide-react";

export default function CalidadGarantiasPage() {
    const router = useRouter();
    const [warranties, setWarranties] = useState<WarrantyTicketRecord[]>([]);
    const [loading, setLoading] = useState(true);

    const [isAddReturnOpen, setIsAddReturnOpen] = useState(false);
    const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);

    // Form for new return
    const [form, setForm] = useState({
        originalTicketId: "",
        originalTicketNumber: "",
        warrantyTicketId: "",
        clientId: "",
        clientName: "",
        equipmentModel: "",
        reportedProblem: "",
        foundCause: "",
        returnSequenceNumber: 1,
        isSameRootCause: false,
        responsibility: "FALLA_MATERIAL_EQUIPO" as WarrantyResponsibility,
        hoursConsumed: 2,
        hourlyRateApplied: 450, // RD$ 450/hora
        materialsCost: 0,
        additionalExpenses: 0,
        validationNotes: ""
    });

    const [adjForm, setAdjForm] = useState({
        originalIncentiveId: "",
        originalTicketId: "",
        warrantyTicketId: "",
        technicianId: "",
        technicianName: "",
        adjustedAmount: 300,
        reason: ""
    });

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await getWarrantyRecords();
            setWarranties(data);
        } catch (e) {
            console.error("Error loading warranty records:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleCreateReturn = async (e: React.FormEvent) => {
        e.preventDefault();
        const user = auth.currentUser;
        if (!user) return;

        try {
            await registerWarrantyReturn({
                originalTicketId: form.originalTicketId,
                originalTicketNumber: form.originalTicketNumber || form.originalTicketId,
                warrantyTicketId: form.warrantyTicketId || `GAR-${Date.now()}`,
                clientId: form.clientId || "client-1",
                clientName: form.clientName || "Cliente General",
                equipmentModel: form.equipmentModel,
                originalWorkDate: new Date(),
                returnDate: new Date(),
                returnSequenceNumber: Number(form.returnSequenceNumber),
                isSameRootCause: form.isSameRootCause,
                reportedProblem: form.reportedProblem,
                foundCause: form.foundCause,
                originalTechnicianIds: ["tech-1"],
                originalTechnicianNames: ["Técnico Principal"],
                attendingTechnicianIds: ["tech-1"],
                evidenceUrls: [],
                responsibility: form.responsibility,
                adminValidated: true,
                validatedBy: user.uid,
                validatedByName: user.displayName || "Admin",
                validationNotes: form.validationNotes,
                hoursConsumed: Number(form.hoursConsumed),
                hourlyRateApplied: Number(form.hourlyRateApplied),
                materialsCost: Number(form.materialsCost),
                additionalExpenses: Number(form.additionalExpenses)
            }, {
                id: user.uid,
                name: user.displayName || "Admin",
                email: user.email || ""
            });

            setIsAddReturnOpen(false);
            await loadData();
        } catch (err: any) {
            alert("Error al registrar retorno: " + err.message);
        }
    };

    const handleCreateAdjustment = async (e: React.FormEvent) => {
        e.preventDefault();
        const user = auth.currentUser;
        if (!user) return;

        try {
            await applyQualityAdjustment({
                originalIncentiveId: adjForm.originalIncentiveId,
                originalTicketId: adjForm.originalTicketId,
                warrantyTicketId: adjForm.warrantyTicketId,
                technicianId: adjForm.technicianId || "tech-1",
                technicianName: adjForm.technicianName || "Técnico",
                adjustedAmount: Number(adjForm.adjustedAmount),
                reason: adjForm.reason
            }, {
                id: user.uid,
                name: user.displayName || "Admin",
                email: user.email || ""
            });

            setIsAdjustmentOpen(false);
            alert("Ajuste de calidad aplicado con éxito.");
            await loadData();
        } catch (err: any) {
            alert("Error al aplicar ajuste: " + err.message);
        }
    };

    // CNC Calculations
    const totalCNC = warranties.reduce((sum, w) => sum + (w.totalCNC || 0), 0);
    const totalReturns = warranties.length;
    const sameCauseCount = warranties.filter(w => w.isSameRootCause).length;

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
                                <span className="bg-rose-100 text-rose-800 text-xs font-bold px-2.5 py-0.5 rounded-full">Calidad y Control</span>
                                <span className="bg-slate-100 text-slate-800 text-xs font-bold px-2.5 py-0.5 rounded-full">Gestión CNC</span>
                            </div>
                            <h1 className="text-2xl md:text-3xl font-black text-slate-900 mt-1">Motor de Calidad, Garantías y CNC</h1>
                            <p className="text-slate-500 text-sm">Control de retrabajos, reincidencias y cálculo del Costo de No Calidad empresarial</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Button onClick={() => setIsAdjustmentOpen(true)} variant="outline" className="text-xs font-semibold">
                                <TrendingDown className="h-3.5 w-3.5 mr-1" /> Ajuste de Calidad
                            </Button>
                            <Button onClick={() => setIsAddReturnOpen(true)} className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md">
                                <Plus className="h-4 w-4 mr-1" /> Registrar Retorno Garantía
                            </Button>
                        </div>
                    </div>

                    {/* Top 4 KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card className="border-l-4 border-l-rose-600 shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Costo de No Calidad (CNC)</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-black text-rose-700">RD$ {totalCNC.toLocaleString()}</div>
                                <p className="text-[11px] text-slate-500 mt-1">Horas + Materiales en retrabajos</p>
                            </CardContent>
                        </Card>

                        <Card className="border-l-4 border-l-amber-500 shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Retornos / Garantías</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-black text-amber-600">{totalReturns}</div>
                                <p className="text-[11px] text-slate-500 mt-1">Tickets de garantía vinculados</p>
                            </CardContent>
                        </Card>

                        <Card className="border-l-4 border-l-purple-600 shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Reincidencias Misma Causa</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-black text-purple-700">{sameCauseCount}</div>
                                <p className="text-[11px] text-slate-500 mt-1">Fallas recurrentes en seguimiento</p>
                            </CardContent>
                        </Card>

                        <Card className="border-l-4 border-l-emerald-600 shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tasa Trabajos Sin Retorno</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-black text-emerald-600">96.8%</div>
                                <p className="text-[11px] text-emerald-700 font-semibold mt-1">Calidad operativa excelente</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Notice */}
                    <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
                        <AlertOctagon className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />
                        <div className="text-xs text-rose-900 leading-relaxed">
                            <span className="font-bold">POLÍTICA DE CALIDAD HECHO: </span>
                            El Costo de No Calidad (CNC) es un indicador financiero <strong>empresarial</strong>. Nunca se convierte automáticamente en deuda salarial del técnico. La responsabilidad se clasifica administrativamente para distinguir fallas de material, cambios del cliente o problemas de supervisión antes de aplicar cualquier ajuste sobre el componente de calidad retenido.
                        </div>
                    </div>

                    {/* Warranties Table */}
                    <Card className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                        <CardHeader className="bg-slate-50 border-b border-slate-100 pb-3">
                            <CardTitle className="text-base font-bold text-slate-900">Historial de Tickets de Garantía y Retornos</CardTitle>
                            <CardDescription className="text-xs text-slate-500">Trazabilidad vinculada con los tickets originales y clasificación de causa</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                                        <tr>
                                            <th className="p-4">Ticket Retorno / Original</th>
                                            <th className="p-4">Cliente / Equipo</th>
                                            <th className="p-4">Problema Reportado & Causa</th>
                                            <th className="p-4">Clasificación Responsabilidad</th>
                                            <th className="p-4 text-center">Secuencia</th>
                                            <th className="p-4 text-right">CNC (Costo No Calidad)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {warranties.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="p-8 text-center text-slate-400">
                                                    No hay tickets de garantía registrados. ¡Excelente nivel de calidad!
                                                </td>
                                            </tr>
                                        ) : (
                                            warranties.map(w => (
                                                <tr key={w.id} className="hover:bg-slate-50/80 transition-colors">
                                                    <td className="p-4">
                                                        <div className="font-bold text-slate-900">{w.warrantyTicketId}</div>
                                                        <div className="text-[11px] text-blue-600 font-medium">Orig: #{w.originalTicketNumber}</div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="font-semibold text-slate-900">{w.clientName}</div>
                                                        {w.equipmentModel && <div className="text-[11px] text-slate-500">{w.equipmentModel}</div>}
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="font-medium text-slate-800">{w.reportedProblem}</div>
                                                        {w.foundCause && <div className="text-[11px] text-rose-700">Causa: {w.foundCause}</div>}
                                                    </td>
                                                    <td className="p-4">
                                                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800">
                                                            {w.responsibility.replace(/_/g, ' ')}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                            w.returnSequenceNumber === 1 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                                                        }`}>
                                                            Retorno #{w.returnSequenceNumber}
                                                        </span>
                                                        {w.isSameRootCause && <div className="text-[9px] text-rose-600 font-bold mt-0.5">Misma Causa</div>}
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <div className="font-black text-rose-700 text-sm">RD$ {w.totalCNC.toLocaleString()}</div>
                                                        <div className="text-[10px] text-slate-400">{w.hoursConsumed}h @ RD$ {w.hourlyRateApplied}/h</div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* MODAL: Registrar Retorno */}
                    {isAddReturnOpen && (
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
                                <div className="flex justify-between items-center border-b pb-3">
                                    <h3 className="text-lg font-bold text-slate-900">Registrar Retorno por Garantía</h3>
                                    <button onClick={() => setIsAddReturnOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">✕</button>
                                </div>
                                <form onSubmit={handleCreateReturn} className="space-y-3 text-xs">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <Label>Ticket Original (OBLIGATORIO)</Label>
                                            <Input
                                                required
                                                placeholder="ID o # Ticket previo"
                                                value={form.originalTicketNumber}
                                                onChange={(e) => setForm({ ...form, originalTicketNumber: e.target.value, originalTicketId: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <Label>Cliente</Label>
                                            <Input
                                                placeholder="Nombre del Cliente"
                                                value={form.clientName}
                                                onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <Label>Problema Reportado por Cliente</Label>
                                        <Input
                                            required
                                            placeholder="ej: El equipo no enfría tras 5 días de servicio"
                                            value={form.reportedProblem}
                                            onChange={(e) => setForm({ ...form, reportedProblem: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <Label>Causa Encontrada en Campo</Label>
                                        <Input
                                            placeholder="ej: Fuga en tuerca flare / bornera floja"
                                            value={form.foundCause}
                                            onChange={(e) => setForm({ ...form, foundCause: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <Label>Clasificación de Responsabilidad</Label>
                                            <select
                                                className="w-full border rounded-lg p-2 h-10 bg-white"
                                                value={form.responsibility}
                                                onChange={(e) => setForm({ ...form, responsibility: e.target.value as any })}
                                            >
                                                <option value="FALLA_MATERIAL_EQUIPO">Falla de Material / Equipo</option>
                                                <option value="ATRIBUIBLE_TECNICO">Atribuible a Mano de Obra</option>
                                                <option value="CAMBIO_SOLICITADO_CLIENTE">Cambio Solicitado por Cliente</option>
                                                <option value="PROBLEMA_DIFERENTE">Problema Diferente</option>
                                                <option value="ERROR_SUPERVISION">Error de Supervisión</option>
                                                <option value="CAUSA_EXTERNA">Causa Externa (Eléctrica, etc.)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <Label>Número de Retorno</Label>
                                            <select
                                                className="w-full border rounded-lg p-2 h-10 bg-white"
                                                value={form.returnSequenceNumber}
                                                onChange={(e) => setForm({ ...form, returnSequenceNumber: Number(e.target.value) })}
                                            >
                                                <option value="1">Retorno #1 (Primer Regreso)</option>
                                                <option value="2">Retorno #2 (Reincidencia)</option>
                                                <option value="3">Retorno #3 (Crítico)</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-xl space-y-2 border">
                                        <div className="font-bold text-slate-800">Cálculo de Costo de No Calidad (CNC):</div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <div>
                                                <Label>Horas</Label>
                                                <Input
                                                    type="number"
                                                    value={form.hoursConsumed}
                                                    onChange={(e) => setForm({ ...form, hoursConsumed: Number(e.target.value) })}
                                                />
                                            </div>
                                            <div>
                                                <Label>Costo/Hora (RD$)</Label>
                                                <Input
                                                    type="number"
                                                    value={form.hourlyRateApplied}
                                                    onChange={(e) => setForm({ ...form, hourlyRateApplied: Number(e.target.value) })}
                                                />
                                            </div>
                                            <div>
                                                <Label>Materiales (RD$)</Label>
                                                <Input
                                                    type="number"
                                                    value={form.materialsCost}
                                                    onChange={(e) => setForm({ ...form, materialsCost: Number(e.target.value) })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-2 pt-3 border-t">
                                        <Button type="button" variant="ghost" onClick={() => setIsAddReturnOpen(false)}>Cancelar</Button>
                                        <Button type="submit" className="bg-rose-600 text-white font-bold">Registrar Garantía</Button>
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
