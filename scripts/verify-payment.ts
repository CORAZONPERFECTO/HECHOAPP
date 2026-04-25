
import { registerPayment } from "../src/lib/income-utils";
import { addDoc, collection, getDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../src/lib/firebase";
import * as dotenv from "dotenv";
import { setupAuth } from "./setup-auth";

dotenv.config({ path: ".env.local" });

async function verifyPayments() {
    console.log("🚀 Starting Payment Verification...");
    await setupAuth(); // Authenticate as Admin

    try {
        // 1. Create Invoice
        const invoiceRef = await addDoc(collection(db, "invoices"), {
            clientId: "TEST_CLIENT",
            number: "INV-TEST-001",
            total: 1000,
            balance: 1000,
            status: "SENT",
            items: [],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        console.log("✅ Created Test Invoice:", invoiceRef.id);

        // 2. Register Partial Payment
        console.log("Testing Partial Payment...");
        await registerPayment({
            invoiceId: invoiceRef.id,
            clientId: "TEST_CLIENT",
            clientName: "Test Client",
            amount: 400,
            method: "EFECTIVO",
            notes: "Partial Payment",
            createdByUserId: "TEST",
            number: "PAY-001",
            date: serverTimestamp() as any
        } as any);

        // Verify Invoice Balance
        const invSnap1 = await getDoc(doc(db, "invoices", invoiceRef.id));
        const inv1 = invSnap1.data();
        if (inv1?.balance !== 600 || inv1?.status !== "PARTIALLY_PAID") {
            throw new Error(`Partial Payment Failed! Balance: ${inv1?.balance}, Status: ${inv1?.status}`);
        }
        console.log("✅ Partial Payment Verified. Balance 600, Status PARTIALLY_PAID.");

        // 3. Register Full Remaining Payment
        console.log("Testing Full Payment...");
        await registerPayment({
            invoiceId: invoiceRef.id,
            clientId: "TEST_CLIENT",
            clientName: "Test Client",
            amount: 600,
            method: "EFECTIVO",
            notes: "Full Payment",
            createdByUserId: "TEST",
            number: "PAY-002",
            date: serverTimestamp() as any
        } as any);

        // Verify Invoice Closed
        const invSnap2 = await getDoc(doc(db, "invoices", invoiceRef.id));
        const inv2 = invSnap2.data();
        if (inv2?.balance !== 0 || inv2?.status !== "PAID") {
            throw new Error(`Full Payment Failed! Balance: ${inv2?.balance}, Status: ${inv2?.status}`);
        }
        console.log("✅ Full Payment Verified. Balance 0, Status PAID.");

        console.log("🎉 ALL PAYMENT TESTS PASSED");

    } catch (error) {
        console.error("❌ Payment Verification Failed:", error);
        process.exit(1);
    }
}

verifyPayments();
