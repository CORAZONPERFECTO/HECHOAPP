"use client";

import { ServiceTicket } from "@/types/service";

import { useEffect, useState, useCallback } from 'react';
import { useOnlineStatus } from './use-online-status';
import {
    addToSyncQueue,
    getSyncQueue,
    removeFromSyncQueue,
    updateSyncOperation,
    saveTicketOffline,
    getTicketOffline,
    savePurchaseOffline,
    getPurchaseOffline
} from '@/lib/offline-storage';
import { doc, updateDoc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL, uploadString } from 'firebase/storage';
import { registerPurchase } from "@/lib/purchase-service";
import { Purchase } from "@/types/purchase";
import { Project, ProjectZone } from '@/types/projects';

export function useOfflineSync() {
    const isOnline = useOnlineStatus();
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncQueue, setSyncQueue] = useState<any[]>([]);
    const [pendingOperations, setPendingOperations] = useState(0);

    const refreshQueue = useCallback(() => {
        const queue = getSyncQueue();
        setSyncQueue(queue);
        setPendingOperations(queue.length);
    }, []);

    // Initial load and listen for changes
    useEffect(() => {
        refreshQueue();
    }, [refreshQueue]);

    // Update pending operations count
    // Update pending operations count whenever online status changes
    useEffect(() => {
        refreshQueue();
    }, [isOnline, refreshQueue]);

    // Process sync queue when coming back online
    useEffect(() => {
        if (isOnline && !isSyncing) {
            processSyncQueue();
        }
    }, [isOnline]);

    const calculateBackoff = (retries: number) => {
        const BASE_DELAY = 1000; // 1 second
        const MAX_DELAY = 30000; // 30 seconds
        const delay = Math.min(BASE_DELAY * Math.pow(2, retries), MAX_DELAY);
        return delay;
    };

    const processSyncQueue = useCallback(async () => {
        const queue = getSyncQueue();
        setSyncQueue(queue); // Update state

        if (queue.length === 0) return;

        setIsSyncing(true);
        console.log(`🔄 Processing ${queue.length} pending operations...`);

        const MAX_RETRIES = 5;

        for (const operation of queue) {
            // Skip if CONFLICT - requires manual resolution
            if (operation.status === 'CONFLICT') continue;

            // Check backoff
            if (operation.lastAttempt && operation.status === 'RETRYING') {
                const delay = calculateBackoff(operation.retries);
                const timeSinceLastAttempt = Date.now() - operation.lastAttempt;

                if (timeSinceLastAttempt < delay) {
                    // Skip this operation for now
                    console.log(`⏳ Skipping op ${operation.id} (backoff wait: ${delay - timeSinceLastAttempt}ms)`);
                    continue;
                }
            }

            try {
                // Update status to RETRYING if it's not the first try
                if (operation.retries > 0) {
                    updateSyncOperation(operation.id, { status: 'RETRYING' });
                }

                // Determine data type based on operation.type
                // We use discriminated union in offline-storage, but here data is 'any' in general db retrieval
                // We trust the structure stored by this same app.

                if (operation.type === 'UPDATE_TICKET') {
                    await syncTicketUpdate(operation.data as Partial<ServiceTicket> & { id: string });
                } else if (operation.type === 'UPLOAD_PHOTO') {
                    await syncPhotoUpload(operation.data as { ticketId: string; blob: Blob; type: string; location?: string; filename: string });
                } else if (operation.type === 'CREATE_PURCHASE') {
                    await syncPurchaseCreation(operation.data as any);
                } else if (operation.type === 'COMPLETE_PROJECT_TALLER') {
                    await syncProjectTallerCompletion(operation.data as any);
                } else if (operation.type === 'BLOCK_PROJECT_TALLER') {
                    await syncProjectTallerBlock(operation.data as any);
                }

                // Remove from queue after successful sync
                removeFromSyncQueue(operation.id);
                refreshQueue(); // Refresh UI state

            } catch (error: any) {
                console.error(`❌ Failed to sync operation ${operation.id}:`, error);

                // Identify Conflict (e.g. from Firebase Precondition Failed)
                // Firestore error code 'failed-precondition' or similar
                const isConflict = error?.code === 'failed-precondition' || error?.message?.includes('conflict');

                if (isConflict) {
                    updateSyncOperation(operation.id, {
                        status: 'CONFLICT',
                        error: error.message,
                        lastAttempt: Date.now()
                    });
                } else if (operation.retries >= MAX_RETRIES) {
                    // Mark as FAILED after max retries
                    updateSyncOperation(operation.id, {
                        status: 'FAILED',
                        error: error.message,
                        lastAttempt: Date.now(),
                        retries: operation.retries + 1
                    });
                } else {
                    // Schedule Retry
                    updateSyncOperation(operation.id, {
                        retries: operation.retries + 1,
                        lastAttempt: Date.now(),
                        status: 'RETRYING',
                        error: error.message
                    });
                    refreshQueue(); // Refresh UI state
                }
            }
        }

        setIsSyncing(false);
        refreshQueue(); // Final refresh
        console.log('✅ Sync cycle complete');

    }, [refreshQueue]);

    const syncTicketUpdate = async (ticketData: Partial<ServiceTicket> & { id: string }) => {
        const docRef = doc(db, 'tickets', ticketData.id);
        await updateDoc(docRef, {
            ...ticketData,
            updatedAt: serverTimestamp()
        });
        console.log('✅ Synced ticket:', ticketData.id);
    };

    const syncPhotoUpload = async (photoData: { ticketId: string; blob: Blob; type: string; location?: string; filename: string }) => {
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

    const syncPurchaseCreation = async (params: any) => {
        try {
            // params already contains all necessary data structure for registerPurchase
            // { ticketId, items, userId, addToInventory, inventoryTargetLocationId... }

            await registerPurchase(params);
            console.log('✅ Synced purchase from queue');
        } catch (err) {
            console.error("Error syncing purchase:", err);
            throw err; // Re-throw to keep in queue
        }
    };

    const syncProjectTallerCompletion = async (data: {
        projectId: string;
        zoneId: string;
        areaId: string;
        tallerId: string;
        evidencePhotoBase64?: string;
        userId: string;
        userName: string;
    }) => {
        const { projectId, zoneId, areaId, tallerId, evidencePhotoBase64, userId, userName } = data;
        let finalPhotoUrl = "";

        if (evidencePhotoBase64) {
            // Upload Base64 image to Firebase Storage
            const storageRef = ref(storage, `projects/${projectId}/${zoneId}_${tallerId}_${Date.now()}.jpg`);
            await uploadString(storageRef, evidencePhotoBase64, 'data_url');
            finalPhotoUrl = await getDownloadURL(storageRef);
        }

        // Run transaction to update zone and project status & progress
        await runTransaction(db, async (transaction) => {
            const projectRef = doc(db, "projects", projectId);
            const zoneRef = doc(db, "projectZones", zoneId);
            
            const projectDoc = await transaction.get(projectRef);
            const zoneDoc = await transaction.get(zoneRef);
            
            if (!projectDoc.exists() || !zoneDoc.exists()) {
                throw new Error("Documentos no encontrados");
            }
            
            const zoneData = zoneDoc.data() as ProjectZone;
            const projectData = projectDoc.data() as Project;

            let tallerEncontrado = false;
            for (let a of zoneData.areas) {
                if (a.id === areaId) {
                    for (let t of a.talleres) {
                        if (t.id === tallerId && t.status !== 'COMPLETED') {
                            t.status = 'COMPLETED';
                            t.completedAt = serverTimestamp() as any;
                            if (finalPhotoUrl) {
                                t.evidencePhotoUrl = finalPhotoUrl;
                            }
                            t.assignedToTecnicoId = userId;
                            t.assignedToTecnicoName = userName;
                            t.blockedReason = undefined; // Limpiar bloqueo
                            tallerEncontrado = true;
                            break;
                        }
                    }
                }
            }

            if (!tallerEncontrado) {
                return;
            }

            // Recalcular completados en la zona
            const completedCount = zoneData.areas.reduce(
                (acc, a) => acc + a.talleres.filter(t => t.status === 'COMPLETED').length,
                0
            );
            zoneData.completedTalleres = completedCount;
            zoneData.progressPercentage = zoneData.totalTalleres > 0 ? (completedCount / zoneData.totalTalleres) * 100 : 0;

            const newProjectCompleted = projectData.completedTalleres + 1;
            const newProjectProgress = projectData.totalTalleres > 0 ? (newProjectCompleted / projectData.totalTalleres) * 100 : 0;

            const currentAssigned = projectData.assignedTechnicianIds || [];
            const newAssigned = new Set([...currentAssigned, userId]);

            transaction.update(zoneRef, zoneData as any);
            transaction.update(projectRef, {
                completedTalleres: newProjectCompleted,
                progressPercentage: newProjectProgress,
                status: projectData.status === 'PLANNING' ? 'IN_PROGRESS' : projectData.status,
                assignedTechnicianIds: Array.from(newAssigned)
            });
        });
        console.log(`✅ Synced milestone completion: ${tallerId} in project ${projectId}`);
    };

    const syncProjectTallerBlock = async (data: {
        projectId: string;
        zoneId: string;
        areaId: string;
        tallerId: string;
        blockedReason: string;
        blockedByContractor?: string;
        userId: string;
        userName: string;
    }) => {
        const { projectId, zoneId, areaId, tallerId, blockedReason, blockedByContractor, userId, userName } = data;

        await runTransaction(db, async (transaction) => {
            const projectRef = doc(db, "projects", projectId);
            const zoneRef = doc(db, "projectZones", zoneId);
            
            const projectDoc = await transaction.get(projectRef);
            const zoneDoc = await transaction.get(zoneRef);
            
            if (!projectDoc.exists() || !zoneDoc.exists()) {
                throw new Error("Documentos no encontrados");
            }
            
            const zoneData = zoneDoc.data() as ProjectZone;
            const projectData = projectDoc.data() as Project;

            let tallerEncontrado = false;
            for (let a of zoneData.areas) {
                if (a.id === areaId) {
                    for (let t of a.talleres) {
                        if (t.id === tallerId) {
                            t.status = 'BLOCKED';
                            t.blockedReason = blockedReason;
                            t.blockedByContractor = blockedByContractor || undefined;
                            t.blockedAt = serverTimestamp() as any;
                            t.assignedToTecnicoId = userId;
                            t.assignedToTecnicoName = userName;
                            tallerEncontrado = true;
                            break;
                        }
                    }
                }
            }

            if (!tallerEncontrado) {
                return;
            }

            const currentAssigned = projectData.assignedTechnicianIds || [];
            const newAssigned = new Set([...currentAssigned, userId]);

            transaction.update(zoneRef, zoneData as any);
            transaction.update(projectRef, {
                assignedTechnicianIds: Array.from(newAssigned)
            });
        });
        console.log(`✅ Synced milestone block: ${tallerId} in project ${projectId}`);
    };

    const queuePurchaseCreation = useCallback(async (params: any, purchaseDisplay: Purchase) => {
        // 1. Save UI representation offline
        await savePurchaseOffline(purchaseDisplay);

        // 2. Add to sync queue with full params
        addToSyncQueue({
            type: 'CREATE_PURCHASE',
            data: params
        });

        refreshQueue();
    }, [refreshQueue]);

    const saveOffline = useCallback(async (ticketId: string, updates: Partial<ServiceTicket>) => {
        // Save to IndexedDB
        await saveTicketOffline({ id: ticketId, ...updates });

        // Add to sync queue
        addToSyncQueue({
            type: 'UPDATE_TICKET',
            data: { id: ticketId, ...updates }
        });

        refreshQueue();
    }, [refreshQueue]);

    const queueProjectTallerCompletion = useCallback(async (params: {
        projectId: string;
        zoneId: string;
        areaId: string;
        tallerId: string;
        evidencePhotoBase64?: string;
        userId: string;
        userName: string;
    }) => {
        addToSyncQueue({
            type: 'COMPLETE_PROJECT_TALLER',
            data: params
        });
        refreshQueue();
    }, [refreshQueue]);

    const queueProjectTallerBlock = useCallback(async (params: {
        projectId: string;
        zoneId: string;
        areaId: string;
        tallerId: string;
        blockedReason: string;
        blockedByContractor?: string;
        userId: string;
        userName: string;
    }) => {
        addToSyncQueue({
            type: 'BLOCK_PROJECT_TALLER',
            data: params
        });
        refreshQueue();
    }, [refreshQueue]);

    const queuePhotoUpload = useCallback((ticketId: string, blob: Blob, type: string, location?: string, filename?: string) => {
        addToSyncQueue({
            type: 'UPLOAD_PHOTO',
            data: { ticketId, blob, type, location, filename: filename || 'photo.jpg' }
        });

        refreshQueue();
    }, [refreshQueue]);

    const retryOperation = useCallback((id: string) => {
        updateSyncOperation(id, { status: 'PENDING', retries: 0, error: undefined });
        refreshQueue();
        if (navigator.onLine && !isSyncing) {
            processSyncQueue();
        }
    }, [isSyncing, processSyncQueue, refreshQueue]);

    const discardOperation = useCallback((id: string) => {
        removeFromSyncQueue(id);
        refreshQueue();
    }, [refreshQueue]);

    return {
        isOnline,
        isSyncing,
        pendingOperations,
        syncQueue,
        saveOffline,
        queuePhotoUpload,
        queuePurchaseCreation,
        queueProjectTallerCompletion,
        queueProjectTallerBlock,
        processSyncQueue,
        retryOperation,
        discardOperation
    };
}
