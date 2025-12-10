import { Timestamp } from "firebase/firestore";

export interface Equipment {
    id: string;
    nombre: string;
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

export interface User {
    id: string;
    nombre: string;
    email: string;
    telefono?: string;
    rol: UserRole;
    activo: boolean;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface Client {
    id: string;
    nombreComercial: string;
    rnc?: string;
    personaContacto: string;
    telefonoContacto: string;
    emailContacto?: string;
    direccion?: string;
    tipoCliente: 'RESIDENCIAL' | 'COMERCIAL' | 'INDUSTRIAL' | 'HOTEL' | 'EMPRESA';
    notas?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface Location {
    id: string;
    nombre: string;
    direccion?: string;
    descripcion?: string;
    clientId?: string;
    createdAt?: any;
    updatedAt?: any;
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

export type EventType = 'STATUS_CHANGE' | 'COMMENT' | 'PHOTO_UPLOAD' | 'CHECKLIST_UPDATE' | 'ASSIGNMENT';

export interface TicketPhoto {
    url: string;
    type: 'BEFORE' | 'DURING' | 'AFTER';
    description?: string;
    timestamp?: { seconds: number; nanoseconds: number };
    area?: string;
    details?: string;
}

export interface ChecklistItem {
    id: string;
    text: string;
    checked: boolean;
}

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_CLIENT' | 'WAITING_PARTS' | 'COMPLETED' | 'CANCELLED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface Ticket {
    id: string;
    ticketNumber?: string;
    clientId?: string;
    clientName: string;
    ticketTypeId?: string;
    locationName: string;
    locationArea?: string; // e.g., "CAP CANA"
    specificLocation?: string; // e.g., "Villa 12"
    serviceType: string;
    priority: TicketPriority;
    description: string;
    status: TicketStatus;
    checklist: ChecklistItem[];
    photos: TicketPhoto[];
    technicianId?: string;
    technicianName?: string;
    tecnicoAsignadoId?: string;
    creadoPorId?: string;
    diagnosis?: string;
    solution?: string;
    recommendations?: string;
    clientSignature?: string;
    allowGalleryUpload?: boolean;
    equipmentId?: string; // ID of the equipment being serviced
    // SLA Fields
    slaResponseDeadline?: Timestamp; // When first response is due
    slaResolutionDeadline?: Timestamp; // When resolution is due
    firstResponseAt?: Timestamp; // When technician first responded
    resolvedAt?: Timestamp; // When ticket was completed
    // Profitability Fields
    laborHours?: number; // Hours worked on this ticket
    laborRate?: number; // Hourly rate (RD$/hour)
    materialsCost?: number; // Cost of materials used
    otherCosts?: number; // Other expenses
    totalCost?: number; // Calculated: (laborHours * laborRate) + materialsCost + otherCosts
    linkedInvoiceId?: string; // ID of related invoice
    revenue?: number; // Amount charged to client
    profitMargin?: number; // Calculated: ((revenue - totalCost) / revenue) * 100
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export type UserRole = 'ADMIN' | 'SUPERVISOR' | 'GERENTE' | 'TECNICO';
export type ClientType = 'RESIDENCIAL' | 'COMERCIAL' | 'INDUSTRIAL';
export type EquipmentType = 'AIRE_ACONDICIONADO' | 'REFRIGERACION' | 'LAVADORA' | 'SECADORA' | 'ESTUFA' | 'OTRO';
export type ServiceType = 'MANTENIMIENTO' | 'INSTALACION' | 'REPARACION' | 'LEVANTAMIENTO' | 'ARRANQUE_EQUIPOS' | 'VERIFICACION' | 'CHEQUEO_GENERAL' | 'DESINSTALACION' | 'EMERGENCIA' | 'PREVENTIVO' | 'DIAGNOSTICO' | 'INSPECCION';

export type ReportBlockType = 'h1' | 'h2' | 'h3' | 'text' | 'bullet-list' | 'numbered-list' | 'blockquote' | 'separator' | 'photo';

export interface ReportBlockAttributes {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    align?: 'left' | 'center' | 'right' | 'justify';
    size?: 'small' | 'medium' | 'large' | 'full';
}

export interface ReportSection {
    id: string;
    type: ReportBlockType;
    content?: string; // For text, titles, lists
    photoUrl?: string; // For photo sections
    description?: string; // For photo sections
    attributes?: ReportBlockAttributes;
    // Legacy/Optional fields
    area?: string;
    details?: string;
}

// --- Resources Module ---

export type PersonnelType = 'EMPLEADO' | 'CONTRATISTA' | 'TECNICO' | 'AYUDANTE' | 'GERENTE' | 'ADMINISTRATIVO';

export interface PersonnelResource {
    id: string;
    type: PersonnelType;
    fullName: string;
    cedula: string; // Document ID number
    cedulaText?: string; // Formatted for messages
    licenseNumber?: string;
    licenseExpiry?: string; // ISO Date string
    phone: string;
    secondaryPhone?: string;
    email?: string;
    notes?: string;
    documents: string[]; // Array of URLs
    active: boolean;
    createdAt?: any;
    updatedAt?: any;
}

export type ACErrorCriticality = 'BAJA' | 'MEDIA' | 'ALTA';

export interface ACError {
    id: string;
    brand: string; // e.g., "Daikin", "Lennox"
    model?: string;
    systemType?: string; // "Split", "VRF", etc.
    errorCode?: string; // "E5", "U4"
    symptom: string; // "No enfría"
    cause?: string;
    solution?: string; // Steps to fix
    criticality: ACErrorCriticality;
    notes?: string;
    tags?: string[]; // ["Presión", "Sensor"]
    createdAt?: any;
    updatedAt?: any;
}

export interface Permission {
    id: string;
    key: string;
    label: string;
    group: string;
}

export interface Role {
    id: string;
    name: string;
    description?: string;
    permissions: string[];
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface TicketType {
    id: string;
    name: string;
    key: string;
    description?: string;
    color: string;
    active: boolean;
    requiresPhotos: boolean;
    requiresSignature: boolean;
    requiresMaterials: boolean;
    defaultChecklist: ChecklistItem[];
    order?: number;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface TicketReport {
    id?: string;
    ticketId: string;
    header: {
        clientName: string;
        ticketNumber: string;
        address: string;
        date: string;
        technicianName: string;
        title: string;
    };
    sections: ReportSection[];
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}

export type ApprovalRequestType = 'MATERIAL_PURCHASE' | 'PRICE_CHANGE' | 'SCOPE_CHANGE' | 'OVERTIME' | 'OTHER';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ApprovalRequest {
    id: string;
    ticketId: string;
    ticketNumber?: string;
    requestedBy: string; // User ID
    requestedByName: string;
    type: ApprovalRequestType;
    title: string;
    description: string;
    amount?: number; // For purchases or price changes
    urgency: 'LOW' | 'MEDIUM' | 'HIGH';
    status: ApprovalStatus;
    reviewedBy?: string; // User ID
    reviewedByName?: string;
    reviewedAt?: Timestamp;
    reviewNotes?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface CompanySettings {
    name: string;
    rnc: string;
    address: string;
    phone: string;
    email: string;
    website: string;
    logoUrl: string;
}

export interface TicketToken {
    id: string;
    token: string; // The unique token string (can be same as ID)
    status: 'ACTIVE' | 'USED' | 'INVALID';
    ticketId?: string | null;
    createdAt: Timestamp;
    expiresAt?: Timestamp;
    createdBy: string; // User ID of admin who generated it
}

// --- New Report Module Types ---

export type SectionType = 'h1' | 'h2' | 'text' | 'list' | 'photo' | 'divider' | 'beforeAfter';

export interface BaseSection {
    id: string;
    type: SectionType;
}

export interface TitleSection extends BaseSection {
    type: 'h1' | 'h2';
    content: string;
}

export interface TextSection extends BaseSection {
    type: 'text';
    content: string;
}

export interface ListSection extends BaseSection {
    type: 'list';
    items: string[];
}

export interface PhotoSection extends BaseSection {
    type: 'photo';
    photoUrl: string;
    description?: string;
    photoMeta?: {
        originalId?: string;
        area?: string;
        phase?: 'BEFORE' | 'DURING' | 'AFTER';
    };
}

export interface DividerSection extends BaseSection {
    type: 'divider';
}

export interface BeforeAfterSection extends BaseSection {
    type: 'beforeAfter';
    beforePhotoUrl: string;
    afterPhotoUrl: string;
    beforeMeta?: {
        originalId?: string;
        area?: string;
    };
    afterMeta?: {
        originalId?: string;
        area?: string;
    };
    description?: string;
}

export type TicketReportSection =
    | TitleSection
    | TextSection
    | ListSection
    | PhotoSection
    | DividerSection
    | BeforeAfterSection;

export interface TicketReportHeader {
    clientName: string;
    ticketNumber: string;
    address?: string;
    date: string;
    technicianName?: string;
    title: string;
}

export interface TicketReportSignatures {
    technicianSignature?: string; // URL
    technicianName?: string;
    technicianSignedAt?: Timestamp;
    clientSignature?: string; // URL
    clientName?: string;
    clientSignedAt?: Timestamp;
}

export interface TicketReportNew {
    ticketId: string;
    header: TicketReportHeader;
    sections: TicketReportSection[];
    signatures?: TicketReportSignatures;
    lastGeneratedFromTicketAt?: string;
}
