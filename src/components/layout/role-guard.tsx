"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
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
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                router.push("/login");
                return;
            }

            try {
                const docRef = doc(db, "users", user.uid);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const userRole = docSnap.data().rol || "NONE";
                    
                    if (allowedRoles.includes(userRole)) {
                        setIsAuthorized(true);
                    } else {
                        // Anti-Hacker / Security Bound: Redirect technicians unconditionally to their domain
                        if (userRole === "TECNICO") {
                            router.push("/technician/my-day");
                        } else {
                            router.push("/");
                        }
                    }
                } else {
                    router.push("/login");
                }
            } catch (error) {
                console.error("Error validando permisos:", error);
                router.push("/login");
            }
        });

        return () => unsubscribe();
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
