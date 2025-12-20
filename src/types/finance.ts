import { Timestamp } from "firebase/firestore";

// --- Income Module Types ---

export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'PARTIALLY_PAID' | 'OVERDUE' | 'CANCELLED';
export type PaymentMethod = 'EFECTIVO' | 'TRANSFERENCIA' | 'CHEQUE' | 'TARJETA' | 'OTRO';

export type QuoteStatus = 'DRAFT' | 'SENT' | 'OPENED' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CONVERTED';
export type Currency = 'DOP' | 'USD';

export interface QuoteTimelineEvent {
    status: QuoteStatus;
    timestamp: Timestamp;
    userId?: string;
    userName?: string;
    note?: string;
    ipAddress?: string;
}

export interface QuoteAcceptance {
    acceptedAt: Timestamp;
    acceptedBy: string; // Name
    acceptedByEmail: string;
    acceptedByPhone?: string;
    signatureUrl?: string;
    ipAddress?: string;
    userAgent?: string;
    comment?: string;
}

export interface QuoteRejection {
    rejectedAt: Timestamp;
    reason: string;
    ipAddress?: string;
}

export interface InvoiceItem {
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate: number; // e.g., 0.18 for 18%
    taxAmount: number;
    total: number;
}

export interface Invoice {
    id: string;
    number: string; // Sequence number e.g., NCF or internal ID
    ncf?: string; // Comprobante Fiscal
    clientId: string;
    clientName: string;
    clientRnc?: string;
    items: InvoiceItem[];
    subtotal: number;
    taxTotal: number;
    total: number;
    balance: number; // Amount remaining to be paid
    currency?: Currency; // New field

    status: InvoiceStatus;
    issueDate: Timestamp;
    dueDate: Timestamp;

    // Origin
    convertedFromQuoteId?: string; // New Link

    // Assignment
    sellerId?: string; // New field
    sellerName?: string; // New field
    notes?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface Quote {
    id: string;
    number: string; // COT-000001

    // Client & Context
    clientId: string;
    clientName: string;
    clientContact?: string;
    clientEmail?: string;
    clientPhone?: string;
    ticketId?: string; // Link to Ticket
    ticketNumber?: string;

    // Commercial Data
    items: InvoiceItem[];
    currency: Currency;
    exchangeRate?: number; // If USD
    subtotal: number;
    taxTotal: number;
    discountTotal: number;
    total: number;

    // Status & Validity
    status: QuoteStatus;
    issueDate: Timestamp;
    validUntil: Timestamp;

    // Assignment
    sellerId?: string;
    sellerName?: string;

    // Meta
    notes?: string;   // Internal notes
    terms?: string;   // Commercial terms visible to client

    // Lifecycle
    timeline: QuoteTimelineEvent[];
    acceptance?: QuoteAcceptance;
    rejection?: QuoteRejection;
    convertedInvoiceId?: string; // If converted

    // Audit
    createdBy: string;
    createdAt: Timestamp;
    updatedBy?: string;
    updatedAt: Timestamp;
}

export interface Payment {
    id: string;
    number: string; // Receipt number
    invoiceId?: string; // Optional if payment covers multiple or is on account
    clientId: string;
    clientName: string;
    amount: number;
    method: PaymentMethod;
    reference?: string; // Check number, transfer ID
    date: Timestamp;
    notes?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export type RecurringFrequency = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
export type RecurringStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED';

export interface RecurringInvoice {
    id: string;
    clientId: string;
    clientName: string;
    frequency: RecurringFrequency;
    startDate: Timestamp;
    nextRunDate: Timestamp;
    endDate?: Timestamp;
    status: RecurringStatus;
    items: InvoiceItem[];
    subtotal: number;
    taxTotal: number;
    total: number;
    notes?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface CreditNote {
    id: string;
    number: string; // NCF or internal ID
    ncf?: string; // Comprobante Fiscal Modificado
    invoiceId?: string; // Related Invoice
    clientId: string;
    clientName: string;
    items: InvoiceItem[];
    subtotal: number;
    taxTotal: number;
    total: number;
    status: InvoiceStatus; // Reusing InvoiceStatus for simplicity
    issueDate: Timestamp;
    reason: string;
    notes?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface DeliveryNote {
    id: string;
    number: string;
    clientId: string;
    clientName: string;
    items: InvoiceItem[]; // Maybe without prices, just quantities? Keeping generic for now.
    status: 'DRAFT' | 'SENT' | 'DELIVERED' | 'CANCELLED';
    issueDate: Timestamp;
    deliveryDate?: Timestamp;
    address?: string;
    notes?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface Receipt {
    id: string;
    number: string;
    clientId: string;
    clientName: string;
    amount: number;
    concept: string;
    date: Timestamp;
    notes?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}
