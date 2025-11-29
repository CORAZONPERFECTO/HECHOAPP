import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { UserRole, ClientType, EquipmentType } from "../types/schema";

const db = admin.firestore();

export const seedDatabase = functions.https.onRequest(async (req, res) => {
    try {
        const batch = db.batch();

        // 1. Create Users
        const users = [
            { id: "admin_user", email: "admin@hecho.com", role: "ADMIN", name: "Admin Principal" },
            { id: "coord_user", email: "coord@hecho.com", role: "COORDINADOR", name: "Coordinador Operaciones" },
            { id: "tech_user_1", email: "tech1@hecho.com", role: "TECNICO", name: "Juan Técnico" },
        ];

        for (const u of users) {
            const userRef = db.collection("users").doc(u.id);
            batch.set(userRef, {
                id: u.id,
                nombre: u.name,
                email: u.email,
                telefono: "809-555-0000",
                rol: u.role as UserRole,
                activo: true,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }

        // 2. Create Clients
        const clients = [
            { id: "client_hotel", name: "Hotel Paradise", type: "HOTEL" },
            { id: "client_res", name: "Residencial Torre Alta", type: "RESIDENCIAL" },
        ];

        for (const c of clients) {
            const clientRef = db.collection("clients").doc(c.id);
            batch.set(clientRef, {
                id: c.id,
                nombreComercial: c.name,
                tipoCliente: c.type as ClientType,
                personaContacto: "Gerente",
                telefonoContacto: "809-555-1234",
                emailContacto: "contacto@cliente.com",
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }

        // 3. Create Locations & Equipment
        const locRef = db.collection("locations").doc();
        batch.set(locRef, {
            id: locRef.id,
            clientId: "client_hotel",
            nombre: "Lobby Principal",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        const equipRef = db.collection("equipment").doc();
        batch.set(equipRef, {
            id: equipRef.id,
            clientId: "client_hotel",
            locationId: locRef.id,
            marca: "Carrier",
            modelo: "X-1000",
            numeroSerie: "SN123456",
            capacidadBTU: "60000",
            tipoEquipo: "CHILLER" as EquipmentType,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        await batch.commit();
        res.send({ success: true, message: "Database seeded successfully" });
    } catch (error) {
        console.error("Seeding error:", error);
        res.status(500).send({ error: "Seeding failed" });
    }
});
