
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard, Files, Repeat, CreditCard,
    FileText, Truck, Receipt, Users, Settings,
    BarChart3, ChevronLeft, ChevronRight, LogOut, Sparkles, Mic, Ticket, MessageSquare,
    PackageSearch, ArrowLeftRight, BrainCircuit
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

const adminMenuItems = [
    { label: "Dashboard", icon: LayoutDashboard, href: "/", roles: ["ADMIN", "SUPERVISOR", "TECNICO"] },
    { label: "Facturas", icon: Files, href: "/income/invoices", roles: ["ADMIN", "SUPERVISOR"] },
    { label: "Recurrentes", icon: Repeat, href: "/income/recurring", roles: ["ADMIN", "SUPERVISOR"] },
    { label: "Pagos", icon: CreditCard, href: "/income/payments", roles: ["ADMIN", "SUPERVISOR"] },
    { label: "Cotizaciones", icon: FileText, href: "/income/quotes", roles: ["ADMIN", "SUPERVISOR"] },
    { label: "Notas Crédito", icon: Files, href: "/income/credit-notes", roles: ["ADMIN", "SUPERVISOR"] },
    { label: "Conduces", icon: Truck, href: "/income/delivery-notes", roles: ["ADMIN", "SUPERVISOR"] },
    { label: "Recibos", icon: Receipt, href: "/income/receipts", roles: ["ADMIN", "SUPERVISOR"] },
    { label: "Clientes", icon: Users, href: "/clients", roles: ["ADMIN", "SUPERVISOR"] },
    { label: "Inventario", icon: PackageSearch, href: "/inventory", roles: ["ADMIN", "SUPERVISOR"] },
    { label: "Movimientos", icon: ArrowLeftRight, href: "/inventory/movements", roles: ["ADMIN", "SUPERVISOR", "TECNICO"] },
    { label: "Tickets", icon: Ticket, href: "/technician/my-day", roles: ["TECNICO"] },
    { label: "Mensajes", icon: MessageSquare, href: "#", roles: ["ADMIN", "SUPERVISOR", "TECNICO"] },
    { label: "Reportes", icon: BarChart3, href: "/reports", roles: ["ADMIN", "SUPERVISOR"] },
    { label: "Diagnóstico IA", icon: BrainCircuit, href: "/resources?tab=errors", roles: ["ADMIN", "SUPERVISOR", "TECNICO"] },
    { label: "Aprobaciones", icon: Sparkles, href: "/admin/approvals", roles: ["ADMIN", "SUPERVISOR"] },
];

export function Sidebar() {
    const [collapsed, setCollapsed] = useState(false);
    const [userRole, setUserRole] = useState<string | null>(null);
    const pathname = usePathname();

    useEffect(() => {
        const fetchUserRole = async () => {
            const user = auth.currentUser;
            if (user) {
                const docRef = doc(db, "users", user.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setUserRole(docSnap.data().rol || null);
                }
            }
        };
        fetchUserRole();
    }, []);

    const toggleSidebar = () => setCollapsed(!collapsed);

    // Filter menu items based on user role
    const menuItems = adminMenuItems.filter(item =>
        !userRole || item.roles.includes(userRole)
    );

    const isTechnician = userRole === "TECNICO";

    return (
        <aside
            className={cn(
                "h-screen sticky top-0 left-0 z-40 bg-white/80 dark:bg-[#0f172a]/90 backdrop-blur-xl border-r border-white/20 dark:border-white/5 transition-all duration-300 flex flex-col shadow-2xl",
                collapsed ? "w-20" : "w-64"
            )}
        >
            {/* Header / Logo */}
            <div className="h-16 flex items-center justify-center border-b border-gray-200/50 dark:border-gray-800/50 relative">
                <Link href="/" className={cn("flex items-center gap-2 transition-all duration-300", collapsed ? "scale-0 opacity-0 absolute" : "scale-100 opacity-100")}>
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg shadow-purple-500/30">
                        H
                    </div>
                    <span className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-purple-600 dark:from-blue-400 dark:to-purple-400">
                        HECHOAPP
                    </span>
                </Link>

                {/* Collapsed Logo */}
                <Link href="/" className={cn("absolute transition-all duration-300", collapsed ? "scale-100 opacity-100" : "scale-0 opacity-0")}>
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-purple-500/30">
                        H
                    </div>
                </Link>

                {/* Toggle Button */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute -right-3 top-6 h-6 w-6 rounded-full bg-white dark:bg-slate-800 border shadow-md text-gray-500 hover:text-purple-600 z-50 hidden md:flex"
                    onClick={toggleSidebar}
                >
                    {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
                </Button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-2 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-800">

                {/* CTA New Invoice - Only for Admin/Supervisor */}
                {!isTechnician && (
                    <div className="mb-6 px-1">
                        <Button
                            className={cn(
                                "w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg shadow-blue-500/20 transition-all duration-300",
                                collapsed ? "h-12 w-12 rounded-xl p-0 justify-center" : "justify-start gap-3"
                            )}
                            asChild
                        >
                            <Link href="/income/invoices/new">
                                <Mic className={cn("h-5 w-5", collapsed ? "mr-0" : "")} />
                                {!collapsed && <span>Nueva Factura</span>}
                            </Link>
                        </Button>
                    </div>
                )}

                {/* Menu Items */}
                {menuItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative",
                                isActive
                                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium"
                                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-200"
                            )}
                        >
                            <item.icon className={cn("h-5 w-5 transition-colors", isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-500 group-hover:text-gray-700 dark:text-gray-500")} />

                            {!collapsed && (
                                <span className="truncate">{item.label}</span>
                            )}

                            {/* Tooltip for collapsed mode */}
                            {collapsed && (
                                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                                    {item.label}
                                </div>
                            )}

                            {isActive && !collapsed && (
                                <div className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
                            )}
                        </Link>
                    );
                })}
            </nav>


            {/* Footer / User Profile */}
            <div className="p-4 border-t border-gray-200/50 dark:border-gray-800/50">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            className={cn(
                                "w-full flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors h-auto",
                                collapsed ? "justify-center" : "justify-start"
                            )}
                        >
                            <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-yellow-400 to-orange-500 flex items-center justify-center text-white font-bold text-xs shadow-sm shrink-0">
                                {userRole === "TECNICO" ? "T" : "A"}
                            </div>
                            {!collapsed && (
                                <div className="flex-1 min-w-0 text-left">
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{auth.currentUser?.displayName || "Usuario"}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{userRole || "Cargando..."}</p>
                                </div>
                            )}
                            {!collapsed && <Settings className="h-4 w-4 text-gray-400" />}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <Link href="/settings" className="cursor-pointer w-full flex items-center">
                                <Settings className="mr-2 h-4 w-4" />
                                <span>Configuración</span>
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            className="text-red-600 focus:text-red-600 cursor-pointer"
                            onClick={async () => {
                                try {
                                    await auth.signOut();
                                    // Router push not strictly needed if onAuthStateChanged handles it, 
                                    // but good for immediate feedback if listener is slow.
                                    // However, simpler to let the global auth listener handle the redirect 
                                    // if it exists in the main layout/provider.
                                    window.location.href = "/login";
                                } catch (error) {
                                    console.error("Error signing out:", error);
                                }
                            }}
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Cerrar Sesión</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </aside>
    );
}
