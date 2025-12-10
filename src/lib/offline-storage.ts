// Offline Storage using IndexedDB for ticket data and LocalStorage for sync queue

const DB_NAME = 'TechnicianOfflineDB';
const DB_VERSION = 1;
const TICKET_STORE = 'tickets';
const SYNC_QUEUE_KEY = 'syncQueue';

interface SyncOperation {
    id: string;
    type: 'UPDATE_TICKET' | 'UPLOAD_PHOTO';
    data: any;
    timestamp: number;
    retries: number;
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
        };
    });
};

// Save ticket to IndexedDB
export const saveTicketOffline = async (ticket: any): Promise<void> => {
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
export const getTicketOffline = async (ticketId: string): Promise<any> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([TICKET_STORE], 'readonly');
        const store = transaction.objectStore(TICKET_STORE);
        const request = store.get(ticketId);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

// Sync Queue Management (using LocalStorage for simplicity)
export const addToSyncQueue = (operation: Omit<SyncOperation, 'id' | 'timestamp' | 'retries'>): void => {
    const queue = getSyncQueue();
    const newOperation: SyncOperation = {
        ...operation,
        id: `${Date.now()}_${Math.random()}`,
        timestamp: Date.now(),
        retries: 0
    };
    queue.push(newOperation);
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    console.log('📝 Added to sync queue:', newOperation.type);
};

export const getSyncQueue = (): SyncOperation[] => {
    const queueStr = localStorage.getItem(SYNC_QUEUE_KEY);
    return queueStr ? JSON.parse(queueStr) : [];
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
