import { db } from "@/lib/firebase";
import { collection, doc, setDoc, getDocs, query, orderBy, limit, serverTimestamp } from "firebase/firestore";
import { FinancialAuditLog } from "@/types/audit";

export async function logFinancialAudit(entry: Omit<FinancialAuditLog, "id" | "timestamp">) {
    try {
        const auditRef = doc(collection(db, "financial_audit_logs"));
        await setDoc(auditRef, {
            id: auditRef.id,
            ...entry,
            timestamp: serverTimestamp()
        });
    } catch (e) {
        console.error("Failed to log financial audit:", e);
    }
}

export async function getFinancialAuditLogs(maxLogs: number = 100): Promise<FinancialAuditLog[]> {
    try {
        const q = query(
            collection(db, "financial_audit_logs"),
            orderBy("timestamp", "desc"),
            limit(maxLogs)
        );
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as FinancialAuditLog));
    } catch (e) {
        console.error("Error fetching financial audit logs:", e);
        return [];
    }
}
