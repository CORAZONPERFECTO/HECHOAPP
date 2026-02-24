import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { erpNextService } from "./service";

const getDb = () => admin.firestore();

// ERPNext is configured with USD as the base currency.
// We always send USD to avoid exchange rate configuration issues.
// If the quote is in DOP, we convert at a fixed fallback rate.
const DOP_TO_USD_FALLBACK = 0.0167; // ~59.9 DOP = 1 USD

function toUsd(amount: number, currency: string): number {
    if (currency === "USD") return amount;
    return Math.round(amount * DOP_TO_USD_FALLBACK * 100) / 100;
}

// ---------------------------------------------------------------------------
// syncQuoteToErp
// Called from the frontend when the user wants to push a Firestore quote
// to ERPNext as a Quotation draft.
// ---------------------------------------------------------------------------
export const syncQuoteToErp = onCall(async (req) => {
    if (!req.auth) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");

    const { quoteId } = req.data as { quoteId: string };
    if (!quoteId) throw new HttpsError("invalid-argument", "quoteId es requerido.");

    const db = getDb();
    const quoteSnap = await db.collection("quotes").doc(quoteId).get();
    if (!quoteSnap.exists) throw new HttpsError("not-found", "Cotización no encontrada.");

    const quote = quoteSnap.data()!;

    try {
        // 1. Ensure the customer exists in ERPNext
        const erpCustomer = await erpNextService.ensureCustomer({
            name: quote.clientName,
            rnc: quote.clientRnc,
            email: quote.clientEmail,
        });

        // 2. Map Firestore InvoiceItems -> ERPNext Quotation items
        const today = new Date().toISOString().split("T")[0];
        let validTill = today;
        if (quote.validUntil?.seconds) {
            validTill = new Date(quote.validUntil.seconds * 1000).toISOString().split("T")[0];
        }

        const currency = quote.currency || "DOP";
        const erpItems = (quote.items || []).map((item: any) => ({
            item_code: item.itemCode || "Servicio Tecnico",
            item_name: item.description,
            qty: item.quantity ?? item.qty ?? 1,
            rate: toUsd(item.unitPrice ?? item.rate ?? 0, currency),
            description: item.description,
            uom: item.uom || "Unit",
        }));

        if (erpItems.length === 0) {
            throw new HttpsError("failed-precondition", "La cotización no tiene ítems.");
        }

        // 3. Create Quotation in ERPNext (always in USD)
        const quotation = await erpNextService.createQuotation({
            party_name: erpCustomer,
            transaction_date: today,
            valid_till: validTill,
            items: erpItems,
            currency: "USD",
            remarks: `Sincronizado desde HECHOAPP – Cotización ${quote.number || quoteId}${currency === "DOP" ? " (convertido de DOP)" : ""}`,
        });

        // 4. Write back the ERPNext reference to Firestore
        await quoteSnap.ref.update({
            erpQuotationId: quotation.name,
            erpSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
            status: "SENT", // Advance status since it's now pushed to ERP
        });

        console.log(`✅ Quote ${quoteId} synced to ERPNext as ${quotation.name}`);
        return { success: true, erpQuotationId: quotation.name };

    } catch (error: any) {
        console.error("❌ syncQuoteToErp failed:", error);
        throw new HttpsError("internal", error.message || "Error al sincronizar con ERPNext.");
    }
});

// ---------------------------------------------------------------------------
// convertQuoteToInvoiceErp
// Converts an existing Firestore quote to a Firestore invoice AND creates the
// corresponding Sales Invoice in ERPNext (draft).
// ---------------------------------------------------------------------------
export const convertQuoteToInvoiceErp = onCall(async (req) => {
    if (!req.auth) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");

    const { quoteId } = req.data as { quoteId: string };
    if (!quoteId) throw new HttpsError("invalid-argument", "quoteId es requerido.");

    const db = getDb();
    const quoteSnap = await db.collection("quotes").doc(quoteId).get();
    if (!quoteSnap.exists) throw new HttpsError("not-found", "Cotización no encontrada.");

    const quote = quoteSnap.data()!;

    if (quote.status === "CONVERTED") {
        throw new HttpsError("failed-precondition", "Esta cotización ya fue convertida a factura.");
    }

    try {
        const today = new Date().toISOString().split("T")[0];

        // 1. Ensure customer in ERPNext
        const erpCustomer = await erpNextService.ensureCustomer({
            name: quote.clientName,
            rnc: quote.clientRnc,
            email: quote.clientEmail,
        });

        // 2. Map items (always in USD for ERPNext)
        const currency = quote.currency || "DOP";
        const erpItems = (quote.items || []).map((item: any) => ({
            item_code: item.itemCode || "Servicio Tecnico",
            item_name: item.description,
            qty: item.quantity ?? item.qty ?? 1,
            rate: toUsd(item.unitPrice ?? item.rate ?? 0, currency),
            description: item.description,
            uom: item.uom || "Unit",
        }));

        // 3. Create Sales Invoice in ERPNext (Draft, always in USD)
        const invoice = await erpNextService.createSalesInvoice({
            customer: erpCustomer,
            posting_date: today,
            due_date: today,
            items: erpItems,
            currency: "USD",
            docstatus: 0,
            po_no: quote.number || quoteId,
            remarks: `Convertida desde Cotización ${quote.number || quoteId} – HECHOAPP`,
        });

        // 4. Create Firestore Invoice document
        const invoiceRef = await db.collection("invoices").add({
            clientId: quote.clientId,
            clientName: quote.clientName,
            clientRnc: quote.clientRnc || null,
            number: invoice.name, // Use ERPNext invoice name as number
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

    } catch (error: any) {
        console.error("❌ convertQuoteToInvoiceErp failed:", error);
        throw new HttpsError("internal", error.message || "Error al convertir la cotización.");
    }
});

// ---------------------------------------------------------------------------
// syncInvoiceToErp
// For manually-created Firestore invoices that need to be pushed to ERPNext.
// ---------------------------------------------------------------------------
export const syncInvoiceToErp = onCall(async (req) => {
    if (!req.auth) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");

    const { invoiceId } = req.data as { invoiceId: string };
    if (!invoiceId) throw new HttpsError("invalid-argument", "invoiceId es requerido.");

    const db = getDb();
    const invoiceSnap = await db.collection("invoices").doc(invoiceId).get();
    if (!invoiceSnap.exists) throw new HttpsError("not-found", "Factura no encontrada.");

    const invoice = invoiceSnap.data()!;

    if (invoice.erpInvoiceId) {
        return { success: true, erpInvoiceId: invoice.erpInvoiceId, alreadySynced: true };
    }

    try {
        const today = new Date().toISOString().split("T")[0];
        const dueDate = invoice.dueDate?.seconds
            ? new Date(invoice.dueDate.seconds * 1000).toISOString().split("T")[0]
            : today;

        const erpCustomer = await erpNextService.ensureCustomer({
            name: invoice.clientName,
            rnc: invoice.clientRnc,
        });

        const invCurrency = invoice.currency || "DOP";
        const erpItems = (invoice.items || []).map((item: any) => ({
            item_code: item.itemCode || "Servicio Tecnico",
            item_name: item.description,
            qty: item.quantity ?? item.qty ?? 1,
            rate: toUsd(item.unitPrice ?? item.rate ?? 0, invCurrency),
            description: item.description,
            uom: item.uom || "Unit",
        }));

        const erpInvoice = await erpNextService.createSalesInvoice({
            customer: erpCustomer,
            posting_date: today,
            due_date: dueDate,
            items: erpItems,
            currency: "USD",
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

    } catch (error: any) {
        console.error("❌ syncInvoiceToErp failed:", error);
        throw new HttpsError("internal", error.message || "Error al sincronizar la factura.");
    }
});
