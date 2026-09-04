"use server";

import admin from "firebase-admin";

function getAdminAuth() {
    if (!admin.apps.length) {
        const privateKey = process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, "\n");
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "hecho-srl-free",
                clientEmail: process.env.GCP_CLIENT_EMAIL,
                privateKey: privateKey,
            }),
        });
    }
    return {
        auth: admin.auth(),
        db: admin.firestore()
    };
}

export async function loginAsAdminUser(targetEmail: string = "lcaa27@gmail.com") {
    try {
        const email = targetEmail.trim().toLowerCase();
        const { auth, db } = getAdminAuth();

        let userRecord;
        try {
            userRecord = await auth.getUserByEmail(email);
        } catch (err: any) {
            if (err.code === "auth/user-not-found") {
                userRecord = await auth.createUser({
                    email: email,
                    displayName: "Admin Principal (HECHO SRL)",
                    emailVerified: true
                });
            } else {
                throw err;
            }
        }

        const userDocRef = db.collection("users").doc(userRecord.uid);
        await userDocRef.set({
            uid: userRecord.uid,
            email: email,
            displayName: userRecord.displayName || "Admin Principal",
            rol: "ADMIN",
            role: "ADMIN",
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        const customToken = await auth.createCustomToken(userRecord.uid, {
            role: "ADMIN",
            email: email
        });

        return {
            success: true,
            customToken,
            email: userRecord.email,
            uid: userRecord.uid
        };
    } catch (error: any) {
        console.error("Error generating quick admin login token:", error);
        return {
            success: false,
            error: error.message || "Error al generar sesión administrativa"
        };
    }
}
