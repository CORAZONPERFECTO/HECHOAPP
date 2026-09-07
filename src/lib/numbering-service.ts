import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type SequenceType = 'COT' | 'CT' | 'FACT' | 'FACTPF' | 'FP' | 'OC' | 'COND' | 'INT';

const SEQUENCE_CONFIG: Record<SequenceType, { prefix: string; padding: number }> = {
    'COT': { prefix: 'COT', padding: 3 },
    'CT': { prefix: 'CT', padding: 3 },
    'INT': { prefix: 'INT', padding: 3 },
    'FP': { prefix: 'FP', padding: 3 },
    'FACTPF': { prefix: 'FP', padding: 3 },
    'OC': { prefix: 'OC', padding: 3 },
    'FACT': { prefix: 'FACT', padding: 3 },
    'COND': { prefix: 'COND', padding: 3 },
};

/**
 * Returns current date formatted as YYYY-MM-DD in Dominican Republic timezone (UTC-4).
 */
function getTodayDateString(): string {
    try {
        return new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Santo_Domingo',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(new Date());
    } catch {
        return new Date().toISOString().split('T')[0];
    }
}

/**
 * Generates the next sequential number for a given document type using a Firestore transaction.
 * Formats as: {PREFIX}-{YYYY-MM-DD}-{001}
 * Example: CT-2026-09-02-001, CT-2026-09-02-002
 * Safe for concurrent and daily multi-user usage.
 * 
 * @param type The type of document (e.g., 'COT', 'CT', 'FACT')
 * @returns The formatted sequence string (e.g., 'CT-2026-09-02-001')
 */
export async function generateNextNumber(type: SequenceType = 'CT'): Promise<string> {
    const config = SEQUENCE_CONFIG[type] || SEQUENCE_CONFIG['CT'];
    const prefix = config.prefix;
    const todayStr = getTodayDateString();
    const sequenceDocId = `${prefix}_${todayStr}`;
    const sequenceRef = doc(db, "sequences", sequenceDocId);

    try {
        const newNumber = await runTransaction(db, async (transaction) => {
            const sequenceDoc = await transaction.get(sequenceRef);

            let current = 0;
            if (sequenceDoc.exists()) {
                current = sequenceDoc.data().current || 0;
            }

            const next = current + 1;

            transaction.set(sequenceRef, {
                current: next,
                date: todayStr,
                prefix: prefix,
                updatedAt: serverTimestamp(),
                type: type,
            }, { merge: true });

            return next;
        });

        const paddedCount = newNumber.toString().padStart(config.padding, '0');
        return `${prefix}-${todayStr}-${paddedCount}`;
    } catch (error) {
        console.error(`Error generating sequence for ${type} on ${todayStr}:`, error);
        const randomFallback = Math.floor(Math.random() * 900) + 100;
        return `${prefix}-${todayStr}-${randomFallback}`;
    }
}
