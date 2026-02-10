
import { db, storage } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, runTransaction, doc, query, where, getDocs, orderBy } from "firebase/firestore";
import { Purchase, PurchaseItem } from "@/types/purchase";
import { registerMovement } from "./inventory-service";

// Helper for mathematical integrity
function validatePurchaseIntegrity(data: { items: any[], subtotal: number, tax: number, total: number }) {
    const calculatedSubtotal = data.items.reduce((sum, item) => sum + (item.total || 0), 0);
    const calculatedTotal = calculatedSubtotal + data.tax;

    // Tolerance for floating point math
    const TOLERANCE = 0.05;

    if (Math.abs(calculatedSubtotal - data.subtotal) > TOLERANCE) {
        throw new Error(`Integrity Error: Sum of items (${calculatedSubtotal.toFixed(2)}) does not match subtotal (${data.subtotal.toFixed(2)})`);
    }

    if (Math.abs(calculatedTotal - data.total) > TOLERANCE) {
        throw new Error(`Integrity Error: Subtotal + Tax (${calculatedTotal.toFixed(2)}) does not match Total (${data.total.toFixed(2)})`);
    }
}

export async function registerPurchase(purchaseData: Omit<Purchase, 'id' | 'createdAt' | 'createdByUserId'> & {
    userId: string;
    addToInventory: boolean;
    inventoryTargetLocationId?: string;
}) {
    // 1. Validation
    if (purchaseData.addToInventory && !purchaseData.inventoryTargetLocationId) {
        throw new Error("Target location is required for inventory entry");
    }

    validatePurchaseIntegrity({
        items: purchaseData.items,
        subtotal: purchaseData.subtotal,
        tax: purchaseData.tax,
        total: purchaseData.total
    });

    // 2. Duplicate Check (NCF + Provider)
    if (purchaseData.ncf) {
        const q = query(
            collection(db, "purchases"),
            where("ncf", "==", purchaseData.ncf),
            where("providerName", "==", purchaseData.providerName)
        );
        const duplicateSnap = await getDocs(q);
        if (!duplicateSnap.empty) {
            throw new Error(`Duplicate Invoice: A purchase from ${purchaseData.providerName} with NCF ${purchaseData.ncf} already exists.`);
        }
    }

    try {
        // Create ref outside to get ID
        const purchaseRef = doc(collection(db, "purchases"));

        await runTransaction(db, async (transaction) => {
            // 3. Create Purchase Record
            transaction.set(purchaseRef, {
                ...purchaseData,
                createdByUserId: purchaseData.userId,
                createdAt: serverTimestamp(),
                // Clean up transient fields
                addToInventory: undefined,
                inventoryTargetLocationId: undefined
            });
        });

        // 4. Post-Transaction: Process Inventory (Sequential)
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
