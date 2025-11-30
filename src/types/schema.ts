
export interface User {
    id: string;
    nombre: string;
    email: string;
    telefono: string;
    rol: UserRole;
    activo: boolean;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface Client {
    id: string;
    nombreComercial: string;
    tipoCliente: ClientType;
    rnc?: string;
    personaContacto: string;
    telefonoContacto: string;
    emailContacto: string;
    notas?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface Location {
    id: string;
    clientId: string;
    nombre: string;
    descripcion?: string;
    direccion?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface Equipment {
    id: string;
    clientId: string;
    locationId: string;
    marca: string;
    modelo: string;
    numeroSerie: string;
    capacidadBTU: string;
    tipoEquipo: EquipmentType;
    anoInstalacion?: string;
    notas?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface TicketEvent {
    id: string;
    ticketId: string;
    userId: string;
    userName?: string;
    type: EventType;
    description: string;
    timestamp: Timestamp;
}

// --- Income Module Types ---

export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'PARTIALLY_PAID' | 'OVERDUE' | 'CANCELLED';
export type PaymentMethod = 'EFECTIVO' | 'TRANSFERENCIA' | 'CHEQUE' | 'TARJETA' | 'OTRO';
export type QuoteStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';

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
    status: InvoiceStatus;
    issueDate: Timestamp;
    dueDate: Timestamp;
    notes?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface Quote {
    id: string;
    number: string;
    clientId: string;
    clientName: string;
    items: InvoiceItem[];
    subtotal: number;
    taxTotal: number;
    total: number;
    status: QuoteStatus;
    validUntil: Timestamp;
    notes?: string;
    createdAt: Timestamp;
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
