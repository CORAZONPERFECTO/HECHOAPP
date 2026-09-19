import { Timestamp } from "firebase/firestore";
import { EquipmentType, Location as BaseLocation } from "./assets";
import { TicketPhoto, SurveyArea } from "./tickets";

export type EquipmentStatus = 'OPERATIONAL' | 'WARNING' | 'CRITICAL' | 'REPLACED' | 'RETIRED' | 'OFFLINE' | 'MAINTENANCE';

export type HVACCategory = 
    | 'SPLIT_INVERTER' 
    | 'SPLIT_CONVENCIONAL' 
    | 'CENTRAL_FANCOIL' 
    | 'VRF' 
    | 'PACKAGE' 
    | 'MULTI_SPLIT' 
    | 'CHILLER' 
    | 'EXTRACTOR' 
    | 'OTRO';

export interface EquipmentSpecs {
    brand: string;
    model?: string;
    serialNumber?: string;
    btu?: number | string;
    voltage?: string; // "110V", "220V", "208/230V 3Ph"
    refrigerant?: string; // "R410A", "R32", "R22", "R134a", "R404A"
    type?: HVACCategory | string;
    pipeDistanceMeters?: number;
    electricalStatus?: string;
    drainStatus?: string;
}

export interface EquipmentPassport {
    id: string;                    // Firestore Document ID
    code: string;                  // Inmutable institucional, ej: "EQ-001847"
    qrToken: string;               // Token para URL /qr/[token]
    qrCode?: string;               // Alias para compatibilidad con HVACAsset

    // Jerarquía
    clientId: string;
    clientName?: string;
    locationId: string;            // ID de la Villa/Propiedad ('locations' doc id)
    villaId?: string;              // Alias de locationId para compatibilidad
    locationName?: string;         // "Villa 12"
    locationArea?: string;         // "Cap Cana", "Punta Cana Resort"
    areaId?: string;               // ID del área física, ej: "AREA-01"
    areaName: string;              // Ej: "Habitación Principal", "Sala / Comedor"
    name?: string;                 // Nombre descriptivo ("AC Habitación Principal")
    nombre?: string;               // Alias para compatibilidad con código legacy

    // Ficha Técnica
    specs: EquipmentSpecs;
    marca?: string;                // Desnormalizado legacy
    modelo?: string;
    numeroSerie?: string;
    capacidadBTU?: string;
    tipoEquipo?: EquipmentType | string;

    // Ciclo de Vida y Reemplazos
    status: EquipmentStatus;
    replacesEquipmentId?: string;  // ID del equipo previo al que sustituyó
    replacedByEquipmentId?: string;// ID del nuevo equipo que lo sustituyó
    retirementReason?: string;     // Causa de baja ("Compresor quemado", etc.)
    retiredAt?: Timestamp | string;

    // Fotos de Identificación Base
    platePhotoUrl?: string;        // Foto de placa de datos
    boardPhotoUrl?: string;        // Foto de tarjeta electrónica
    evaporatorPhotoUrl?: string;   // Foto de unidad interior
    condenserPhotoUrl?: string;    // Foto de condensadora/unidad exterior

    // Fechas y Metadatos
    installDate?: string;
    lastServiceDate?: Timestamp | string;
    nextServiceDate?: Timestamp | string;
    activeTicketId?: string | null;
    notes?: string;
    notas?: string;
    createdAt: Timestamp | any;
    updatedAt: Timestamp | any;
}

export type InterventionStage = 'BEFORE' | 'DURING' | 'AFTER';

export interface InterventionEvidencePhoto {
    url: string;
    stage: InterventionStage;
    caption?: string;
    timestamp?: Timestamp | any;
    uploadedBy?: string;
}

export interface EquipmentIntervention {
    id: string;
    equipmentId: string;           // Código "EQ-001847" o Doc ID
    equipmentCode?: string;
    ticketId: string;              // "TK-2026-0042"
    locationId: string;            // ID de la Villa
    locationName?: string;
    areaName?: string;
    date: Timestamp | string;
    technicianId: string;
    technicianName: string;
    serviceType: 'PREVENTIVO' | 'CORRECTIVO' | 'DIAGNOSTICO' | 'REEMPLAZO' | 'INSTALACION' | 'LEVANTAMIENTO';
    diagnosis?: string;
    workDone: string;
    partsReplaced?: string[];
    measurements?: {
        psiLow?: number;
        psiHigh?: number;
        amp?: number;
        tempSupply?: number;
        tempReturn?: number;
        tempDelta?: number;
    };
    photos: InterventionEvidencePhoto[];
    createdAt: Timestamp | any;
}

export interface PropertyArea {
    id: string;
    name: string;
    floor?: number;
    notes?: string;
}

export interface PropertyLocation extends BaseLocation {
    code?: string;                 // "PROP-00042"
    areas?: PropertyArea[];
}
