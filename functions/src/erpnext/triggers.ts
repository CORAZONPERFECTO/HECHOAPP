import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { erpNextService } from "./service";
import { Ticket, Client, ServiceType } from "../types/schema";

const db = admin.firestore();

// ---------------------------------------------------------------------------
// Maps a HECHOAPP ServiceType to a default ERPNext Item Code.
// These item codes MUST exist in your ERPNext Item master.
// ---------------------------------------------------------------------------
const SERVICE_TYPE_ITEM_MAP: Record<ServiceType, string> = {
    MANTENIMIENTO: "Servicio de Mantenimiento",
    INSTALACION: "Servicio de Instalacion",
    REPARACION: "Servicio de Reparacion",
    EMERGENCIA: "Servicio de Emergencia",
    PREVENTIVO: "Servicio Preventivo",
    DIAGNOSTICO: "Servicio de Diagnostico",
    INSPECCION: "Servicio de Inspeccion",
};

const DEFAULT_ITEM_CODE = "Servicio Tecnico";
const LABOR_ITEM_CODE = "Mano de Obra";
const MATERIALS_ITEM_CODE = "Materiales";
const OTHER_COSTS_ITEM_CODE = "Otros Gastos";

// ---------------------------------------------------------------------------
// Firestore Trigger: runs when a ticket document is updated.
// Only acts when `estado` transitions to "CERRADO".
// ---------------------------------------------------------------------------
export const onTicketClosed = functions.firestore
    .onDocumentUpdated("tickets/{ticketId}", async (event) => {
        const { ticketId } = event.params;
        const change = event.data;
        if (!change) return;

        const newData = change.after.data() as Ticket;
        const previousData = change.before.data() as Ticket;

        // Guard: only sync when first transitioning to CERRADO
        if (newData.estado !== "CERRADO" || previousData.estado === "CERRADO") return;

        // Guard: prevent re-sync if already linked to an invoice
        if (newData.erpInvoiceId) {
            console.log(`Ticket ${ticketId} already synced (invoice: ${newData.erpInvoiceId}). Skipping.`);
            return;
        }

        console.log(`Ticket ${ticketId} closed. Building ERPNext invoice...`);

        try {
            // ---------------------------------------------------------------
            // 1. Fetch Client details from Firestore
            // ---------------------------------------------------------------
            let clientName = "Cliente Desconocido";
            let clientRnc: string | undefined;
            let clientEmail: string | undefined;

            if (newData.clientId) {
                const clientDoc = await db.collection("clients").doc(newData.clientId).get();
                if (clientDoc.exists) {
                    const clientData = clientDoc.data() as Client;
                    clientName = clientData.nombreComercial || "Cliente Sin Nombre";
                    clientRnc = clientData.rnc;
                    clientEmail = clientData.emailContacto;
                }
            }

            // ---------------------------------------------------------------
            // 2. Find or create Customer in ERPNext
            // ---------------------------------------------------------------
            let erpCustomerName = await erpNextService.findCustomer(clientName);
            if (!erpCustomerName) {
                console.log(`Customer "${clientName}" not found in ERPNext – creating...`);
                erpCustomerName = await erpNextService.createCustomer({
                    name: clientName,
                    customer_name: clientName,
                    customer_type: "Company",
                    customer_group: "Commercial",
                    tax_id: clientRnc,
                    email_id: clientEmail,
                    territory: "All Territories",
                });
            }
            console.log(`ERPNext customer: ${erpCustomerName}`);

            // ---------------------------------------------------------------
            // 3. Build invoice line items (priority order):
            //    a) Explicit TicketItems array (most granular)
            //    b) Profitability fields (laborHours, materialsCost, otherCosts)
            //    c) Fallback: single item from ServiceType mapping
            // ---------------------------------------------------------------
            const today = new Date().toISOString().split("T")[0];
            const invoiceItems: { item_code: string; qty: number; rate: number; description: string; uom?: string }[] = [];

            if (newData.items && newData.items.length > 0) {
                // --- Strategy A: use explicitly recorded ticket line items ---
                console.log(`Building invoice from ${newData.items.length} explicit ticket items.`);
                for (const item of newData.items) {
                    // Fetch price from ERPNext if rate not provided on the item
                    const rate = item.rate > 0
                        ? item.rate
                        : await erpNextService.getItemPrice(item.itemCode).catch(() => 0);

                    invoiceItems.push({
                        item_code: item.itemCode,
                        qty: item.qty,
                        rate,
                        description: item.description,
                        uom: item.uom || "Unit",
                    });
                }

            } else if (
                (newData.laborHours && newData.laborHours > 0) ||
                (newData.materialsCost && newData.materialsCost > 0) ||
                (newData.otherCosts && newData.otherCosts > 0)
            ) {
                // --- Strategy B: use profitability fields ---
                console.log("Building invoice from profitability fields (laborHours / materialsCost / otherCosts).");

                if (newData.laborHours && newData.laborHours > 0) {
                    const defaultLaborRate = newData.laborRate
                        ?? await erpNextService.getItemPrice(LABOR_ITEM_CODE).catch(() => 0);
                    invoiceItems.push({
                        item_code: LABOR_ITEM_CODE,
                        qty: newData.laborHours,
                        rate: defaultLaborRate,
                        description: `Mano de obra – ${newData.laborHours}h (Ticket ${newData.codigo})`,
                        uom: "Hour",
                    });
                }

                if (newData.materialsCost && newData.materialsCost > 0) {
                    invoiceItems.push({
                        item_code: MATERIALS_ITEM_CODE,
                        qty: 1,
                        rate: newData.materialsCost,
                        description: `Materiales – Ticket ${newData.codigo}`,
                        uom: "Unit",
                    });
                }

                if (newData.otherCosts && newData.otherCosts > 0) {
                    invoiceItems.push({
                        item_code: OTHER_COSTS_ITEM_CODE,
                        qty: 1,
                        rate: newData.otherCosts,
                        description: `Otros gastos – Ticket ${newData.codigo}`,
                        uom: "Unit",
                    });
                }

            } else {
                // --- Strategy C: single-item fallback based on service type ---
                console.log("No items or profitability data – using service-type fallback.");
                const itemCode = SERVICE_TYPE_ITEM_MAP[newData.tipoServicio] ?? DEFAULT_ITEM_CODE;
                const rate = await erpNextService.getItemPrice(itemCode).catch(() => 0);
                invoiceItems.push({
                    item_code: itemCode,
                    qty: 1,
                    rate,
                    description: `${newData.titulo} – ${newData.descripcion?.slice(0, 200) ?? ""}`,
                    uom: "Unit",
                });
            }

            if (invoiceItems.length === 0) {
                throw new Error("Could not build any invoice line items for ticket " + ticketId);
            }

            // ---------------------------------------------------------------
            // 4. Create the Sales Invoice in ERPNext (Draft)
            // ---------------------------------------------------------------
            const invoice = await erpNextService.createSalesInvoice({
                customer: erpCustomerName,
                posting_date: today,
                due_date: today,
                items: invoiceItems,
                docstatus: 0, // Draft – must be submitted manually in ERPNext
                po_no: newData.codigo,
                remarks: `Generado automáticamente desde HECHOAPP – Ticket ${ticketId}`,
            });

            console.log(`✅ Invoice created: ${invoice.name} for Ticket ${ticketId}`);

            // ---------------------------------------------------------------
            // 5. Write back the ERPNext reference to the ticket
            // ---------------------------------------------------------------
            await change.after.ref.update({
                erpInvoiceId: invoice.name,
                erpSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

        } catch (error) {
            console.error(`❌ Failed to sync Ticket ${ticketId} to ERPNext:`, error);

            // Write sync failure to a dedicated error collection for retry/audit
            await db.collection("erpSyncErrors").add({
                ticketId,
                ticketCode: newData.codigo ?? null,
                error: error instanceof Error ? error.message : String(error),
                failedAt: admin.firestore.FieldValue.serverTimestamp(),
                retryCount: 0,
            });
        }
    });
