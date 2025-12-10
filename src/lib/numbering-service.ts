import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type SequenceType = 'COT' | 'FACT' | 'FACTPF' | 'OC' | 'COND';

const SEQUENCE_CONFIG = {
    'COT': { prefix: 'COT', padding: 6 },
    'FACT': { prefix: 'FACT', padding: 6 },
    'FACTPF': { prefix: 'FACTPF', padding: 6 },
    'OC': { prefix: 'OC', padding: 6 },
    'COND': { prefix: 'COND', padding: 6 },
};

/**
 * Generates the next sequential number for a given document type using a Firestore transaction.
 * Safe for concurrent usage.
 * 
 * @param type The type of document (e.g., 'COT', 'FACT')
 * @returns The formatted sequence string (e.g., 'COT-000001')
 */
export async function generateNextNumber(type: SequenceType): Promise<string> {
    const sequenceRef = doc(db, "sequences", type);

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
                updatedAt: serverTimestamp(),
                type: type,
            }, { merge: true });

            return next;
        });

        const config = SEQUENCE_CONFIG[type];
        return `${config.prefix}-${newNumber.toString().padStart(config.padding, '0')}`;
    } catch (error) {
        console.error(`Error generating sequence for ${type}:`, error);
        // Fallback for offline or error cases (should ideally throw or handle gracefully)
        const randomFallback = Math.floor(Math.random() * 10000);
        return `${SEQUENCE_CONFIG[type].prefix}-ERR-${randomFallback}`;
    }
}
