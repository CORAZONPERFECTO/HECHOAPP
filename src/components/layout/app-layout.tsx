
"use client";

import { Sidebar } from "./sidebar";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { RoleGuard } from "./role-guard";

interface AppLayoutProps {
    children: React.ReactNode;
    className?: string; // Allow custom classes for specific pages if needed
}

// Rutas de administración estricta (finanzas, usuarios, ajustes)
const superAdminRoutes = [
   "/income", "/reports", "/settings", "/admin", "/approvals", "/technicians"
];

// Rutas de operación (tickets, clientes)
const operationRoutes = [
    "/tickets", "/clients", "/inventory"
];

export function AppLayout({ children, className }: AppLayoutProps) {
    const pathname = usePathname();
    
    const isSuperAdmin = superAdminRoutes.some(route => pathname.startsWith(route));
    const isOperation = operationRoutes.some(route => pathname.startsWith(route));

    let allowedRoles: string[] | null = null;
    if (isSuperAdmin) {
        allowedRoles = ["ADMIN", "SUPERVISOR"];
    } else if (isOperation) {
        allowedRoles = ["ADMIN", "SUPERVISOR", "GERENTE_TICKETS"];
    }

    return (
        <div className="flex min-h-screen bg-slate-50 dark:bg-[#020617]">
            {/* Sidebar */}
            <Sidebar />

            {/* Main Content Area */}
            <main className={cn("flex-1 px-4 py-6 md:px-8 md:py-8 overflow-y-auto h-screen scroll-smooth", className)}>
                <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 slide-in-from-bottom-4">
                    {allowedRoles ? (
                        <RoleGuard allowedRoles={allowedRoles}>
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
