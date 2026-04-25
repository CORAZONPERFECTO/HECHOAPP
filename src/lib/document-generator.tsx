import { Invoice, Quote, Receipt, DeliveryNote, CompanySettings } from '@/types/schema';
import { Timestamp } from 'firebase/firestore';
import { pdf } from '@react-pdf/renderer';
import DocumentPDF from '@/components/documents/templates/DocumentPDF';
import { DocumentFormat } from '@/stores/document-settings-store';

// Unified Document Interface for the Templates
export interface DocumentItem {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
    taxAmount?: number;
    discount?: number;
}

export interface DocumentData {
    id: string;
    type: 'FACTURA' | 'COTIZACIÓN' | 'ORDEN DE COMPRA' | 'CONDUCE' | 'RECIBO' | 'FACTURA PROFORMA';
    number: string;
    date: Date;
    dueDate?: Date;
    validUntil?: Date;

    // Company (Issuer)
    company: {
        name: string;
        rnc?: string;
        address?: string;
        phone?: string;
        email?: string;
        logoUrl?: string;
        website?: string;
    };

    // Client (Receiver)
    client: {
        name: string;
        rnc?: string;
        address?: string;
        phone?: string;
        email?: string;
        contact?: string;
    };

    // Content
    items: DocumentItem[];

    // Totals
    currency: 'DOP' | 'USD';
    subtotal: number;
    taxTotal: number;
    discountTotal: number;
    total: number;

    // Meta
    notes?: string;
    terms?: string;
    status?: string;
}

/**
 * Mappers to convert DB objects into DocumentData
 */

export function mapQuoteToDocument(quote: Quote, company: CompanySettings): DocumentData {
    const q = quote as any; // legacy field access shim
    const mappedBase = {
        id: quote.id,
        type: 'COTIZACIÓN' as const,
        number: q.number || quote.name || '',
        date: quote.transaction_date
            ? new Date(quote.transaction_date)
            : (q.issueDate instanceof Timestamp ? q.issueDate.toDate() : new Date()),
        validUntil: quote.valid_till
            ? new Date(quote.valid_till)
            : (q.validUntil instanceof Timestamp ? q.validUntil.toDate() : undefined),

        company: {
            name: company.name,
            rnc: company.rnc,
            address: company.address,
            phone: company.phone,
            email: company.email,
            logoUrl: company.logoUrl,
            website: company.website,
        },

        client: {
            name: quote.party_name || (quote as any).clientName || '',
            rnc: (quote as any).clientRnc,
            contact: (quote as any).clientContact,
            email: (quote as any).clientEmail,
            phone: (quote as any).clientPhone,
        },

        items: quote.items.map(item => ({
            description: item.item_name || item.description || '',
            quantity: item.qty || 1,
            unitPrice: item.rate || 0,
            total: item.amount || ((item.qty || 1) * (item.rate || 0)),
            taxAmount: item.tax_amount,
        })),
    };

    // Auto-reparar totales si la base de datos tiene 0 (por errores viejos)
    let subtotal = quote.net_total ?? (quote as any).subtotal ?? 0;
    let taxTotal = quote.total_taxes_and_charges ?? (quote as any).taxTotal ?? 0;
    let grandTotal = quote.grand_total ?? (quote as any).total ?? 0;

    if (subtotal === 0 && mappedBase.items.length > 0) {
        subtotal = mappedBase.items.reduce((acc, item) => acc + item.total, 0);
        taxTotal = subtotal * 0.18;
        grandTotal = subtotal + taxTotal;
    }

    return {
        ...mappedBase,

        currency: quote.currency,
        subtotal: subtotal,
        taxTotal: taxTotal,
        discountTotal: (quote as any).discountTotal ?? 0,
        total: grandTotal,

        notes: quote.note || (quote as any).notes,
        terms: (quote as any).terms,
        status: quote.status,
    };
}

export function mapInvoiceToDocument(invoice: Invoice, company: CompanySettings): DocumentData {
    return {
        id: invoice.id,
        type: 'FACTURA', // Could be 'FACTURA DE CRÉDITO FISCAL' based on NCF logic if needed
        number: invoice.ncf || invoice.number, // Prefer NCF if available for Invoice title
        date: invoice.issueDate instanceof Timestamp ? invoice.issueDate.toDate() : new Date(),
        dueDate: invoice.dueDate instanceof Timestamp ? invoice.dueDate.toDate() : undefined,

        company: {
            name: company.name,
            rnc: company.rnc,
            address: company.address,
            phone: company.phone,
            email: company.email,
            logoUrl: company.logoUrl,
            website: company.website,
        },

        client: {
            name: invoice.clientName,
            rnc: invoice.clientRnc,
        },

        items: invoice.items.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total,
            taxAmount: item.taxAmount,
        })),

        currency: invoice.currency || 'DOP',
        subtotal: invoice.subtotal,
        taxTotal: invoice.taxTotal,
        discountTotal: 0, // Invoice schema might not have explicit discount total field sometimes?
        total: invoice.total,

        notes: invoice.notes,
        status: invoice.status,
    };
}

export async function generateDocumentPDF(data: DocumentData, format: DocumentFormat): Promise<Blob> {
    return await pdf(<DocumentPDF data={data} format={format} />).toBlob();
}
