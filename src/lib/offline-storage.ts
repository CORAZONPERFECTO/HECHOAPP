// Offline Storage using IndexedDB for ticket data and LocalStorage for sync queue
import { ServiceTicket } from "@/types/service";
import { Purchase } from "@/types/purchase";

const DB_NAME = 'TechnicianOfflineDB';
const DB_VERSION = 2; // Incremented version
const TICKET_STORE = 'tickets';
const PURCHASES_STORE = 'purchases';
const SYNC_QUEUE_KEY = 'syncQueue';

interface SyncOperation {
    id: string;
    type: 'UPDATE_TICKET' | 'UPLOAD_PHOTO' | 'CREATE_PURCHASE';
    data: any;
    timestamp: number;
    retries: number;
    lastAttempt?: number;
    error?: string;
    status: 'PENDING' | 'RETRYING' | 'FAILED' | 'CONFLICT';
}

// Initialize IndexedDB
export const initDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;

            // Create tickets store if it doesn't exist
            if (!db.objectStoreNames.contains(TICKET_STORE)) {
                db.createObjectStore(TICKET_STORE, { keyPath: 'id' });
            }
            // Create purchases store
            if (!db.objectStoreNames.contains(PURCHASES_STORE)) {
                db.createObjectStore(PURCHASES_STORE, { keyPath: 'id' });
            }
        };
    });
};

// Save ticket to IndexedDB
export const saveTicketOffline = async (ticket: Partial<ServiceTicket> & { id: string }): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([TICKET_STORE], 'readwrite');
        const store = transaction.objectStore(TICKET_STORE);
        const request = store.put(ticket);

        request.onsuccess = () => {
            console.log('✅ Ticket saved offline:', ticket.id);
            resolve();
        };
        request.onerror = () => reject(request.error);
    });
};

// Get ticket from IndexedDB
export const getTicketOffline = async (ticketId: string): Promise<ServiceTicket | undefined> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([TICKET_STORE], 'readonly');
        const store = transaction.objectStore(TICKET_STORE);
        const request = store.get(ticketId);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

// Save purchase to IndexedDB
export const savePurchaseOffline = async (purchase: Purchase): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([PURCHASES_STORE], 'readwrite');
        const store = transaction.objectStore(PURCHASES_STORE);
        const request = store.put(purchase);

        request.onsuccess = () => {
            console.log('✅ Purchase saved offline:', purchase.id);
            resolve();
        };
        request.onerror = () => reject(request.error);
    });
};

// Get purchase from IndexedDB
export const getPurchaseOffline = async (purchaseId: string): Promise<Purchase | undefined> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([PURCHASES_STORE], 'readonly');
        const store = transaction.objectStore(PURCHASES_STORE);
        const request = store.get(purchaseId);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

// Sync Queue Management (using LocalStorage for simplicity)
export const addToSyncQueue = (operation: Omit<SyncOperation, 'id' | 'timestamp' | 'retries' | 'status'>): void => {
    const queue = getSyncQueue();
    const newOperation: SyncOperation = {
        ...operation,
        id: `${Date.now()}_${Math.random()}`,
        timestamp: Date.now(),
        retries: 0,
        status: 'PENDING'
    };
    queue.push(newOperation);
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    console.log('📝 Added to sync queue:', newOperation.type);
};

export const getSyncQueue = (): SyncOperation[] => {
    const queueStr = localStorage.getItem(SYNC_QUEUE_KEY);
    return queueStr ? JSON.parse(queueStr) : [];
};

export const updateSyncOperation = (id: string, updates: Partial<SyncOperation>): void => {
    const queue = getSyncQueue();
    const index = queue.findIndex(op => op.id === id);

    if (index !== -1) {
        queue[index] = { ...queue[index], ...updates };
        localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    }
};

export const removeFromSyncQueue = (operationId: string): void => {
    const queue = getSyncQueue();
    const filtered = queue.filter(op => op.id !== operationId);
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(filtered));
};

export const clearSyncQueue = (): void => {
    localStorage.removeItem(SYNC_QUEUE_KEY);
    console.log('🗑️ Sync queue cleared');
};

// Photo cache management
export const cachePhoto = (photoId: string, blob: Blob): void => {
    // Store photo blob URL in sessionStorage (temporary)
    const url = URL.createObjectURL(blob);
    sessionStorage.setItem(`photo_${photoId}`, url);
};

export const getCachedPhoto = (photoId: string): string | null => {
    return sessionStorage.getItem(`photo_${photoId}`);
};

export const clearPhotoCache = (): void => {
    // Clear all photo cache entries
    Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('photo_')) {
            const url = sessionStorage.getItem(key);
            if (url) URL.revokeObjectURL(url);
            sessionStorage.removeItem(key);
        }
    });
};
