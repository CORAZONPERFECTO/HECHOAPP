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
    IncentiveType, 
    IncentiveRecord, 
    PasanteRecord, 
    IncentiveStatus, 
    IncentiveExportRow 
} from "@/types/incentives";
import { logFinancialAudit } from "./audit-service";

export const DEFAULT_INCENTIVE_TYPES: Array<Omit<IncentiveType, "id" | "createdAt" | "updatedAt">> = [
    {
        key: "PASANTES",
        name: "Incentivo por Pasantes",
        description: "Pago por cada pasante de tubería/cableado realizado en campo",
        defaultRate: 500, // RD$ 500 por pasante
        hasQualityComponent: true,
        productivityRatio: 0.70, // RD$ 350 inmediato
        qualityRatio: 0.30, // RD$ 150 consolidado a 30 días
        qualityHoldPeriodDays: 30,
        requiresTicket: true,
        requiresPhotoEvidence: true,
        active: true
    },
    {
        key: "INSTALACIONES",
        name: "Incentivo por Instalación Completa",
        description: "Bono por equipo instalado y probado satisfactoriamente",
        defaultRate: 1500,
        hasQualityComponent: true,
        productivityRatio: 0.75,
        qualityRatio: 0.25,
        qualityHoldPeriodDays: 30,
        requiresTicket: true,
        requiresPhotoEvidence: true,
        active: true
    },
    {
        key: "PRODUCTIVIDAD",
        name: "Bono de Productividad Semanal",
        description: "Cumplimiento de meta semanal de tickets resueltos",
        defaultRate: 2000,
        hasQualityComponent: false,
        productivityRatio: 1.0,
        qualityRatio: 0.0,
        qualityHoldPeriodDays: 0,
        requiresTicket: true,
        requiresPhotoEvidence: false,
        active: true
    },
    {
        key: "PUNTUALIDAD_SLA",
        name: "Cumplimiento Estricto de SLA / Cero Reclamos",
        description: "Bono por resolver tickets dentro del tiempo de respuesta acordado",
        defaultRate: 1000,
        hasQualityComponent: true,
        productivityRatio: 0.60,
        qualityRatio: 0.40,
        qualityHoldPeriodDays: 30,
        requiresTicket: true,
        requiresPhotoEvidence: false,
        active: true
    },
    {
        key: "EVIDENCIAS_COMPLETAS",
        name: "Evidencias Fotográficas Perfectas",
        description: "Premio por fotos antes, durante y después impecables",
        defaultRate: 500,
        hasQualityComponent: false,
        productivityRatio: 1.0,
        qualityRatio: 0.0,
        qualityHoldPeriodDays: 0,
        requiresTicket: true,
        requiresPhotoEvidence: true,
        active: true
    },
    {
        key: "TRABAJO_ESPECIAL",
        name: "Trabajo Especial / Maniobra Compleja",
        description: "Bonificación por trabajos de alto riesgo o complejidad técnica",
        defaultRate: 1200,
        hasQualityComponent: true,
        productivityRatio: 0.80,
        qualityRatio: 0.20,
        qualityHoldPeriodDays: 15,
        requiresTicket: true,
        requiresPhotoEvidence: true,
        active: true
    }
];

export async function ensureDefaultIncentiveTypes() {
    try {
        const snap = await getDocs(collection(db, "incentive_types"));
        if (snap.empty) {
            for (const t of DEFAULT_INCENTIVE_TYPES) {
                const tRef = doc(collection(db, "incentive_types"));
                await setDoc(tRef, {
                    id: tRef.id,
                    ...t,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
            }
        }
    } catch (e) {
        console.error("Error seeding default incentive types:", e);
    }
}

export async function getIncentiveTypes(): Promise<IncentiveType[]> {
    try {
        await ensureDefaultIncentiveTypes();
        const snap = await getDocs(collection(db, "incentive_types"));
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as IncentiveType)).filter(t => t.active !== false);
    } catch (e) {
        console.error("Error fetching incentive types:", e);
        return [];
    }
}

export async function addIncentiveType(data: Omit<IncentiveType, "id" | "createdAt" | "updatedAt">, user: { id: string; name: string; email: string }) {
    const tRef = doc(collection(db, "incentive_types"));
    const newType = {
        id: tRef.id,
        ...data,
        active: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    };
    await setDoc(tRef, newType);
    await logFinancialAudit({
        entityType: "INCENTIVE",
        entityId: tRef.id,
        action: "CREATE",
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        newValue: newType,
        reason: "Nuevo tipo de incentivo creado"
    });
    return tRef.id;
}

export async function getIncentives(periodId?: string): Promise<IncentiveRecord[]> {
    try {
        const snap = await getDocs(collection(db, "incentives"));
        const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as IncentiveRecord));
        if (periodId) {
            return all.filter(i => i.periodId === periodId);
        }
        return all;
    } catch (e) {
        console.error("Error fetching incentives:", e);
        return [];
    }
}

export async function registerIncentive(
    data: Omit<IncentiveRecord, "id" | "createdAt" | "updatedAt" | "productivityAmount" | "qualityAmount" | "qualityConsolidated">,
    incentiveType: IncentiveType,
    user: { id: string; name: string; email: string }
): Promise<string> {
    if (!data.ticketIds || data.ticketIds.length === 0) {
        throw new Error("REGLA OBLIGATORIA: Todo incentivo debe estar vinculado a uno o varios tickets.");
    }

    const totalAmount = data.quantity * data.rate;
    const prodRatio = incentiveType.hasQualityComponent ? incentiveType.productivityRatio : 1.0;
    const qualRatio = incentiveType.hasQualityComponent ? incentiveType.qualityRatio : 0.0;

    const productivityAmount = totalAmount * prodRatio;
    const qualityAmount = totalAmount * qualRatio;

    const incRef = doc(collection(db, "incentives"));
    const newRecord: IncentiveRecord = {
        id: incRef.id,
        ...data,
        totalAmount,
        productivityAmount,
        qualityAmount,
        qualityConsolidated: !incentiveType.hasQualityComponent,
        status: data.status || "PENDING_VALIDATION",
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
    };

    await setDoc(incRef, newRecord);

    await logFinancialAudit({
        entityType: "INCENTIVE",
        entityId: incRef.id,
        action: "CREATE",
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        newValue: newRecord,
        reason: `Incentivo generado para ${data.beneficiaryName} por RD$ ${totalAmount}`
    });

    return incRef.id;
}

export async function updateIncentiveStatus(
    incentiveId: string,
    newStatus: IncentiveStatus,
    user: { id: string; name: string; email: string },
    options?: { rejectionReason?: string; observations?: string; paymentBatchId?: string }
) {
    const incRef = doc(db, "incentives", incentiveId);
    const snap = await getDoc(incRef);
    if (!snap.exists()) throw new Error("Incentivo no encontrado");
    const prev = snap.data();

    const updates: any = {
        status: newStatus,
        updatedAt: serverTimestamp()
    };

    if (newStatus === "VALIDATED") {
        updates.validatorId = user.id;
        updates.validatorName = user.name;
        updates.validatedAt = serverTimestamp();
    } else if (newStatus === "APPROVED_FOR_PAYMENT") {
        updates.approvedById = user.id;
        updates.approvedByName = user.name;
        updates.approvedAt = serverTimestamp();
    } else if (newStatus === "PAID") {
        updates.paidAt = serverTimestamp();
        if (options?.paymentBatchId) updates.paymentBatchId = options.paymentBatchId;
    } else if (newStatus === "REJECTED") {
        updates.rejectionReason = options?.rejectionReason || "Rechazado por supervisión";
    }

    if (options?.observations) updates.observations = options.observations;

    await updateDoc(incRef, updates);

    await logFinancialAudit({
        entityType: "INCENTIVE",
        entityId: incentiveId,
        action: newStatus === "APPROVED_FOR_PAYMENT" ? "APPROVE" : newStatus === "REJECTED" ? "REJECT" : "UPDATE",
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        previousValue: prev,
        newValue: updates,
        reason: `Cambio de estado a ${newStatus}`
    });
}
