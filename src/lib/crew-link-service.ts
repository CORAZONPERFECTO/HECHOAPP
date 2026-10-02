import { db } from "@/lib/firebase";
import { 
    collection, 
    doc, 
    getDoc, 
    getDocs, 
    setDoc, 
    updateDoc, 
    query, 
    where, 
    serverTimestamp, 
    Timestamp, 
    arrayUnion, 
    increment 
} from "firebase/firestore";
import { TicketCrewToken, Ticket } from "@/types/schema";

export const COLL_CREW_TOKENS = "ticketCrewTokens";

/**
 * Genera un token aleatorio, legible y seguro de 8 caracteres alfanuméricos
 */
export function generateRandomCrewToken(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Sin caracteres ambiguos como 0, O, 1, I
    let result = "";
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `TKC-${result}`;
}

/**
 * Obtiene el token activo existente o crea uno nuevo con 2 aperturas por defecto
 */
export async function getOrCreateCrewToken(
    ticketId: string,
    ticketNumber?: string,
    clientName?: string,
    locationName?: string,
    createdBy?: string,
    createdByName?: string,
    defaultMaxOpens: number = 2
): Promise<TicketCrewToken> {
    if (!ticketId) throw new Error("ticketId es requerido para generar token de cuadrilla.");

    try {
        // 1. Buscar si ya existe un token activo para este ticket
        const q = query(
            collection(db, COLL_CREW_TOKENS),
            where("ticketId", "==", ticketId),
            where("status", "==", "ACTIVE")
        );
        const snap = await getDocs(q);

        if (!snap.empty) {
            const docData = snap.docs[0].data() as Omit<TicketCrewToken, 'id'>;
            return { ...docData, id: snap.docs[0].id } as TicketCrewToken;
        }

        // 2. Si no existe, crear un nuevo token
        const token = generateRandomCrewToken();
        const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 horas de vigencia

        const newTokenData: Omit<TicketCrewToken, 'id'> = {
            token,
            ticketId,
            ticketNumber: ticketNumber || ticketId.slice(0, 8),
            clientName: clientName || "",
            locationName: locationName || "",
            maxOpens: defaultMaxOpens || 2,
            openCount: 0,
            registeredDeviceIds: [],
            status: 'ACTIVE',
            isStandby: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            expiresAt: Timestamp.fromDate(expiresAt),
            createdBy: createdBy || "admin",
            createdByName: createdByName || "Administración"
        };

        await setDoc(doc(db, COLL_CREW_TOKENS, token), newTokenData);

        return {
            id: token,
            ...newTokenData
        } as TicketCrewToken;
    } catch (error) {
        console.error("Error en getOrCreateCrewToken:", error);
        throw error;
    }
}

/**
 * Permite al administrador aumentar el cupo de aperturas (ej: pasar de 2 a 3, 4, etc.)
 */
export async function updateCrewTokenMaxOpens(token: string, newMaxOpens: number): Promise<void> {
    if (!token || newMaxOpens < 1) throw new Error("Parámetros inválidos para actualizar cupo de aperturas.");
    const tokenRef = doc(db, COLL_CREW_TOKENS, token);
    await updateDoc(tokenRef, {
        maxOpens: newMaxOpens,
        updatedAt: serverTimestamp()
    });
}

/**
 * Permite al administrador resetear los dispositivos registrados (en caso de cambio de móvil en campo)
 */
export async function resetCrewTokenDevices(token: string): Promise<void> {
    if (!token) return;
    const tokenRef = doc(db, COLL_CREW_TOKENS, token);
    await updateDoc(tokenRef, {
        registeredDeviceIds: [],
        openCount: 0,
        updatedAt: serverTimestamp()
    });
}

/**
 * Cierra e invalida los tokens de cuadrilla cuando el servicio es finalizado
 */
export async function closeCrewToken(ticketId: string): Promise<void> {
    if (!ticketId) return;
    try {
        const q = query(
            collection(db, COLL_CREW_TOKENS),
            where("ticketId", "==", ticketId)
        );
        const snap = await getDocs(q);
        for (const docSnap of snap.docs) {
            await updateDoc(docSnap.ref, {
                status: 'CLOSED',
                updatedAt: serverTimestamp()
            });
        }
    } catch (error) {
        console.error("Error closing crew token:", error);
    }
}

/**
 * Pausa o reanuda el ticket para dejarlo en standby y continuarlo luego
 */
export async function setTicketStandby(
    ticketId: string,
    isStandby: boolean,
    reason?: string,
    userId?: string,
    userName?: string
): Promise<void> {
    if (!ticketId) return;
    try {
        const updates: any = {
            isStandby,
            standbyReason: isStandby ? (reason || "Pausa operativa de cuadrilla") : null,
            standbyAt: isStandby ? serverTimestamp() : null,
            updatedAt: serverTimestamp()
        };

        await updateDoc(doc(db, "tickets", ticketId), updates);

        // Actualizar también en el token de cuadrilla
        const q = query(
            collection(db, COLL_CREW_TOKENS),
            where("ticketId", "==", ticketId),
            where("status", "==", "ACTIVE")
        );
        const snap = await getDocs(q);
        for (const docSnap of snap.docs) {
            await updateDoc(docSnap.ref, {
                isStandby,
                standbyReason: isStandby ? (reason || "Pausa operativa") : null,
                standbyAt: isStandby ? serverTimestamp() : null,
                updatedAt: serverTimestamp()
            });
        }
    } catch (error) {
        console.error("Error setting standby status:", error);
        throw error;
    }
}

export interface ValidateCrewAccessResult {
    authorized: boolean;
    isClosed?: boolean;
    isLimitReached?: boolean;
    isExistingDevice?: boolean;
    reason?: string;
    tokenData?: TicketCrewToken;
    ticket?: Ticket;
}

/**
 * Valida el acceso de un celular al enlace de cuadrilla con control atómico de cupos
 */
export async function validateAndRegisterCrewDevice(
    token: string,
    deviceId: string
): Promise<ValidateCrewAccessResult> {
    if (!token || !deviceId) {
        return { authorized: false, reason: "Identificador de enlace o dispositivo no proporcionado." };
    }

    try {
        // 1. Obtener documento del token
        const tokenRef = doc(db, COLL_CREW_TOKENS, token);
        const tokenSnap = await getDoc(tokenRef);

        if (!tokenSnap.exists()) {
            return { authorized: false, reason: "El enlace no es válido o ha expirado." };
        }

        const tokenData = { id: tokenSnap.id, ...tokenSnap.data() } as TicketCrewToken;

        // 2. Cargar el ticket asociado
        const ticketSnap = await getDoc(doc(db, "tickets", tokenData.ticketId));
        if (!ticketSnap.exists()) {
            return { authorized: false, reason: "El ticket asignado a este enlace no existe." };
        }

        const ticket = { id: ticketSnap.id, ...ticketSnap.data() } as Ticket;

        // 3. REGLA ESTRICTA: Si el ticket ya está completado o cerrado, BLOQUEAR modificación
        if (ticket.status === 'COMPLETED' || ticket.status === 'CANCELLED' || tokenData.status === 'CLOSED') {
            return {
                authorized: false,
                isClosed: true,
                reason: "Este servicio ya ha sido finalizado y cerrado. Por razones de seguridad e integridad técnica, no se permiten modificaciones adicionales.",
                tokenData,
                ticket
            };
        }

        // 4. Si el dispositivo ya fue registrado previamente: ACCESO PERMITIDO (STANDBY / CONTINUAR)
        const registered = tokenData.registeredDeviceIds || [];
        if (registered.includes(deviceId)) {
            return {
                authorized: true,
                isExistingDevice: true,
                tokenData,
                ticket
            };
        }

        // 5. Si es un dispositivo nuevo, verificar si supera el cupo (por defecto 2)
        const currentCount = registered.length;
        const maxLimit = tokenData.maxOpens || 2;

        if (currentCount >= maxLimit) {
            return {
                authorized: false,
                isLimitReached: true,
                reason: `Límite de aperturas alcanzado (${currentCount} de ${maxLimit} dispositivos ya registrados: Técnico Líder y Ayudante). Si necesitas habilitar este celular, solicita a la administración ampliar el cupo de aperturas desde el panel.`,
                tokenData,
                ticket
            };
        }

        // 6. Registrar atómicamente el nuevo dispositivo
        await updateDoc(tokenRef, {
            registeredDeviceIds: arrayUnion(deviceId),
            openCount: increment(1),
            updatedAt: serverTimestamp()
        });

        // Actualizar datos locales
        tokenData.registeredDeviceIds.push(deviceId);
        tokenData.openCount = (tokenData.openCount || 0) + 1;

        return {
            authorized: true,
            isExistingDevice: false,
            tokenData,
            ticket
        };
    } catch (error: any) {
        console.error("Error en validateAndRegisterCrewDevice:", error);
        return { authorized: false, reason: error.message || "Error al validar acceso de cuadrilla." };
    }
}
