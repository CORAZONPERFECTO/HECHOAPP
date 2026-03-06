import { Timestamp } from "firebase/firestore";

// --- Income Module Types ---

export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'PARTIALLY_PAID' | 'OVERDUE' | 'CANCELLED';
export type PaymentMethod = 'EFECTIVO' | 'TRANSFERENCIA' | 'CHEQUE' | 'TARJETA' | 'OTRO';

// Estados oficiales del DocType Quotation en ERPNext v16
// Draft = no enviada | Open = enviada/vigente | Expired = válida hasta vencida | Cancelled | Ordered = convertida a SO
export type QuoteStatus = 'Draft' | 'Open' | 'Expired' | 'Cancelled' | 'Ordered';

// Estado extendido local (solo para el flujo interno antes del sync con ERP)
export type QuoteLocalStatus = QuoteStatus | 'CONVERTED';
export type Currency = 'DOP' | 'USD';

export interface SupplierFile {
    name: string;
    url: string;
    path: string;
    uploadedAt: string;
}

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

// ─── Quotation Item (espejo de 'Quotation Item' DocType en ERPNext v16) ──────
export interface QuotationItem {
    // Campos ERP exactos (fieldnames del DocType)
    item_code: string;          // ERPNext: Link → Item (requerido)
    item_name: string;          // ERPNext: Data (autofill desde Item)
    description: string;        // ERPNext: Text Editor
    qty: number;                // ERPNext: Float
    uom: string;                // ERPNext: Link → UOM (ej. 'Unit', 'Nos')
    rate: number;               // ERPNext: Currency (precio unitario sin impuesto)
    amount: number;             // ERPNext: Currency = qty * rate (calculado por ERP)

    // Impuesto — calculado por ERPNext, solo se lee, no se edita localmente
    item_tax_template?: string; // ERPNext: Link → Item Tax Template
    tax_amount?: number;        // Devuelto por ERP tras cálculo

    // Campos locales opcionales (no se envían a ERP)
    discount_percentage?: number; // UI only
}

// ─── InvoiceLineItem — para facturas y notas de crédito (campos locales) ─────
// Estos campos NO se envían a ERPNext; son para el cálculo local de facturas.
export interface InvoiceLineItem {
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;     // ej. 0.18
    taxAmount: number;
    total: number;
    itemCode?: string;   // Referencia opcional al item_code de ERP
}

// Alias: InvoiceItem puede ser cualquiera de los dos según el contexto
export type InvoiceItem = QuotationItem | InvoiceLineItem;


export interface Invoice {
    id: string;
    number: string; // Sequence number e.g., NCF or internal ID
    ncf?: string; // Comprobante Fiscal
    clientId: string;
    clientName: string;
    clientRnc?: string;
    items: InvoiceLineItem[];
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

// ─── Quote / Quotation (espejo del DocType Quotation de ERPNext v16) ─────────
export interface Quote {
    id: string;                 // Firestore document ID

    // ── Campos ERP exactos (fieldnames 1:1 con ERPNext) ──────────────────────
    name?: string;              // ERP: ID autogenerado (SAL-QTN-2026-00001)
    quotation_to: 'Customer' | 'Lead'; // ERP: Select
    party_name: string;         // ERP: Link → Customer / Lead (nombre ERP)
    customer_name?: string;     // ERP: Data (autofill, nombre completo)
    transaction_date: string;   // ERP: Date (YYYY-MM-DD) = fecha de emisión
    valid_till: string;         // ERP: Date (YYYY-MM-DD) = válida hasta
    currency: Currency;         // ERP: Link → Currency ('DOP' | 'USD')
    conversion_rate?: number;   // ERP: Float (tipo de cambio si != moneda base)
    selling_price_list: string; // ERP: Link → Price List (ej. 'Standard Selling')
    items: QuotationItem[];     // ERP: Table → Quotation Item

    // Totales — los devuelve ERPNext tras calcular (no se calculan localmente)
    total_qty?: number;         // ERP: Float
    net_total?: number;         // ERP: Currency (subtotal sin impuestos)
    total_taxes_and_charges?: number; // ERP: Currency (ITBIS 18%)
    grand_total?: number;       // ERP: Currency (total final)
    rounded_total?: number;     // ERP: Currency

    // Notas y condiciones
    terms?: string;             // ERP: Text Editor (condiciones comerciales)
    note?: string;              // ERP: Small Text (nota interna)

    // Estado oficial ERP
    status: QuoteLocalStatus;   // Sincronizado con ERP: Draft | Open | Expired | Ordered
    docstatus?: 0 | 1 | 2;     // ERP: 0=Draft, 1=Submitted, 2=Cancelled

    // ── Campos locales HECHOAPP (no existen en ERP) ───────────────────────────
    clientId: string;           // Firestore Client doc ID
    clientRnc?: string;         // RNC del cliente (tax_id en ERP)
    ticketId?: string;          // Link a Ticket de servicio
    ticketNumber?: string;
    sellerId?: string;
    sellerName?: string;

    // Referencia ERP (backlink)
    erpQuotationId?: string;    // name del Quotation en ERPNext
    erpSyncedAt?: Timestamp;

    // Archivos de Proveedores
    supplierFiles?: SupplierFile[];

    // Conversión a Factura
    convertedInvoiceId?: string;

    // Timeline / aprobación
    timeline: QuoteTimelineEvent[];
    acceptance?: QuoteAcceptance;
    rejection?: QuoteRejection;

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
    items: InvoiceLineItem[];
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
    items: InvoiceLineItem[];
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
    items: InvoiceLineItem[];
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
