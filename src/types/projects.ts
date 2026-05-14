import { Timestamp } from "firebase/firestore";

export type ProjectStatus = 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED';
export type TallerStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';

export interface ProjectTallerTemplate {
    id: string;
    name: string;
    description?: string;
    orderIndex: number;
    estimatedMinutes?: number; // Estimated time to complete (for AI tracking)
}

export interface ProjectArea {
    id: string;
    name: string; // e.g. "Habitación Principal", "Sala"
    talleres: ProjectTaller[];
}

export interface ProjectZone {
    id: string;
    projectId: string;
    name: string; // e.g. "Bloque A - Apto 202"
    areas: ProjectArea[];
    progressPercentage: number;
    totalTalleres: number;
    completedTalleres: number;
}

export interface ProjectTaller {
    id: string;
    templateId?: string; // If it came from a template
    name: string; // e.g. "Instalación de Evaporador"
    status: TallerStatus;
    orderIndex: number;
    
    // Assignment and tracking
    assignedToTecnicoId?: string;
    assignedToTecnicoName?: string;
    
    // Evidence and auditing
    completedAt?: Timestamp | Date;
    evidencePhotoUrl?: string;
    notes?: string;
    
    // History or blockers
    blockedReason?: string;
}

export interface Project {
    id: string;
    name: string; // e.g. "Torre Bella Vista"
    description?: string;
    clientName?: string;
    location?: string;
    
    status: ProjectStatus;
    
    // Metrics & AI Predictor
    totalTalleres: number;
    completedTalleres: number;
    progressPercentage: number;
    
    startDate?: Timestamp | Date;
    estimatedCompletionDate?: Timestamp | Date; // Calculated by AI/System
    averageTalleresPerDay?: number; // "Velocity" tracking
    
    // Audit
    createdBy: string;
    createdAt: Timestamp | Date;
    updatedAt: Timestamp | Date;
}

// Pre-diseños (Plantillas Base)
export const DEFAULT_TALLERES_TEMPLATES: ProjectTallerTemplate[] = [
    { id: 't1', name: 'Replanteo y Marcado', orderIndex: 1, estimatedMinutes: 60 },
    { id: 't2', name: 'Ranurado / Rotura de Pared', orderIndex: 2, estimatedMinutes: 120 },
    { id: 't3', name: 'Instalación de Tubería de Cobre', orderIndex: 3, estimatedMinutes: 180 },
    { id: 't4', name: 'Instalación de Drenaje (PVC)', orderIndex: 4, estimatedMinutes: 90 },
    { id: 't5', name: 'Cableado de Control y Fuerza', orderIndex: 5, estimatedMinutes: 90 },
    { id: 't6', name: 'Prueba de Nitrógeno (Estanqueidad)', orderIndex: 6, estimatedMinutes: 120 },
    { id: 't7', name: 'Cierre y Pañete (Resane)', orderIndex: 7, estimatedMinutes: 240 },
    { id: 't8', name: 'Instalación de Evaporador (Consola)', orderIndex: 8, estimatedMinutes: 120 },
    { id: 't9', name: 'Instalación de Condensador', orderIndex: 9, estimatedMinutes: 120 },
    { id: 't10', name: 'Colocación de Termostatos', orderIndex: 10, estimatedMinutes: 60 },
    { id: 't11', name: 'Vacío de Sistema', orderIndex: 11, estimatedMinutes: 60 },
    { id: 't12', name: 'Liberación de Gas / Carga de Refrigerante', orderIndex: 12, estimatedMinutes: 60 },
    { id: 't13', name: 'Prueba de Arranque y Termometría', orderIndex: 13, estimatedMinutes: 60 },
];
