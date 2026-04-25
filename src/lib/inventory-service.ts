
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
    Timestamp,
    DocumentReference
} from "firebase/firestore";
import { db } from "./firebase";
import {
    InventoryProduct,
    InventoryMovement,
    InventoryStock,
    InventoryLocation,
    MovementType,
    InventoryLocationType
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
    const defaults: { name: string; type: InventoryLocationType }[] = [
        { name: "Almacén Principal", type: "ALMACEN" },
        { name: "Camioneta 1", type: "VEHICULO" },
        { name: "Camioneta 2", type: "VEHICULO" }
    ];

    for (const def of defaults) {
        const q = query(
            collection(db, "inventory_locations"),
            where("name", "==", def.name),
            where("type", "==", def.type)
        );
        const snapshot = await getDocs(q);
        const exists = !snapshot.empty;

        if (!exists) {
            await createLocation({
                name: def.name,
                type: def.type,
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
            const modifiedLocations: { locationId: string; newQty: number }[] = [];

            // 1. Validate Source Stock (if outgoing)
            if (movement.type === 'SALIDA' || movement.type === 'TRANSFERENCIA') {
                if (!movement.originLocationId) throw new Error("Origin location required for this movement type.");

                const stockId = `${movement.productId}_${movement.originLocationId}`;
                const stockRef = doc(db, "inventory_stock", stockId);
                const stockSnap = await transaction.get(stockRef);

                if (!stockSnap.exists()) {
                    throw new Error("No stock record found at origin location.");
                }

                let currentQty = 0;
                currentQty = stockSnap.data().quantity || 0;
                if (currentQty < movement.quantity) {
                    throw new Error(`Insufficient stock. Available: ${currentQty}, Requested: ${movement.quantity}`);
                }

                const newOriginQty = currentQty - movement.quantity;

                transaction.update(stockRef, {
                    quantity: newOriginQty,
                    updatedAt: serverTimestamp()
                });

                modifiedLocations.push({ locationId: movement.originLocationId, newQty: newOriginQty });
            }

            // 2. Validate/Update Destination Stock (if incoming)
            if (movement.type === 'ENTRADA' || movement.type === 'TRANSFERENCIA' || movement.type === 'AJUSTE') {
                const targetLocationId = movement.destinationLocationId || (movement.type === 'AJUSTE' ? movement.originLocationId : null);

                if (targetLocationId) {
                    const stockId = `${movement.productId}_${targetLocationId}`;
                    const stockRef = doc(db, "inventory_stock", stockId);
                    const stockSnap = await transaction.get(stockRef);

                    let newDestQty = 0;

                    if (stockSnap.exists()) {
                        const currentData = stockSnap.data();

                        if (movement.type === 'AJUSTE') {
                            newDestQty = currentData.quantity + movement.quantity;
                        } else {
                            newDestQty = currentData.quantity + movement.quantity;
                        }

                        transaction.update(stockRef, {
                            quantity: newDestQty,
                            updatedAt: serverTimestamp()
                        });
                    } else {
                        // Create new stock record
                        newDestQty = movement.quantity;
                        transaction.set(stockRef, {
                            id: stockId,
                            productId: movement.productId,
                            locationId: targetLocationId,
                            quantity: newDestQty,
                            updatedAt: serverTimestamp()
                        });
                    }

                    modifiedLocations.push({ locationId: targetLocationId, newQty: newDestQty });
                }
            }

            // 3. Alert Logic
            if (modifiedLocations.length > 0) {
                const prodRef = doc(db, "inventory_products", movement.productId);
                const prodSnap = await transaction.get(prodRef);

                if (prodSnap.exists()) {
                    const prodData = prodSnap.data();
                    const minStock = prodData.minStock || 0;

                    for (const loc of modifiedLocations) {
                        const alertId = `alert_${movement.productId}_${loc.locationId}`;
                        const alertRef = doc(db, "inventory_alerts", alertId);
                        const alertSnap = await transaction.get(alertRef);

                        if (loc.newQty <= minStock) {
                            if (!alertSnap.exists() || alertSnap.data().status === 'RESOLVED') {
                                transaction.set(alertRef, {
                                    productId: movement.productId,
                                    locationId: loc.locationId,
                                    type: loc.newQty === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK',
                                    status: 'ACTIVE',
                                    currentQty: loc.newQty,
                                    threshold: minStock,
                                    createdAt: serverTimestamp(),
                                    updatedAt: serverTimestamp()
                                });
                                console.log(`⚠️ Alert Triggered: ${alertId}`);
                            } else {
                                transaction.update(alertRef, {
                                    currentQty: loc.newQty,
                                    type: loc.newQty === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK',
                                    updatedAt: serverTimestamp()
                                });
                            }
                        } else {
                            if (alertSnap.exists() && alertSnap.data().status === 'ACTIVE') {
                                transaction.update(alertRef, {
                                    status: 'RESOLVED',
                                    resolvedAt: serverTimestamp(),
                                    currentQty: loc.newQty
                                });
                                console.log(`✅ Alert Resolved: ${alertId}`);
                            }
                        }
                    }
                }
            }

            // 4. Create Movement Record
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

export async function getAllStock() {
    const snapshot = await getDocs(collection(db, "inventory_stock"));
    return snapshot.docs.map(d => d.data() as InventoryStock);
}
