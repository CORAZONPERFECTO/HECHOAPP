import { Timestamp } from "firebase/firestore";

export type CostCenterType = 'FLOTILLA' | 'SUPERVISION_DIRECCION' | 'ALMACEN' | 'ADMINISTRACION' | 'GENERAL' | 'OTRO';
export type CostClassification = 'DIRECTO' | 'COMPARTIDO' | 'GENERAL';
export type CostFrequency = 'MENSUAL' | 'QUINCENAL' | 'SEMANAL' | 'UNICO' | 'ANUAL';
export type CostDistributionMethod = 
    | 'MONTO_FIJO' 
    | 'POR_FLOTILLA' 
    | 'POR_CANTIDAD_TECNICOS' 
    | 'POR_HORAS_TRABAJADAS' 
    | 'POR_HORAS_PRODUCTIVAS' 
    | 'POR_FACTURACION' 
    | 'PORCENTAJE_MANUAL' 
    | 'PERSONALIZADA';

export interface CostCenter {
    id: string;
    code: string;
    name: string;
    type: CostCenterType;
    fleetId?: string;
    vehicleId?: string;
    managerId?: string;
    managerName?: string;
    active: boolean;
    description?: string;
    createdAt: Timestamp | Date;
    updatedAt: Timestamp | Date;
}

export interface CostCategory {
    id: string;
    name: string;
    description?: string;
    subcategories: string[];
    active: boolean;
    createdAt: Timestamp | Date;
}

export interface OperationalCost {
    id: string;
    name: string;
    description?: string;
    amount: number;
    currency: 'DOP' | 'USD';
    frequency: CostFrequency;
    startDate: Timestamp | Date;
    endDate?: Timestamp | Date;
    periodId?: string; // e.g. "2026-09"
    
    categoryId: string;
    categoryName: string;
    subcategory?: string;
    costCenterId: string;
    costCenterName: string;
    
    fleetId?: string;
    vehicleId?: string;
    
    classification: CostClassification;
    distributionMethod: CostDistributionMethod;
    customDistribution?: Record<string, number>;
    
    includeInHourlyRate: boolean;
    
    // Prevención de Doble Contabilización
    isIncludedInOtherCost: boolean;
    parentCostId?: string;
    parentCostName?: string;
    
    active: boolean;
    notes?: string;
    
    createdBy: string;
    createdByName: string;
    updatedBy?: string;
    updatedByName?: string;
    createdAt: Timestamp | Date;
    updatedAt: Timestamp | Date;
}

export interface Fleet {
    id: string;
    name: string; // "Flotilla 1", "Flotilla 2", etc.
    code: string;
    vehicleId?: string;
    vehicleName?: string;
    vehiclePlate?: string;
    technicianIds: string[];
    technicianNames?: string[];
    leaderTechnicianId?: string;
    costCenterId: string;
    baseMonthlyCost: number; // e.g. RD$ 119,000
    active: boolean;
    notes?: string;
    createdAt: Timestamp | Date;
    updatedAt: Timestamp | Date;
}

export interface AccountingPeriod {
    id: string; // e.g. "2026-09"
    name: string; // "Septiembre 2026"
    startDate: Timestamp | Date;
    endDate: Timestamp | Date;
    
    // Configuración de Jornadas Laborales
    workingDays: number;
    dailyHours: number;
    vacationOrHolidaysHours?: number;
    
    // Horas registradas / calculadas
    paidHours: number;
    availableHours: number;
    productiveHours: number;
    travelHours: number;
    warrantyHours: number;
    nonProductiveHours: number;
    
    // Indicadores de Costo por Hora
    costoHoraDisponible: number;
    costoHoraProductiva: number;
    costoEmpresarialHora: number;
    
    isClosed: boolean;
    closedAt?: Timestamp | Date;
    closedBy?: string;
    createdAt: Timestamp | Date;
    updatedAt: Timestamp | Date;
}

export interface LoanPaymentSchedule {
    quotaNumber: number;
    dueDate: Timestamp | Date;
    totalQuota: number;
    principalAmount: number;
    interestAmount: number;
    insuranceAmount?: number;
    remainingBalance: number;
    status: 'PENDING' | 'PAID';
    paidAt?: Timestamp | Date;
}

export interface Loan {
    id: string;
    entity: string;
    concept: string;
    totalPrincipal: number;
    monthlyQuota: number;
    interestRateAnnual?: number;
    currentBalance: number;
    startDate: Timestamp | Date;
    endDate: Timestamp | Date;
    costCenterId: string;
    costCenterName?: string;
    linkedVehicleId?: string;
    schedule?: LoanPaymentSchedule[];
    active: boolean;
    notes?: string;
    createdAt: Timestamp | Date;
    updatedAt: Timestamp | Date;
}
