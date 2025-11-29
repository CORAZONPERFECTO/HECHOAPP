import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Ticket, TicketStatus, TicketOrigin, EventType, TicketPriority, ServiceType } from "../types/schema";

const db = admin.firestore();

interface CreateTicketData {
    channel: TicketOrigin;
    nombreCliente: string;
    numeroContacto: string; // WhatsApp number or phone
    mensajeInicial: string;
    externalId?: string; // WhatsApp Message ID or similar
}

/**
 * Creates a ticket from an external channel (e.g., WhatsApp, Mobile App).
 * This function is designed to be called via HTTPS or directly from other internal functions.
 */
export const createTicketFromChannel = functions.https.onCall(async (data: CreateTicketData, context) => {
    // 1. Validate Input
    if (!data.channel || !data.nombreCliente || !data.mensajeInicial) {
        throw new functions.https.HttpsError("invalid-argument", "Missing required fields: channel, nombreCliente, mensajeInicial");
    }

    try {
        // 2. Find or Create Client (Simplified logic: match by phone)
        // In a real scenario, we might want more complex matching or creation logic.
        let clientId = "UNKNOWN_CLIENT";
        const clientsRef = db.collection("clients");
        const clientQuery = await clientsRef.where("telefonoContacto", "==", data.numeroContacto).limit(1).get();

        if (!clientQuery.empty) {
            clientId = clientQuery.docs[0].id;
        } else {
            // Create a temporary/new client
            const newClientRef = await clientsRef.add({
                nombreComercial: data.nombreCliente,
                tipoCliente: "RESIDENCIAL", // Default
                personaContacto: data.nombreCliente,
                telefonoContacto: data.numeroContacto,
                emailContacto: "",
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            clientId = newClientRef.id;
        }

        // 3. Generate Ticket Code (Simple Counter or Random for now)
        // Ideally, use a distributed counter or transaction.
        const ticketCount = (await db.collection("tickets").count().get()).data().count;
        const code = `TCK-2025-${String(ticketCount + 1).padStart(4, "0")}`;

        // 4. Create Ticket
        const newTicket: Partial<Ticket> = {
            codigo: code,
            titulo: `Nuevo ticket de ${data.nombreCliente}`,
            descripcion: data.mensajeInicial,
            prioridad: "MEDIA",
            estado: "ABIERTO" as TicketStatus,
            tipoServicio: "MANTENIMIENTO", // Default
            origen: data.channel,
            clientId,
            locationId: "PENDING", // Needs triage
            creadoPorId: context.auth?.uid || "SYSTEM",
            canalContactoDetalle: data.numeroContacto,
            externalConversationId: data.externalId,
            createdAt: admin.firestore.FieldValue.serverTimestamp() as any,
            updatedAt: admin.firestore.FieldValue.serverTimestamp() as any,
        };

        const ticketRef = await db.collection("tickets").add(newTicket);

        // 5. Create Initial Event
        await db.collection("ticketEvents").add({
            ticketId: ticketRef.id,
            usuarioId: context.auth?.uid || "SYSTEM",
            tipoEvento: "CREACION" as EventType,
            descripcion: `Ticket creado desde ${data.channel}`,
            fechaEvento: admin.firestore.FieldValue.serverTimestamp(),
        });

        return { success: true, ticketId: ticketRef.id, code };
    } catch (error) {
        console.error("Error creating ticket:", error);
        throw new functions.https.HttpsError("internal", "Failed to create ticket");
    }
});

interface CreateTicketInternalData {
    titulo: string;
    descripcion: string;
    prioridad: TicketPriority;
    tipoServicio: ServiceType;
    clientId: string;
    locationId: string;
    equipmentId?: string;
    tecnicoAsignadoId?: string;
}

export const createTicket = functions.https.onCall(async (data: CreateTicketInternalData, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be logged in");
    }

    try {
        const ticketCount = (await db.collection("tickets").count().get()).data().count;
        const code = `TCK-2025-${String(ticketCount + 1).padStart(4, "0")}`;

        const newTicket: Partial<Ticket> = {
            codigo: code,
            titulo: data.titulo,
            descripcion: data.descripcion,
            prioridad: data.prioridad,
            estado: "ABIERTO",
            tipoServicio: data.tipoServicio,
            origen: "LLAMADA", // Default for internal creation
            clientId: data.clientId,
            locationId: data.locationId,
            equipmentId: data.equipmentId,
            tecnicoAsignadoId: data.tecnicoAsignadoId,
            creadoPorId: context.auth.uid,
            createdAt: admin.firestore.FieldValue.serverTimestamp() as any,
            updatedAt: admin.firestore.FieldValue.serverTimestamp() as any,
        };

        const ticketRef = await db.collection("tickets").add(newTicket);

        await db.collection("ticketEvents").add({
            ticketId: ticketRef.id,
            usuarioId: context.auth.uid,
            tipoEvento: "CREACION",
            descripcion: "Ticket creado manualmente por usuario",
            fechaEvento: admin.firestore.FieldValue.serverTimestamp(),
        });

        return { success: true, ticketId: ticketRef.id, code };
    } catch (error) {
        console.error("Error creating ticket:", error);
        throw new functions.https.HttpsError("internal", "Failed to create ticket");
    }
});
