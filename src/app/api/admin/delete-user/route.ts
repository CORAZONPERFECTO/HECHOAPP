export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK
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
        console.warn("Failed to initialize Firebase Admin:", error);
    }
}

export async function POST(req: NextRequest) {
    try {
        const { uid } = await req.json();

        if (!uid) {
            return NextResponse.json({ error: "UID requerido." }, { status: 400 });
        }

        // 1. Borrar de Firebase Auth (si existe)
        try {
            await admin.auth().deleteUser(uid);
            console.log("Usuario borrado de Auth:", uid);
        } catch (authError: any) {
            // Si el usuario no existe en Auth, no importa, seguimos para borrarlo de Firestore
            if (authError.code !== "auth/user-not-found") {
                console.error("Error al borrar de Auth:", authError);
            }
        }

        // 2. Borrar de Firestore
        await admin.firestore().collection("users").doc(uid).delete();
        console.log("Usuario borrado de Firestore:", uid);

        return NextResponse.json({ success: true, message: "Usuario eliminado completamente del sistema." });

    } catch (error: any) {
        console.error("Error deleting user:", error);
        return NextResponse.json(
            { error: error.message || "Error interno al eliminar el usuario." },
            { status: 500 }
        );
    }
}
