
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    addDoc,
    updateDoc,
    query,
    where,
    orderBy,
    limit,
    runTransaction,
    serverTimestamp,
    Timestamp
} from "firebase/firestore";
import { db } from "./firebase";
import {
    InventoryProduct,
    InventoryMovement,
    InventoryStock,
    InventoryLocation,
    MovementType
} from "@/types/inventory";

// --- PRODUCTS ---

export async function createProduct(product: Omit<InventoryProduct, 'id' | 'createdAt' | 'updatedAt'>) {
    const docRef = await addDoc(collection(db, "inventory_products"), {
        ...product,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isActive: true
    });
    return docRef.id;
}

export async function updateProduct(id: string, updates: Partial<InventoryProduct>) {
    const docRef = doc(db, "inventory_products", id);
    await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
    });
}

export async function getProducts(onlyActive = true) {
    let q = query(collection(db, "inventory_products"));
    if (onlyActive) {
        q = query(q, where("isActive", "==", true));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as InventoryProduct));
}

export async function getProduct(id: string) {
    const docRef = doc(db, "inventory_products", id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as InventoryProduct;
}

// --- LOCATIONS ---

export async function getLocations() {
    const q = query(collection(db, "inventory_locations"), where("isActive", "==", true));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as InventoryLocation));
}

export async function createLocation(location: Omit<InventoryLocation, 'id' | 'createdAt' | 'updatedAt'>) {
    await addDoc(collection(db, "inventory_locations"), {
        ...location,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });
}

export async function updateLocation(id: string, updates: Partial<InventoryLocation>) {
    const docRef = doc(db, "inventory_locations", id);
    await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
    });
}

export async function deleteLocation(id: string) {
    // Soft delete
    const docRef = doc(db, "inventory_locations", id);
    await updateDoc(docRef, { isActive: false });
}

export async function ensureDefaultLocations() {
    const locations = await getLocations();

    const defaults = [
        { name: "Almacén Principal", type: "ALMACEN" },
        { name: "Camioneta 1", type: "VEHICULO" },
        { name: "Camioneta 2", type: "VEHICULO" }
    ];

    for (const def of defaults) {
        const exists = locations.find(l => l.name === def.name && l.type === def.type);
        if (!exists) {
            await createLocation({
                name: def.name,
                type: def.type as any,
                isActive: true
            });
        }
    }
}

// --- STOCK & MOVEMENTS (CORE LOGIC) ---

/**
 * Registers a movement and updates stock levels atomically.
 * THIS IS THE ONLY WAY TO CHANGE STOCK.
 */
export async function registerMovement(movement: Omit<InventoryMovement, 'id' | 'createdAt'>) {
    try {
        await runTransaction(db, async (transaction) => {
            // 1. Validate Source Stock (if outgoing)
            if (movement.type === 'SALIDA' || movement.type === 'TRANSFERENCIA') {
                if (!movement.originLocationId) throw new Error("Origin location required for this movement type.");

                const stockId = `${movement.productId}_${movement.originLocationId}`;
                const stockRef = doc(db, "inventory_stock", stockId);
                const stockSnap = await transaction.get(stockRef);

                if (!stockSnap.exists()) {
                    throw new Error("No stock record found at origin location.");
                }

                const currentQty = stockSnap.data().quantity || 0;
                if (currentQty < movement.quantity) {
                    throw new Error(`Insufficient stock. Available: ${currentQty}, Requested: ${movement.quantity}`);
                }

                // Deduct
                transaction.update(stockRef, {
                    quantity: currentQty - movement.quantity,
                    updatedAt: serverTimestamp()
                });
            }

            // 2. Validate/Update Destination Stock (if incoming)
            if (movement.type === 'ENTRADA' || movement.type === 'TRANSFERENCIA' || movement.type === 'AJUSTE') {
                // Determine target location
                // For AJUSTE, it depends if positive or negative, usually mapped to a location
                // Just assuming standard flow:
                const targetLocationId = movement.destinationLocationId || (movement.type === 'AJUSTE' ? movement.originLocationId : null);

                if (targetLocationId) {
                    const stockId = `${movement.productId}_${targetLocationId}`;
                    const stockRef = doc(db, "inventory_stock", stockId);
                    const stockSnap = await transaction.get(stockRef);

                    let newQty = 0;

                    if (stockSnap.exists()) {
                        const currentData = stockSnap.data();

                        if (movement.type === 'AJUSTE') {
                            // Adjustment could be absolute or relative. 
                            // For simplicity, let's assume the 'quantity' in movement is the DELTA or strict addition
                            // NOTE: User spec says "Todo cambio crea un movimiento". 
                            // Usually adjustments are corrections. If qty is positive, add. If negative (logic handled elsewhere), subtract?
                            // Let's assume standard ADDITION logic here for simplicity, caller handles negatives by using SALIDA or negative qty?
                            // Better: AJUSTE with positive quantity = found extra. AJUSTE with negative? NO, 'SALIDA' type usually handles loss.
                            // Let's stick to positive qty adds.
                            newQty = currentData.quantity + movement.quantity;
                        } else {
                            newQty = currentData.quantity + movement.quantity;
                        }

                        transaction.update(stockRef, {
                            quantity: newQty,
                            updatedAt: serverTimestamp()
                        });
                    } else {
                        // Create new stock record
                        transaction.set(stockRef, {
                            id: stockId,
                            productId: movement.productId,
                            locationId: targetLocationId,
                            quantity: movement.quantity,
                            updatedAt: serverTimestamp()
                        });
                    }
                }
            }

            // 3. Create Movement Record
            const movRef = doc(collection(db, "inventory_movements"));
            transaction.set(movRef, {
                ...movement,
                createdAt: serverTimestamp()
            });
        });

        return { success: true };
    } catch (error: any) {
        console.error("Transaction failed: ", error);
        throw error;
    }
}

export async function getStockByProduct(productId: string) {
    const q = query(collection(db, "inventory_stock"), where("productId", "==", productId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as InventoryStock);
}

export async function getStockByLocation(locationId: string) {
    const q = query(collection(db, "inventory_stock"), where("locationId", "==", locationId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as InventoryStock);
}

export async function getMovements(productId?: string, limitCount = 50) {
    let q = query(collection(db, "inventory_movements"), orderBy("createdAt", "desc"), limit(limitCount));
    if (productId) {
        q = query(q, where("productId", "==", productId));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as InventoryMovement));
}
