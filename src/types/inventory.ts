
import { Timestamp } from "firebase/firestore";

export type UnitOfMeasure = 'UNIDAD' | 'PIE' | 'METRO' | 'ROLLO' | 'GALON' | 'LIBRA' | 'CAJA' | 'JUEGO' | 'PAQUETE' | 'OTRO';

export type InventoryLocationType = 'ALMACEN' | 'VEHICULO' | 'OBRA';

export type MovementType = 'ENTRADA' | 'SALIDA' | 'AJUSTE' | 'TRANSFERENCIA';

export type StockStatus = 'OK' | 'LOW' | 'CRITICAL';

export interface InventoryLocation {
    id: string;
    name: string;
    type: InventoryLocationType;
    description?: string;
    responsibleUserId?: string; // If assigned to a technician (vehicle)
    isActive: boolean;
    createdAt?: Date | Timestamp;
    updatedAt?: Date | Timestamp;
}

export interface InventoryProduct {
    id: string;
    sku: string;
    name: string;
    category: string; // Could be an ID if categories are in a separate collection
    brand?: string;
    unit: UnitOfMeasure;
    description?: string;
    photoUrl?: string;

    // Costing
    averageCost: number; // Calculated moving average
    referencePrice?: number; // For sale or estimation
    taxRate?: number; // 0.18 etc.

    // Stock Rules
    minStock: number;
    maxStock?: number;
    tags?: string[]; // ["R410A", "Consumible"]

    isActive: boolean;
    createdAt?: Date | Timestamp;
    updatedAt?: Date | Timestamp;
}

// Maps a product to a location with quantity
export interface InventoryStock {
    id: string; // usually product_id_location_id composite
    productId: string;
    locationId: string;
    quantity: number;
    updatedAt?: Date | Timestamp;
}

export interface InventoryMovement {
    id?: string;
    type: MovementType;
    productId: string;

    // Locations
    originLocationId?: string; // For transfers or consumption (store/van it came from)
    destinationLocationId?: string; // For transfers or returns

    quantity: number;
    unitCost?: number; // Snapshot of cost at time of movement (optional)

    reason: string; // "Compra", "Consumo Ticket", "Merma", etc.
    note?: string;

    // Evidence/Links
    ticketId?: string;
    evidencePhotoUrl?: string;

    // Audit
    createdByUserId: string;
    createdByType?: 'ADMIN' | 'TECHNICIAN' | 'SYSTEM';
    createdAt: Date | Timestamp;
}

export interface InventorySupplier {
    id: string;
    name: string;
    contactName?: string;
    phone?: string;
    email?: string;
    rnc?: string;
    notes?: string;
}

export interface PendingProduct {
    id: string;
    detectedName: string;
    providerName?: string;
    suggestedUnit?: string;
    detectedPrice?: number;

    ticketId: string;
    purchaseId: string;
    purchaseItemId?: string;

    quantity?: number; // Added for retro-active movement
    targetLocationId?: string; // Added for retro-active movement

    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    resolvedProductId?: string;

    createdByUserId: string;
    createdAt: any;
}
