
import { registerMovement, createProduct, createLocation } from "../src/lib/inventory-service";
import { getDoc, doc } from "firebase/firestore";
import { db } from "../src/lib/firebase";
import * as dotenv from "dotenv";
import { setupAuth } from "./setup-auth";

dotenv.config({ path: ".env.local" });

async function verifyInventory() {
    console.log("🚀 Starting Inventory Verification...");
    await setupAuth(); // Authenticate as Admin

    try {
        // 1. Setup
        const locationId = "verify_loc_" + Date.now();
        await createLocation({
            id: locationId,
            name: "Test Location",
            type: "ALMACEN",
            isActive: true
        } as any);
        console.log("✅ Created Test Location:", locationId);

        const productId = "verify_prod_" + Date.now();
        await createProduct({
            id: productId,
            name: "Test Product",
            sku: "TEST-SKU",
            averageCost: 100,
            minStock: 10,
            unit: "UNIDAD",
            isActive: true,
            category: "TEST"
        } as any);
        console.log("✅ Created Test Product:", productId);

        // 2. Test ENTRADA (Entry)
        console.log("Testing ENTRADA...");
        await registerMovement({
            type: "ENTRADA",
            productId,
            destinationLocationId: locationId,
            quantity: 50,
            reason: "Initial Stock",
            createdByUserId: "TEST_USER",
            createdByType: "SYSTEM"
        } as any);

        // Verify Stock
        const stockId = `${productId}_${locationId}`;
        const stockSnap = await getDoc(doc(db, "inventory_stock", stockId));
        if (!stockSnap.exists() || stockSnap.data().quantity !== 50) {
            throw new Error(`Stock verification failed! Expected 50, got ${stockSnap.data()?.quantity}`);
        }
        console.log("✅ ENTRADA Verified. Stock is 50.");

        // 3. Test SALIDA (Exit)
        console.log("Testing SALIDA...");
        await registerMovement({
            type: "SALIDA",
            productId,
            originLocationId: locationId,
            quantity: 20,
            reason: "Consumption",
            createdByUserId: "TEST_USER",
            createdByType: "SYSTEM"
        } as any);

        // Verify Stock
        const stockSnap2 = await getDoc(doc(db, "inventory_stock", stockId));
        if (stockSnap2.data()?.quantity !== 30) {
            throw new Error(`Stock verification failed! Expected 30, got ${stockSnap2.data()?.quantity}`);
        }
        console.log("✅ SALIDA Verified. Stock is 30.");

        // 4. Test Insufficient Stock
        console.log("Testing Insufficient Stock...");
        try {
            await registerMovement({
                type: "SALIDA",
                productId,
                originLocationId: locationId,
                quantity: 100, // More than 30
                reason: "Fail Test",
                createdByUserId: "TEST_USER",
                createdByType: "SYSTEM"
            } as any);
            throw new Error("Should have failed due to insufficient stock!");
        } catch (e: any) {
            if (e.message.includes("Insufficient stock")) {
                console.log("✅ Insufficient Stock Check Verified.");
            } else {
                throw e;
            }
        }

        // 5. Test Low Stock Alert
        console.log("Testing Low Stock Alert...");
        // Current Stock: 30. Min Stock: 10.
        // Consume 25 -> Remaining 5. Should trigger Alert.

        await registerMovement({
            type: "SALIDA",
            productId,
            originLocationId: locationId,
            quantity: 25,
            reason: "Trigger Alert",
            createdByUserId: "TEST_USER",
            createdByType: "SYSTEM"
        } as any);

        const alertId = `alert_${productId}_${locationId}`;
        const alertSnap = await getDoc(doc(db, "inventory_alerts", alertId));

        if (!alertSnap.exists() || alertSnap.data().status !== 'ACTIVE') {
            throw new Error(`Alert verification failed! Alert should be ACTIVE. Got: ${alertSnap.data()?.status}`);
        }
        console.log("✅ Alert Creation Verified (Status: ACTIVE).");

        // 6. Test Alert Resolution
        console.log("Testing Alert Resolution...");
        // Restock +20 -> Total 25. Min 10. Should Resolve.
        await registerMovement({
            type: "ENTRADA",
            productId,
            destinationLocationId: locationId,
            quantity: 20,
            reason: "Restock",
            createdByUserId: "TEST_USER",
            createdByType: "SYSTEM"
        } as any);

        const alertSnap2 = await getDoc(doc(db, "inventory_alerts", alertId));
        if (alertSnap2.data()?.status !== 'RESOLVED') {
            throw new Error(`Alert resolution failed! Expected RESOLVED, got ${alertSnap2.data()?.status}`);
        }
        console.log("✅ Alert Resolution Verified (Status: RESOLVED).");

        console.log("🎉 ALL INVENTORY TESTS PASSED");

    } catch (error) {
        console.error("❌ Verification Failed:", error);
        process.exit(1);
    }
}

verifyInventory();
