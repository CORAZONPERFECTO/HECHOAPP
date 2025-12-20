import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Reuse the working configuration
const serviceAccountPath = resolve(__dirname, './temp-sa.json');
const serviceAccount = require(serviceAccountPath);

// Sanitize again (copy-paste logic to be safe)
let keyBody = serviceAccount.private_key;
keyBody = keyBody.replace(/-----BEGIN PRIVATE KEY-----/g, '').replace(/-----END PRIVATE KEY-----/g, '');
keyBody = keyBody.replace(/[^a-zA-Z0-9+/=]/g, '');
const finalKey = `-----BEGIN PRIVATE KEY-----\n${keyBody}\n-----END PRIVATE KEY-----\n`;
serviceAccount.private_key = finalKey;

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function verify() {
    console.log('Verifying acErrors collection...');
    const snapshot = await db.collection('acErrors').limit(5).get();
    if (snapshot.empty) {
        console.error('No documents found!');
        process.exit(1);
    }

    console.log(`Found ${snapshot.size} sample documents.`);
    snapshot.docs.forEach(doc => {
        console.log(`- ${doc.id}: ${JSON.stringify(doc.data())}`);
    });
    console.log('Verification successful.');
}

verify().catch(console.error);
