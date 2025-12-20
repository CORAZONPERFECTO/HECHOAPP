import { Timestamp } from "firebase/firestore";
import { Ticket } from "./tickets";
import { Quote } from "./finance";

// ------------------------------------------------------------------
// 1. Service State Machine
// ------------------------------------------------------------------

export type ServiceTicketStatus =
    | 'CREATED'
    | 'SCHEDULED'
    | 'ON_SITE'
    | 'DIAGNOSIS_IN_PROGRESS'
    | 'EVIDENCE_READY'
    | 'QUOTE_DRAFTED'
    | 'PENDING_ADMIN_APPROVAL'
    | 'QUOTE_SENT'
    | 'CLIENT_ACCEPTED'
    | 'WORK_AUTHORIZED'
    | 'WORK_DONE'
    | 'INVOICE_ISSUED'
    | 'PAYMENT_REQUESTED'
    | 'PROOF_RECEIVED'
    | 'PAYMENT_VERIFIED'
    | 'CLOSED';

export interface ServiceTicket extends Ticket {
    serviceStatus: ServiceTicketStatus;
    // We keep the original 'status' from Ticket for backward compatibility or high-level view (OPEN/CLOSED)
    // but the engine drives 'serviceStatus'.

    currentQuoteId?: string;
    currentInvoiceId?: string;

    // Auth & Access
    accessToken?: string; // High entropy token for external client access (Approve/Pay)

    // Workflow Flags
    requiresAdminApproval?: boolean;
    adminApprovalReason?: string;
    autoApproved?: boolean;

    // Agent Context
    agentParams?: {
        lastInteraction?: Timestamp;
        conversationId?: string;
        pendingAction?: string; // e.g., 'WAITING_FOR_PAYMENT_PROOF'
    };
}

// ------------------------------------------------------------------
// 2. Policy Engine Types
// ------------------------------------------------------------------

export type ApprovalReason = 'HIGH_VALUE' | 'DISCOUNT_EXCEEDS_LIMIT' | 'CREDIT_RISK' | 'CRITICAL_ITEM' | 'MANUAL_OVERRIDE';

export interface ApprovalResult {
    requiresApproval: boolean;
    reason?: ApprovalReason;
    details?: string;
}

export interface PolicyRule {
    id: string;
    name: string;
    condition: (ticket: ServiceTicket, quote: Quote) => boolean;
    reason: ApprovalReason;
    priority: number;
}

// ------------------------------------------------------------------
// 3. Agent & Conversation Types
// ------------------------------------------------------------------

export type MessageRole = 'USER' | 'AGENT' | 'SYSTEM' | 'FIELD_TECH';

export interface AgentMessage {
    id: string;
    role: MessageRole;
    content: string; // Text content
    mediaUrl?: string; // Image/Doc
    mediaType?: 'image' | 'document' | 'audio';
    timestamp: Timestamp;
    metadata?: any; // e.g., WhatsApp message ID
}

export interface AgentConversation {
    id: string;
    ticketId: string;
    orgId: string;
    participants: {
        userId?: string; // If registered user
        phone?: string;  // If WhatsApp
        name?: string;
        role: 'CLIENT' | 'TECHNICIAN' | 'ADMIN';
    }[];
    platform: 'WHATSAPP' | 'WEB';
    platformId?: string; // e.g., WA Phone ID
    lastMessageAt: Timestamp;
    status: 'ACTIVE' | 'ARCHIVED';
    // Context for LLM
    contextSummary?: string;
}

export interface AgentRun {
    id: string;
    ticketId: string;
    trigger: 'WEBHOOK' | 'SCHEDULE' | 'MANUAL';
    status: 'RUNNING' | 'COMPLETED' | 'FAILED';
    startedAt: Timestamp;
    completedAt?: Timestamp;
    logs: string[];
    actionsTaken: string[];
}
