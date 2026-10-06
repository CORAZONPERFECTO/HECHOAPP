export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import * as admin from "firebase-admin";
import { getAdminApp, requireAuth, MANAGER_ROLES } from "@/lib/server-auth";

// Alfabeto sin caracteres ambiguos (0/O, 1/I): 32^10 ≈ 10^15 combinaciones.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 10;

function generateCode(): string {
    const bytes = randomBytes(CODE_LENGTH);
    let out = "";
    for (let i = 0; i < CODE_LENGTH; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
    return `VC-${out}`;
}

/**
 * Obtiene (o crea) el ID público de una villa. Idempotente.
 * Body opcional { regenerate: true } revoca el enlace anterior (solo gerentes).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const authz = await requireAuth(req);
        if (!authz.ok) return authz.response;

        const { id } = await params;
        const body = await req.json().catch(() => ({}));
        const regenerate = body?.regenerate === true;

        if (regenerate && !(MANAGER_ROLES as readonly string[]).includes(authz.ctx.role)) {
            return NextResponse.json({ error: "Solo gerentes pueden regenerar el enlace." }, { status: 403 });
        }

        const db = admin.firestore(getAdminApp());
        const ref = db.collection("locations").doc(id);
        const snap = await ref.get();
        if (!snap.exists) {
            return NextResponse.json({ error: "Villa no encontrada" }, { status: 404 });
        }

        const existing = snap.data()?.publicCode as string | undefined;
        if (existing && !regenerate) {
            return NextResponse.json({ publicCode: existing });
        }

        // Garantiza unicidad (colisión prácticamente imposible, pero barato de verificar).
        let code = generateCode();
        for (let i = 0; i < 5; i++) {
            const clash = await db.collection("locations").where("publicCode", "==", code).limit(1).get();
            if (clash.empty) break;
            code = generateCode();
        }

        await ref.set({ publicCode: code, publicCodeUpdatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        return NextResponse.json({ publicCode: code });
    } catch (error) {
        console.error("Villa public-code error:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}
