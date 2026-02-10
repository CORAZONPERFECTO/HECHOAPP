
import * as admin from 'firebase-admin';
import { getAuth, signInWithCustomToken } from 'firebase/auth';
import { initializeApp, getApps } from 'firebase/app';
import * as dotenv from 'dotenv';
import { db as clientDb } from '../src/lib/firebase'; // Ensure client app is inited

dotenv.config({ path: ".env.local" });

export async function setupAuth() {
    // 1. Initialize Admin SDK if not already
    if (admin.apps.length === 0) {
        // Handle escaped newlines in private key
        let privateKey = process.env.GCP_PRIVATE_KEY || "";
        if (privateKey.includes("\\n")) {
            privateKey = privateKey.split("\\n").join("\n");
        }
        // Handle escaped slashes which are common in JSON-formatted keys
        if (privateKey.includes("\\/")) {
            privateKey = privateKey.replace(/\\\//g, '/');
        }

        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.GCP_PROJECT_ID,
                clientEmail: process.env.GCP_CLIENT_EMAIL,
                privateKey: privateKey,
            })
        });
    }

    // 2. Create Custom Token for an Admin User
    // Use an email that matches the 'isAdmin' rule if possible, or just a random one with explicit claims if rules allow.
    // The rules check: request.auth.token.email == 'lcaa27@gmail.com' || hasRole('ADMIN')
    // We'll simulate lcaa27@gmail.com to get full access
    const uid = "verification-script-admin";
    const customToken = await admin.auth().createCustomToken(uid, {
        email: 'lcaa27@gmail.com',  // This bypasses isAdmin() check
        role: 'ADMIN'               // Double safety
    });

    // 3. Sign in Client SDK
    const auth = getAuth(); // Uses the default client app initialized in src/lib/firebase
    await signInWithCustomToken(auth, customToken);

    console.log("🔐 Authenticated as Admin via Custom Token");
    return { admin, clientAuth: auth };
}
