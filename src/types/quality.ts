import { Timestamp } from "firebase/firestore";

export type WarrantyResponsibility = 
    | 'ATRIBUIBLE_TECNICO' 
    | 'FALLA_MATERIAL_EQUIPO' 
    | 'CAMBIO_SOLICITADO_CLIENTE' 
    | 'PROBLEMA_DIFERENTE' 
    | 'ERROR_DISENO' 
    | 'ERROR_SUPERVISION' 
    | 'CAUSA_EXTERNA' 
    | 'INDETERMINADO' 
    | 'OTRA';

export interface WarrantyTicketRecord {
    id: string;
    warrantyTicketId: string; // Ticket creado para atender la garantía
    originalTicketId: string; // Ticket original que generó el servicio
    originalTicketNumber: string;
    clientId: string;
    clientName: string;
    equipmentId?: string;
    equipmentModel?: string;
    
    originalWorkDate: Timestamp | Date;
    returnDate: Timestamp | Date;
    returnSequenceNumber: number; // Retorno #1, Retorno #2, etc.
    isSameRootCause: boolean; // "Misma causa no resuelta" vs "Nuevo problema"
    
    reportedProblem: string;
    foundCause?: string;
    
    originalTechnicianIds: string[];
    originalTechnicianNames?: string[];
    originalFleetId?: string;
    
    attendingTechnicianIds: string[];
    attendingTechnicianNames?: string[];
    
    evidenceUrls: string[];
    responsibility: WarrantyResponsibility;
    adminValidated: boolean;
    validatedBy?: string;
    validatedByName?: string;
    validationNotes?: string;
    
    // Costo de No Calidad (CNC)
    hoursConsumed: number;
    hourlyRateApplied: number;
    materialsCost: number;
    additionalExpenses: number;
    totalCNC: number; // (hoursConsumed * hourlyRateApplied) + materialsCost + additionalExpenses
    
    createdAt: Timestamp | Date;
    updatedAt: Timestamp | Date;
}

export interface QualityAdjustment {
    id: string;
    originalIncentiveId: string;
    originalTicketId: string;
    warrantyTicketId: string;
    technicianId: string;
    technicianName?: string;
    adjustedAmount: number;
    reason: string;
    evidenceUrl?: string;
    authorizedBy: string;
    authorizedByName: string;
    authorizedAt: Timestamp | Date;
    createdAt: Timestamp | Date;
}
