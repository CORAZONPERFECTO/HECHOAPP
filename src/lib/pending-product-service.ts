
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { PendingProduct } from "@/types/inventory";
import { registerMovement } from "./inventory-service";

export async function getPendingProducts() {
    // We want all pending products, ordered by date
    const q = query(
        collection(db, "pending_products"),
        where("status", "==", "PENDING"),
        orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as PendingProduct));
}

export async function resolvePendingProduct(
    pendingProduct: PendingProduct & { quantity: number, targetLocationId: string },
    action: 'APPROVE' | 'REJECT',
    resolvedProductId?: string
) {
    try {
        const ref = doc(db, "pending_products", pendingProduct.id);

        if (action === 'REJECT') {
            await updateDoc(ref, { status: 'REJECTED' });
            return;
        }

        if (action === 'APPROVE' && resolvedProductId) {
            // 1. Create Inventory Movement (Retroactive Entry)
            await registerMovement({
                productId: resolvedProductId,
                type: 'ENTRADA',
                quantity: pendingProduct.quantity,
                destinationLocationId: pendingProduct.targetLocationId,
                reason: `Ingreso por Compra (Aprobación Pendiente)`,
                unitCost: pendingProduct.detectedPrice,
                ticketId: pendingProduct.ticketId,
                createdByUserId: 'ADMIN', // Approver
                createdByType: 'ADMIN'
            });

            // 2. Update Pending Status
            await updateDoc(ref, {
                status: 'APPROVED',
                resolvedProductId: resolvedProductId
            });
        }
    } catch (error) {
        console.error("Error resolving pending product:", error);
        throw error;
    }
}
