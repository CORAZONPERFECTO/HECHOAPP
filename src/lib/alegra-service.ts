import { db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";
import { Quote } from "@/types/finance";

const ALEGRA_API_BASE = "https://api.alegra.com/api/v1";

export interface AlegraConfig {
    email: string;
    token: string;
}

/**
 * Retrieves Alegra API configuration from environment variables or Firestore.
 */
export async function getAlegraConfig(): Promise<AlegraConfig | null> {
    const envEmail = process.env.ALEGRA_EMAIL;
    const envToken = process.env.ALEGRA_TOKEN;

    if (envEmail && envToken) {
        return { email: envEmail, token: envToken };
    }

    try {
        const snap = await getDoc(doc(db, "settings", "alegra"));
        if (snap.exists()) {
            const data = snap.data();
            if (data.email && data.token) {
                return { email: data.email, token: data.token };
            }
        }
    } catch (e) {
        console.warn("Could not read Alegra settings from Firestore:", e);
    }

    return null;
}

/**
 * Returns Basic Auth Header for Alegra API.
 */
function getAuthHeader(config: AlegraConfig): string {
    const credentials = Buffer.from(`${config.email}:${config.token}`).toString("base64");
    return `Basic ${credentials}`;
}

/**
 * Searches for an existing contact in Alegra by name or identification (RNC).
 * If not found, creates a new contact.
 */
export async function findOrCreateAlegraContact(
    config: AlegraConfig,
    name: string,
    rnc?: string,
    email?: string,
    phone?: string
): Promise<{ id: number; name: string }> {
    const authHeader = getAuthHeader(config);

    // 1. Search existing contact
    try {
        const searchUrl = `${ALEGRA_API_BASE}/contacts?query=${encodeURIComponent(rnc || name)}&limit=5`;
        const res = await fetch(searchUrl, {
            headers: {
                Authorization: authHeader,
                Accept: "application/json",
            },
        });

        if (res.ok) {
            const contacts = await res.json();
            if (Array.isArray(contacts) && contacts.length > 0) {
                return { id: contacts[0].id, name: contacts[0].name };
            }
        }
    } catch (searchErr) {
        console.warn("[Alegra] Error searching contact, will create new:", searchErr);
    }

    // 2. Create new contact in Alegra
    const newContactPayload: any = {
        name: name || "Cliente General",
        type: ["client"],
    };

    if (rnc) {
        newContactPayload.identification = rnc.replace(/[^0-9]/g, "");
    }
    if (email) {
        newContactPayload.email = email;
    }
    if (phone) {
        newContactPayload.phonePrimary = phone;
    }

    const createRes = await fetch(`${ALEGRA_API_BASE}/contacts`, {
        method: "POST",
        headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify(newContactPayload),
    });

    if (!createRes.ok) {
        const errJson = await createRes.json().catch(() => ({}));
        throw new Error(errJson.message || `Error al crear cliente en Alegra (${createRes.status})`);
    }

    const createdContact = await createRes.json();
    return { id: createdContact.id, name: createdContact.name };
}

/**
 * Creates an official Invoice in Alegra based on a HECHOAPP Quote.
 */
export async function createAlegraInvoiceFromQuote(
    config: AlegraConfig,
    quote: Quote,
    clientData?: { name?: string; rnc?: string; email?: string; phone?: string }
): Promise<{
    id: number;
    numberTemplate: { fullNumber?: string; formattedNumber?: string };
    total: number;
    url?: string;
}> {
    const authHeader = getAuthHeader(config);

    const clientName = clientData?.name || quote.party_name || (quote as any).clientName || "Cliente General";
    const clientRnc = clientData?.rnc || quote.clientRnc || (quote as any).clientRnc;
    const clientEmail = clientData?.email || (quote as any).clientEmail;
    const clientPhone = clientData?.phone || (quote as any).clientPhone;

    // 1. Get or create Alegra contact
    const contact = await findOrCreateAlegraContact(config, clientName, clientRnc, clientEmail, clientPhone);

    // 2. Build items array for Alegra Invoice
    const items = quote.items.map((item, index) => {
        const qty = item.qty || (item as any).quantity || 1;
        const price = item.rate || (item as any).unitPrice || (item as any).price || 0;
        
        return {
            name: item.description || item.item_name || `Servicio ${index + 1}`,
            description: item.description || "",
            price: Number(price),
            quantity: Number(qty),
            // Default 18% ITBIS tax in Dominican Republic Alegra accounts
            tax: [{ id: 1, name: "ITBIS", percentage: 18 }]
        };
    });

    const dueDateStr = quote.valid_till || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const dateStr = quote.transaction_date || new Date().toISOString().split("T")[0];

    const invoicePayload: any = {
        date: dateStr,
        dueDate: dueDateStr,
        client: contact.id,
        items: items,
        anotation: quote.terms || "Cotización aprobada en HECHOAPP.",
        observations: quote.note || `Referencia HECHOAPP: ${quote.name || (quote as any).number || quote.id}`,
    };

    console.log("[Alegra] Creando factura en Alegra...", invoicePayload);

    const res = await fetch(`${ALEGRA_API_BASE}/invoices`, {
        method: "POST",
        headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify(invoicePayload),
    });

    if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        console.error("[Alegra] Error respuesta Alegra:", errJson);
        throw new Error(errJson.message || `Error al crear factura en Alegra (${res.status})`);
    }

    const createdInvoice = await res.json();

    const fullNumber = createdInvoice.numberTemplate?.fullNumber || 
                       createdInvoice.numberTemplate?.formattedNumber || 
                       `FAC-${createdInvoice.id}`;

    return {
        id: createdInvoice.id,
        numberTemplate: createdInvoice.numberTemplate || { fullNumber },
        total: createdInvoice.total || quote.grand_total || 0,
        url: `https://app.alegra.com/invoice/view/id/${createdInvoice.id}`,
    };
}

/**
 * Creates an Estimate / Quotation in Alegra.
 */
export async function createAlegraEstimateFromQuote(
    config: AlegraConfig,
    quote: Quote,
    clientData?: { name?: string; rnc?: string; email?: string; phone?: string }
): Promise<{
    id: number;
    numberTemplate: { fullNumber?: string; formattedNumber?: string };
    total: number;
    url?: string;
}> {
    const authHeader = getAuthHeader(config);

    const clientName = clientData?.name || quote.party_name || (quote as any).clientName || "Cliente General";
    const clientRnc = clientData?.rnc || quote.clientRnc || (quote as any).clientRnc;
    const clientEmail = clientData?.email || (quote as any).clientEmail;
    const clientPhone = clientData?.phone || (quote as any).clientPhone;

    const contact = await findOrCreateAlegraContact(config, clientName, clientRnc, clientEmail, clientPhone);

    const items = quote.items.map((item, index) => {
        const qty = item.qty || (item as any).quantity || 1;
        const price = item.rate || (item as any).unitPrice || 0;
        return {
            name: item.description || item.item_name || `Servicio ${index + 1}`,
            description: item.description || "",
            price: Number(price),
            quantity: Number(qty),
            tax: [{ id: 1, name: "ITBIS", percentage: 18 }]
        };
    });

    const dueDateStr = quote.valid_till || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const dateStr = quote.transaction_date || new Date().toISOString().split("T")[0];

    const estimatePayload: any = {
        date: dateStr,
        dueDate: dueDateStr,
        client: contact.id,
        items: items,
        anotation: quote.terms || "Propuesta formal de servicios HECHO SRL.",
        observations: quote.note || `Referencia HECHOAPP: ${quote.name || (quote as any).number || quote.id}`,
    };

    const res = await fetch(`${ALEGRA_API_BASE}/estimates`, {
        method: "POST",
        headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify(estimatePayload),
    });

    if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `Error al crear cotización en Alegra (${res.status})`);
    }

    const createdEstimate = await res.json();
    const fullNumber = createdEstimate.numberTemplate?.fullNumber || 
                       createdEstimate.numberTemplate?.formattedNumber || 
                       `COT-${createdEstimate.id}`;

    return {
        id: createdEstimate.id,
        numberTemplate: createdEstimate.numberTemplate || { fullNumber },
        total: createdEstimate.total || quote.grand_total || 0,
        url: `https://app.alegra.com/estimate/view/id/${createdEstimate.id}`,
    };
}
