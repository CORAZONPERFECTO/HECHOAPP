import * as dotenv from 'dotenv';
import { resolve } from 'path';
import * as admin from 'firebase-admin';

// Load .env.local
dotenv.config({ path: resolve(__dirname, '../.env.local') });

const rawKey = process.env.GCP_PRIVATE_KEY || '';
console.log('Raw Key Length:', rawKey.length);
console.log('Contains \\r?', rawKey.includes('\r'));
const privateKey = rawKey.replace(/\\n/g, '\n').replace(/"/g, '');

console.log('Processed Key Length:', privateKey.length);

const saData = {
    projectId: process.env.GCP_PROJECT_ID,
    clientEmail: process.env.GCP_CLIENT_EMAIL,
    privateKey: privateKey,
};

try {
    const cert = admin.credential.cert(saData);
    console.log('Credential created successfully!');
} catch (e) {
    console.error('Credential creation failed:', e);
}
