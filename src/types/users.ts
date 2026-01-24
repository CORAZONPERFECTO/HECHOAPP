import { Timestamp } from "firebase/firestore";

export type UserRole = 'ADMIN' | 'SUPERVISOR' | 'GERENTE' | 'TECNICO';
export type ClientType = 'RESIDENCIAL' | 'COMERCIAL' | 'INDUSTRIAL';
export type PersonnelType = 'EMPLEADO' | 'CONTRATISTA' | 'TECNICO' | 'AYUDANTE' | 'GERENTE' | 'ADMINISTRATIVO';

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
    createdAt?: Timestamp | Date;
    updatedAt?: Timestamp | Date;
}

export interface Role {
    id: string;
    name: string;
    description?: string;
    permissions: string[];
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface Permission {
    id: string;
    key: string;
    label: string;
    group: string;
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
