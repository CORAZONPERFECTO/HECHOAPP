import * as dotenv from "dotenv";
import * as path from "path";

// Load .env
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Import service
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { erpNextService } = require("./erpnext/service");

async function simulateTrigger() {
    console.log("🚀 Simulating Ticket Closure Trigger Logic...");

    // 1. Mock Data (What would come from Firestore)
    const mockTicket = {
        id: "TICKET-SIM-001",
        codigo: "SIM-001",
        titulo: "Reparación Simulada",
        descripcion: "Prueba de integración directa desde script.",
        estado: "CERRADO",
        clientId: "CLIENT-SIM-123"
    };

    const mockClient = {
        nombreComercial: "Cliente Simulado Script",
        rnc: "101010101",
        emailContacto: "test@simulado.com"
    };

    try {
        // --- Step 1: Client Lookup (Simulated Firestore fetch) ---
        console.log(`\n1️⃣  [MockDB] Client Data Loaded: ${mockClient.nombreComercial}`);

        // --- Step 2: ERPNext Customer Sync ---
        console.log(`\n2️⃣  [ERPNext] Finding Customer '${mockClient.nombreComercial}'...`);
        let erpCustomer = await erpNextService.findCustomer(mockClient.nombreComercial);

        if (!erpCustomer) {
            console.log(`   Customer not found. Creating...`);
            erpCustomer = await erpNextService.createCustomer({
                name: mockClient.nombreComercial,
                customer_name: mockClient.nombreComercial,
                customer_type: "Company",
                customer_group: "Commercial",
                tax_id: mockClient.rnc,
                email_id: mockClient.emailContacto,
                territory: "All Territories"
            });
            console.log(`   ✅ Customer Created: ${erpCustomer}`);
        } else {
            console.log(`   ✅ Customer Found: ${erpCustomer}`);
        }

        // --- Step 3: Item Price ---
        const itemCode = "Servicio Técnico";
        console.log(`\n3️⃣  [ERPNext] Fetching Price for '${itemCode}'...`);
        let rate = 0;
        try {
            rate = await erpNextService.getItemPrice(itemCode);
            console.log(`   Price: ${rate}`);
        } catch (e) {
            console.warn(`   Could not fetch price, using 0.`);
        }

        // --- Step 4: Create Invoice ---
        console.log(`\n4️⃣  [ERPNext] Creating Sales Invoice...`);
        const invoicePayload = {
            customer: erpCustomer,
            posting_date: new Date().toISOString().split('T')[0],
            due_date: new Date().toISOString().split('T')[0],
            items: [
                {
                    item_code: itemCode,
                    qty: 1,
                    rate: rate,
                    description: `Ticket #${mockTicket.codigo} - ${mockTicket.titulo}\n${mockTicket.descripcion}`,
                    uom: "Unit"
                }
            ],
            docstatus: 0, // Draft
            po_no: mockTicket.codigo,
            remarks: `Generated from HECHOAPP Ticket ${mockTicket.id} (Simulation)`
        };

        const invoice = await erpNextService.createSalesInvoice(invoicePayload);
        console.log(`   ✅ Invoice Created: ${invoice.name}`);

        console.log("\n🎉 Simulation Complete! Logic works.");

    } catch (error) {
        console.error("\n❌ Simulation Failed:", error);
    }
}

simulateTrigger();
