import { db } from "@/lib/firebase";
import { doc, runTransaction, serverTimestamp } from "firebase/firestore";

/**
 * Generates the next sequential ticket number for the current day.
 * Format: TK-YYYY-MM-DD-XXX (e.g., TK-2025-11-30-001)
 */
export async function generateNextTicketNumber(): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;

    const counterRef = doc(db, "counters", `tickets-${dateString}`);

    try {
        const newNumber = await runTransaction(db, async (transaction) => {
            const counterDoc = await transaction.get(counterRef);

            let currentCount = 0;
            if (counterDoc.exists()) {
                currentCount = counterDoc.data().count || 0;
            }

            const nextCount = currentCount + 1;

            transaction.set(counterRef, {
                count: nextCount,
                date: dateString,
                updatedAt: serverTimestamp()
            }, { merge: true });

            return nextCount;
        });

        const sequence = String(newNumber).padStart(3, '0');
        return `TK-${dateString}-${sequence}`;
    } catch (error) {
        console.error("Error generating ticket number:", error);
        // Fallback to timestamp if transaction fails
        return `TK-${dateString}-${Date.now().toString().slice(-4)}`;
    }
}
