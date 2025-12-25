import * as admin from 'firebase-admin';

const db = admin.firestore();

export interface JobData {
    type: "EXTRACT_PAYMENT_PROOF";
    ticketId: string;
    paymentId: string;
    input: {
        proofStoragePath: string;
        mimeType: string;
    };
}

export interface JobDocument extends JobData {
    status: "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "RETRY";
    createdAt: admin.firestore.Timestamp;
    attempts: number;
    maxAttempts: number;
    error?: { message: string };
    result?: any;
}

const PY_WORKER_URL = process.env.PY_WORKER_URL || "http://127.0.0.1:8000";
const PY_WORKER_TOKEN = process.env.PY_WORKER_TOKEN || "dev-token";

/**
 * Creates a job in Firestore and attempts to dispatch it to the worker.
 */
export async function createAndDispatchJob(orgId: string, jobData: JobData) {
    console.log(`Creating job ${jobData.type} for payment ${jobData.paymentId}`);

    const jobRef = db.collection(`orgs/${orgId}/jobs`).doc();

    const newJob: JobDocument = {
        ...jobData,
        status: 'QUEUED',
        createdAt: admin.firestore.Timestamp.now(),
        attempts: 0,
        maxAttempts: 3
    };

    await jobRef.set(newJob);

    // NON-BLOCKING Dispatch
    // We don't await the result of the dispatch to keep the trigger fast.
    // The worker will update the job status.
    dispatchJobToWorker(orgId, jobRef.id).catch(err => {
        console.error(`Failed to dispatch job ${jobRef.id}:`, err);
    });

    return jobRef.id;
}

/**
 * Sends the HTTP request to the Python Worker
 */
export async function dispatchJobToWorker(orgId: string, jobId: string) {
    const url = `${PY_WORKER_URL}/v1/jobs/run`;

    console.log(`Dispatching job ${jobId} to ${url}`);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${PY_WORKER_TOKEN}`
            },
            body: JSON.stringify({
                orgId,
                jobId
            })
        });

        if (!response.ok) {
            throw new Error(`Worker responded with ${response.status}: ${await response.text()}`);
        }

        console.log(`Job ${jobId} dispatched successfully.`);
        return true;

    } catch (error) {
        console.error(`Error dispatching job ${jobId}:`, error);
        // We could update retry count here if we wanted strict guarantee, 
        // but for now we rely on the worker eventually picking it up or manual retry.
        throw error;
    }
}
