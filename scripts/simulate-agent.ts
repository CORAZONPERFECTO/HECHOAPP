import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';

// Load Env
dotenv.config({ path: '.env.local' });

// Initialize Admin
// NOTE: Requires SERVICE_ACCOUNT_KEY json or proper env setup.
// For dev context, assuming default creds or emulation if running locally.
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!admin.apps.length) {
    if (serviceAccountPath) {
        const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } else {
        admin.initializeApp();
    }
}

const db = admin.firestore();

async function simulateAgentFlow() {
    const ORG_ID = 'demo-org';
    const TICKET_ID = 'SIM-TICKET-' + Date.now();

    console.log(`🚀 Starting Simulation: Ticket ${TICKET_ID}`);

    // 1. Create a Mock Ticket
    const ticketRef = db.doc(`orgs/${ORG_ID}/tickets/${TICKET_ID}`);
    await ticketRef.set({
        ticketNumber: 'SIM-001',
        serviceStatus: 'DIAGNOSIS_IN_PROGRESS',
        clientName: 'Simulated Client',
        description: 'Testing Agent Flow',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`[x] Created Ticket: DIAGNOSIS_IN_PROGRESS`);

    // 2. Simulate Evidence Upload (Trigger Draft)
    console.log(`\n--- Simulating Evidence Upload ---`);
    await ticketRef.collection('evidence').add({
        type: 'DIAGNOSIS',
        url: 'https://mock.com/evidence.jpg',
        description: 'Compressor failure detected',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`[x] Evidence Uploaded. Waiting for Agent Run...`);

    // NOTE: In a real simulation, we'd poll 'agentRuns', but locally the Trigger function won't run 
    // unless using "firebase emulators:start".

    // 3. Simulate WhatsApp Message (Trigger Webhook Logic)
    console.log(`\n--- Simulating WhatsApp Message ---`);
    // Need a conversation Doc first
    const convRef = db.collection('conversations').doc();
    await convRef.set({
        ticketId: TICKET_ID,
        orgId: ORG_ID,
        status: 'ACTIVE',
        participantPhones: ['15551234567'],
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`[x] Conversation setup ${convRef.id}`);

    // Note: We can't easily invoke the HTTPS function from here without `fetch`.
    // Instead we can simulate what the function DOES: write to `messages` and `agentRuns`.
    // But better to verify the Logic by writing a message and checking logic?
    // Actually, calling the URL of the emulator is best.

    console.log(`\n⚠️ Simulation Complete (Data Setup Only).`);
    console.log(`To verify triggers, run: firebase emulators:start --only functions,firestore`);
    console.log(`Then check the Firestore Emulator or Agent Logs.`);
}

simulateAgentFlow().catch(console.error);
