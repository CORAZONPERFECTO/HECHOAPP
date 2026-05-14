import { Timestamp } from "firebase/firestore";
import { EquipmentType } from "./assets";

export type ServiceType = 'MANTENIMIENTO' | 'INSTALACION' | 'REPARACION' | 'LEVANTAMIENTO' | 'ARRANQUE_EQUIPOS' | 'VERIFICACION' | 'CHEQUEO_GENERAL' | 'DESINSTALACION' | 'EMERGENCIA' | 'PREVENTIVO' | 'DIAGNOSTICO' | 'INSPECCION';
export type EventType = 'STATUS_CHANGE' | 'COMMENT' | 'PHOTO_UPLOAD' | 'CHECKLIST_UPDATE' | 'ASSIGNMENT' | 'TOOL_REPORT';
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_CLIENT' | 'WAITING_PARTS' | 'COMPLETED' | 'CANCELLED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type ApprovalRequestType = 'MATERIAL_PURCHASE' | 'PRICE_CHANGE' | 'SCOPE_CHANGE' | 'OVERTIME' | 'OTHER';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface TicketEvent {
    id: string;
    ticketId: string;
    userId: string;
    userName?: string;
    type: EventType;
    description: string;
    timestamp: Timestamp;
    mediaUrl?: string;
    metadata?: any;
}

export interface TicketPhoto {
    url: string;
    type: 'BEFORE' | 'DURING' | 'AFTER';
    description?: string;
    timestamp?: { seconds: number; nanoseconds: number };
    location?: string;
    area?: string;
    details?: string;
}

export interface ChecklistItem {
    id: string;
    text: string;
    checked: boolean;
}

export interface Ticket {
    id: string;
    ticketNumber?: string;
    clientId?: string;
    clientName: string;
    ticketTypeId?: string;
    locationName: string;
    locationUrl?: string;   // Google Maps / WhatsApp link set by manager or client
    locationArea?: string; // e.g., "CAP CANA"
    locationZone?: string; // e.g., "Bavaro"
    locationStreet?: string;
    locationHouseNumber?: string;
    specificLocation?: string; // e.g., "Villa 12"
    serviceType: string;
    priority: TicketPriority;
    description: string;
    status: TicketStatus;
    checklist: ChecklistItem[];
    materialsChecklist?: ChecklistItem[];
    photos: TicketPhoto[];
    technicianId?: string;
    technicianName?: string;
    tecnicoAsignadoId?: string;
    extraServices?: string[]; // Multiple additional services added by admin/manager
    creadoPorId?: string;
    diagnosis?: string;
    solution?: string;
    recommendations?: string;
    clientSignature?: string;
    clientSignatureName?: string; // Legible name of the person who signed
    allowGalleryUpload?: boolean;
    equipmentId?: string; // ID of the equipment being serviced
    interventionId?: string; // ID of the RIT Intervention created
    // SLA Fields
    slaResponseDeadline?: Timestamp; // When first response is due
    slaResolutionDeadline?: Timestamp; // When resolution is due
    firstResponseAt?: Timestamp; // When technician first responded
    resolvedAt?: Timestamp; // When ticket was completed

    // Date Planning
    scheduledStart?: Timestamp; // Programmed start
    scheduledEnd?: Timestamp; // Programmed end
    schedulingNote?: string; // Note from client if they couldn't pick a date
    closedAt?: Timestamp; // Actual closing time

    // Time Tracking (New)
    enRouteAt?: Timestamp; // When technician started moving towards location
    arrivedAt?: Timestamp; // When technician arrived at the location
    workStartedAt?: Timestamp; // When actual work started
    
    // Profitability Fields
    laborHours?: number; // Hours worked on this ticket
    laborRate?: number; // Hourly rate (RD$/hour)
    materialsCost?: number; // Cost of materials used
    otherCosts?: number; // Other expenses
    totalCost?: number; // Calculated: (laborHours * laborRate) + materialsCost + otherCosts
    linkedInvoiceId?: string; // ID of related invoice
    revenue?: number; // Amount charged to client
    profitMargin?: number; // Calculated: ((revenue - totalCost) / revenue) * 100
    billingStatus?: 'PENDING' | 'BILLED' | 'PAID'; // Tracking billing state
    executionOrder?: number; // Manual override for technician's daily execution order
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

export interface ApprovalRequest {
    id: string;
    ticketId?: string;
    assetId?: string; // Linked HVAC Asset
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

export interface TicketToken {
    id: string;
    token: string; // The unique token string (can be same as ID)
    status: 'ACTIVE' | 'USED' | 'INVALID';
    ticketId?: string | null;
    createdAt: Timestamp;
    expiresAt?: Timestamp;
    createdBy: string; // User ID of admin who generated it
}
