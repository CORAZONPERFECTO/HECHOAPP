"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onTicketClosed = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const service_1 = require("./service");
const getDb = () => admin.firestore();
// ---------------------------------------------------------------------------
// Maps a HECHOAPP ServiceType to a default ERPNext Item Code.
// These item codes MUST exist in your ERPNext Item master.
// ---------------------------------------------------------------------------
const SERVICE_TYPE_ITEM_MAP = {
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
exports.onTicketClosed = (0, firestore_1.onDocumentUpdated)("tickets/{ticketId}", async (event) => {
    var _a, _b, _c, _d, _e;
    const { ticketId } = event.params;
    const change = event.data;
    if (!change)
        return;
    const newData = change.after.data();
    const previousData = change.before.data();
    // Guard: only sync when first transitioning to CERRADO
    if (newData.estado !== "CERRADO" || previousData.estado === "CERRADO")
        return;
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
        let clientRnc;
        let clientEmail;
        if (newData.clientId) {
            const clientDoc = await getDb().collection("clients").doc(newData.clientId).get();
            if (clientDoc.exists) {
                const clientData = clientDoc.data();
                clientName = clientData.nombreComercial || "Cliente Sin Nombre";
                clientRnc = clientData.rnc;
                clientEmail = clientData.emailContacto;
            }
        }
        // ---------------------------------------------------------------
        // 2. Find or create Customer in ERPNext
        // ---------------------------------------------------------------
        let erpCustomerName = await service_1.erpNextService.findCustomer(clientName);
        if (!erpCustomerName) {
            console.log(`Customer "${clientName}" not found in ERPNext – creating...`);
            erpCustomerName = await service_1.erpNextService.createCustomer({
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
        const invoiceItems = [];
        if (newData.items && newData.items.length > 0) {
            // --- Strategy A: use explicitly recorded ticket line items ---
            console.log(`Building invoice from ${newData.items.length} explicit ticket items.`);
            for (const item of newData.items) {
                // Fetch price from ERPNext if rate not provided on the item
                const rate = item.rate > 0
                    ? item.rate
                    : await service_1.erpNextService.getItemPrice(item.itemCode).catch(() => 0);
                invoiceItems.push({
                    item_code: item.itemCode,
                    qty: item.qty,
                    rate,
                    description: item.description,
                    uom: item.uom || "Unit",
                });
            }
        }
        else if ((newData.laborHours && newData.laborHours > 0) ||
            (newData.materialsCost && newData.materialsCost > 0) ||
            (newData.otherCosts && newData.otherCosts > 0)) {
            // --- Strategy B: use profitability fields ---
            console.log("Building invoice from profitability fields (laborHours / materialsCost / otherCosts).");
            if (newData.laborHours && newData.laborHours > 0) {
                const defaultLaborRate = (_a = newData.laborRate) !== null && _a !== void 0 ? _a : await service_1.erpNextService.getItemPrice(LABOR_ITEM_CODE).catch(() => 0);
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
        }
        else {
            // --- Strategy C: single-item fallback based on service type ---
            console.log("No items or profitability data – using service-type fallback.");
            const itemCode = (_b = SERVICE_TYPE_ITEM_MAP[newData.tipoServicio]) !== null && _b !== void 0 ? _b : DEFAULT_ITEM_CODE;
            const rate = await service_1.erpNextService.getItemPrice(itemCode).catch(() => 0);
            invoiceItems.push({
                item_code: itemCode,
                qty: 1,
                rate,
                description: `${newData.titulo} – ${(_d = (_c = newData.descripcion) === null || _c === void 0 ? void 0 : _c.slice(0, 200)) !== null && _d !== void 0 ? _d : ""}`,
                uom: "Unit",
            });
        }
        if (invoiceItems.length === 0) {
            throw new Error("Could not build any invoice line items for ticket " + ticketId);
        }
        // ---------------------------------------------------------------
        // 4. Create the Sales Invoice in ERPNext (Draft)
        // ---------------------------------------------------------------
        const invoice = await service_1.erpNextService.createSalesInvoice({
            customer: erpCustomerName,
            posting_date: today,
            due_date: today,
            items: invoiceItems,
            docstatus: 0,
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
    }
    catch (error) {
        console.error(`❌ Failed to sync Ticket ${ticketId} to ERPNext:`, error);
        // Write sync failure to a dedicated error collection for retry/audit
        await getDb().collection("erpSyncErrors").add({
            ticketId,
            ticketCode: (_e = newData.codigo) !== null && _e !== void 0 ? _e : null,
            error: error instanceof Error ? error.message : String(error),
            failedAt: admin.firestore.FieldValue.serverTimestamp(),
            retryCount: 0,
        });
    }
});
//# sourceMappingURL=triggers.js.map