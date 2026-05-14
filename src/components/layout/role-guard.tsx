"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Loader2, ShieldAlert } from "lucide-react";

interface RoleGuardProps {
    children: React.ReactNode;
    allowedRoles: string[];
}

export function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
    const router = useRouter();

    useEffect(() => {
        let mounted = true;

        const checkAuth = async () => {
            // ✅ CRITICAL FIX: Wait for Firebase to fully restore session from persistence
            // Without this, onAuthStateChanged fires null immediately on mount
            // causing a premature redirect to /login before the session is confirmed.
            await auth.authStateReady();

            if (!mounted) return;

            const user = auth.currentUser;

            if (!user) {
                const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
                router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
                return;
            }

            // ✅ Super Admin Bypass
            if (user.email?.toLowerCase() === 'lcaa27@gmail.com') {
                setIsAuthorized(true);
                return;
            }

            try {
                const docRef = doc(db, "users", user.uid);
                const docSnap = await getDoc(docRef);

                if (!mounted) return;

                if (docSnap.exists()) {
                    const rawRole = docSnap.data().rol || "NONE";
                    const upperRole = String(rawRole).toUpperCase().trim();
                    const normalizedRole = (upperRole === "TÉCNICO" || upperRole === "TECNICO") ? "TECNICO" : upperRole;

                    if (allowedRoles.includes(normalizedRole)) {
                        setIsAuthorized(true);
                    } else {
                        if (normalizedRole === "TECNICO" || normalizedRole === "CONTRATISTA") {
                            router.push("/technician/my-day");
                        } else {
                            router.push("/");
                        }
                    }
                } else {
                    console.error("Ghost user: document not found in Firestore");
                    await auth.signOut();
                    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
                    router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
                }
            } catch (error) {
                console.error("Error validando permisos:", error);
                if (mounted) {
                    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
                    router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
                }
            }
        };

        checkAuth();

        return () => { mounted = false; };
    }, [router, allowedRoles]);

    // Loading State
    if (isAuthorized === null) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
                <p className="text-gray-500 font-medium">Verificando permisos de seguridad...</p>
            </div>
        );
    }

    // Denied State (Flash before redirecting)
    if (isAuthorized === false) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
                <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Acceso Denegado</h1>
                <p className="text-gray-500">No cuentas con los privilegios para ver esta zona.</p>
            </div>
        );
    }

    return <>{children}</>;
}
