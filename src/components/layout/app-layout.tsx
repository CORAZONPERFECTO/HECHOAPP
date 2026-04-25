
"use client";

import { Sidebar } from "./sidebar";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { RoleGuard } from "./role-guard";

interface AppLayoutProps {
    children: React.ReactNode;
    className?: string; // Allow custom classes for specific pages if needed
}

// Rutas estrictamente administrativas. Ni técnicos ni publico general pueden ver esto.
const adminRoutes = [
   "/income", "/clients", "/reports", "/settings", "/admin", "/approvals", "/tickets", "/inventory", "/technicians"
];

export function AppLayout({ children, className }: AppLayoutProps) {
    const pathname = usePathname();
    // Revisa si la ruta actual está protegida de los técnicos
    const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route));

    return (
        <div className="flex min-h-screen bg-slate-50 dark:bg-[#020617]">
            {/* Sidebar */}
            <Sidebar />

            {/* Main Content Area */}
            <main className={cn("flex-1 px-4 py-6 md:px-8 md:py-8 overflow-y-auto h-screen scroll-smooth", className)}>
                <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 slide-in-from-bottom-4">
                    {isAdminRoute ? (
                        <RoleGuard allowedRoles={["ADMIN", "SUPERVISOR"]}>
                            {children}
                        </RoleGuard>
                    ) : (
                        children
                    )}
                </div>
            </main>
        </div>
    );
}
