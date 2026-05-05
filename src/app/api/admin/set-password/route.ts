export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK (singleton pattern)
if (!admin.apps.length) {
    try {
        const privateKey = process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, "\n");
        if (privateKey) {
            const serviceAccount = {
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                clientEmail: process.env.GCP_CLIENT_EMAIL,
                privateKey: privateKey,
            };

            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
            });
        }
    } catch (error) {
        console.warn("Failed to initialize Firebase Admin during build:", error);
    }
}

export async function POST(req: NextRequest) {
    try {
        const { uid, newPassword } = await req.json();

        if (!uid || !newPassword) {
            return NextResponse.json(
                { error: "UID y nueva contraseña son requeridos." },
                { status: 400 }
            );
        }

        if (newPassword.length < 6) {
            return NextResponse.json(
                { error: "La contraseña debe tener al menos 6 caracteres." },
                { status: 400 }
            );
        }

        // Use Firebase Admin SDK to update password directly (no email required)
        await admin.auth().updateUser(uid, { password: newPassword });

        return NextResponse.json({ success: true, message: "Contraseña actualizada correctamente." });

    } catch (error: any) {
        console.error("Error updating password:", error);

        if (error.code === "auth/user-not-found") {
            return NextResponse.json(
                { error: "Usuario no encontrado en Firebase Auth." },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { error: error.message || "Error interno al cambiar la contraseña." },
            { status: 500 }
        );
    }
}
