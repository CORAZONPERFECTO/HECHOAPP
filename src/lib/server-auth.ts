import { NextRequest, NextResponse } from "next/server";
import * as admin from "firebase-admin";

/**
 * Autenticación centralizada para rutas API (servidor).
 * Una sola implementación: cada ruta protegida llama a `requireAuth(req, roles)`.
 * Los roles se leen de Firestore (users/{uid}), nunca del cliente.
 */

export const STAFF_ROLES = ["ADMIN", "GERENTE", "GERENTE_TICKETS", "SUPERVISOR", "TECNICO", "CONTRATISTA"] as const;
export const MANAGER_ROLES = ["ADMIN", "GERENTE", "GERENTE_TICKETS", "SUPERVISOR"] as const;

// Mismo criterio que firestore.rules (isManager/isStaff). Pendiente P2: moverlo a custom claim.
const SUPER_ADMIN_EMAIL = (process.env.SUPER_ADMIN_EMAIL || "lcaa27@gmail.com").toLowerCase();

// Hosts desde los que el servidor puede descargar imágenes (evita SSRF).
const ALLOWED_IMAGE_HOSTS = [
    "firebasestorage.googleapis.com",
    "storage.googleapis.com",
    "lh3.googleusercontent.com",
];

export function getAdminApp(): admin.app.App {
    if (!admin.apps.length) {
        const privateKey = process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, "\n");
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.GCP_PROJECT_ID,
                clientEmail: process.env.GCP_CLIENT_EMAIL,
                privateKey,
            } as admin.ServiceAccount),
        });
    }
    return admin.app();
}

export interface AuthContext {
    uid: string;
    email: string | null;
    role: string;
}

type AuthResult = { ok: true; ctx: AuthContext } | { ok: false; response: NextResponse };

/**
 * Verifica un ID token de Firebase y comprueba el rol. Núcleo compartido entre
 * rutas API (token en header Authorization) y server actions (token como parámetro).
 */
export async function requireAuthToken(
    token: string | null | undefined,
    allowedRoles: readonly string[] = STAFF_ROLES
): Promise<AuthResult> {
    const deny = (status: number, error: string): AuthResult => ({
        ok: false,
        response: NextResponse.json({ error }, { status }),
    });

    if (!token) return deny(401, "No autenticado.");

    try {
        const app = getAdminApp();
        const decoded = await admin.auth(app).verifyIdToken(token);
        const email = decoded.email ? decoded.email.toLowerCase() : null;

        let role = "";
        if (email && email === SUPER_ADMIN_EMAIL) {
            role = "ADMIN";
        } else {
            const snap = await admin.firestore(app).collection("users").doc(decoded.uid).get();
            const data = snap.exists ? snap.data() : null;
            role = String(data?.rol || data?.role || "");
            if (data && data.activo === false) return deny(403, "Usuario desactivado.");
        }

        if (!allowedRoles.includes(role)) return deny(403, "Sin permisos para esta acción.");
        return { ok: true, ctx: { uid: decoded.uid, email, role } };
    } catch {
        return deny(401, "Sesión inválida o expirada.");
    }
}

/** Para rutas API: lee el Bearer token del header y devuelve contexto o respuesta 401/403. */
export async function requireAuth(
    req: Request | NextRequest,
    allowedRoles: readonly string[] = STAFF_ROLES
): Promise<AuthResult> {
    const header = req.headers.get("authorization") || "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    return requireAuthToken(token, allowedRoles);
}

/** True solo si la URL es https y su host está en la lista permitida. */
export function isAllowedImageUrl(raw: string): boolean {
    try {
        const u = new URL(raw);
        return u.protocol === "https:" && ALLOWED_IMAGE_HOSTS.includes(u.hostname);
    } catch {
        return false;
    }
}
