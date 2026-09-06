export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
    try {
        const privateKey = process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, "\n");
        if (privateKey) {
            const serviceAccount = {
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.GCP_PROJECT_ID,
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

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        if (!id) {
            return NextResponse.json({ error: "ID requerido" }, { status: 400 });
        }

        const db = admin.firestore();

        // 1. Obtener documento de la villa / location
        const locSnap = await db.collection("locations").doc(id).get();
        if (!locSnap.exists) {
            return NextResponse.json({ error: "Villa no encontrada" }, { status: 404 });
        }

        const locationData = { id: locSnap.id, ...locSnap.data() };

        // 2. Obtener tickets vinculados a esta villa
        let tickets: any[] = [];
        try {
            const ticketsSnap = await db.collection("tickets").where("locationId", "==", id).get();
            tickets = ticketsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Fallback por nombre si no tiene locationId asignado
            if (tickets.length === 0 && (locationData as any).clientId) {
                const clientTickets = await db.collection("tickets").where("clientId", "==", (locationData as any).clientId).get();
                const locName = ((locationData as any).nombre || "").toLowerCase();
                tickets = clientTickets.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .filter((t: any) => {
                        const tLoc = (t.locationName || t.specificLocation || "").toLowerCase();
                        return tLoc.includes(locName) || locName.includes(tLoc);
                    });
            }
        } catch (e) {
            console.error("Error fetching tickets for villa API:", e);
        }

        return NextResponse.json({
            location: locationData,
            tickets: tickets
        });
    } catch (error: any) {
        console.error("Villa Care Pass API error:", error);
        return NextResponse.json({ error: error.message || "Error interno del servidor" }, { status: 500 });
    }
}
