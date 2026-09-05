"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { AppLayout } from "@/components/layout/app-layout";
import { RoleGuard } from "@/components/layout/role-guard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
    getOperationalCosts, 
    addOperationalCost, 
    updateOperationalCost,
    getCostCategories,
    addCostCategory,
    getCostCenters,
    getFleets,
    getLoans,
    saveLoan,
    computeHourlyRates,
    HourlyRateMetrics
} from "@/lib/costs-service";
import { OperationalCost, CostCategory, CostCenter, Fleet, Loan } from "@/types/costs";
import { 
    DollarSign, 
    Plus, 
    Building2, 
    Truck, 
    Layers, 
    Clock, 
    TrendingUp, 
    AlertCircle, 
    CheckCircle2, 
    CreditCard, 
    ArrowUpRight, 
    FileSpreadsheet, 
    Sliders,
    HelpCircle,
    Loader2
} from "lucide-react";

export default function CostosRentabilidadPage() {
    const router = useRouter();
    const [costs, setCosts] = useState<OperationalCost[]>([]);
    const [categories, setCategories] = useState<CostCategory[]>([]);
    const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
    const [fleets, setFleets] = useState<Fleet[]>([]);
    const [loans, setLoans] = useState<Loan[]>([]);
    const [loading, setLoading] = useState(true);

    // Filter and modal states
    const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
    const [selectedClassification, setSelectedClassification] = useState<string>("ALL");
    const [isAddCostOpen, setIsAddCostOpen] = useState(false);
    const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
    const [isAddLoanOpen, setIsAddLoanOpen] = useState(false);

    // Hourly rate simulation params
    const [workingDays, setWorkingDays] = useState<number>(24);
    const [dailyHours, setDailyHours] = useState<number>(8);
    const [productiveRatio, setProductiveRatio] = useState<number>(0.65);

    // New Cost Form
    const [costForm, setCostForm] = useState({
        name: "",
        description: "",
        amount: 0,
        currency: "DOP" as "DOP" | "USD",
        frequency: "MENSUAL" as any,
        categoryId: "",
        subcategory: "",
        costCenterId: "",
        classification: "DIRECTO" as any,
        distributionMethod: "POR_FLOTILLA" as any,
        includeInHourlyRate: true,
        isIncludedInOtherCost: false,
        parentCostName: "",
        notes: ""
    });

    // New Category Form
    const [categoryForm, setCategoryForm] = useState({
        name: "",
        description: "",
        subcategories: ""
    });

    // New Loan Form
    const [loanForm, setLoanForm] = useState({
        entity: "",
        concept: "",
        totalPrincipal: 0,
        monthlyQuota: 0,
        interestRateAnnual: 0,
        currentBalance: 0,
        costCenterId: "",
        startDate: "",
        endDate: "",
        notes: ""
    });

    const loadData = async () => {
        setLoading(true);
        try {
            const [cData, catData, ccData, fData, lData] = await Promise.all([
                getOperationalCosts(true),
                getCostCategories(),
                getCostCenters(),
                getFleets(),
                getLoans()
            ]);
            setCosts(cData);
            setCategories(catData);
            setCostCenters(ccData);
            setFleets(fData);
            setLoans(lData);
        } catch (e) {
            console.error("Error loading cost data:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const metrics: HourlyRateMetrics = computeHourlyRates(
        costs,
        fleets.length || 3,
        workingDays,
        dailyHours,
        productiveRatio
    );

    const handleCreateCost = async (e: React.FormEvent) => {
        e.preventDefault();
        const user = auth.currentUser;
        if (!user) return;
        
        const cat = categories.find(c => c.id === costForm.categoryId || c.name === costForm.categoryId);
        const cc = costCenters.find(c => c.id === costForm.costCenterId);

        try {
            await addOperationalCost({
                name: costForm.name,
                description: costForm.description,
                amount: Number(costForm.amount),
                currency: costForm.currency,
                frequency: costForm.frequency,
                startDate: new Date(),
                categoryId: cat ? cat.id : costForm.categoryId,
                categoryName: cat ? cat.name : costForm.categoryId,
                subcategory: costForm.subcategory,
                costCenterId: costForm.costCenterId,
                costCenterName: cc ? cc.name : "General",
                classification: costForm.classification,
                distributionMethod: costForm.distributionMethod,
                includeInHourlyRate: costForm.includeInHourlyRate,
                isIncludedInOtherCost: costForm.isIncludedInOtherCost,
                parentCostName: costForm.parentCostName,
                active: true,
                notes: costForm.notes,
                createdBy: user.uid,
                createdByName: user.displayName || user.email || "Admin"
            }, {
                id: user.uid,
                name: user.displayName || "Admin",
                email: user.email || ""
            });
            setIsAddCostOpen(false);
            setCostForm({
                name: "",
                description: "",
                amount: 0,
                currency: "DOP",
                frequency: "MENSUAL",
                categoryId: "",
                subcategory: "",
                costCenterId: "",
                classification: "DIRECTO",
                distributionMethod: "POR_FLOTILLA",
                includeInHourlyRate: true,
                isIncludedInOtherCost: false,
                parentCostName: "",
                notes: ""
            });
            await loadData();
        } catch (err: any) {
            alert("Error al guardar costo: " + err.message);
        }
    };

    const handleCreateCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        const user = auth.currentUser;
        if (!user) return;
        try {
            const subs = categoryForm.subcategories.split(",").map(s => s.trim());
            await addCostCategory(categoryForm.name, categoryForm.description, subs, {
                id: user.uid,
                name: user.displayName || "Admin",
                email: user.email || ""
            });
            setIsAddCategoryOpen(false);
            setCategoryForm({ name: "", description: "", subcategories: "" });
            await loadData();
        } catch (err: any) {
            alert("Error al guardar categoría: " + err.message);
        }
    };

    const handleCreateLoan = async (e: React.FormEvent) => {
        e.preventDefault();
        const user = auth.currentUser;
        if (!user) return;
        const cc = costCenters.find(c => c.id === loanForm.costCenterId);
        try {
            await saveLoan({
                entity: loanForm.entity,
                concept: loanForm.concept,
                totalPrincipal: Number(loanForm.totalPrincipal),
                monthlyQuota: Number(loanForm.monthlyQuota),
                interestRateAnnual: Number(loanForm.interestRateAnnual),
                currentBalance: Number(loanForm.currentBalance || loanForm.totalPrincipal),
                startDate: loanForm.startDate ? new Date(loanForm.startDate) : new Date(),
                endDate: loanForm.endDate ? new Date(loanForm.endDate) : new Date(),
                costCenterId: loanForm.costCenterId,
                costCenterName: cc ? cc.name : "",
                active: true,
                notes: loanForm.notes
            }, {
                id: user.uid,
                name: user.displayName || "Admin",
                email: user.email || ""
            });
            setIsAddLoanOpen(false);
            setLoanForm({
                entity: "",
                concept: "",
                totalPrincipal: 0,
                monthlyQuota: 0,
                interestRateAnnual: 0,
                currentBalance: 0,
                costCenterId: "",
                startDate: "",
                endDate: "",
                notes: ""
            });
            await loadData();
        } catch (err: any) {
            alert("Error al guardar préstamo: " + err.message);
        }
    };

    const toggleCostActive = async (cost: OperationalCost) => {
        const user = auth.currentUser;
        if (!user) return;
        try {
            await updateOperationalCost(cost.id, { active: !cost.active }, {
                id: user.uid,
                name: user.displayName || "Admin",
                email: user.email || ""
            }, cost.active ? "Desactivación de costo" : "Reactivación de costo");
            await loadData();
        } catch (e: any) {
            alert("Error al actualizar estado: " + e.message);
        }
    };

    const filteredCosts = costs.filter(c => {
        if (selectedCategory !== "ALL" && c.categoryName !== selectedCategory && c.categoryId !== selectedCategory) return false;
        if (selectedClassification !== "ALL" && c.classification !== selectedClassification) return false;
        return true;
    });

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
                                <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full">Área Financiera</span>
                                <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded-full">Exclusivo Admin</span>
                            </div>
                            <h1 className="text-2xl md:text-3xl font-black text-slate-900 mt-1">Motor de Costos y Rentabilidad</h1>
                            <p className="text-slate-500 text-sm">Estructura dinámica de costos operativos, flotillas y cálculo del costo/hora real</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Button onClick={() => setIsAddCategoryOpen(true)} variant="outline" className="text-xs font-semibold">
                                <Plus className="h-3.5 w-3.5 mr-1" /> Nueva Categoría
                            </Button>
                            <Button onClick={() => setIsAddLoanOpen(true)} variant="outline" className="text-xs font-semibold">
                                <CreditCard className="h-3.5 w-3.5 mr-1" /> Préstamo
                            </Button>
                            <Button onClick={() => setIsAddCostOpen(true)} className="bg-slate-900 hover:bg-black text-white text-xs font-bold shadow-md">
                                <Plus className="h-4 w-4 mr-1" /> Agregar Nuevo Costo
                            </Button>
                        </div>
                    </div>

                    {/* Top 4 KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="border-l-4 border-l-emerald-600 shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                                    <span>Costos Registrados</span>
                                    <DollarSign className="h-4 w-4 text-emerald-600" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-black text-slate-900">
                                    RD$ {metrics.totalRegisteredCosts.toLocaleString()}
                                </div>
                                <p className="text-[11px] text-emerald-700 font-semibold mt-1 flex items-center gap-1">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Base activa mensual verificada
                                </p>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                    * Faltan costos pendientes por incorporar
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="border-l-4 border-l-blue-600 shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                                    <span>Costo / Hora Productiva</span>
                                    <Clock className="h-4 w-4 text-blue-600" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-black text-blue-700">
                                    RD$ {metrics.costoHoraProductiva.toFixed(2)}
                                </div>
                                <p className="text-[11px] text-slate-600 mt-1">
                                    Basado en {metrics.productiveHours.toFixed(0)}h productivas/mes
                                </p>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                    Disponible: RD$ {metrics.costoHoraDisponible.toFixed(2)}/h
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="border-l-4 border-l-indigo-600 shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                                    <span>Costo Empresarial / Hora</span>
                                    <TrendingUp className="h-4 w-4 text-indigo-600" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-black text-indigo-700">
                                    RD$ {metrics.costoEmpresarialHora.toFixed(2)}
                                </div>
                                <p className="text-[11px] text-slate-600 mt-1">
                                    Directo + Compartidos + Generales
                                </p>
                                <p className="text-[10px] text-indigo-600 font-medium mt-0.5">
                                    Margen de seguridad integrado
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="border-l-4 border-l-amber-500 shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                                    <span>Distribución de Costos</span>
                                    <Layers className="h-4 w-4 text-amber-600" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-1 text-xs">
                                <div className="flex justify-between text-slate-700">
                                    <span>Directos (Flotillas):</span>
                                    <span className="font-bold">RD$ {metrics.totalDirectCosts.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-slate-700">
                                    <span>Compartidos:</span>
                                    <span className="font-bold">RD$ {metrics.totalSharedCosts.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-slate-700">
                                    <span>Generales:</span>
                                    <span className="font-bold">RD$ {metrics.totalGeneralCosts.toLocaleString()}</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Notice Banner */}
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="text-xs text-amber-900 leading-relaxed">
                            <span className="font-bold">COSTOS ACTUALMENTE REGISTRADOS: </span> 
                            El total mostrado de RD$ {metrics.totalRegisteredCosts.toLocaleString()} corresponde a la base de las 3 flotillas, cuotas vehiculares, supervisión Volvo XC60, almacén y comunicaciones. Los costos aún no incorporados (remuneración del propietario, gerencia, seguros, software, etc.) pueden agregarse en cualquier momento mediante el botón <strong>"Agregar Nuevo Costo"</strong> sin alterar el histórico de tickets pasados.
                        </div>
                    </div>

                    {/* Main Tabs */}
                    <Tabs defaultValue="costs" className="w-full">
                        <TabsList className="grid grid-cols-2 md:grid-cols-4 max-w-2xl mb-6">
                            <TabsTrigger value="costs">Lista de Costos</TabsTrigger>
                            <TabsTrigger value="centers">Centros y Flotillas</TabsTrigger>
                            <TabsTrigger value="simulator">Simulador Costo/Hora</TabsTrigger>
                            <TabsTrigger value="loans">Préstamos / Financiamiento</TabsTrigger>
                        </TabsList>

                        {/* Tab 1: Costs List */}
                        <TabsContent value="costs" className="space-y-4">
                            {/* Filter Bar */}
                            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs font-bold text-slate-500 mr-2">Filtrar por:</span>
                                    <select
                                        className="text-xs border rounded-lg p-2 bg-slate-50 font-medium"
                                        value={selectedCategory}
                                        onChange={(e) => setSelectedCategory(e.target.value)}
                                    >
                                        <option value="ALL">Todas las Categorías</option>
                                        {categories.map(c => (
                                            <option key={c.id} value={c.name}>{c.name}</option>
                                        ))}
                                    </select>

                                    <select
                                        className="text-xs border rounded-lg p-2 bg-slate-50 font-medium"
                                        value={selectedClassification}
                                        onChange={(e) => setSelectedClassification(e.target.value)}
                                    >
                                        <option value="ALL">Todas las Clasificaciones</option>
                                        <option value="DIRECTO">Directo</option>
                                        <option value="COMPARTIDO">Compartido</option>
                                        <option value="GENERAL">General</option>
                                    </select>
                                </div>
                                <div className="text-xs text-slate-500">
                                    Mostrando <strong>{filteredCosts.length}</strong> de {costs.length} conceptos
                                </div>
                            </div>

                            {/* Costs Table */}
                            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                                            <tr>
                                                <th className="p-4">Concepto / Descripción</th>
                                                <th className="p-4">Categoría / Centro</th>
                                                <th className="p-4">Clasificación</th>
                                                <th className="p-4">Distribución</th>
                                                <th className="p-4 text-right">Monto Mensual</th>
                                                <th className="p-4 text-center">En Costo/Hora</th>
                                                <th className="p-4 text-center">Estado</th>
                                                <th className="p-4 text-center">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {filteredCosts.map((cost) => (
                                                <tr key={cost.id} className={`hover:bg-slate-50/80 transition-colors ${!cost.active ? "opacity-50 bg-slate-50/40" : ""}`}>
                                                    <td className="p-4">
                                                        <div className="font-bold text-slate-900">{cost.name}</div>
                                                        {cost.description && <div className="text-[11px] text-slate-500 mt-0.5">{cost.description}</div>}
                                                        {cost.isIncludedInOtherCost && (
                                                            <span className="inline-block mt-1 text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-semibold">
                                                                * Incluido dentro de: {cost.parentCostName || "Base Flotilla"} (Sin doble suma)
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="font-medium text-slate-800">{cost.categoryName}</div>
                                                        <div className="text-[11px] text-slate-400">{cost.costCenterName}</div>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                            cost.classification === 'DIRECTO' ? 'bg-blue-100 text-blue-800' :
                                                            cost.classification === 'COMPARTIDO' ? 'bg-amber-100 text-amber-800' :
                                                            'bg-slate-100 text-slate-800'
                                                        }`}>
                                                            {cost.classification}
                                                        </span>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className="text-slate-600 font-medium">{cost.distributionMethod.replace(/_/g, ' ')}</span>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <span className="font-bold text-slate-900 text-sm">
                                                            RD$ {Number(cost.amount || 0).toLocaleString()}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        {cost.includeInHourlyRate ? (
                                                            <span className="text-emerald-600 font-bold text-xs">Sí</span>
                                                        ) : (
                                                            <span className="text-slate-400 text-xs">No</span>
                                                        )}
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${cost.active ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
                                                            {cost.active ? "Activo" : "Inactivo"}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => toggleCostActive(cost)}
                                                            className="text-xs h-7 px-2"
                                                        >
                                                            {cost.active ? "Desactivar" : "Activar"}
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </TabsContent>

                        {/* Tab 2: Centers and Fleets */}
                        <TabsContent value="centers" className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {fleets.map((fleet) => (
                                    <Card key={fleet.id} className="border border-slate-200 rounded-2xl shadow-sm">
                                        <CardHeader className="bg-slate-50 border-b border-slate-100 pb-3">
                                            <div className="flex items-center justify-between">
                                                <CardTitle className="text-base font-bold text-slate-900">{fleet.name}</CardTitle>
                                                <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded">
                                                    {fleet.code}
                                                </span>
                                            </div>
                                            <CardDescription className="text-xs text-slate-500">
                                                Vehículo: <strong>{fleet.vehicleName}</strong>
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="pt-4 space-y-3 text-xs">
                                            <div className="flex justify-between border-b pb-2">
                                                <span className="text-slate-500">Base Operacional Mensual:</span>
                                                <span className="font-bold text-slate-900">RD$ {fleet.baseMonthlyCost.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between border-b pb-2">
                                                <span className="text-slate-500">Incluye:</span>
                                                <span className="text-slate-700 font-medium">Sueldos + Combustible</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">Centro de Costo:</span>
                                                <span className="text-slate-700 font-medium">{fleet.costCenterId}</span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </TabsContent>

                        {/* Tab 3: Simulator */}
                        <TabsContent value="simulator" className="space-y-4">
                            <Card className="border border-slate-200 rounded-2xl shadow-sm">
                                <CardHeader>
                                    <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                        <Sliders className="h-5 w-5 text-blue-600" />
                                        Simulador Dinámico de Costo por Hora
                                    </CardTitle>
                                    <CardDescription>
                                        Ajusta los días laborales y el ratio de horas productivas para ver el impacto en el costo/hora empresarial
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="sim-days">Días Laborales por Mes</Label>
                                            <Input
                                                id="sim-days"
                                                type="number"
                                                value={workingDays}
                                                onChange={(e) => setWorkingDays(Number(e.target.value))}
                                                className="h-10"
                                            />
                                            <p className="text-[11px] text-slate-400">Estándar HVAC: 22 a 24 días</p>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="sim-hours">Horas por Jornada</Label>
                                            <Input
                                                id="sim-hours"
                                                type="number"
                                                value={dailyHours}
                                                onChange={(e) => setDailyHours(Number(e.target.value))}
                                                className="h-10"
                                            />
                                            <p className="text-[11px] text-slate-400">Estándar: 8 horas/día</p>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="sim-ratio">Ratio Productivo (% en campo)</Label>
                                            <Input
                                                id="sim-ratio"
                                                type="number"
                                                step="0.05"
                                                min="0.3"
                                                max="1.0"
                                                value={productiveRatio}
                                                onChange={(e) => setProductiveRatio(Number(e.target.value))}
                                                className="h-10"
                                            />
                                            <p className="text-[11px] text-slate-400">0.65 = 65% trabajo / 35% traslados</p>
                                        </div>
                                    </div>

                                    {/* Calculated Result Breakdown */}
                                    <div className="p-6 bg-slate-900 text-white rounded-xl grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div>
                                            <div className="text-xs text-slate-400 uppercase font-bold">Horas Disponibles Totales</div>
                                            <div className="text-3xl font-black mt-1">{metrics.availableHours} h</div>
                                            <div className="text-xs text-slate-400 mt-1">({workingDays} días × {dailyHours}h × {fleets.length || 3} cuadrillas)</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-blue-400 uppercase font-bold">Horas Productivas Reales</div>
                                            <div className="text-3xl font-black text-blue-400 mt-1">{metrics.productiveHours.toFixed(0)} h</div>
                                            <div className="text-xs text-slate-400 mt-1">{(productiveRatio * 100).toFixed(0)}% de efectividad de servicio</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-emerald-400 uppercase font-bold">Costo Hora Productiva</div>
                                            <div className="text-3xl font-black text-emerald-400 mt-1">RD$ {metrics.costoHoraProductiva.toFixed(2)}</div>
                                            <div className="text-xs text-slate-400 mt-1">Empresarial: RD$ {metrics.costoEmpresarialHora.toFixed(2)}/h</div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Tab 4: Loans */}
                        <TabsContent value="loans" className="space-y-4">
                            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <div>
                                        <h3 className="font-bold text-slate-900">Estructura de Préstamos y Financiamiento</h3>
                                        <p className="text-xs text-slate-500">Separa la Amortización de Capital (Patrimonio) del Gasto Operativo (Intereses) y Flujo de Caja</p>
                                    </div>
                                    <Button onClick={() => setIsAddLoanOpen(true)} size="sm" className="text-xs font-semibold">
                                        <Plus className="h-3.5 w-3.5 mr-1" /> Registrar Préstamo
                                    </Button>
                                </div>

                                {loans.length === 0 ? (
                                    <div className="text-center py-12 text-slate-400 text-xs">
                                        No hay préstamos registrados aún. Puedes registrar créditos vehiculares o líneas comerciales.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {loans.map(loan => (
                                            <div key={loan.id} className="p-4 border rounded-xl bg-slate-50 space-y-2 text-xs">
                                                <div className="flex justify-between items-start font-bold text-slate-900">
                                                    <span>{loan.concept}</span>
                                                    <span className="text-emerald-700">RD$ {loan.monthlyQuota.toLocaleString()} / mes</span>
                                                </div>
                                                <div className="text-slate-500">Entidad: {loan.entity}</div>
                                                <div className="flex justify-between text-slate-600 border-t pt-2 mt-2">
                                                    <span>Saldo Pendiente:</span>
                                                    <span className="font-bold">RD$ {loan.currentBalance.toLocaleString()}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </TabsContent>
                    </Tabs>

                    {/* MODAL: Agregar Costo */}
                    {isAddCostOpen && (
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
                                <div className="flex justify-between items-center border-b pb-3">
                                    <h3 className="text-lg font-bold text-slate-900">Registrar Nuevo Costo Operacional</h3>
                                    <button onClick={() => setIsAddCostOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">✕</button>
                                </div>
                                <form onSubmit={handleCreateCost} className="space-y-3 text-xs">
                                    <div>
                                        <Label>Nombre / Concepto del Costo</Label>
                                        <Input
                                            required
                                            placeholder="ej: Seguro de Responsabilidad Civil"
                                            value={costForm.name}
                                            onChange={(e) => setCostForm({ ...costForm, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <Label>Monto Mensual (RD$)</Label>
                                            <Input
                                                type="number"
                                                required
                                                min="0"
                                                value={costForm.amount}
                                                onChange={(e) => setCostForm({ ...costForm, amount: Number(e.target.value) })}
                                            />
                                        </div>
                                        <div>
                                            <Label>Categoría</Label>
                                            <select
                                                required
                                                className="w-full border rounded-lg p-2 h-10 bg-white"
                                                value={costForm.categoryId}
                                                onChange={(e) => setCostForm({ ...costForm, categoryId: e.target.value })}
                                            >
                                                <option value="">Seleccione Categoría</option>
                                                {categories.map(c => (
                                                    <option key={c.id} value={c.name}>{c.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <Label>Centro de Costo</Label>
                                            <select
                                                required
                                                className="w-full border rounded-lg p-2 h-10 bg-white"
                                                value={costForm.costCenterId}
                                                onChange={(e) => setCostForm({ ...costForm, costCenterId: e.target.value })}
                                            >
                                                <option value="">Seleccione Centro</option>
                                                {costCenters.map(cc => (
                                                    <option key={cc.id} value={cc.id}>{cc.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <Label>Clasificación</Label>
                                            <select
                                                className="w-full border rounded-lg p-2 h-10 bg-white"
                                                value={costForm.classification}
                                                onChange={(e) => setCostForm({ ...costForm, classification: e.target.value as any })}
                                            >
                                                <option value="DIRECTO">Directo</option>
                                                <option value="COMPARTIDO">Compartido</option>
                                                <option value="GENERAL">General</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-xl space-y-2 border">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={costForm.includeInHourlyRate}
                                                onChange={(e) => setCostForm({ ...costForm, includeInHourlyRate: e.target.checked })}
                                                className="rounded"
                                            />
                                            <span className="font-semibold text-slate-800">Incluir en el cálculo de Costo/Hora</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={costForm.isIncludedInOtherCost}
                                                onChange={(e) => setCostForm({ ...costForm, isIncludedInOtherCost: e.target.checked })}
                                                className="rounded"
                                            />
                                            <span className="text-slate-600">¿Está incluido dentro de otro costo? (Evitar doble suma)</span>
                                        </label>
                                        {costForm.isIncludedInOtherCost && (
                                            <Input
                                                placeholder="Nombre del costo padre (ej: Base Flotilla 1)"
                                                value={costForm.parentCostName}
                                                onChange={(e) => setCostForm({ ...costForm, parentCostName: e.target.value })}
                                            />
                                        )}
                                    </div>
                                    <div>
                                        <Label>Observaciones adicionales</Label>
                                        <Input
                                            placeholder="Detalles contables..."
                                            value={costForm.notes}
                                            onChange={(e) => setCostForm({ ...costForm, notes: e.target.value })}
                                        />
                                    </div>
                                    <div className="flex justify-end gap-2 pt-3 border-t">
                                        <Button type="button" variant="ghost" onClick={() => setIsAddCostOpen(false)}>Cancelar</Button>
                                        <Button type="submit" className="bg-slate-900 text-white font-bold">Guardar Costo</Button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* MODAL: Nueva Categoría */}
                    {isAddCategoryOpen && (
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
                                <div className="flex justify-between items-center border-b pb-3">
                                    <h3 className="text-lg font-bold text-slate-900">Agregar Nueva Categoría de Costo</h3>
                                    <button onClick={() => setIsAddCategoryOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">✕</button>
                                </div>
                                <form onSubmit={handleCreateCategory} className="space-y-3 text-xs">
                                    <div>
                                        <Label>Nombre de la Categoría</Label>
                                        <Input
                                            required
                                            placeholder="ej: Software & IA"
                                            value={categoryForm.name}
                                            onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <Label>Descripción</Label>
                                        <Input
                                            placeholder="ej: Licencias y servicios en la nube"
                                            value={categoryForm.description}
                                            onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <Label>Subcategorías (separadas por coma)</Label>
                                        <Input
                                            placeholder="Hosting, Suscripciones, API tokens"
                                            value={categoryForm.subcategories}
                                            onChange={(e) => setCategoryForm({ ...categoryForm, subcategories: e.target.value })}
                                        />
                                    </div>
                                    <div className="flex justify-end gap-2 pt-3 border-t">
                                        <Button type="button" variant="ghost" onClick={() => setIsAddCategoryOpen(false)}>Cancelar</Button>
                                        <Button type="submit" className="bg-slate-900 text-white font-bold">Crear Categoría</Button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* MODAL: Préstamo */}
                    {isAddLoanOpen && (
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
                                <div className="flex justify-between items-center border-b pb-3">
                                    <h3 className="text-lg font-bold text-slate-900">Registrar Préstamo / Financiamiento</h3>
                                    <button onClick={() => setIsAddLoanOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">✕</button>
                                </div>
                                <form onSubmit={handleCreateLoan} className="space-y-3 text-xs">
                                    <div>
                                        <Label>Entidad Financiera</Label>
                                        <Input
                                            required
                                            placeholder="Banco Popular, Banreservas, etc."
                                            value={loanForm.entity}
                                            onChange={(e) => setLoanForm({ ...loanForm, entity: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <Label>Concepto</Label>
                                        <Input
                                            required
                                            placeholder="Financiamiento Kia Picanto 2025"
                                            value={loanForm.concept}
                                            onChange={(e) => setLoanForm({ ...loanForm, concept: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <Label>Capital Total (RD$)</Label>
                                            <Input
                                                type="number"
                                                required
                                                value={loanForm.totalPrincipal}
                                                onChange={(e) => setLoanForm({ ...loanForm, totalPrincipal: Number(e.target.value) })}
                                            />
                                        </div>
                                        <div>
                                            <Label>Cuota Mensual (RD$)</Label>
                                            <Input
                                                type="number"
                                                required
                                                value={loanForm.monthlyQuota}
                                                onChange={(e) => setLoanForm({ ...loanForm, monthlyQuota: Number(e.target.value) })}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <Label>Centro de Costo</Label>
                                        <select
                                            required
                                            className="w-full border rounded-lg p-2 h-10 bg-white"
                                            value={loanForm.costCenterId}
                                            onChange={(e) => setLoanForm({ ...loanForm, costCenterId: e.target.value })}
                                        >
                                            <option value="">Seleccione Centro</option>
                                            {costCenters.map(cc => (
                                                <option key={cc.id} value={cc.id}>{cc.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex justify-end gap-2 pt-3 border-t">
                                        <Button type="button" variant="ghost" onClick={() => setIsAddLoanOpen(false)}>Cancelar</Button>
                                        <Button type="submit" className="bg-slate-900 text-white font-bold">Guardar Préstamo</Button>
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
