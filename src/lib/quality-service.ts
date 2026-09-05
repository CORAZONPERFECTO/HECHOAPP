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
    WarrantyTicketRecord, 
    QualityAdjustment, 
    WarrantyResponsibility 
} from "@/types/quality";
import { logFinancialAudit } from "./audit-service";

export async function getWarrantyRecords(): Promise<WarrantyTicketRecord[]> {
    try {
        const snap = await getDocs(collection(db, "warranty_tickets"));
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as WarrantyTicketRecord));
    } catch (e) {
        console.error("Error fetching warranty records:", e);
        return [];
    }
}

export async function registerWarrantyReturn(
    data: Omit<WarrantyTicketRecord, "id" | "createdAt" | "updatedAt" | "totalCNC">,
    user: { id: string; name: string; email: string }
): Promise<string> {
    const wRef = doc(collection(db, "warranty_tickets"));
    
    // Cálculo seguro del Costo de No Calidad (CNC)
    const totalCNC = (Number(data.hoursConsumed || 0) * Number(data.hourlyRateApplied || 0)) 
        + Number(data.materialsCost || 0) 
        + Number(data.additionalExpenses || 0);

    const newRecord: WarrantyTicketRecord = {
        id: wRef.id,
        ...data,
        totalCNC,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
    };

    await setDoc(wRef, newRecord);

    // Actualizar ticket original con flag de garantía vinculada
    if (data.originalTicketId) {
        try {
            const origRef = doc(db, "tickets", data.originalTicketId);
            await updateDoc(origRef, {
                hasWarrantyReturn: true,
                warrantyCount: data.returnSequenceNumber,
                latestWarrantyId: wRef.id,
                updatedAt: serverTimestamp()
            });
        } catch (ticketErr) {
            console.warn("Could not update original ticket with warranty flag:", ticketErr);
        }
    }

    await logFinancialAudit({
        entityType: "WARRANTY",
        entityId: wRef.id,
        action: "CREATE",
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        newValue: newRecord,
        reason: `Registro de Retorno por Garantía #${data.returnSequenceNumber} (CNC: RD$ ${totalCNC})`
    });

    return wRef.id;
}

export async function applyQualityAdjustment(
    data: Omit<QualityAdjustment, "id" | "createdAt" | "authorizedAt" | "authorizedBy" | "authorizedByName">,
    user: { id: string; name: string; email: string }
): Promise<string> {
    const adjRef = doc(collection(db, "quality_adjustments"));
    const newAdj: QualityAdjustment = {
        id: adjRef.id,
        ...data,
        authorizedBy: user.id,
        authorizedByName: user.name,
        authorizedAt: Timestamp.now(),
        createdAt: Timestamp.now()
    };

    await setDoc(adjRef, newAdj);

    // Actualizar el incentivo original con el ajuste de calidad (sin borrarlo históricamente)
    if (data.originalIncentiveId) {
        try {
            const incRef = doc(db, "incentives", data.originalIncentiveId);
            const incSnap = await getDoc(incRef);
            if (incSnap.exists()) {
                const incData = incSnap.data();
                const prevAdj = Number(incData.qualityAdjustedAmount || 0);
                await updateDoc(incRef, {
                    qualityAdjustedAmount: prevAdj + data.adjustedAmount,
                    adjustedReason: data.reason,
                    status: "ADJUSTED",
                    updatedAt: serverTimestamp()
                });
            }
        } catch (e) {
            console.error("Error applying adjustment to original incentive:", e);
        }
    }

    await logFinancialAudit({
        entityType: "INCENTIVE",
        entityId: data.originalIncentiveId,
        action: "ADJUST",
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        newValue: newAdj,
        reason: `Ajuste de Calidad por RD$ ${data.adjustedAmount}: ${data.reason}`
    });

    return adjRef.id;
}
