import { db } from "@/lib/firebase";
import { 
    collection, 
    doc, 
    getDocs, 
    query, 
    where, 
    updateDoc, 
    addDoc, 
    serverTimestamp 
} from "firebase/firestore";
import { UserVehicle, Ticket } from "@/types/schema";

export const DEFAULT_COST_PER_KM = 18.0; // RD$ 18.00 / km sugerido por defecto

export interface DailyCheckoutResult {
    success: boolean;
    startMileage: number;
    endMileage: number;
    totalDailyKm: number;
    ticketsCount: number;
    kmPerTicket: number;
    costPerKm: number;
    vehicleCostPerTicket: number;
    updatedTicketIds: string[];
    needsOilChange: boolean;
    isNearOilChange: boolean;
    remainingKmForOil: number;
    currentIntervalKm: number;
}

/**
 * 🚗 Check-in Matutino: Registra el Odómetro Inicial del Día
 */
export async function recordDailyCheckin(
    userId: string,
    userName: string,
    vehicle: UserVehicle,
    startMileage: number
): Promise<{ success: boolean; needsOilChange: boolean; remainingKmForOil: number }> {
    const todayStr = new Date().toISOString().split("T")[0];
    const oilInterval = vehicle.oilChangeInterval || 4500;
    const lastOilChange = vehicle.lastOilChangeMileage || 0;
    const currentIntervalKm = startMileage - lastOilChange;
    const needsOilChange = currentIntervalKm >= oilInterval;
    const remainingKmForOil = Math.max(0, oilInterval - currentIntervalKm);

    // 1. Actualizar perfil del usuario
    await updateDoc(doc(db, "users", userId), {
        "vehicle.currentMileage": startMileage,
        "vehicle.todayStartMileage": startMileage,
        "vehicle.todayStartDate": todayStr,
        "vehicle.lastMileageUpdateDate": todayStr,
    });

    // 2. Guardar en histórico de auditoría
    await addDoc(collection(db, "vehicleMileageLogs"), {
        userId,
        userName,
        vehiclePlate: vehicle.plate || "S/R",
        vehicleBrand: vehicle.brand || "S/R",
        vehicleModel: vehicle.model || "S/R",
        mileage: startMileage,
        type: "DAILY_CHECKIN",
        date: todayStr,
        createdAt: serverTimestamp(),
    });

    return {
        success: true,
        needsOilChange,
        remainingKmForOil,
    };
}

/**
 * 🏁 Cierre de Jornada: Registra el Odómetro Final, calcula los KM totales
 * y los reparte automáticamente entre todos los tickets completados hoy.
 */
export async function recordDailyCheckout(
    userId: string,
    userName: string,
    vehicle: UserVehicle,
    startMileage: number,
    endMileage: number
): Promise<DailyCheckoutResult> {
    const todayStr = new Date().toISOString().split("T")[0];
    const totalDailyKm = Math.max(0, endMileage - startMileage);
    const costPerKm = vehicle.costPerKm || DEFAULT_COST_PER_KM;

    // 1. Buscar todos los tickets completados por este técnico hoy
    const ticketsSnap = await getDocs(
        query(
            collection(db, "tickets"),
            where("technicianId", "==", userId),
            where("status", "==", "COMPLETED")
        )
    );

    // Filtrar los que fueron cerrados o actualizados en la fecha de hoy
    const todayCompletedTickets = ticketsSnap.docs
        .map(d => ({ id: d.id, ...d.data() } as Ticket))
        .filter(t => {
            const dateField = t.closedAt || t.resolvedAt || t.updatedAt;
            if (!dateField) return true;
            const dateStr = (dateField as any).toDate 
                ? (dateField as any).toDate().toISOString().split("T")[0]
                : new Date((dateField as any).seconds * 1000).toISOString().split("T")[0];
            return dateStr === todayStr;
        });

    const ticketsCount = todayCompletedTickets.length;
    const divisor = Math.max(1, ticketsCount);
    const kmPerTicket = Math.round((totalDailyKm / divisor) * 10) / 10;
    const vehicleCostPerTicket = Math.round(kmPerTicket * costPerKm * 100) / 100;

    const updatedTicketIds: string[] = [];

    // 2. Repartir los costos en cada ticket completado
    for (const ticket of todayCompletedTickets) {
        try {
            const laborHours = ticket.laborHours || 0;
            const laborRate = ticket.laborRate || 0;
            const materialsCost = ticket.materialsCost || 0;
            const otherCosts = ticket.otherCosts || 0;
            const newTotalCost = (laborHours * laborRate) + materialsCost + otherCosts + vehicleCostPerTicket;
            const revenue = ticket.revenue || 0;
            const newProfitMargin = revenue > 0 ? ((revenue - newTotalCost) / revenue) * 100 : 0;

            await updateDoc(doc(db, "tickets", ticket.id), {
                assignedMileageKm: kmPerTicket,
                vehicleMileageCost: vehicleCostPerTicket,
                vehiclePlate: vehicle.plate || "S/R",
                totalCost: newTotalCost,
                profitMargin: newProfitMargin,
                updatedAt: serverTimestamp(),
            });

            updatedTicketIds.push(ticket.id);
        } catch (ticketErr) {
            console.error(`Error updating ticket ${ticket.id} with mileage cost:`, ticketErr);
        }
    }

    // 3. Mantenimiento y odómetro
    const oilInterval = vehicle.oilChangeInterval || 4500;
    const lastOilChange = vehicle.lastOilChangeMileage || 0;
    const currentIntervalKm = endMileage - lastOilChange;
    const needsOilChange = currentIntervalKm >= oilInterval;
    const remainingKmForOil = Math.max(0, oilInterval - currentIntervalKm);
    const isNearOilChange = remainingKmForOil <= 500;

    // 4. Actualizar usuario / vehículo
    await updateDoc(doc(db, "users", userId), {
        "vehicle.currentMileage": endMileage,
        "vehicle.todayStartMileage": null,
        "vehicle.todayStartDate": null,
        "vehicle.lastMileageUpdateDate": todayStr,
    });

    // 5. Guardar registro en historial
    await addDoc(collection(db, "vehicleMileageLogs"), {
        userId,
        userName,
        vehiclePlate: vehicle.plate || "S/R",
        vehicleBrand: vehicle.brand || "S/R",
        vehicleModel: vehicle.model || "S/R",
        startMileage,
        endMileage,
        totalDailyKm,
        ticketsCount,
        kmPerTicket,
        costPerKm,
        vehicleCostPerTicket,
        updatedTicketIds,
        type: "DAILY_CHECKOUT",
        date: todayStr,
        createdAt: serverTimestamp(),
    });

    return {
        success: true,
        startMileage,
        endMileage,
        totalDailyKm,
        ticketsCount,
        kmPerTicket,
        costPerKm,
        vehicleCostPerTicket,
        updatedTicketIds,
        needsOilChange,
        isNearOilChange,
        remainingKmForOil,
        currentIntervalKm,
    };
}
