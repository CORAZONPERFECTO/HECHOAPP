import { Timestamp } from "firebase/firestore";
import { TicketSurveyArea } from './tickets';

export type EquipmentType = 'AIRE_ACONDICIONADO' | 'REFRIGERACION' | 'LAVADORA' | 'SECADORA' | 'ESTUFA' | 'OTRO';

export interface Equipment {
    id: string;
    code?: string; // ej. "EQ-001847"
    qrToken?: string;
    qrCode?: string;
    nombre?: string;
    name?: string;
    clientId: string;
    locationId: string;
    villaId?: string;
    areaId?: string;
    areaName?: string;
    marca?: string;
    modelo?: string;
    numeroSerie?: string;
    capacidadBTU?: string;
    tipoEquipo?: EquipmentType | string;
    specs?: {
        brand?: string;
        model?: string;
        serialNumber?: string;
        btu?: number | string;
        voltage?: string;
        refrigerant?: string;
        type?: string;
    };
    status?: 'OPERATIONAL' | 'WARNING' | 'CRITICAL' | 'REPLACED' | 'RETIRED' | 'OFFLINE' | 'MAINTENANCE';
    replacesEquipmentId?: string;
    replacedByEquipmentId?: string;
    retirementReason?: string;
    platePhotoUrl?: string;
    boardPhotoUrl?: string;
    evaporatorPhotoUrl?: string;
    condenserPhotoUrl?: string;
    anoInstalacion?: string;
    notas?: string;
    createdAt?: Timestamp | any;
    updatedAt?: Timestamp | any;
}

export interface Location {
    id: string;
    code?: string; // ej. "PROP-00042"
    nombre: string;
    direccion?: string;
    descripcion?: string;
    clientId?: string;
    clientName?: string;
    locationArea?: string;
    specificLocation?: string;
    locationUrl?: string; // GPS Google Maps / Waze link
    facadePhotoUrl?: string; // Foto de la fachada / parte delantera de la villa
    frontPhotoUrl?: string; // Alias
    isRetainer?: boolean; // Villa con Iguala
    contractType?: 'IGUALA' | 'EVENTUAL';
    contractStartDate?: string;
    nextMaintenanceDate?: string;
    maintenanceFrequency?: 'MENSUAL' | 'BIMESTRAL' | 'TRIMESTRAL';
    areas?: Array<{ id: string; name: string; floor?: number }>;
    equipmentCensus?: TicketSurveyArea[];
    retentionPolicyReviewedAt?: any;
    retentionDecision?: 'PRESERVE_ALL' | 'PURGED_OLD';
    createdAt?: Timestamp | Date;
    updatedAt?: Timestamp | Date;
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
    createdAt?: Timestamp | Date | any; // allow FieldValue
    updatedAt?: Timestamp | Date | any;
    // Validation Fields
    validationStatus?: 'PENDIENTE' | 'VALIDADO';
    sourcePhotoUrl?: string; // Original photo if scanned
}

export interface ErrorSource {
    id: string;
    brand: string;
    model?: string;
    type?: string;
    photoUrls: string[];
    extractedData: Record<string, unknown>; // Raw JSON from AI
    processedAt: Timestamp;
    status: 'PROCESSED' | 'ERROR';
}
