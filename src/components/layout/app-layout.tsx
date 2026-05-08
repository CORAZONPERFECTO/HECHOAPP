
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
        <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-[#020617] selection:bg-blue-500/30">
            {/* Background ambient gradient */}
            <div className="fixed inset-0 z-0 pointer-events-none opacity-40 dark:opacity-20">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-[100px] animate-pulse" />
                <div className="absolute top-40 -left-40 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-[100px] animate-pulse delay-1000" />
            </div>

            {/* Sidebar */}
            <Sidebar />

            {/* Main Content Area */}
            <main className={cn("flex-1 relative z-10 px-4 py-6 md:px-8 md:py-8 overflow-y-auto h-screen scroll-smooth scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-800", className)}>
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
