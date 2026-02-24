/**
 * ERP Integration Test Script
 * Run with: npx ts-node -e "require('./src/test-erp-flow')"
 * Or: cd functions && npm run shell  (then call test functions)
 */

import * as admin from "firebase-admin";
import { ERPNextService } from "./erpnext/service";

// Init Firebase Admin
if (!admin.apps.length) {
    const serviceAccount = require("../../serviceAccountKey.json");
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

const db = admin.firestore();

async function runTests() {
    console.log("\n====================================");
    console.log("   HECHOAPP ERP Integration Tests   ");
    console.log("====================================\n");

    const erp = new ERPNextService();

    // ─── TEST 1: ERP Connection ───────────────────────────────────────
    console.log("TEST 1: Conexión a ERPNext...");
    try {
        const customer = await erp.findCustomer("HECHO SRL");
        console.log(`  ✅ Conexión OK. Cliente encontrado: ${customer || "No encontrado (normal si no existe)"}`);
    } catch (e: any) {
        console.log(`  ❌ Error de conexión: ${e.message}`);
    }

    // ─── TEST 2: Fetch Items from ERP ─────────────────────────────────
    console.log("\nTEST 2: Obteniendo ítems del catálogo ERP...");
    try {
        const items = await erp.getItems();
        console.log(`  ✅ ${items.length} ítems encontrados en ERPNext`);
        if (items.length > 0) {
            console.log(`     Ejemplo: ${items[0].item_name} (${items[0].name})`);
        }
    } catch (e: any) {
        console.log(`  ❌ Error obteniendo ítems: ${e.message}`);
    }

    // ─── TEST 3: Check Firestore data ─────────────────────────────────
    console.log("\nTEST 3: Verificando datos en Firestore...");
    try {
        const clientsSnap = await db.collection("clients").limit(3).get();
        const quotesSnap = await db.collection("quotes").limit(3).get();
        const invoicesSnap = await db.collection("invoices").limit(3).get();

        console.log(`  ✅ Clientes: ${clientsSnap.size}`);
        console.log(`  ✅ Cotizaciones: ${quotesSnap.size}`);
        console.log(`  ✅ Facturas: ${invoicesSnap.size}`);

        if (clientsSnap.size > 0) {
            const client = clientsSnap.docs[0].data();
            console.log(`     Primer cliente: ${client.nombreComercial} (RNC: ${client.rnc || "N/A"})`);
        }

        // Check for quotes already synced to ERP
        const syncedQuotes = await db.collection("quotes")
            .where("erpQuotationId", "!=", null)
            .limit(5)
            .get();
        console.log(`  ✅ Cotizaciones sincronizadas con ERP: ${syncedQuotes.size}`);

        const syncedInvoices = await db.collection("invoices")
            .where("erpInvoiceId", "!=", null)
            .limit(5)
            .get();
        console.log(`  ✅ Facturas sincronizadas con ERP: ${syncedInvoices.size}`);

    } catch (e: any) {
        console.log(`  ❌ Error Firestore: ${e.message}`);
    }

    // ─── TEST 4: ERP Customer Ensure ──────────────────────────────────
    console.log("\nTEST 4: Verificando/creando cliente de prueba en ERP...");
    try {
        const testClientName = "Cliente Prueba HECHOAPP Test";
        const customerName = await erp.ensureCustomer({
            name: testClientName,
            rnc: "131-12345-6",
            email: "test@hechoapp.com"
        });
        console.log(`  ✅ Cliente ERP asegurado: ${customerName}`);
    } catch (e: any) {
        console.log(`  ❌ Error creando cliente en ERP: ${e.message}`);
    }

    // ─── TEST 5: Create test Quotation in ERP ─────────────────────────
    console.log("\nTEST 5: Creando cotización de prueba en ERPNext...");
    try {
        const settingsSnap = await db.collection("settings").doc("company").get();
        const company = settingsSnap.exists ? settingsSnap.data()?.name || "HECHO SRL" : "HECHO SRL";

        const result = await erp.createQuotation({
            quotation_to: "Customer",
            party_name: "Cliente Prueba HECHOAPP Test",
            company,
            transaction_date: new Date().toISOString().split("T")[0],
            currency: "DOP",
            items: [{
                item_code: "Servicio de Prueba",
                item_name: "Servicio de Prueba",
                description: "Test desde HECHOAPP",
                qty: 1,
                rate: 1500,
            }],
            custom_hechoapp_quote_id: "TEST-001",
        });
        console.log(`  ✅ Cotización creada en ERP: ${result.name}`);
        console.log(`     Link: ${process.env.ERPNEXT_URL}/Quotation/${result.name}`);
    } catch (e: any) {
        console.log(`  ⚠️  No se pudo crear cotización en ERP: ${e.message}`);
        console.log(`     (Puede ser normal si el ítem no existe en ERP)`);
    }

    console.log("\n====================================");
    console.log("          Tests completados          ");
    console.log("====================================\n");
}

runTests().catch(console.error);
