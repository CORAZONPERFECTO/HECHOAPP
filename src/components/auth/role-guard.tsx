"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserRole } from "@/types/schema";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Loader2 } from "lucide-react";

interface RoleGuardProps {
    children: React.ReactNode;
    allowedRoles: UserRole[];
    requireAuth?: boolean;
}

export function RoleGuard({ children, allowedRoles, requireAuth = true }: RoleGuardProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [authorized, setAuthorized] = useState(false);

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
                if (requireAuth) {
                    router.push("/login");
                } else {
                    setAuthorized(true);
                }
                setLoading(false);
                return;
            }

            // Super Admin Bypass for specific email
            if (user.email?.toLowerCase() === 'lcaa27@gmail.com') {
                setAuthorized(true);
                setLoading(false);
                return;
            }

            try {
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (!mounted) return;

                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    const userRole = (userData.rol || userData.role) as UserRole;

                    if (allowedRoles.includes(userRole)) {
                        setAuthorized(true);
                    } else {
                        router.push("/");
                    }
                } else {
                    console.error("User document not found in Firestore");
                    router.push("/login");
                }
            } catch (error) {
                console.error("Error checking role:", error);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        checkAuth();

        return () => { mounted = false; };
    }, [router, allowedRoles, requireAuth]);

    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    <p className="text-sm text-gray-500">Verificando permisos...</p>
                </div>
            </div>
        );
    }

    if (!authorized) {
        return null;
    }

    return <>{children}</>;
}
