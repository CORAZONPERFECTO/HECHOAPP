
import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import * as fs from 'fs';

// Load .env.local (optional now, but good to keep)
dotenv.config({ path: resolve(__dirname, '../.env.local') });

// Load credentials directly from JSON file to avoid parsing issues
const serviceAccountPath = resolve(__dirname, './temp-sa.json');
if (!fs.existsSync(serviceAccountPath)) {
    console.error(`Service account file not found at ${serviceAccountPath}`);
    process.exit(1);
}

// Load credentials
const serviceAccount = require(serviceAccountPath);

// Aggressive cleanup: Rebuild the private key
let keyBody = serviceAccount.private_key;
// Remove headers
keyBody = keyBody.replace(/-----BEGIN PRIVATE KEY-----/g, '').replace(/-----END PRIVATE KEY-----/g, '');
// Keep only valid base64 chars
keyBody = keyBody.replace(/[^a-zA-Z0-9+/=]/g, '');

// Reconstruct properly
const finalKey = `-----BEGIN PRIVATE KEY-----\n${keyBody}\n-----END PRIVATE KEY-----\n`;
serviceAccount.private_key = finalKey;

console.log('Refined Key Length:', finalKey.length);

// Initialize Admin
if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } catch (e) {
        console.error("Init Error:", e);
        process.exit(1);
    }
}

// Clean up immediately after init (or at end)? 
// Usually GoogleAuth loads it into memory.
// But to be safe, delete at end.

const db = admin.firestore();

interface ACError {
    brand: string;
    errorCode: string;
    symptom: string;
    cause: string;
    solution: string;
    criticality: 'BAJA' | 'MEDIA' | 'ALTA';
    tags: string[];
    createdAt: any;
    updatedAt: any;
}

// Load errors from JSON file
const errorsPath = resolve(__dirname, '../errores_multimarca_hecho.json');
if (!fs.existsSync(errorsPath)) {
    console.error(`Error file not found at ${errorsPath}`);
    process.exit(1);
}
const rawErrors = fs.readFileSync(errorsPath, 'utf-8');
const jsonErrors = JSON.parse(rawErrors);

// Map JSON to ACError interface structure
const ERRORS = jsonErrors.map((e: any) => ({
    code: e.codigo,
    desc: e.descripcion_es,
    cause: e.causa_probable,
    sol: e.solucion_recomendada,
    brand: e.marca
}));

async function seed() {
    console.log(`Starting seed for ${ERRORS.length} errors...`);
    const collectionRef = db.collection('acErrors');
    const batchSize = 500; // Firestore batch limit works fine as we have < 200 items

    const batch = db.batch();

    for (const err of ERRORS) {
        // Create ID based on Brand and Code to prevent duplicates
        const docId = `${err.brand}_${err.code}`.replace(/[^a-zA-Z0-9_]/g, '');
        const docRef = collectionRef.doc(docId);

        const payload = {
            brand: err.brand,
            errorCode: err.code,
            symptom: err.desc,
            cause: err.cause,
            solution: err.sol,
            criticality: 'MEDIA', // Default
            tags: [],
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            validationStatus: 'VALIDADO'
        };
        batch.set(docRef, payload, { merge: true }); // Merge updates existing
    }

    await batch.commit();
    console.log('Seeding complete!');
    process.exit(0);
}

seed().catch(e => {
    console.error(e);
    process.exit(1);
});
