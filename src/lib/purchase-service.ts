
import { db, storage } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, runTransaction, doc, query, where, getDocs, orderBy } from "firebase/firestore";
import { Purchase, PurchaseItem } from "@/types/purchase";
import { registerMovement } from "./inventory-service";

export async function registerPurchase(purchaseData: Omit<Purchase, 'id' | 'createdAt' | 'createdByUserId'> & {
    userId: string;
    addToInventory: boolean;
    inventoryTargetLocationId?: string;
}) {
    if (purchaseData.addToInventory && !purchaseData.inventoryTargetLocationId) {
        throw new Error("Target location is required for inventory entry");
    }

    try {
        // Create ref outside to get ID
        const purchaseRef = doc(collection(db, "purchases"));

        await runTransaction(db, async (transaction) => {
            // 1. Create Purchase Record
            transaction.set(purchaseRef, {
                ...purchaseData,
                createdByUserId: purchaseData.userId,
                createdAt: serverTimestamp(),
                // Clean up transient fields
                addToInventory: undefined,
                inventoryTargetLocationId: undefined
            });

            // 2. Inventory Logic inside transaction? 
            // We moved it to AFTER transaction for simplicity in previous steps, 
            // but effectively we just set the purchase here.
        });

        // 3. Post-Transaction: Process Inventory (Sequential)
        // This makes "Purchase" the parent. If inventory fails, Purchase still exists (as expense).
        if (purchaseData.addToInventory && purchaseData.inventoryTargetLocationId) {
            const inventoryItems = purchaseData.items.filter(item => item.isInventory);

            for (const item of inventoryItems) {
                if (item.matchedProductId) {
                    // Match found: Create Movement
                    await registerMovement({
                        productId: item.matchedProductId,
                        type: 'ENTRADA',
                        quantity: item.quantity,
                        destinationLocationId: purchaseData.inventoryTargetLocationId,
                        reason: `Compra Ticket #${purchaseData.ticketNumber || purchaseData.ticketId}`,
                        unitCost: item.unitPrice,
                        ticketId: purchaseData.ticketId,
                        createdByUserId: purchaseData.userId,
                        createdByType: 'TECHNICIAN'
                    });
                } else {
                    // No Match: Create Pending Product (Provisional)
                    await addDoc(collection(db, "pending_products"), {
                        detectedName: item.description,
                        providerName: purchaseData.providerName,
                        suggestedUnit: 'UND',
                        detectedPrice: item.unitPrice,
                        quantity: item.quantity, // Storing quantity for retroactive entry
                        targetLocationId: purchaseData.inventoryTargetLocationId, // Storing target for retroactive entry

                        ticketId: purchaseData.ticketId,
                        purchaseId: purchaseRef.id,
                        status: 'PENDING',
                        createdByUserId: purchaseData.userId,
                        createdAt: serverTimestamp()
                    });
                }
            }
        }

        return true;
    } catch (error) {
        console.error("Error registering purchase", error);
        throw error;
    }
}

export async function getPurchasesByTicket(ticketId: string) {
    const q = query(collection(db, "purchases"), where("ticketId", "==", ticketId), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Purchase));
}

// --- MOCK OCR SERVICE ---
export async function analyzeReceiptImage(file: File): Promise<{
    provider?: string;
    total?: number;
    items?: Partial<PurchaseItem>[];
    date?: string;
}> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // In a real app, this would call GPT-4o-mini or Google Vision
    // For now, return varying mock data or empty to force user interaction
    // Or basic deterministic result for demo

    return {
        provider: "", // Empty to let user fill
        total: 0,
        items: [
            { description: "Item detectado 1", quantity: 1, unitPrice: 0, total: 0, isInventory: false },
        ]
    };
}
