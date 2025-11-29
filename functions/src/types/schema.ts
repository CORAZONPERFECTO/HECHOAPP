export type UserRole = 'ADMIN' | 'COORDINADOR' | 'TECNICO';
export type ClientType = 'HOTEL' | 'EMPRESA' | 'RESIDENCIAL';
export type EquipmentType = 'MINISPLIT' | 'CASSETTE' | 'DUCTO' | 'VRF' | 'CHILLER' | 'OTRO';
export type TicketPriority = 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';
export type TicketStatus = 'ABIERTO' | 'EN_PROCESO' | 'PENDIENTE_CLIENTE' | 'PENDIENTE_MATERIAL' | 'CERRADO';
export type ServiceType = 'MANTENIMIENTO' | 'INSTALACION' | 'EMERGENCIA' | 'INSPECCION';
export type TicketOrigin = 'WHATSAPP' | 'LLAMADA' | 'EMAIL' | 'VISITA' | 'OTRO';
export type EventType = 'CREACION' | 'CAMBIO_ESTADO' | 'COMENTARIO' | 'CAMBIO_TECNICO' | 'ADJUNTO' | 'OTRO';

export interface Timestamp {
    seconds: number;
    nanoseconds: number;
}

export interface User {
    id: string;
    nombre: string;
    email: string;
    telefono: string;
    rol: UserRole;
    activo: boolean;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface Client {
    id: string;
    nombreComercial: string;
    tipoCliente: ClientType;
    rnc?: string;
    personaContacto: string;
    telefonoContacto: string;
    emailContacto: string;
    notas?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface Location {
    id: string;
    clientId: string;
    nombre: string;
    descripcion?: string;
    direccion?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface Equipment {
    id: string;
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

export interface Ticket {
    id: string;
    codigo: string; // TCK-2025-0001
    titulo: string;
    descripcion: string;
    prioridad: TicketPriority;
    estado: TicketStatus;
    tipoServicio: ServiceType;
    origen: TicketOrigin;
    clientId: string;
    locationId: string;
    equipmentId?: string;
    tecnicoAsignadoId?: string;
    fechaCompromiso?: Timestamp;
    fechaCierre?: Timestamp;
    slaHorasObjetivo?: number;
    creadoPorId: string;
    actualizadoPorId?: string;
    canalContactoDetalle?: string;
    externalConversationId?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface TicketEvent {
    id: string;
    ticketId: string;
    usuarioId: string;
    tipoEvento: EventType;
    descripcion: string;
    estadoAnterior?: string;
    estadoNuevo?: string;
    fechaEvento: Timestamp;
}
