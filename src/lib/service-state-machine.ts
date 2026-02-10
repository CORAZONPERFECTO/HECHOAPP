import { ServiceTicket, ServiceTicketStatus } from "@/types/service";
import { Timestamp } from "firebase/firestore";

/**
 * Calculates the current SLA status for a ticket.
 */
export function calculateSLAStatus(ticket: ServiceTicket): 'ON_TRACK' | 'AT_RISK' | 'BREACHED' {
    if (!ticket.slaResolutionTimeHours) return 'ON_TRACK'; // No SLA defined

    const now = Timestamp.now().toMillis();
    const created = ticket.createdAt instanceof Timestamp ? ticket.createdAt.toMillis() : new Date(ticket.createdAt).getTime();

    // Check Resolution SLA
    const resolutionDeadline = created + (ticket.slaResolutionTimeHours * 60 * 60 * 1000);

    // If ticket is closed, check if it met the deadline
    if (ticket.serviceStatus === 'CLOSED' || ticket.serviceStatus === 'WORK_DONE') {
        const resolutionTime = ticket.resolvedAt ? ticket.resolvedAt.toMillis() : now; // Fallback if missing
        return resolutionTime <= resolutionDeadline ? 'ON_TRACK' : 'BREACHED';
    }

    // Active ticket checks
    if (now > resolutionDeadline) {
        return 'BREACHED';
    }

    // "At Risk" if within 20% of deadline remaining
    const timeRemaining = resolutionDeadline - now;
    const totalDuration = resolutionDeadline - created;
    if (timeRemaining < (totalDuration * 0.2)) {
        return 'AT_RISK';
    }

    return 'ON_TRACK';
}

// Define allowed transitions
const TRANSITIONS: Record<ServiceTicketStatus, ServiceTicketStatus[]> = {
    'CREATED': ['SCHEDULED', 'CLOSED'],
    'SCHEDULED': ['ON_SITE', 'CANCELLED', 'CLOSED'],
    'ON_SITE': ['DIAGNOSIS_IN_PROGRESS', 'CLOSED'],
    'DIAGNOSIS_IN_PROGRESS': ['EVIDENCE_READY', 'QUOTE_DRAFTED', 'CLOSED'],
    'EVIDENCE_READY': ['QUOTE_DRAFTED', 'CLOSED'],
    'QUOTE_DRAFTED': ['PENDING_ADMIN_APPROVAL', 'QUOTE_SENT', 'CLOSED'],
    'PENDING_ADMIN_APPROVAL': ['QUOTE_SENT', 'QUOTE_DRAFTED', 'CLOSED'], // QUOTE_DRAFTED if rejected/changes needed
    'QUOTE_SENT': ['CLIENT_ACCEPTED', 'CLOSED'],
    'CLIENT_ACCEPTED': ['WORK_AUTHORIZED', 'CLOSED'],
    'WORK_AUTHORIZED': ['WORK_DONE', 'CLOSED'],
    'WORK_DONE': ['INVOICE_ISSUED', 'CLOSED'],
    'INVOICE_ISSUED': ['PAYMENT_REQUESTED', 'CLOSED'],
    'PAYMENT_REQUESTED': ['PROOF_RECEIVED', 'CLOSED'],
    'PROOF_RECEIVED': ['PAYMENT_VERIFIED', 'PAYMENT_REQUESTED', 'CLOSED'], // Back to REQUESTED if proof rejected
    'PAYMENT_VERIFIED': ['CLOSED'],
    'CANCELLED': ['CLOSED', 'CREATED'], // Allow reset? or just closed.
    'CLOSED': [], // Terminal state? Or maybe REOPEN?
};

/**
 * Validates if a transition is allowed.
 * @param currentStatus Current status of the ticket
 * @param targetStatus Target status
 * @returns boolean true if allowed
 */
export function canTransition(currentStatus: ServiceTicketStatus, targetStatus: ServiceTicketStatus): boolean {
    // Special case: Admin can likely force CLOSE from almost anywhere, handled in map.
    // Also special case: Admins might need to jump steps manually? 
    // For now, strict enforcement based on the map.
    const allowed = TRANSITIONS[currentStatus];
    return allowed ? allowed.includes(targetStatus) : false;
}

/**
 * Computes the next likely status based on an action.
 * This helper is for the Agent to know "what's next" after a specific event.
 */
export function getNextStatus(current: ServiceTicketStatus, action: string): ServiceTicketStatus | null {
    // This could be expanded to a full State Machine with Events.
    // For now, a simple switch for common happy paths.
    switch (current) {
        case 'CREATED':
            if (action === 'SCHEDULE') return 'SCHEDULED';
            break;
        case 'SCHEDULED':
            if (action === 'ARRIVE') return 'ON_SITE';
            break;
        case 'ON_SITE':
            if (action === 'START_DIAGNOSIS') return 'DIAGNOSIS_IN_PROGRESS';
            break;
        case 'DIAGNOSIS_IN_PROGRESS':
            if (action === 'UPLOAD_EVIDENCE') return 'EVIDENCE_READY';
            break;
        case 'EVIDENCE_READY':
            if (action === 'GENERATE_QUOTE') return 'QUOTE_DRAFTED';
            break;
        case 'QUOTE_DRAFTED':
            if (action === 'REQUEST_APPROVAL') return 'PENDING_ADMIN_APPROVAL';
            if (action === 'SEND_QUOTE') return 'QUOTE_SENT'; // If auto-approved
            break;
        // ... add more as needed
    }
    return null;
}

export function validateTicketState(ticket: ServiceTicket): string[] {
    const errors: string[] = [];

    // Example validations
    if (ticket.serviceStatus === 'QUOTE_SENT' && !ticket.currentQuoteId) {
        errors.push("Ticket is in QUOTE_SENT but has no currentQuoteId");
    }

    // Add more structural integrity checks here
    return errors;
}
