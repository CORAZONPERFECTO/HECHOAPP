"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Loader2 } from "lucide-react";

/**
 * Smart entry point for Gerente de Tickets:
 * - If NOT logged in → redirect to /login?redirect=/gerente
 * - If logged in as GERENTE_TICKETS → redirect to /tickets
 * - If logged in as ADMIN/SUPERVISOR → redirect to /tickets
 * - Other roles → redirect to their home
 */
export default function GerentePage() {
    const router = useRouter();

    useEffect(() => {
        auth.authStateReady().then(async () => {
            const user = auth.currentUser;

            if (!user) {
                router.replace("/login?redirect=/tickets");
                return;
            }

            try {
                const userDoc = await getDoc(doc(db, "users", user.uid));
                const userData = userDoc.data();
                const role = userData?.rol || userData?.role;

                if (role === "GERENTE_TICKETS" || role === "ADMIN" || role === "SUPERVISOR") {
                    router.replace("/tickets");
                } else if (role === "TECNICO") {
                    router.replace("/technician/my-day");
                } else {
                    router.replace("/");
                }
            } catch {
                router.replace("/tickets");
            }
        });
    }, [router]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#0f172a] gap-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center shadow-xl shadow-blue-900/50">
                <span className="text-white text-2xl font-black">H</span>
            </div>
            <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
            <p className="text-slate-400 text-sm">Accediendo a tu panel...</p>
        </div>
    );
}
