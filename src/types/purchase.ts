
import { Timestamp } from "firebase/firestore";

export type ExpenseType = 
    | 'OPEX_TICKET'     // Costo directo de materiales/insumos asignados a un ticket
    | 'OPEX_GENERAL'    // Gasto operativo recurrente (almacén, servicios, etc.)
    | 'CAPEX_EQUIPO'    // Inversión en activos fijos (equipos HVAC mayores, herramientas pesadas)
    | 'COMBUSTIBLE';    // Combustible y peajes vinculados a una camioneta

export interface DgiiTaxData {
    rncEmisor?: string;
    rncComprador?: string;
    eNcf?: string;               // e-NCF electrónico (E31, E32, E34, E43...)
    ncf?: string;                // NCF tradicional (B01, B02...)
    securityCode?: string;       // Código de seguridad del e-CF
    qrPayload?: string;          // Contenido crudo decodificado del QR
    taxType?: '01' | '02' | '03' | '04' | '05' | '06' | '07' | '08' | '09' | '10' | '11'; // Tipo Bienes/Servicios Formato 606
    itbisWithheld?: number;      // ITBIS Retenido
    isrWithheld?: number;        // ISR Retenido
    paymentMethodCode?: '01' | '02' | '03' | '04' | '05' | '06' | '07'; // Código DGII (01 Efectivo, 02 Cheque/Transf, 03 Tarjeta...)
    isValidatedWithDgii?: boolean;
}

export interface AssetDetails {
    assetCategory: 'HVAC_EQUIPMENT' | 'HEAVY_TOOL' | 'VEHICLE' | 'OFFICE_TECH';
    serialNumber?: string;
    assetModel?: string;
    brand?: string;
    estimatedUsefulMonths?: number; // ej. 60 meses (5 años)
    monthlyDepreciation?: number;
    assignedLocationOrFleet?: string;
}

export interface VehicleExpenseDetails {
    vehiclePlate?: string;
    fleetId?: string;
    odometerKm?: number;
    fuelGallons?: number;
    fuelType?: 'GASOLINA' | 'DIESEL' | 'GLP';
    costPerGallon?: number;
}

export interface PurchaseItem {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
    isInventory: boolean; // TRUE = Material, FALSE = Expense (Gas, Food, etc)
    matchedProductId?: string; // If matched to existing product
}

export interface Purchase {
    id: string;
    ticketId?: string;
    ticketNumber?: string;

    expenseType?: ExpenseType; // 'OPEX_TICKET' | 'OPEX_GENERAL' | 'CAPEX_EQUIPO' | 'COMBUSTIBLE'

    providerName: string;
    rnc?: string;
    ncf?: string; // Comprobante tradicional
    eNcf?: string; // Comprobante Electrónico (e-NCF)
    buyerRnc?: string; // RNC Comprador (HECHO SRL: 131947532)
    buyerName?: string; // Razón Social Comprador (HECHO SRL)
    status?: string; // Estado (e.g., ACEPTADA, PENDIENTE)

    date: Timestamp; // Firestore Timestamp

    subtotal: number;
    tax: number;
    total: number;

    items: PurchaseItem[];

    paymentMethod: 'CASH' | 'TRANSFER' | 'CARD';
    notes?: string;

    evidenceUrls: string[]; // Receipt photos

    dgiiData?: DgiiTaxData;
    assetDetails?: AssetDetails;
    vehicleDetails?: VehicleExpenseDetails;

    alegraSynced?: boolean;
    alegraBillId?: string;
    alegraSyncedAt?: Timestamp | Date;

    createdByUserId: string;
    createdAt: Timestamp | Date;
}
