export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import * as admin from "firebase-admin";
import { getAdminApp, requireAuth } from "@/lib/server-auth";

// Campos internos/financieros que NUNCA deben llegar al portal público del propietario.
const PRIVATE_LOCATION_FIELDS = ["clientId", "retentionPolicyReviewedAt", "retentionDecision"];
const PRIVATE_TICKET_FIELDS = [
    "revenue", "profitMargin", "totalCost", "materialsCost", "otherCosts", "laborHours", "laborRate",
    "assignedMileageKm", "vehicleMileageCost", "vehiclePlate", "startMileage", "endMileage",
    "linkedInvoiceId", "billingStatus", "executionOrder", "creadoPorId", "technicianId",
    "tecnicoAsignadoId", "clientId", "surveyBudget", "slaResponseDeadline", "slaResolutionDeadline",
    "firstResponseAt", "schedulingNote",
];
const PRIVATE_VISIT_FIELDS = ["technicianId", "startMileage", "endMileage"];

function omit<T extends Record<string, any>>(obj: T, keys: string[]): Record<string, any> {
    const copy: Record<string, any> = { ...obj };
    for (const k of keys) delete copy[k];
    return copy;
}

function sanitizeTicket(t: Record<string, any>) {
    const clean = omit(t, PRIVATE_TICKET_FIELDS);
    if (Array.isArray(clean.visits)) {
        clean.visits = clean.visits.map((v: Record<string, any>) => omit(v, PRIVATE_VISIT_FIELDS));
    }
    return clean;
}

/**
 * Datos de una villa + sus tickets.
 * - Con sesión de personal: [id] = ID interno de la villa → datos completos.
 * - Sin sesión (propietario): [id] = publicCode → datos saneados. El ID interno NUNCA da acceso público.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        if (!id) {
            return NextResponse.json({ error: "ID requerido" }, { status: 400 });
        }

        const db = admin.firestore(getAdminApp());
        const staff = await requireAuth(req);
        const isStaff = staff.ok;

        let locSnap: admin.firestore.DocumentSnapshot | null = null;

        if (isStaff) {
            const byId = await db.collection("locations").doc(id).get();
            if (byId.exists) locSnap = byId;
        }
        if (!locSnap) {
            const byCode = await db.collection("locations").where("publicCode", "==", id).limit(1).get();
            if (!byCode.empty) locSnap = byCode.docs[0];
        }
        if (!locSnap) {
            return NextResponse.json({ error: "Villa no encontrada" }, { status: 404 });
        }

        const rawLocation = { id: locSnap.id, ...locSnap.data() } as Record<string, any>;
        const locationData = isStaff ? rawLocation : omit(rawLocation, PRIVATE_LOCATION_FIELDS);

        // Tickets vinculados a esta villa
        let tickets: any[] = [];
        try {
            const ticketsSnap = await db.collection("tickets").where("locationId", "==", locSnap.id).get();
            tickets = ticketsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Fallback por nombre si no tiene locationId asignado
            if (tickets.length === 0 && rawLocation.clientId) {
                const clientTickets = await db.collection("tickets").where("clientId", "==", rawLocation.clientId).get();
                const locName = String(rawLocation.nombre || "").toLowerCase();
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
            tickets: isStaff ? tickets : tickets.map(sanitizeTicket),
        });
    } catch (error: any) {
        console.error("Villa Care Pass API error:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}
