
import { registerPurchase } from "../src/lib/purchase-service";
import { Timestamp } from "firebase/firestore";
import * as dotenv from "dotenv";
import { setupAuth } from "./setup-auth";

dotenv.config({ path: ".env.local" });

async function verifyPurchases() {
    console.log("🚀 Starting Purchase Integrity Verification...");
    await setupAuth();

    const timestamp = Timestamp.now();
    const mockTicketId = "ticket_" + Date.now();

    // Test Case 1: Integrity Error (Math Mismatch)
    console.log("Testing Integrity Error...");
    try {
        await registerPurchase({
            userId: "TEST_USER",
            ticketId: mockTicketId,
            providerName: "Test Provider",
            date: timestamp,
            subtotal: 100,
            tax: 18,
            total: 500, // ERROR: Should be 118
            items: [
                { description: "Item 1", quantity: 1, unitPrice: 100, total: 100, isInventory: false }
            ],
            paymentMethod: 'CASH',
            evidenceUrls: [],
            addToInventory: false
        } as any);
        throw new Error("Should have failed validation!");
    } catch (e: any) {
        if (e.message.includes("Integrity Error")) {
            console.log("✅ Integrity Check Verified.");
        } else {
            throw e;
        }
    }

    // Test Case 2: Success
    console.log("Testing Successful Purchase...");
    const ncf = "B01" + Date.now();
    await registerPurchase({
        userId: "TEST_USER",
        ticketId: mockTicketId,
        providerName: "Duplicate Provider",
        rnc: "123",
        ncf: ncf,
        date: timestamp,
        subtotal: 100,
        tax: 18,
        total: 118, // Correct
        items: [
            { description: "Item 1", quantity: 1, unitPrice: 100, total: 100, isInventory: false }
        ],
        paymentMethod: 'CASH',
        evidenceUrls: [],
        addToInventory: false
    } as any);
    console.log("✅ valid purchase registered.");

    // Test Case 3: Duplicate NCF
    console.log("Testing Duplicate NCF...");
    try {
        await registerPurchase({
            userId: "TEST_USER",
            ticketId: mockTicketId,
            providerName: "Duplicate Provider", // Same provider
            ncf: ncf, // Same NCF
            date: timestamp,
            subtotal: 50,
            tax: 0,
            total: 50,
            items: [
                { description: "Diff Item", quantity: 1, unitPrice: 50, total: 50, isInventory: false }
            ],
            paymentMethod: 'CASH',
            evidenceUrls: [],
            addToInventory: false
        } as any);
        throw new Error("Should have failed duplicate check!");
    } catch (e: any) {
        if (e.message.includes("Duplicate Invoice")) {
            console.log("✅ Duplicate Check Verified.");
        } else {
            throw e;
        }
    }

    console.log("🎉 ALL PURCHASE TESTS PASSED");
    process.exit(0);
}

verifyPurchases().catch(e => {
    console.error("Verification Failed", e);
    process.exit(1);
});
