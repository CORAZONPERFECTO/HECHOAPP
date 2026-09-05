import { Timestamp } from "firebase/firestore";

export type IncentiveStatus = 
    | 'GENERATED' 
    | 'PENDING_VALIDATION' 
    | 'VALIDATED' 
    | 'APPROVED_FOR_PAYMENT' 
    | 'PAID' 
    | 'REJECTED' 
    | 'ADJUSTED';

export interface IncentiveType {
    id: string;
    key: string;
    name: string;
    description: string;
    defaultRate: number;
    
    hasQualityComponent: boolean;
    productivityRatio: number; // e.g. 0.70
    qualityRatio: number; // e.g. 0.30
    qualityHoldPeriodDays: number; // e.g. 30
    
    requiresTicket: boolean;
    requiresPhotoEvidence: boolean;
    active: boolean;
    createdAt: Timestamp | Date;
    updatedAt: Timestamp | Date;
}

export interface PasanteRecord {
    id: string;
    ticketId: string;
    ticketNumber?: string;
    equipment: string;
    technicianId: string;
    technicianName: string;
    fleetId?: string;
    evidenceUrl?: string;
    date: Timestamp | Date;
    rate: number;
    totalIncentive: number;
    status: 'PENDIENTE' | 'APROBADO' | 'PAGADO' | 'RECHAZADO';
    notes?: string;
}

export interface IncentiveRecord {
    id: string;
    beneficiaryId: string;
    beneficiaryName: string;
    beneficiaryCedula?: string;
    
    typeKey: string;
    typeName: string;
    quantity: number;
    rate: number;
    totalAmount: number;
    
    productivityAmount: number;
    qualityAmount: number;
    qualityConsolidated: boolean;
    qualityConsolidationDate?: Timestamp | Date;
    
    ticketIds: string[];
    primaryTicketId: string;
    ticketNumber?: string;
    
    fleetId?: string;
    fleetName?: string;
    evidenceUrls?: string[];
    
    periodId: string;
    status: IncentiveStatus;
    
    validatorId?: string;
    validatorName?: string;
    validatedAt?: Timestamp | Date;
    
    approvedById?: string;
    approvedByName?: string;
    approvedAt?: Timestamp | Date;
    
    paidAt?: Timestamp | Date;
    paymentBatchId?: string;
    
    rejectionReason?: string;
    observations?: string;
    
    qualityAdjustedAmount?: number;
    adjustedReason?: string;
    
    createdAt: Timestamp | Date;
    updatedAt: Timestamp | Date;
}

export interface IncentiveExportRow {
    id: string;
    beneficiaryName: string;
    beneficiaryCedula: string;
    concept: string;
    quantity: number;
    rate: number;
    grossAmount: number;
    adjustments: number;
    netTotal: number;
    ticketsJustification: string;
    period: string;
    status: string;
    approvedBy: string;
}
