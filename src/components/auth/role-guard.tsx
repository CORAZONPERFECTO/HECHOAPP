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
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
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
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    const userRole = userData.rol as UserRole; // Note: schema uses 'rol', verify consistency

                    if (allowedRoles.includes(userRole)) {
                        setAuthorized(true);
                    } else {
                        // Unauthorized for this role
                        router.push("/"); // Redirect to home or 403 page
                    }
                } else {
                    // User exists in auth but not in db??
                    console.error("User document not found");
                    router.push("/login");
                }
            } catch (error) {
                console.error("Error checking role:", error);
            } finally {
                setLoading(false);
            }
        });

        return () => unsubscribe();
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
        return null; // or a forbidden component
    }

    return <>{children}</>;
}
