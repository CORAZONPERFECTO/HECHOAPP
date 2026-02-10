import { Timestamp } from "firebase/firestore";

// --- HIERARCHY ---

export type HierarchyType = 'CLIENT' | 'PROJECT' | 'COMPLEX' | 'VILLA' | 'AREA';

export interface LocationNode {
    id: string;
    clientId: string; // The Tenant Owner
    parentId: string | null; // Null for Root (Client/Project)
    type: HierarchyType;
    name: string;
    path: string[]; // Ancestor IDs for efficient querying [clientId, projectId, villaId]
    description?: string;
    specs?: Record<string, any>; // Flexible metadata (sq meters, levels, etc)
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

// --- ASSETS (EXTENDED) ---

export type AssetStatus = 'OPERATIONAL' | 'WARNING' | 'CRITICAL' | 'OFFLINE' | 'MAINTENANCE';

export interface AssetSpecs {
    brand: string;
    model: string;
    serialNumber: string;
    btu?: number;
    voltage?: string; // 110v, 220v
    refrigerant?: string; // R410a, R22
    type: string; // Split, Central, VRF, Package
    installDate?: Timestamp;
    warrantyEnd?: Timestamp;
}

// Replaces/Extends the old 'Equipment' interface
export interface HVACAsset {
    id: string;
    qrCode: string; // Unique hash or shortId
    clientId: string;
    locationId: string; // Direct parent (Area)
    villaId: string; // Denormalized for reporting
    name: string; // "AC Master Bedroom"
    status: AssetStatus;
    specs: AssetSpecs;

    // Metadata
    lastServiceDate?: Timestamp;
    nextServiceDate?: Timestamp;
    activeTicketId?: string | null; // If currently being serviced

    notes?: string;
    photos?: string[]; // Main reference photos
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

// --- INTERVENTION REGISTER (RIT) ---

export type InterventionType = 'PREVENTIVE' | 'CORRECTIVE' | 'DIAGNOSIS' | 'INSTALLATION' | 'AUDIT' | 'OTHER';
export type InterventionStatus = 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'VERIFIED' | 'CANCELLED';

export interface InterventionPhoto {
    url: string;
    stage: 'BEFORE' | 'DURING' | 'AFTER';
    caption?: string;
    timestamp: Timestamp;
    geo?: { lat: number, lng: number };
}

export interface InterventionComment {
    id: string;
    text: string;
    authorId: string;
    authorName: string;
    authorRole: 'HECHO' | 'CLIENTE' | 'SYSTEM'; // HECHO = Blue, CLIENTE = Red
    createdAt: Timestamp;
}

export interface Intervention {
    id: string;
    // Relations
    assetId: string;
    clientId: string;
    locationId: string; // Area ID
    ticketId?: string; // Optional link to mutable ticket

    // Execution
    technicianId: string;
    technicianName: string;
    supervisorId?: string;

    // Details
    type: InterventionType;
    status: InterventionStatus;
    summary: string; // Short public summary
    technicalReport: string; // Detailed findings
    recommendations?: string;

    // Evidence
    photos: InterventionPhoto[];
    documents?: { name: string, url: string }[]; // PDF reports attached

    // State
    comments: InterventionComment[]; // Embedded conversation or subcollection? (Embedded simpler for PDF gen)

    // Timestamps
    startedAt?: Timestamp;
    completedAt?: Timestamp;
    verifiedAt?: Timestamp;
    createdAt: Timestamp; // Immutable
    updatedAt: Timestamp;
}
