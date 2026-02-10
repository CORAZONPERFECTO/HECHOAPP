"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onTicketClosed = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const service_1 = require("./service");
const db = admin.firestore();
exports.onTicketClosed = functions.firestore
    .document("tickets/{ticketId}")
    .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const previousData = change.before.data();
    // Only run if status changed to CERRADO (Closed)
    if (newData.estado === "CERRADO" && previousData.estado !== "CERRADO") {
        const ticketId = context.params.ticketId;
        console.log(`Ticket ${ticketId} closed. Syncing to ERPNext...`);
        try {
            // 1. Get Client Details
            let clientName = "Cliente Desconocido";
            let clientRnc = undefined;
            let clientEmail = undefined;
            if (newData.clientId) {
                const clientDoc = await db.collection("clients").doc(newData.clientId).get();
                if (clientDoc.exists) {
                    const clientData = clientDoc.data();
                    clientName = clientData.nombreComercial || "Cliente Sin Nombre";
                    clientRnc = clientData.rnc; // Tax ID
                    clientEmail = clientData.emailContacto;
                }
            }
            // 2. Find or Create Customer in ERPNext
            let erpCustomer = await service_1.erpNextService.findCustomer(clientName);
            if (!erpCustomer) {
                console.log(`Customer ${clientName} not found in ERPNext. Creating...`);
                erpCustomer = await service_1.erpNextService.createCustomer({
                    name: clientName,
                    customer_name: clientName,
                    customer_type: "Company",
                    customer_group: "Commercial",
                    tax_id: clientRnc,
                    email_id: clientEmail,
                    territory: "All Territories"
                });
            }
            // 3. Prepare Invoice Items from Ticket
            // TODO: Map real items if Ticket has a dedicated sub-collection or array of items.
            // For now, we use the Ticket metadata.
            const description = `Ticket #${newData.codigo} - ${newData.titulo}\n${newData.descripcion}`;
            const invoice = await service_1.erpNextService.createSalesInvoice({
                customer: erpCustomer,
                posting_date: new Date().toISOString().split('T')[0],
                due_date: new Date().toISOString().split('T')[0],
                items: [
                    {
                        item_code: "Servicio Técnico",
                        qty: 1,
                        rate: 0,
                        description: description,
                        uom: "Unit"
                    }
                ],
                docstatus: 0,
                po_no: newData.codigo,
                remarks: `Generated from HECHOAPP Ticket ${ticketId}`
            });
            console.log(`Invoice created for Ticket ${ticketId}: ${invoice.name}`);
            // 4. Update Ticket with ERP Reference
            await change.after.ref.update({
                erpInvoiceId: invoice.name,
                erpSyncedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
        catch (error) {
            console.error(`Failed to sync Ticket ${ticketId} to ERPNext:`, error);
            // Optionally: Write to a separate 'sync_errors' collection for retry
        }
    }
});
//# sourceMappingURL=triggers.js.map