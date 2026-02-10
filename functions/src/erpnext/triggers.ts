import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { erpNextService } from "./service";
import { Ticket, Client } from "../types/schema";

const db = admin.firestore();

export const onTicketClosed = functions.firestore
    .document("tickets/{ticketId}")
    .onUpdate(async (change, context) => {
        const newData = change.after.data() as Ticket;
        const previousData = change.before.data() as Ticket;

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
                        const clientData = clientDoc.data() as Client;
                        clientName = clientData.nombreComercial || "Cliente Sin Nombre";
                        clientRnc = clientData.rnc; // Tax ID
                        clientEmail = clientData.emailContacto;
                    }
                }

                // 2. Find or Create Customer in ERPNext
                let erpCustomer = await erpNextService.findCustomer(clientName);
                if (!erpCustomer) {
                    console.log(`Customer ${clientName} not found in ERPNext. Creating...`);
                    erpCustomer = await erpNextService.createCustomer({
                        name: clientName, // This becomes ID in ERPNext if using manual naming, or is ignored if auto-naming
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

                const invoice = await erpNextService.createSalesInvoice({
                    customer: erpCustomer,
                    posting_date: new Date().toISOString().split('T')[0],
                    due_date: new Date().toISOString().split('T')[0],
                    items: [
                        {
                            item_code: "Servicio Técnico", // Generic Item must exist in ERPNext
                            qty: 1,
                            rate: 0, // Placeholder: Needs logic to determine price
                            description: description,
                            uom: "Unit"
                        }
                    ],
                    docstatus: 0, // Draft
                    po_no: newData.codigo, // Purchase Order / Reference
                    remarks: `Generated from HECHOAPP Ticket ${ticketId}`
                });

                console.log(`Invoice created for Ticket ${ticketId}: ${invoice.name}`);

                // 4. Update Ticket with ERP Reference
                await change.after.ref.update({
                    erpInvoiceId: invoice.name,
                    erpSyncedAt: admin.firestore.FieldValue.serverTimestamp()
                });

            } catch (error) {
                console.error(`Failed to sync Ticket ${ticketId} to ERPNext:`, error);
                // Optionally: Write to a separate 'sync_errors' collection for retry
            }
        }
    });
