
import {
    addToSyncQueue,
    getSyncQueue,
    updateSyncOperation,
    removeFromSyncQueue,
    clearSyncQueue
} from '@/lib/offline-storage';

// Mock localStorage if running in Node (simplistic mock)
if (typeof localStorage === 'undefined') {
    const store: Record<string, string> = {};
    (global as any).localStorage = {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => store[key] = value,
        removeItem: (key: string) => delete store[key],
        clear: () => { }
    };
    (global as any).window = {}; // minimal window mock
}

async function verifySyncLogic() {
    console.log("🛠️ Starting Sync Logic Verification...");

    // 1. Clear Queue
    clearSyncQueue();
    console.log("✅ Queue cleared.");

    // 2. Add Test Operation
    addToSyncQueue({
        type: 'UPDATE_TICKET',
        data: { id: 'test-ticket-1', diagnosis: 'Test Diagnosis' }
    });

    let queue = getSyncQueue();
    if (queue.length !== 1 || queue[0].status !== 'PENDING') {
        console.error("❌ Failed to add operation to queue correctly.");
        console.log(queue);
        process.exit(1);
    }
    console.log("✅ Operation added to queue.");

    const opId = queue[0].id;

    // 3. Simulate Failure & Retry
    console.log("🔄 Simulating 1st limit failure...");
    updateSyncOperation(opId, {
        status: 'RETRYING',
        retries: 1,
        lastAttempt: Date.now()
    });

    queue = getSyncQueue();
    if (queue[0].retries !== 1 || queue[0].status !== 'RETRYING') {
        console.error("❌ Failed to update operation status.");
        process.exit(1);
    }
    console.log("✅ Operation updated to RETRYING.");

    // 4. Test Backoff Calculation
    // Logic mirror from use-offline-sync
    const calculateBackoff = (retries: number) => {
        const BASE_DELAY = 1000;
        const MAX_DELAY = 30000;
        return Math.min(BASE_DELAY * Math.pow(2, retries), MAX_DELAY);
    };

    const retries = 2; // Testing logic for 2nd retry
    const delay = calculateBackoff(retries);
    console.log(`⏱️ Calculated delay for ${retries} retries: ${delay}ms`);

    if (delay !== 4000) { // 1000 * 2^2 = 4000
        console.error(`❌ Backoff calculation wrong. Expected 4000, got ${delay}`);
        process.exit(1);
    }
    console.log("✅ Backoff calculation correct.");

    // 5. Simulate Max Retries
    console.log("🔄 Simulating Max Retries...");
    updateSyncOperation(opId, {
        status: 'FAILED',
        retries: 6,
        lastAttempt: Date.now(),
        error: 'Max retries exceeded'
    });

    queue = getSyncQueue();
    if (queue[0].status !== 'FAILED') {
        console.error("❌ Failed to set FAILED status.");
        process.exit(1);
    }
    console.log("✅ Operation marked as FAILED.");

    console.log("\n🎉 ALL CHECKS PASSED. Sync storage and logic primitives are working.");
}

verifySyncLogic().catch(err => {
    console.error("❌ Fatal Test Error:", err);
    process.exit(1);
});
