export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import * as admin from "firebase-admin";
import { requireAuth, MANAGER_ROLES } from "@/lib/server-auth";

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
        const authz = await requireAuth(req, MANAGER_ROLES);
        if (!authz.ok) return authz.response;

        const { uid, newPassword, newEmail, displayName } = await req.json();

        if (!uid) {
            return NextResponse.json(
                { error: "UID es requerido." },
                { status: 400 }
            );
        }

        // Solo un ADMIN puede modificar la cuenta de otro ADMIN (evita escalada por un gerente).
        if (authz.ctx.role !== "ADMIN" && uid !== authz.ctx.uid) {
            const target = await admin.firestore().collection("users").doc(uid).get();
            const targetRole = String(target.data()?.rol || target.data()?.role || "");
            if (targetRole === "ADMIN") {
                return NextResponse.json({ error: "Solo un ADMIN puede modificar a otro ADMIN." }, { status: 403 });
            }
        }

        const updatePayload: any = {};
        if (newPassword) {
            if (newPassword.length < 6) {
                return NextResponse.json(
                    { error: "La contraseña debe tener al menos 6 caracteres." },
                    { status: 400 }
                );
            }
            updatePayload.password = newPassword;
        }

        if (newEmail) {
            updatePayload.email = newEmail.trim().toLowerCase();
        }

        if (displayName) {
            updatePayload.displayName = displayName;
        }

        if (Object.keys(updatePayload).length > 0) {
            await admin.auth().updateUser(uid, updatePayload);
        }

        // Keep Firestore in sync
        if (newEmail || displayName) {
            const firestoreUpdate: any = {
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            };
            if (newEmail) firestoreUpdate.email = newEmail.trim().toLowerCase();
            if (displayName) {
                firestoreUpdate.nombre = displayName;
                firestoreUpdate.displayName = displayName;
            }
            await admin.firestore().collection("users").doc(uid).set(firestoreUpdate, { merge: true });
        }

        return NextResponse.json({ success: true, message: "Datos actualizados correctamente en Auth y Base de Datos." });

    } catch (error: any) {
        console.error("Error updating user auth:", error);

        if (error.code === "auth/user-not-found") {
            return NextResponse.json(
                { error: "Usuario no encontrado en Firebase Auth." },
                { status: 404 }
            );
        }

        if (error.code === "auth/email-already-exists") {
            return NextResponse.json(
                { error: "El correo electrónico ya está registrado con otra cuenta." },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: error.message || "Error interno al actualizar datos del usuario." },
            { status: 500 }
        );
    }
}
