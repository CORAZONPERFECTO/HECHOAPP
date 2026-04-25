"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncInvoiceToErp = exports.convertQuoteToInvoiceErp = exports.syncQuoteToErp = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const service_1 = require("./service");
const getDb = () => admin.firestore();
// ---------------------------------------------------------------------------
// syncQuoteToErp
// Called from the frontend when the user wants to push a Firestore quote
// to ERPNext as a Quotation draft.
// ---------------------------------------------------------------------------
exports.syncQuoteToErp = (0, https_1.onCall)(async (req) => {
    var _a;
    if (!req.auth)
        throw new https_1.HttpsError("unauthenticated", "Debes iniciar sesión.");
    const { quoteId } = req.data;
    if (!quoteId)
        throw new https_1.HttpsError("invalid-argument", "quoteId es requerido.");
    const db = getDb();
    const quoteSnap = await db.collection("quotes").doc(quoteId).get();
    if (!quoteSnap.exists)
        throw new https_1.HttpsError("not-found", "Cotización no encontrada.");
    const quote = quoteSnap.data();
    try {
        // 1. Ensure the customer exists in ERPNext
        const erpCustomer = await service_1.erpNextService.ensureCustomer({
            name: quote.clientName,
            rnc: quote.clientRnc,
            email: quote.clientEmail,
        });
        // 2. Map Firestore InvoiceItems -> ERPNext Quotation items
        const today = new Date().toISOString().split("T")[0];
        let validTill = today;
        if ((_a = quote.validUntil) === null || _a === void 0 ? void 0 : _a.seconds) {
            validTill = new Date(quote.validUntil.seconds * 1000).toISOString().split("T")[0];
        }
        const erpItems = (quote.items || []).map((item) => {
            var _a, _b, _c, _d;
            return ({
                item_code: item.itemCode || "Servicio Tecnico",
                item_name: item.description,
                qty: (_b = (_a = item.quantity) !== null && _a !== void 0 ? _a : item.qty) !== null && _b !== void 0 ? _b : 1,
                rate: (_d = (_c = item.unitPrice) !== null && _c !== void 0 ? _c : item.rate) !== null && _d !== void 0 ? _d : 0,
                description: item.description,
                uom: item.uom || "Unit",
            });
        });
        if (erpItems.length === 0) {
            throw new https_1.HttpsError("failed-precondition", "La cotización no tiene ítems.");
        }
        // 3. Create Quotation in ERPNext
        const quotation = await service_1.erpNextService.createQuotation({
            party_name: erpCustomer,
            transaction_date: today,
            valid_till: validTill,
            items: erpItems,
            currency: quote.currency === "USD" ? "USD" : "DOP",
            remarks: `Sincronizado desde HECHOAPP – Cotización ${quote.number || quoteId}`,
        });
        // 4. Write back the ERPNext reference to Firestore
        await quoteSnap.ref.update({
            erpQuotationId: quotation.name,
            erpSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
            status: "SENT", // Advance status since it's now pushed to ERP
        });
        console.log(`✅ Quote ${quoteId} synced to ERPNext as ${quotation.name}`);
        return { success: true, erpQuotationId: quotation.name };
    }
    catch (error) {
        console.error("❌ syncQuoteToErp failed:", error);
        throw new https_1.HttpsError("internal", error.message || "Error al sincronizar con ERPNext.");
    }
});
// ---------------------------------------------------------------------------
// convertQuoteToInvoiceErp
// Converts an existing Firestore quote to a Firestore invoice AND creates the
// corresponding Sales Invoice in ERPNext (draft).
// ---------------------------------------------------------------------------
exports.convertQuoteToInvoiceErp = (0, https_1.onCall)(async (req) => {
    if (!req.auth)
        throw new https_1.HttpsError("unauthenticated", "Debes iniciar sesión.");
    const { quoteId } = req.data;
    if (!quoteId)
        throw new https_1.HttpsError("invalid-argument", "quoteId es requerido.");
    const db = getDb();
    const quoteSnap = await db.collection("quotes").doc(quoteId).get();
    if (!quoteSnap.exists)
        throw new https_1.HttpsError("not-found", "Cotización no encontrada.");
    const quote = quoteSnap.data();
    if (quote.status === "CONVERTED") {
        throw new https_1.HttpsError("failed-precondition", "Esta cotización ya fue convertida a factura.");
    }
    try {
        const today = new Date().toISOString().split("T")[0];
        // 1. Ensure customer in ERPNext
        const erpCustomer = await service_1.erpNextService.ensureCustomer({
            name: quote.clientName,
            rnc: quote.clientRnc,
            email: quote.clientEmail,
        });
        // 2. Map items
        const erpItems = (quote.items || []).map((item) => {
            var _a, _b, _c, _d;
            return ({
                item_code: item.itemCode || "Servicio Tecnico",
                item_name: item.description,
                qty: (_b = (_a = item.quantity) !== null && _a !== void 0 ? _a : item.qty) !== null && _b !== void 0 ? _b : 1,
                rate: (_d = (_c = item.unitPrice) !== null && _c !== void 0 ? _c : item.rate) !== null && _d !== void 0 ? _d : 0,
                description: item.description,
                uom: item.uom || "Unit",
            });
        });
        // 3. Create Sales Invoice in ERPNext (Draft)
        const invoice = await service_1.erpNextService.createSalesInvoice({
            customer: erpCustomer,
            posting_date: today,
            due_date: today,
            items: erpItems,
            currency: quote.currency === "USD" ? "USD" : "DOP",
            docstatus: 0,
            po_no: quote.number || quoteId,
            remarks: `Convertida desde Cotización ${quote.number || quoteId} – HECHOAPP`,
        });
        // 4. Create Firestore Invoice document
        const invoiceRef = await db.collection("invoices").add({
            clientId: quote.clientId,
            clientName: quote.clientName,
            clientRnc: quote.clientRnc || null,
            number: invoice.name,
            items: quote.items,
            subtotal: quote.subtotal,
            taxTotal: quote.taxTotal,
            total: quote.total,
            balance: quote.total,
            currency: quote.currency || "DOP",
            status: "DRAFT",
            issueDate: admin.firestore.FieldValue.serverTimestamp(),
            dueDate: admin.firestore.FieldValue.serverTimestamp(),
            notes: `Generada desde Cotización ${quote.number || "N/A"}.`,
            convertedFromQuoteId: quoteId,
            erpInvoiceId: invoice.name,
            erpSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: req.auth.uid,
        });
        // 5. Mark quote as CONVERTED
        await quoteSnap.ref.update({
            status: "CONVERTED",
            convertedInvoiceId: invoiceRef.id,
            erpSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`✅ Quote ${quoteId} converted to Invoice ${invoiceRef.id} / ERP: ${invoice.name}`);
        return {
            success: true,
            invoiceId: invoiceRef.id,
            erpInvoiceId: invoice.name,
        };
    }
    catch (error) {
        console.error("❌ convertQuoteToInvoiceErp failed:", error);
        throw new https_1.HttpsError("internal", error.message || "Error al convertir la cotización.");
    }
});
// ---------------------------------------------------------------------------
// syncInvoiceToErp
// For manually-created Firestore invoices that need to be pushed to ERPNext.
// ---------------------------------------------------------------------------
exports.syncInvoiceToErp = (0, https_1.onCall)(async (req) => {
    var _a;
    if (!req.auth)
        throw new https_1.HttpsError("unauthenticated", "Debes iniciar sesión.");
    const { invoiceId } = req.data;
    if (!invoiceId)
        throw new https_1.HttpsError("invalid-argument", "invoiceId es requerido.");
    const db = getDb();
    const invoiceSnap = await db.collection("invoices").doc(invoiceId).get();
    if (!invoiceSnap.exists)
        throw new https_1.HttpsError("not-found", "Factura no encontrada.");
    const invoice = invoiceSnap.data();
    if (invoice.erpInvoiceId) {
        return { success: true, erpInvoiceId: invoice.erpInvoiceId, alreadySynced: true };
    }
    try {
        const today = new Date().toISOString().split("T")[0];
        const dueDate = ((_a = invoice.dueDate) === null || _a === void 0 ? void 0 : _a.seconds)
            ? new Date(invoice.dueDate.seconds * 1000).toISOString().split("T")[0]
            : today;
        const erpCustomer = await service_1.erpNextService.ensureCustomer({
            name: invoice.clientName,
            rnc: invoice.clientRnc,
        });
        const erpItems = (invoice.items || []).map((item) => {
            var _a, _b, _c, _d;
            return ({
                item_code: item.itemCode || "Servicio Tecnico",
                item_name: item.description,
                qty: (_b = (_a = item.quantity) !== null && _a !== void 0 ? _a : item.qty) !== null && _b !== void 0 ? _b : 1,
                rate: (_d = (_c = item.unitPrice) !== null && _c !== void 0 ? _c : item.rate) !== null && _d !== void 0 ? _d : 0,
                description: item.description,
                uom: item.uom || "Unit",
            });
        });
        const erpInvoice = await service_1.erpNextService.createSalesInvoice({
            customer: erpCustomer,
            posting_date: today,
            due_date: dueDate,
            items: erpItems,
            currency: invoice.currency === "USD" ? "USD" : "DOP",
            docstatus: 0,
            po_no: invoice.number || invoiceId,
            remarks: `Sincronizado desde HECHOAPP – Factura ${invoice.number || invoiceId}`,
        });
        await invoiceSnap.ref.update({
            erpInvoiceId: erpInvoice.name,
            erpSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`✅ Invoice ${invoiceId} synced to ERPNext as ${erpInvoice.name}`);
        return { success: true, erpInvoiceId: erpInvoice.name };
    }
    catch (error) {
        console.error("❌ syncInvoiceToErp failed:", error);
        throw new https_1.HttpsError("internal", error.message || "Error al sincronizar la factura.");
    }
});
//# sourceMappingURL=quotes.js.map