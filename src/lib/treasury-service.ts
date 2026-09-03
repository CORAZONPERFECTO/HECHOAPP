import { collection, getDocs, doc, setDoc, serverTimestamp, query, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { BankAccount, TreasuryMovement } from "@/types/treasury";

export const DEFAULT_ACCOUNTS: BankAccount[] = [
    {
        id: "bpd_corriente",
        name: "Banco Popular Dominicano (Corriente)",
        accountNumber: "792-XXXXX-1",
        type: "BANK",
        currency: "DOP",
        currentBalance: 485200,
        updatedAt: new Date()
    },
    {
        id: "banreservas_ahorros",
        name: "Banreservas (Cuenta Operativa)",
        accountNumber: "240-XXXXX-8",
        type: "BANK",
        currency: "DOP",
        currentBalance: 215400,
        updatedAt: new Date()
    },
    {
        id: "caja_chica_oficina",
        name: "Caja Chica Oficina Central",
        accountNumber: "Efectivo",
        type: "CASH",
        currency: "DOP",
        currentBalance: 35000,
        updatedAt: new Date()
    }
];

export async function getTreasuryAccounts(): Promise<BankAccount[]> {
    try {
        const snap = await getDocs(collection(db, "bank_accounts"));
        if (snap.empty) {
            for (const acc of DEFAULT_ACCOUNTS) {
                await setDoc(doc(db, "bank_accounts", acc.id), {
                    ...acc,
                    updatedAt: serverTimestamp()
                });
            }
            return DEFAULT_ACCOUNTS;
        }
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as BankAccount));
    } catch (err) {
        console.error("Error fetching treasury accounts:", err);
        return DEFAULT_ACCOUNTS;
    }
}

export async function getTreasuryMovements(): Promise<TreasuryMovement[]> {
    try {
        const q = query(collection(db, "treasury_movements"), orderBy("createdAt", "desc"), limit(20));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as TreasuryMovement));
    } catch (err) {
        console.error("Error fetching treasury movements:", err);
        return [];
    }
}
