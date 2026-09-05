import { db } from "@/lib/firebase";
import { 
    collection, 
    doc, 
    getDocs, 
    getDoc, 
    setDoc, 
    updateDoc, 
    query, 
    where, 
    orderBy, 
    serverTimestamp,
    Timestamp 
} from "firebase/firestore";
import { 
    CostCategory, 
    CostCenter, 
    OperationalCost, 
    Fleet, 
    AccountingPeriod, 
    Loan 
} from "@/types/costs";
import { logFinancialAudit } from "./audit-service";

// Baseline categories
export const DEFAULT_CATEGORIES: Array<{ name: string; description: string; subcategories: string[] }> = [
    { name: "Nómina", description: "Salarios, horas extras y beneficios", subcategories: ["Sueldo Base", "Horas Extras", "Viáticos", "Comisiones", "Seguridad Social"] },
    { name: "Combustible", description: "Consumo de combustible por vehículo y cuadrilla", subcategories: ["Rutas Operativas", "Supervisión", "Emergencias"] },
    { name: "Vehículos", description: "Pagos de financiamiento, seguros y mantenimiento vehicular", subcategories: ["Cuota Mensual", "Seguro de Vehículo", "Mantenimiento Preventivo", "Reparaciones", "Lavado"] },
    { name: "Almacén", description: "Alquiler, seguridad y gastos de almacenamiento", subcategories: ["Renta Almacén", "Seguridad", "Insumos de Almacén"] },
    { name: "Comunicaciones", description: "Flotas de telefonía, datos e internet", subcategories: ["Flotas Celulares", "Internet Fibra", "Telefonía Fija"] },
    { name: "Gerencia", description: "Costos de supervisión y dirección general", subcategories: ["Dirección Ejecutiva", "Supervisión de Operaciones"] },
    { name: "Operaciones", description: "Gastos operativos generales en campo", subcategories: ["EPP y Seguridad", "Consumibles Generales", "Imprevistos"] },
    { name: "Administración", description: "Gastos de oficina y gestión administrativa", subcategories: ["Útiles de Oficina", "Servicios Contables", "Legal"] },
    { name: "Préstamos/Financiamiento", description: "Cuotas e intereses financieros", subcategories: ["Crédito Vehicular", "Línea de Crédito", "Préstamo Comercial"] },
    { name: "Seguros", description: "Pólizas contra incendios, RC y accidentes", subcategories: ["Responsabilidad Civil", "Accidentes Laborales"] },
    { name: "Herramientas", description: "Adquisición, reposición y calibración de herramientas", subcategories: ["Herramientas Eléctricas", "Manómetros/Bombas Vacío", "Reposición Menor"] },
    { name: "Software", description: "Suscripciones de software y hosting", subcategories: ["HECHOAPP Hosting", "ERP", "Licencias Ofimática"] },
    { name: "Electricidad", description: "Servicio eléctrico de sedes y almacenes", subcategories: ["Almacén Central", "Oficina"] },
    { name: "Internet", description: "Conectividad central", subcategories: ["Conexión Almacén", "Redes"] },
    { name: "Mantenimiento", description: "Mantenimiento de infraestructura y equipos de apoyo", subcategories: ["Edificio", "Generadores"] },
    { name: "Otros", description: "Otros costos no catalogados", subcategories: ["Varios"] }
];

export const DEFAULT_COST_CENTERS: Array<{ id: string; code: string; name: string; type: CostCenter['type']; description: string }> = [
    { id: "cc-flotilla-1", code: "CC-FLOT-01", name: "Flotilla 1 (Kia Picanto 2025)", type: "FLOTILLA", description: "Cuadrilla Técnica Zona Este" },
    { id: "cc-flotilla-2", code: "CC-FLOT-02", name: "Flotilla 2 (Daihatsu Hijet 2012)", type: "FLOTILLA", description: "Cuadrilla Técnica Zona Norte / Bávaro" },
    { id: "cc-flotilla-3", code: "CC-FLOT-03", name: "Flotilla 3 (Daihatsu Hijet 2020)", type: "FLOTILLA", description: "Cuadrilla Técnica Zona Sur / Cap Cana" },
    { id: "cc-supervision", code: "CC-SUP-DIR", name: "Supervisión / Dirección (Volvo XC60)", type: "SUPERVISION_DIRECCION", description: "Vehículo de Supervisión y Dirección General" },
    { id: "cc-almacen", code: "CC-ALMACEN", name: "Almacén Central", type: "ALMACEN", description: "Almacenamiento de equipos y repuestos" },
    { id: "cc-admin", code: "CC-ADMIN", name: "Administración General", type: "ADMINISTRACION", description: "Estructura corporativa y gestión" }
];

export const DEFAULT_FLEETS: Array<{ id: string; code: string; name: string; vehicleName: string; costCenterId: string; baseMonthlyCost: number }> = [
    { id: "fleet-1", code: "FLOT-01", name: "Flotilla 1", vehicleName: "Kia Picanto 2025", costCenterId: "cc-flotilla-1", baseMonthlyCost: 119000 },
    { id: "fleet-2", code: "FLOT-02", name: "Flotilla 2", vehicleName: "Daihatsu Hijet 2012", costCenterId: "cc-flotilla-2", baseMonthlyCost: 119000 },
    { id: "fleet-3", code: "FLOT-03", name: "Flotilla 3", vehicleName: "Daihatsu Hijet 2020", costCenterId: "cc-flotilla-3", baseMonthlyCost: 119000 }
];

export const DEFAULT_OPERATIONAL_COSTS: Array<Omit<OperationalCost, "id" | "createdAt" | "updatedAt">> = [
    // Flotilla 1
    {
        name: "Base Operacional Flotilla 1 (Sueldos + Combustible)",
        description: "Base operacional mensual que incluye sueldos y combustible de Flotilla 1",
        amount: 119000,
        currency: "DOP",
        frequency: "MENSUAL",
        startDate: new Date("2026-01-01"),
        categoryId: "Nómina",
        categoryName: "Nómina",
        subcategory: "Sueldo Base",
        costCenterId: "cc-flotilla-1",
        costCenterName: "Flotilla 1 (Kia Picanto 2025)",
        fleetId: "fleet-1",
        classification: "DIRECTO",
        distributionMethod: "POR_FLOTILLA",
        includeInHourlyRate: true,
        isIncludedInOtherCost: false,
        active: true,
        createdBy: "SYSTEM",
        createdByName: "Sistema Inicial"
    },
    {
        name: "Pago Mensual Vehículo Kia Picanto 2025",
        description: "Cuota mensual del vehículo asignado a Flotilla 1",
        amount: 19000,
        currency: "DOP",
        frequency: "MENSUAL",
        startDate: new Date("2026-01-01"),
        categoryId: "Vehículos",
        categoryName: "Vehículos",
        subcategory: "Cuota Mensual",
        costCenterId: "cc-flotilla-1",
        costCenterName: "Flotilla 1 (Kia Picanto 2025)",
        fleetId: "fleet-1",
        vehicleId: "kia-picanto-2025",
        classification: "DIRECTO",
        distributionMethod: "POR_FLOTILLA",
        includeInHourlyRate: true,
        isIncludedInOtherCost: false,
        active: true,
        createdBy: "SYSTEM",
        createdByName: "Sistema Inicial"
    },
    // Flotilla 2
    {
        name: "Base Operacional Flotilla 2 (Sueldos + Combustible)",
        description: "Base operacional mensual que incluye sueldos y combustible de Flotilla 2",
        amount: 119000,
        currency: "DOP",
        frequency: "MENSUAL",
        startDate: new Date("2026-01-01"),
        categoryId: "Nómina",
        categoryName: "Nómina",
        subcategory: "Sueldo Base",
        costCenterId: "cc-flotilla-2",
        costCenterName: "Flotilla 2 (Daihatsu Hijet 2012)",
        fleetId: "fleet-2",
        classification: "DIRECTO",
        distributionMethod: "POR_FLOTILLA",
        includeInHourlyRate: true,
        isIncludedInOtherCost: false,
        active: true,
        createdBy: "SYSTEM",
        createdByName: "Sistema Inicial"
    },
    {
        name: "Pago Mensual Vehículo Daihatsu Hijet 2012",
        description: "Cuota mensual del vehículo asignado a Flotilla 2",
        amount: 10000,
        currency: "DOP",
        frequency: "MENSUAL",
        startDate: new Date("2026-01-01"),
        categoryId: "Vehículos",
        categoryName: "Vehículos",
        subcategory: "Cuota Mensual",
        costCenterId: "cc-flotilla-2",
        costCenterName: "Flotilla 2 (Daihatsu Hijet 2012)",
        fleetId: "fleet-2",
        vehicleId: "daihatsu-hijet-2012",
        classification: "DIRECTO",
        distributionMethod: "POR_FLOTILLA",
        includeInHourlyRate: true,
        isIncludedInOtherCost: false,
        active: true,
        createdBy: "SYSTEM",
        createdByName: "Sistema Inicial"
    },
    // Flotilla 3
    {
        name: "Base Operacional Flotilla 3 (Sueldos + Combustible)",
        description: "Base operacional mensual que incluye sueldos y combustible de Flotilla 3",
        amount: 119000,
        currency: "DOP",
        frequency: "MENSUAL",
        startDate: new Date("2026-01-01"),
        categoryId: "Nómina",
        categoryName: "Nómina",
        subcategory: "Sueldo Base",
        costCenterId: "cc-flotilla-3",
        costCenterName: "Flotilla 3 (Daihatsu Hijet 2020)",
        fleetId: "fleet-3",
        classification: "DIRECTO",
        distributionMethod: "POR_FLOTILLA",
        includeInHourlyRate: true,
        isIncludedInOtherCost: false,
        active: true,
        createdBy: "SYSTEM",
        createdByName: "Sistema Inicial"
    },
    {
        name: "Pago Mensual Vehículo Daihatsu Hijet 2020",
        description: "Cuota mensual del vehículo asignado a Flotilla 3",
        amount: 10000,
        currency: "DOP",
        frequency: "MENSUAL",
        startDate: new Date("2026-01-01"),
        categoryId: "Vehículos",
        categoryName: "Vehículos",
        subcategory: "Cuota Mensual",
        costCenterId: "cc-flotilla-3",
        costCenterName: "Flotilla 3 (Daihatsu Hijet 2020)",
        fleetId: "fleet-3",
        vehicleId: "daihatsu-hijet-2020",
        classification: "DIRECTO",
        distributionMethod: "POR_FLOTILLA",
        includeInHourlyRate: true,
        isIncludedInOtherCost: false,
        active: true,
        createdBy: "SYSTEM",
        createdByName: "Sistema Inicial"
    },
    // Supervisión y Dirección
    {
        name: "Pago Mensual Volvo XC60 2018 (Supervisión/Dirección)",
        description: "Pago mensual del vehículo de supervisión/dirección",
        amount: 45000,
        currency: "DOP",
        frequency: "MENSUAL",
        startDate: new Date("2026-01-01"),
        categoryId: "Vehículos",
        categoryName: "Vehículos",
        subcategory: "Cuota Mensual",
        costCenterId: "cc-supervision",
        costCenterName: "Supervisión / Dirección (Volvo XC60)",
        vehicleId: "volvo-xc60-2018",
        classification: "COMPARTIDO",
        distributionMethod: "POR_FLOTILLA",
        includeInHourlyRate: true,
        isIncludedInOtherCost: false,
        active: true,
        createdBy: "SYSTEM",
        createdByName: "Sistema Inicial"
    },
    {
        name: "Combustible Mensual Estimado Volvo XC60",
        description: "Combustible mensual asignado a Supervisión/Dirección",
        amount: 30000,
        currency: "DOP",
        frequency: "MENSUAL",
        startDate: new Date("2026-01-01"),
        categoryId: "Combustible",
        categoryName: "Combustible",
        subcategory: "Supervisión",
        costCenterId: "cc-supervision",
        costCenterName: "Supervisión / Dirección (Volvo XC60)",
        vehicleId: "volvo-xc60-2018",
        classification: "COMPARTIDO",
        distributionMethod: "POR_FLOTILLA",
        includeInHourlyRate: true,
        isIncludedInOtherCost: false,
        active: true,
        createdBy: "SYSTEM",
        createdByName: "Sistema Inicial"
    },
    // Almacén
    {
        name: "Renta de Almacén Mensual",
        description: "Costo mensual de almacenamiento de repuestos y equipos",
        amount: 30000,
        currency: "DOP",
        frequency: "MENSUAL",
        startDate: new Date("2026-01-01"),
        categoryId: "Almacén",
        categoryName: "Almacén",
        subcategory: "Renta Almacén",
        costCenterId: "cc-almacen",
        costCenterName: "Almacén Central",
        classification: "GENERAL",
        distributionMethod: "POR_FLOTILLA",
        includeInHourlyRate: true,
        isIncludedInOtherCost: false,
        active: true,
        createdBy: "SYSTEM",
        createdByName: "Sistema Inicial"
    },
    // Comunicaciones
    {
        name: "Teléfonos y Flotas Mensuales",
        description: "Servicio de líneas telefónicas y planes de datos de las cuadrillas",
        amount: 15000,
        currency: "DOP",
        frequency: "MENSUAL",
        startDate: new Date("2026-01-01"),
        categoryId: "Comunicaciones",
        categoryName: "Comunicaciones",
        subcategory: "Flotas Celulares",
        costCenterId: "cc-admin",
        costCenterName: "Administración General",
        classification: "COMPARTIDO",
        distributionMethod: "POR_FLOTILLA",
        includeInHourlyRate: true,
        isIncludedInOtherCost: false,
        active: true,
        createdBy: "SYSTEM",
        createdByName: "Sistema Inicial"
    }
];

export async function ensureBaselineCostData() {
    try {
        const catSnap = await getDocs(collection(db, "cost_categories"));
        if (catSnap.empty) {
            for (const cat of DEFAULT_CATEGORIES) {
                const catRef = doc(collection(db, "cost_categories"));
                await setDoc(catRef, {
                    id: catRef.id,
                    ...cat,
                    active: true,
                    createdAt: serverTimestamp()
                });
            }
        }

        const centerSnap = await getDocs(collection(db, "cost_centers"));
        if (centerSnap.empty) {
            for (const center of DEFAULT_COST_CENTERS) {
                const cRef = doc(db, "cost_centers", center.id);
                await setDoc(cRef, {
                    ...center,
                    active: true,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
            }
        }

        const fleetSnap = await getDocs(collection(db, "fleets"));
        if (fleetSnap.empty) {
            for (const fleet of DEFAULT_FLEETS) {
                const fRef = doc(db, "fleets", fleet.id);
                await setDoc(fRef, {
                    ...fleet,
                    technicianIds: [],
                    active: true,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
            }
        }

        const costSnap = await getDocs(collection(db, "operational_costs"));
        if (costSnap.empty) {
            for (const cost of DEFAULT_OPERATIONAL_COSTS) {
                const costRef = doc(collection(db, "operational_costs"));
                await setDoc(costRef, {
                    id: costRef.id,
                    ...cost,
                    startDate: Timestamp.fromDate(cost.startDate as Date),
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
            }
        }
    } catch (err) {
        console.error("Error seeding baseline cost data:", err);
    }
}

// Operational Costs CRUD
export async function getOperationalCosts(includeInactive: boolean = false): Promise<OperationalCost[]> {
    try {
        await ensureBaselineCostData();
        const snap = await getDocs(collection(db, "operational_costs"));
        const costs = snap.docs.map(d => ({ id: d.id, ...d.data() } as OperationalCost));
        if (!includeInactive) {
            return costs.filter(c => c.active !== false);
        }
        return costs;
    } catch (e) {
        console.error("Error fetching operational costs:", e);
        return [];
    }
}

export async function addOperationalCost(data: Omit<OperationalCost, "id" | "createdAt" | "updatedAt">, user: { id: string; name: string; email: string }): Promise<string> {
    const costRef = doc(collection(db, "operational_costs"));
    const newCost: OperationalCost = {
        id: costRef.id,
        ...data,
        active: true,
        createdBy: user.id,
        createdByName: user.name,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
    };
    await setDoc(costRef, newCost);
    await logFinancialAudit({
        entityType: "COST",
        entityId: costRef.id,
        action: "CREATE",
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        newValue: newCost,
        reason: "Creación de costo operacional"
    });
    return costRef.id;
}

export async function updateOperationalCost(id: string, updates: Partial<OperationalCost>, user: { id: string; name: string; email: string }, reason?: string) {
    const costRef = doc(db, "operational_costs", id);
    const prevSnap = await getDoc(costRef);
    const prevData = prevSnap.data();

    await updateDoc(costRef, {
        ...updates,
        updatedBy: user.id,
        updatedByName: user.name,
        updatedAt: serverTimestamp()
    });

    await logFinancialAudit({
        entityType: "COST",
        entityId: id,
        action: updates.active === false ? "DEACTIVATE" : "UPDATE",
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        previousValue: prevData,
        newValue: updates,
        reason: reason || "Actualización de costo operacional"
    });
}

// Categories CRUD
export async function getCostCategories(): Promise<CostCategory[]> {
    try {
        await ensureBaselineCostData();
        const snap = await getDocs(collection(db, "cost_categories"));
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as CostCategory)).filter(c => c.active !== false);
    } catch (e) {
        console.error("Error fetching cost categories:", e);
        return [];
    }
}

export async function addCostCategory(name: string, description: string, subcategories: string[], user: { id: string; name: string; email: string }) {
    const catRef = doc(collection(db, "cost_categories"));
    const newCat = {
        id: catRef.id,
        name: name.trim(),
        description: description.trim(),
        subcategories: subcategories.filter(s => s.trim().length > 0),
        active: true,
        createdAt: serverTimestamp()
    };
    await setDoc(catRef, newCat);
    return catRef.id;
}

// Cost Centers & Fleets
export async function getCostCenters(): Promise<CostCenter[]> {
    try {
        await ensureBaselineCostData();
        const snap = await getDocs(collection(db, "cost_centers"));
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as CostCenter)).filter(c => c.active !== false);
    } catch (e) {
        console.error("Error fetching cost centers:", e);
        return [];
    }
}

export async function getFleets(): Promise<Fleet[]> {
    try {
        await ensureBaselineCostData();
        const snap = await getDocs(collection(db, "fleets"));
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as Fleet)).filter(f => f.active !== false);
    } catch (e) {
        console.error("Error fetching fleets:", e);
        return [];
    }
}

export async function saveFleet(fleetData: Partial<Fleet>, user: { id: string; name: string; email: string }) {
    const fId = fleetData.id || doc(collection(db, "fleets")).id;
    const fRef = doc(db, "fleets", fId);
    await setDoc(fRef, {
        id: fId,
        ...fleetData,
        active: fleetData.active !== false,
        updatedAt: serverTimestamp()
    }, { merge: true });
    return fId;
}

// Loans CRUD
export async function getLoans(): Promise<Loan[]> {
    try {
        const snap = await getDocs(collection(db, "loans"));
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as Loan));
    } catch (e) {
        console.error("Error fetching loans:", e);
        return [];
    }
}

export async function saveLoan(loanData: Omit<Loan, "id" | "createdAt" | "updatedAt">, user: { id: string; name: string; email: string }, loanId?: string) {
    const lId = loanId || doc(collection(db, "loans")).id;
    const lRef = doc(db, "loans", lId);
    const newLoan = {
        id: lId,
        ...loanData,
        active: loanData.active !== false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    };
    await setDoc(lRef, newLoan, { merge: true });
    return lId;
}

// Hourly Rate & Profitability Calculations
export interface HourlyRateMetrics {
    totalDirectCosts: number;
    totalSharedCosts: number;
    totalGeneralCosts: number;
    totalRegisteredCosts: number; // Sum of active costs NOT included in other costs
    
    workingDays: number;
    dailyHours: number;
    totalFleets: number;
    
    paidHours: number;
    availableHours: number;
    productiveHours: number;
    
    costoHoraDisponible: number;
    costoHoraProductiva: number;
    costoEmpresarialHora: number;
}

export function computeHourlyRates(
    costs: OperationalCost[], 
    fleetsCount: number = 3,
    workingDays: number = 24, 
    dailyHours: number = 8,
    productiveHoursRatio: number = 0.65 // 65% tiempo productivo efectivo
): HourlyRateMetrics {
    // 🛡️ Filtro de seguridad: excluir costos incluidos dentro de otro costo para evitar doble contabilización
    const activeValidCosts = costs.filter(c => c.active !== false && !c.isIncludedInOtherCost);

    let totalDirectCosts = 0;
    let totalSharedCosts = 0;
    let totalGeneralCosts = 0;

    activeValidCosts.forEach(c => {
        const amt = Number(c.amount || 0);
        if (c.classification === "DIRECTO") totalDirectCosts += amt;
        else if (c.classification === "COMPARTIDO") totalSharedCosts += amt;
        else totalGeneralCosts += amt;
    });

    const totalRegisteredCosts = totalDirectCosts + totalSharedCosts + totalGeneralCosts;
    const effectiveFleets = Math.max(1, fleetsCount);
    
    const totalPaidHoursFleet = workingDays * dailyHours * effectiveFleets; // Horas pagadas combinadas de las cuadrillas
    const availableHours = totalPaidHoursFleet;
    const productiveHours = Math.max(1, totalPaidHoursFleet * productiveHoursRatio);

    const costoHoraDisponible = availableHours > 0 ? (totalRegisteredCosts / availableHours) : 0;
    const costoHoraProductiva = productiveHours > 0 ? (totalRegisteredCosts / productiveHours) : 0;
    const costoEmpresarialHora = costoHoraProductiva * 1.15; // Con factor de seguridad empresarial

    return {
        totalDirectCosts,
        totalSharedCosts,
        totalGeneralCosts,
        totalRegisteredCosts,
        workingDays,
        dailyHours,
        totalFleets: effectiveFleets,
        paidHours: totalPaidHoursFleet,
        availableHours,
        productiveHours,
        costoHoraDisponible,
        costoHoraProductiva,
        costoEmpresarialHora
    };
}
