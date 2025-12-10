import { db } from "@/lib/firebase";
import { Invoice, Payment, PaymentMethod } from "@/types/schema";
import { collection, doc, runTransaction, Timestamp, addDoc, updateDoc } from "firebase/firestore";

/**
 * Registra un nuevo pago y actualiza el balance de la factura relacionada si existe.
 */
export async function registerPayment(paymentData: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>) {
    try {
        // 1. Si hay factura relacionada, usar transacción
        if (paymentData.invoiceId) {
            await runTransaction(db, async (transaction) => {
                const invoiceRef = doc(db, "invoices", paymentData.invoiceId!);
                const invoiceSnap = await transaction.get(invoiceRef);

                if (!invoiceSnap.exists()) {
                    throw new Error("Factura no encontrada");
                }

                const invoice = invoiceSnap.data() as Invoice;
                const newBalance = invoice.balance - paymentData.amount;

                // Determinar nuevo estado
                let newStatus = invoice.status;
                if (newBalance <= 0) {
                    newStatus = 'PAID';
                } else if (newBalance < invoice.total) {
                    newStatus = 'PARTIALLY_PAID';
                }

                // Crear el pago
                const paymentRef = doc(collection(db, "payments"));
                transaction.set(paymentRef, {
                    ...paymentData,
                    id: paymentRef.id,
                    createdAt: Timestamp.now(),
                    updatedAt: Timestamp.now()
                });

                // Actualizar factura
                transaction.update(invoiceRef, {
                    balance: newBalance,
                    status: newStatus,
                    updatedAt: Timestamp.now()
                });
            });
        } else {
            // 2. Si no hay factura, solo crear el pago (Pago a cuenta o anticipo)
            await addDoc(collection(db, "payments"), {
                ...paymentData,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            });
        }

        return { success: true };
    } catch (error) {
        console.error("Error registering payment:", error);
        throw error;
    }
}
