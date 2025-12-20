import { Timestamp } from "firebase/firestore";

export type EquipmentType = 'AIRE_ACONDICIONADO' | 'REFRIGERACION' | 'LAVADORA' | 'SECADORA' | 'ESTUFA' | 'OTRO';

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

export interface Location {
    id: string;
    nombre: string;
    direccion?: string;
    descripcion?: string;
    clientId?: string;
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
    extractedData: any; // Raw JSON from AI
    processedAt: Timestamp;
    status: 'PROCESSED' | 'ERROR';
}
