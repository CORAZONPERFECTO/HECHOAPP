"use client";

import { useEffect, useState, useCallback } from 'react';
import { useOnlineStatus } from './use-online-status';
import {
    addToSyncQueue,
    getSyncQueue,
    removeFromSyncQueue,
    saveTicketOffline,
    getTicketOffline
} from '@/lib/offline-storage';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export function useOfflineSync() {
    const isOnline = useOnlineStatus();
    const [isSyncing, setIsSyncing] = useState(false);
    const [pendingOperations, setPendingOperations] = useState(0);

    // Update pending operations count
    useEffect(() => {
        const queue = getSyncQueue();
        setPendingOperations(queue.length);
    }, [isOnline]);

    // Process sync queue when coming back online
    useEffect(() => {
        if (isOnline && !isSyncing) {
            processSyncQueue();
        }
    }, [isOnline]);

    const processSyncQueue = useCallback(async () => {
        const queue = getSyncQueue();

        if (queue.length === 0) return;

        setIsSyncing(true);
        console.log(`🔄 Processing ${queue.length} pending operations...`);

        for (const operation of queue) {
            try {
                if (operation.type === 'UPDATE_TICKET') {
                    await syncTicketUpdate(operation.data);
                } else if (operation.type === 'UPLOAD_PHOTO') {
                    await syncPhotoUpload(operation.data);
                }

                // Remove from queue after successful sync
                removeFromSyncQueue(operation.id);
                setPendingOperations(prev => prev - 1);

            } catch (error) {
                console.error(`❌ Failed to sync operation ${operation.id}:`, error);
                // Keep in queue for retry
            }
        }

        setIsSyncing(false);
        console.log('✅ Sync complete');
    }, []);

    const syncTicketUpdate = async (ticketData: any) => {
        const docRef = doc(db, 'tickets', ticketData.id);
        await updateDoc(docRef, {
            ...ticketData,
            updatedAt: serverTimestamp()
        });
        console.log('✅ Synced ticket:', ticketData.id);
    };

    const syncPhotoUpload = async (photoData: any) => {
        const { ticketId, blob, type, location } = photoData;

        // Upload to Firebase Storage
        const storageRef = ref(storage, `tickets/${Date.now()}_${photoData.filename}`);
        await uploadBytes(storageRef, blob);
        const url = await getDownloadURL(storageRef);

        // Update ticket with new photo
        const docRef = doc(db, 'tickets', ticketId);
        const ticketSnap = await getTicketOffline(ticketId);

        if (ticketSnap) {
            const newPhoto = {
                url,
                type,
                description: "",
                timestamp: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 },
                location: location || undefined
            };

            await updateDoc(docRef, {
                photos: [...(ticketSnap.photos || []), newPhoto],
                updatedAt: serverTimestamp()
            });
        }

        console.log('✅ Synced photo for ticket:', ticketId);
    };

    const saveOffline = useCallback(async (ticketId: string, updates: any) => {
        // Save to IndexedDB
        await saveTicketOffline({ id: ticketId, ...updates });

        // Add to sync queue
        addToSyncQueue({
            type: 'UPDATE_TICKET',
            data: { id: ticketId, ...updates }
        });

        setPendingOperations(prev => prev + 1);
    }, []);

    const queuePhotoUpload = useCallback((ticketId: string, blob: Blob, type: string, location?: string, filename?: string) => {
        addToSyncQueue({
            type: 'UPLOAD_PHOTO',
            data: { ticketId, blob, type, location, filename: filename || 'photo.jpg' }
        });

        setPendingOperations(prev => prev + 1);
    }, []);

    return {
        isOnline,
        isSyncing,
        pendingOperations,
        saveOffline,
        queuePhotoUpload,
        processSyncQueue
    };
}
