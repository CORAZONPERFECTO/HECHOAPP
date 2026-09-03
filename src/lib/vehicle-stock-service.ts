import { collection, getDocs, doc, setDoc, updateDoc, query, where, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface VehicleStockItem {
    id?: string;
    vehicleId: string;
    vehiclePlate: string;
    technicianId: string;
    technicianName: string;
    productId: string;
    productName: string;
    quantity: number;
    minRecommended: number;
    unitPrice: number;
    updatedAt: any;
}

export const STANDARD_HVAC_KIT = [
    { name: "Capacitor Dual 45+5 uF / 440V", min: 4, cost: 650 },
    { name: "Capacitor Dual 35+5 uF / 440V", min: 4, cost: 550 },
    { name: "Contactor 1 Polo 30A 24V", min: 3, cost: 850 },
    { name: "Contactor 2 Polos 30A 24V", min: 2, cost: 1100 },
    { name: "Refrigerante Gas R410A (Lbs)", min: 10, cost: 600 },
    { name: "Refrigerante Gas R22 (Lbs)", min: 5, cost: 950 },
    { name: "Cinta Térmica Vinil / Foam", min: 4, cost: 250 },
    { name: "Varilla de Soldadura Plata 15%", min: 6, cost: 350 },
    { name: "Protector de Voltaje 220V", min: 2, cost: 1400 },
    { name: "Sensor de Temperatura / Pozo 10k", min: 3, cost: 450 }
];

export async function getVehicleStock(vehicleId: string): Promise<VehicleStockItem[]> {
    try {
        const q = query(collection(db, "vehicle_stock"), where("vehicleId", "==", vehicleId));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as VehicleStockItem));
    } catch (err) {
        console.error("Error fetching vehicle stock:", err);
        return [];
    }
}

export async function replenishVehicleStandardKit(
    vehicleId: string, 
    vehiclePlate: string, 
    technicianId: string, 
    technicianName: string
): Promise<{ success: boolean; count: number }> {
    try {
        let count = 0;
        for (const item of STANDARD_HVAC_KIT) {
            const stockId = `${vehicleId}_${item.name.replace(/[^a-zA-Z0-9]/g, "_")}`;
            const stockRef = doc(db, "vehicle_stock", stockId);
            
            await setDoc(stockRef, {
                vehicleId,
                vehiclePlate,
                technicianId,
                technicianName,
                productId: stockId,
                productName: item.name,
                quantity: item.min,
                minRecommended: item.min,
                unitPrice: item.cost,
                updatedAt: serverTimestamp()
            }, { merge: true });
            count++;
        }
        return { success: true, count };
    } catch (error) {
        console.error("Error replenishing vehicle kit:", error);
        throw error;
    }
}
