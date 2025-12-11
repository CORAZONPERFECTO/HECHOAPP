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
    return {
        id: quote.id,
        type: 'COTIZACIÓN',
        number: quote.number,
        date: quote.issueDate instanceof Timestamp ? quote.issueDate.toDate() : new Date(),
        validUntil: quote.validUntil instanceof Timestamp ? quote.validUntil.toDate() : undefined,

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
            name: quote.clientName,
            contact: quote.clientContact,
            email: quote.clientEmail,
            phone: quote.clientPhone,
            // Note: Address might need to be fetched if not in quote root, but schema has it sometimes?
            // Checking schema... Quote doesn't have address directly on root usually, but let's assume valid default
            // If schema changes, update here.
        },

        items: quote.items.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total,
            taxAmount: item.taxAmount,
            // discount not per item in current schema explicitly? 
            // Assuming item total handles it or 0 for now.
        })),

        currency: quote.currency,
        subtotal: quote.subtotal,
        taxTotal: quote.taxTotal,
        discountTotal: quote.discountTotal,
        total: quote.total,

        notes: quote.notes,
        terms: quote.terms,
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
