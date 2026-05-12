"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Loader2 } from "lucide-react";

/**
 * Smart entry point for Técnicos:
 * - If NOT logged in → redirect to /login?redirect=/tecnico
 * - If logged in as TECNICO → redirect to /technician/my-day
 * - Other roles → redirect to their home
 */
export default function TecnicoPage() {
    const router = useRouter();
    const [msg, setMsg] = useState("Accediendo a tu panel...");

    useEffect(() => {
        let mounted = true;
        
        // Fallback garantizado
        const fallbackTimer = setTimeout(() => {
            if (mounted) window.location.href = "/technician/my-day";
        }, 4000);

        auth.authStateReady().then(async () => {
            if (!mounted) return;
            const user = auth.currentUser;

            if (!user) {
                window.location.href = "/login?redirect=/tecnico";
                return;
            }

            try {
                setMsg("Verificando permisos...");
                const userDoc = await getDoc(doc(db, "users", user.uid));
                const userData = userDoc.data();
                const rawRole = userData?.rol || userData?.role || "";
                const normalizedRole = String(rawRole).toUpperCase().trim();
                const finalRole = normalizedRole === "TÉCNICO" || normalizedRole === "TECNICO" ? "TECNICO" : normalizedRole;

                setMsg("Redirigiendo...");
                if (finalRole === "TECNICO") {
                    window.location.href = "/technician/my-day";
                } else if (finalRole === "GERENTE_TICKETS" || finalRole === "ADMIN" || finalRole === "SUPERVISOR") {
                    window.location.href = "/tickets";
                } else {
                    window.location.href = "/";
                }
            } catch (err) {
                console.error("Error al obtener perfil", err);
                window.location.href = "/technician/my-day";
            }
        });

        return () => {
            mounted = false;
            clearTimeout(fallbackTimer);
        };
    }, [router]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#064e3b] gap-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-xl shadow-emerald-900/50">
                <span className="text-white text-2xl font-black">H</span>
            </div>
            <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
            <p className="text-emerald-100 text-sm">{msg}</p>
        </div>
    );
}
