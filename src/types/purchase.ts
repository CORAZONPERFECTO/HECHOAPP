
import { Timestamp } from "firebase/firestore";

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
    ticketId: string;
    ticketNumber?: string;

    providerName: string;
    rnc?: string;
    ncf?: string; // Comprobante

    date: Timestamp; // Firestore Timestamp

    subtotal: number;
    tax: number;
    total: number;

    items: PurchaseItem[];

    paymentMethod: 'CASH' | 'TRANSFER' | 'CARD';
    notes?: string;

    evidenceUrls: string[]; // Receipt photos

    createdByUserId: string;
    createdAt: Timestamp | Date;
}
