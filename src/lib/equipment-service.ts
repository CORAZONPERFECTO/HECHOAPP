import { db } from "@/lib/firebase";
import {
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    setDoc,
    updateDoc,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp,
    Timestamp
} from "firebase/firestore";
import {
    EquipmentPassport,
    EquipmentIntervention,
    EquipmentSpecs,
    EquipmentStatus,
    PropertyLocation
} from "@/types/equipment";
import { SurveyArea, Ticket } from "@/types/tickets";

export const COLL_EQUIPMENT = "equipment";
export const COLL_LOCATIONS = "locations";
export const COLL_INTERVENTIONS = "interventions";

/**
 * Genera un código legible e inmutable para el equipo (ej: EQ-00184)
 */
export function generateEquipmentCode(existingCount = 0): string {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const counter = existingCount > 0 ? String(existingCount + 1).padStart(4, "0") : String(randomSuffix);
    return `EQ-${counter}`;
}

/**
 * Genera un código legible e inmutable para la propiedad (ej: PROP-00042)
 */
export function generatePropertyCode(existingCount = 0): string {
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const counter = existingCount > 0 ? String(existingCount + 1).padStart(4, "0") : String(randomSuffix);
    return `PROP-${counter}`;
}

/**
 * Genera un token aleatorio y seguro para el QR
 */
export function generateQrToken(code: string): string {
    const cleanCode = code.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    const entropy = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${cleanCode}-${entropy}`;
}

/**
 * Normaliza un documento de Firestore a la interfaz EquipmentPassport
 */
export function mapDocToEquipment(id: string, data: any): EquipmentPassport {
    const specs: EquipmentSpecs = {
        brand: data.specs?.brand || data.marca || "Genérica",
        model: data.specs?.model || data.modelo || "",
        serialNumber: data.specs?.serialNumber || data.numeroSerie || "",
        btu: data.specs?.btu || data.capacidadBTU || 18000,
        voltage: data.specs?.voltage || data.voltaje || "220V",
        refrigerant: data.specs?.refrigerant || data.refrigerante || "R410A",
        type: data.specs?.type || data.tipoEquipo || "SPLIT_INVERTER",
        pipeDistanceMeters: data.specs?.pipeDistanceMeters || data.pipeDistanceMeters,
        electricalStatus: data.specs?.electricalStatus || data.electricalStatus,
        drainStatus: data.specs?.drainStatus || data.drainStatus
    };

    const code = data.code || data.codigo || `EQ-${id.slice(0, 5).toUpperCase()}`;
    const qrToken = data.qrToken || data.qrCode || code;

    return {
        id,
        code,
        qrToken,
        qrCode: qrToken,
        clientId: data.clientId || "",
        clientName: data.clientName || "",
        locationId: data.locationId || data.villaId || "",
        villaId: data.villaId || data.locationId || "",
        locationName: data.locationName || "",
        locationArea: data.locationArea || "",
        areaId: data.areaId || "",
        areaName: data.areaName || data.name || data.nombre || "Área General",
        name: data.name || data.nombre || data.areaName || "Equipo AC",
        nombre: data.nombre || data.name || "Equipo AC",
        specs,
        marca: specs.brand,
        modelo: specs.model,
        numeroSerie: specs.serialNumber,
        capacidadBTU: String(specs.btu || ""),
        tipoEquipo: specs.type,
        status: (data.status as EquipmentStatus) || (data.activo === false ? "OFFLINE" : "OPERATIONAL"),
        replacesEquipmentId: data.replacesEquipmentId || undefined,
        replacedByEquipmentId: data.replacedByEquipmentId || undefined,
        retirementReason: data.retirementReason || undefined,
        retiredAt: data.retiredAt || undefined,
        platePhotoUrl: data.platePhotoUrl || data.photos?.find((p: any) => p?.type === 'PLATE')?.url || undefined,
        boardPhotoUrl: data.boardPhotoUrl || data.photos?.find((p: any) => p?.type === 'BOARD')?.url || undefined,
        evaporatorPhotoUrl: data.evaporatorPhotoUrl || undefined,
        condenserPhotoUrl: data.condenserPhotoUrl || undefined,
        installDate: data.installDate || data.anoInstalacion || undefined,
        lastServiceDate: data.lastServiceDate || undefined,
        nextServiceDate: data.nextServiceDate || undefined,
        activeTicketId: data.activeTicketId || null,
        notes: data.notes || data.notas || "",
        notas: data.notas || data.notes || "",
        createdAt: data.createdAt || null,
        updatedAt: data.updatedAt || null
    };
}

/**
 * Obtiene todos los equipos registrados de una Villa/Propiedad
 */
export async function getEquipmentByLocation(locationId: string): Promise<EquipmentPassport[]> {
    if (!locationId) return [];

    try {
        // Consultar por locationId
        const q1 = query(
            collection(db, COLL_EQUIPMENT),
            where("locationId", "==", locationId)
        );
        const snap1 = await getDocs(q1);

        // Consultar por villaId (compatibilidad)
        const q2 = query(
            collection(db, COLL_EQUIPMENT),
            where("villaId", "==", locationId)
        );
        const snap2 = await getDocs(q2);

        const itemsMap = new Map<string, EquipmentPassport>();

        snap1.docs.forEach(d => {
            itemsMap.set(d.id, mapDocToEquipment(d.id, d.data()));
        });
        snap2.docs.forEach(d => {
            if (!itemsMap.has(d.id)) {
                itemsMap.set(d.id, mapDocToEquipment(d.id, d.data()));
            }
        });

        return Array.from(itemsMap.values()).sort((a, b) => 
            (a.areaName || "").localeCompare(b.areaName || "")
        );
    } catch (error) {
        console.error("Error fetching equipment by location:", error);
        return [];
    }
}

/**
 * Obtiene un equipo por su ID de documento
 */
export async function getEquipmentById(id: string): Promise<EquipmentPassport | null> {
    if (!id) return null;
    try {
        const snap = await getDoc(doc(db, COLL_EQUIPMENT, id));
        if (!snap.exists()) return null;
        return mapDocToEquipment(snap.id, snap.data());
    } catch (error) {
        console.error("Error fetching equipment by id:", error);
        return null;
    }
}

/**
 * Resuelve un equipo por código inmutable (EQ-XXXXX) o por qrToken
 */
export async function getEquipmentByCodeOrQr(queryStr: string): Promise<EquipmentPassport | null> {
    if (!queryStr) return null;
    const cleanStr = queryStr.trim();

    try {
        // 1. Búsqueda directa por ID de doc
        const byId = await getEquipmentById(cleanStr);
        if (byId) return byId;

        // 2. Búsqueda por code ("EQ-00184")
        const qCode = query(collection(db, COLL_EQUIPMENT), where("code", "==", cleanStr), limit(1));
        const snapCode = await getDocs(qCode);
        if (!snapCode.empty) {
            return mapDocToEquipment(snapCode.docs[0].id, snapCode.docs[0].data());
        }

        // 3. Búsqueda por qrToken
        const qToken = query(collection(db, COLL_EQUIPMENT), where("qrToken", "==", cleanStr), limit(1));
        const snapToken = await getDocs(qToken);
        if (!snapToken.empty) {
            return mapDocToEquipment(snapToken.docs[0].id, snapToken.docs[0].data());
        }

        // 4. Búsqueda por qrCode (legacy)
        const qLegacy = query(collection(db, COLL_EQUIPMENT), where("qrCode", "==", cleanStr), limit(1));
        const snapLegacy = await getDocs(qLegacy);
        if (!snapLegacy.empty) {
            return mapDocToEquipment(snapLegacy.docs[0].id, snapLegacy.docs[0].data());
        }

        return null;
    } catch (error) {
        console.error("Error resolving equipment by code or QR:", error);
        return null;
    }
}

/**
 * Crea un nuevo equipo asegurando código inmutable y token de QR
 */
export async function createEquipmentPassport(
    data: Partial<EquipmentPassport> & { clientId: string; locationId: string; areaName: string }
): Promise<string> {
    const code = data.code || generateEquipmentCode();
    const qrToken = data.qrToken || generateQrToken(code);

    const docData = {
        code,
        qrToken,
        qrCode: qrToken,
        clientId: data.clientId,
        clientName: data.clientName || "",
        locationId: data.locationId,
        villaId: data.locationId, // Compatibilidad
        locationName: data.locationName || "",
        locationArea: data.locationArea || "",
        areaId: data.areaId || "",
        areaName: data.areaName,
        name: data.name || `AC ${data.areaName}`,
        nombre: data.name || `AC ${data.areaName}`,
        specs: {
            brand: data.specs?.brand || data.marca || "Carrier",
            model: data.specs?.model || data.modelo || "",
            serialNumber: data.specs?.serialNumber || data.numeroSerie || "",
            btu: data.specs?.btu || data.capacidadBTU || 18000,
            voltage: data.specs?.voltage || "220V",
            refrigerant: data.specs?.refrigerant || "R410A",
            type: data.specs?.type || data.tipoEquipo || "SPLIT_INVERTER",
            pipeDistanceMeters: data.specs?.pipeDistanceMeters || null,
            electricalStatus: data.specs?.electricalStatus || null,
            drainStatus: data.specs?.drainStatus || null
        },
        marca: data.specs?.brand || data.marca || "Carrier",
        modelo: data.specs?.model || data.modelo || "",
        numeroSerie: data.specs?.serialNumber || data.numeroSerie || "",
        capacidadBTU: String(data.specs?.btu || data.capacidadBTU || "18000"),
        tipoEquipo: data.specs?.type || data.tipoEquipo || "SPLIT_INVERTER",
        status: data.status || "OPERATIONAL",
        replacesEquipmentId: data.replacesEquipmentId || null,
        replacedByEquipmentId: null,
        retirementReason: null,
        platePhotoUrl: data.platePhotoUrl || null,
        boardPhotoUrl: data.boardPhotoUrl || null,
        evaporatorPhotoUrl: data.evaporatorPhotoUrl || null,
        condenserPhotoUrl: data.condenserPhotoUrl || null,
        installDate: data.installDate || null,
        notes: data.notes || data.notas || "",
        notas: data.notes || data.notas || "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, COLL_EQUIPMENT), docData);
    return docRef.id;
}

/**
 * Actualiza la información técnica o fotos de un equipo existente
 */
export async function updateEquipmentPassport(id: string, updates: Partial<EquipmentPassport>): Promise<void> {
    const docRef = doc(db, COLL_EQUIPMENT, id);
    const cleanUpdates: any = {
        ...updates,
        updatedAt: serverTimestamp()
    };

    if (updates.specs) {
        if (updates.specs.brand) cleanUpdates.marca = updates.specs.brand;
        if (updates.specs.model) cleanUpdates.modelo = updates.specs.model;
        if (updates.specs.serialNumber) cleanUpdates.numeroSerie = updates.specs.serialNumber;
        if (updates.specs.btu) cleanUpdates.capacidadBTU = String(updates.specs.btu);
        if (updates.specs.type) cleanUpdates.tipoEquipo = updates.specs.type;
    }

    await updateDoc(docRef, cleanUpdates);
}

/**
 * Proceso de reemplazo de equipo:
 * 1. Marca el equipo previo como 'REPLACED' y guarda el motivo de retiro sin borrar su historial.
 * 2. Crea el nuevo equipo con nuevo código inmutable y QR, registrando a quién reemplaza.
 * 3. Enlaza ambos equipos para trazabilidad completa.
 */
export async function replaceEquipment(
    oldEquipmentId: string,
    newEquipmentData: Partial<EquipmentPassport> & { clientId: string; locationId: string; areaName: string },
    retirementReason: string
): Promise<string> {
    // 1. Crear el nuevo equipo
    const newCode = generateEquipmentCode();
    const newDocId = await createEquipmentPassport({
        ...newEquipmentData,
        code: newCode,
        status: "OPERATIONAL",
        replacesEquipmentId: oldEquipmentId
    });

    // 2. Marcar el equipo anterior como REPLACED
    const oldDocRef = doc(db, COLL_EQUIPMENT, oldEquipmentId);
    await updateDoc(oldDocRef, {
        status: "REPLACED",
        replacedByEquipmentId: newDocId,
        retirementReason: retirementReason || "Sustitución por unidad nueva",
        retiredAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });

    return newDocId;
}

/**
 * Obtiene el historial completo de intervenciones asociadas a un equipo
 */
export async function getEquipmentInterventions(equipmentId: string): Promise<EquipmentIntervention[]> {
    if (!equipmentId) return [];

    try {
        const q1 = query(
            collection(db, COLL_INTERVENTIONS),
            where("equipmentId", "==", equipmentId),
            orderBy("createdAt", "desc")
        );
        const snap1 = await getDocs(q1);

        const q2 = query(
            collection(db, COLL_INTERVENTIONS),
            where("assetId", "==", equipmentId),
            orderBy("createdAt", "desc")
        );
        const snap2 = await getDocs(q2);

        const map = new Map<string, EquipmentIntervention>();

        const parseDoc = (d: any): EquipmentIntervention => {
            const data = d.data();
            return {
                id: d.id,
                equipmentId: data.equipmentId || data.assetId || equipmentId,
                equipmentCode: data.equipmentCode || "",
                ticketId: data.ticketId || "",
                locationId: data.locationId || "",
                locationName: data.locationName || "",
                areaName: data.areaName || "",
                date: data.completedAt || data.createdAt || Timestamp.now(),
                technicianId: data.technicianId || "",
                technicianName: data.technicianName || "Técnico HECHO",
                serviceType: data.serviceType || data.type || "PREVENTIVO",
                diagnosis: data.diagnosis || data.technicalReport || "",
                workDone: data.workDone || data.summary || "",
                partsReplaced: data.partsReplaced || [],
                measurements: data.measurements || undefined,
                photos: data.photos || [],
                createdAt: data.createdAt || null
            };
        };

        snap1.docs.forEach(d => map.set(d.id, parseDoc(d)));
        snap2.docs.forEach(d => {
            if (!map.has(d.id)) map.set(d.id, parseDoc(d));
        });

        return Array.from(map.values());
    } catch (error) {
        console.error("Error fetching interventions for equipment:", error);
        return [];
    }
}

/**
 * Sincroniza y promueve áreas relevadas (SurveyArea) de un ticket a la colección de equipos 'equipment'
 * para garantizar que la Villa cuente con sus pasaportes sin necesidad de volver a pedírselo al técnico.
 */
export async function promoteSurveyAreasToEquipment(
    ticket: Ticket,
    locationId: string
): Promise<string[]> {
    if (!ticket.surveyAreas || ticket.surveyAreas.length === 0 || !locationId) {
        return [];
    }

    // 1. Cargar equipos existentes de la villa para no duplicar
    const existing = await getEquipmentByLocation(locationId);
    const existingByArea = new Map(existing.map(eq => [eq.areaName.trim().toLowerCase(), eq]));

    const createdIds: string[] = [];

    for (let i = 0; i < ticket.surveyAreas.length; i++) {
        const area = ticket.surveyAreas[i];
        const normalizedName = area.name.trim().toLowerCase();

        // Si ya existe un equipo para esta área en la villa, actualizamos datos si faltaban
        const existingEq = existingByArea.get(normalizedName);
        if (existingEq) {
            const updates: Partial<EquipmentPassport> = {};
            if (!existingEq.platePhotoUrl && area.platePhotoUrl) updates.platePhotoUrl = area.platePhotoUrl;
            if (!existingEq.boardPhotoUrl && area.boardPhotoUrl) updates.boardPhotoUrl = area.boardPhotoUrl;
            if (area.brand && existingEq.specs.brand === "Genérica") {
                updates.specs = {
                    ...existingEq.specs,
                    brand: area.brand,
                    model: area.model || area.modelNumber || existingEq.specs.model,
                    serialNumber: area.serialNumber || existingEq.specs.serialNumber
                };
            }
            if (Object.keys(updates).length > 0) {
                await updateEquipmentPassport(existingEq.id, updates);
            }
            createdIds.push(existingEq.id);
            continue;
        }

        // Si no existe, creamos el pasaporte digital
        const newId = await createEquipmentPassport({
            clientId: ticket.clientId || "",
            clientName: ticket.clientName || "",
            locationId: locationId,
            locationName: ticket.locationName || "",
            locationArea: ticket.locationArea || "",
            areaId: area.id || `AREA-${i + 1}`,
            areaName: area.name,
            name: `AC ${area.name}`,
            specs: {
                brand: area.brand || "Genérica",
                model: area.model || area.modelNumber || "",
                serialNumber: area.serialNumber || "",
                btu: area.btuCapacity || area.requiredBtu || 18000,
                voltage: (area.voltage as string) || "220V",
                refrigerant: area.refrigerant || area.refrigerantType || "R410A",
                type: area.equipmentType || "SPLIT_INVERTER",
                pipeDistanceMeters: area.pipeDistanceMeters,
                electricalStatus: area.electricalStatus,
                drainStatus: area.drainStatus
            },
            status: "OPERATIONAL",
            platePhotoUrl: area.platePhotoUrl,
            boardPhotoUrl: area.boardPhotoUrl,
            notes: area.notes || area.technicianNotes || ""
        });

        createdIds.push(newId);
    }

    return createdIds;
}

/**
 * Migra de forma aditiva y segura el equipmentCensus de una ubicación (locations)
 * hacia documentos individuales de la colección equipment.
 */
export async function migrateLocationCensusToEquipment(locationDoc: PropertyLocation): Promise<number> {
    if (!locationDoc.equipmentCensus || locationDoc.equipmentCensus.length === 0) {
        return 0;
    }

    const existing = await getEquipmentByLocation(locationDoc.id);
    const existingByArea = new Map(existing.map(eq => [eq.areaName.trim().toLowerCase(), eq]));

    let migratedCount = 0;

    for (let i = 0; i < locationDoc.equipmentCensus.length; i++) {
        const area = locationDoc.equipmentCensus[i];
        const normalizedName = area.name.trim().toLowerCase();

        if (existingByArea.has(normalizedName)) {
            continue; // Ya existe, no duplicar
        }

        await createEquipmentPassport({
            clientId: locationDoc.clientId || "",
            clientName: locationDoc.clientName || "",
            locationId: locationDoc.id,
            locationName: locationDoc.nombre,
            locationArea: locationDoc.locationArea || "",
            areaId: area.id || `AREA-${i + 1}`,
            areaName: area.name,
            name: `AC ${area.name}`,
            specs: {
                brand: area.brand || "Genérica",
                model: area.model || area.modelNumber || "",
                serialNumber: area.serialNumber || "",
                btu: area.btuCapacity || area.requiredBtu || 18000,
                voltage: (area.voltage as string) || "220V",
                refrigerant: area.refrigerant || area.refrigerantType || "R410A",
                type: area.equipmentType || "SPLIT_INVERTER",
                pipeDistanceMeters: area.pipeDistanceMeters,
                electricalStatus: area.electricalStatus,
                drainStatus: area.drainStatus
            },
            status: "OPERATIONAL",
            platePhotoUrl: area.platePhotoUrl,
            boardPhotoUrl: area.boardPhotoUrl,
            notes: area.notes || area.technicianNotes || ""
        });

        migratedCount++;
    }

    return migratedCount;
}
