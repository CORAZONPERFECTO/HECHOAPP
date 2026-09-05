
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard, Files, Repeat, CreditCard,
    FileText, Truck, Receipt, Users, Settings,
    BarChart3, ChevronLeft, ChevronRight, ChevronDown, LogOut, Sparkles, Mic, Ticket, MessageSquare,
    PackageSearch, ArrowLeftRight, BrainCircuit, Menu, X, MapPin, Building2, Wrench, Landmark, Wallet, BookOpen,
    DollarSign, Award, ShieldCheck
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

interface NavItem {
    label: string;
    icon: any;
    href: string;
    roles: string[];
    badge?: string;
}

interface NavCategory {
    id: string;
    label: string;
    icon: any;
    roles: string[];
    href?: string; // Direct link if no sub-items
    items?: NavItem[];
}

const navCategories: NavCategory[] = [
    {
        id: "dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        href: "/",
        roles: ["ADMIN", "SUPERVISOR", "GERENTE", "GERENTE_TICKETS", "TECNICO", "CONTRATISTA", "PROPERTY_MANAGER"],
    },
    {
        id: "operaciones",
        label: "Operaciones & Tickets",
        icon: Ticket,
        roles: ["ADMIN", "SUPERVISOR", "GERENTE", "GERENTE_TICKETS", "TECNICO", "CONTRATISTA", "PROPERTY_MANAGER"],
        items: [
            { label: "Torre de Tickets", icon: Ticket, href: "/tickets", roles: ["ADMIN", "SUPERVISOR", "GERENTE", "GERENTE_TICKETS"] },
            { label: "Mis Tickets del Día", icon: Wrench, href: "/technician/my-day", roles: ["TECNICO", "CONTRATISTA"] },
            { label: "Proyectos", icon: Building2, href: "/projects", roles: ["ADMIN", "SUPERVISOR", "GERENTE", "GERENTE_TICKETS"] },
            { label: "Mis Proyectos", icon: Building2, href: "/technician/projects", roles: ["TECNICO", "CONTRATISTA"] },
            { label: "Ubicación & GPS", icon: MapPin, href: "/admin/tracking", roles: ["ADMIN", "SUPERVISOR"] },
            { label: "Tareas Logísticas", icon: Truck, href: "/admin/logistics", roles: ["ADMIN", "SUPERVISOR"] },
            { label: "Diagnóstico IA", icon: BrainCircuit, href: "/resources?tab=errors", roles: ["ADMIN", "SUPERVISOR", "TECNICO", "CONTRATISTA"] },
            { label: "Villas Gestor", icon: Building2, href: "/property-manager", roles: ["PROPERTY_MANAGER", "ADMIN", "SUPERVISOR"] },
        ]
    },
    {
        id: "ventas",
        label: "Ventas & Facturación",
        icon: Files,
        roles: ["ADMIN", "SUPERVISOR"],
        items: [
            { label: "Cotizaciones & Proformas", icon: FileText, href: "/income/quotes", roles: ["ADMIN", "SUPERVISOR"] },
            { label: "Facturas de Venta", icon: Files, href: "/income/invoices", roles: ["ADMIN", "SUPERVISOR"] },
            { label: "Pagos Recibidos", icon: CreditCard, href: "/income/payments", roles: ["ADMIN", "SUPERVISOR"] },
            { label: "Facturas Recurrentes", icon: Repeat, href: "/income/recurring", roles: ["ADMIN", "SUPERVISOR"] },
            { label: "Notas de Crédito", icon: Files, href: "/income/credit-notes", roles: ["ADMIN", "SUPERVISOR"] },
            { label: "Conduces de Entrega", icon: Truck, href: "/income/delivery-notes", roles: ["ADMIN", "SUPERVISOR"] },
            { label: "Recibos de Caja", icon: Receipt, href: "/income/receipts", roles: ["ADMIN", "SUPERVISOR"] },
            { label: "Clientes", icon: Users, href: "/clients", roles: ["ADMIN", "SUPERVISOR"] },
        ]
    },
    {
        id: "finanzas",
        label: "Finanzas & Rentabilidad",
        icon: BarChart3,
        roles: ["ADMIN", "SUPERVISOR", "GERENTE"],
        items: [
            { label: "Costos & Rentabilidad", icon: DollarSign, href: "/admin/costos-rentabilidad", roles: ["ADMIN", "GERENTE"] },
            { label: "Motor de Incentivos", icon: Award, href: "/admin/incentivos", roles: ["ADMIN", "SUPERVISOR", "GERENTE"] },
            { label: "Calidad & Garantías (CNC)", icon: ShieldCheck, href: "/admin/calidad-garantias", roles: ["ADMIN", "SUPERVISOR", "GERENTE"] },
            { label: "Dashboard Finanzas", icon: BarChart3, href: "/admin/dashboard-financiero", roles: ["ADMIN", "GERENTE"] },
            { label: "Consejo Asesor IA", icon: Sparkles, href: "/admin/asesores", roles: ["ADMIN", "GERENTE", "SUPERVISOR"], badge: "IA" },
            { label: "Tesorería & Cuentas", icon: Landmark, href: "/admin/tesoreria", roles: ["ADMIN", "GERENTE"] },
            { label: "Control de Gastos", icon: Receipt, href: "/admin/gastos", roles: ["ADMIN", "SUPERVISOR", "GERENTE"] },
            { label: "Reportes Ejecutivos", icon: BarChart3, href: "/reports", roles: ["ADMIN", "SUPERVISOR"] },
        ]
    },
    {
        id: "inventario",
        label: "Inventario & Almacén",
        icon: PackageSearch,
        roles: ["ADMIN", "SUPERVISOR"],
        items: [
            { label: "Stock / Inventario", icon: PackageSearch, href: "/inventory", roles: ["ADMIN", "SUPERVISOR"] },
            { label: "Stock en Camionetas", icon: Truck, href: "/inventory/vehicles", roles: ["ADMIN", "SUPERVISOR", "GERENTE"] },
            { label: "Movimientos", icon: ArrowLeftRight, href: "/inventory/movements", roles: ["ADMIN", "SUPERVISOR"] },
        ]
    },
    {
        id: "administracion",
        label: "Administración & Ajustes",
        icon: Settings,
        roles: ["ADMIN", "GERENTE", "SUPERVISOR"],
        items: [
            { label: "Manual Gerencial & PDF", icon: BookOpen, href: "/admin/manual", roles: ["ADMIN", "GERENTE", "SUPERVISOR"] },
            { label: "Usuarios y Técnicos", icon: Users, href: "/technicians", roles: ["ADMIN"] },
            { label: "Ajustes de Empresa", icon: Settings, href: "/settings", roles: ["ADMIN"] },
        ]
    }
];

export function Sidebar() {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [userName, setUserName] = useState<string | null>(null);
    const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});
    const pathname = usePathname();

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (user) {
                const docRef = doc(db, "users", user.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setUserRole(data.rol || data.role || null);
                    setUserName(data.nombre || user.displayName || user.email || "Usuario");
                }
            } else {
                setUserRole(null);
                setUserName(null);
            }
        });
        return () => unsubscribe();
    }, []);

    // Auto-expand category that contains the active route
    useEffect(() => {
        navCategories.forEach(cat => {
            if (cat.items) {
                const hasActiveChild = cat.items.some(
                    item => pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
                );
                if (hasActiveChild) {
                    setOpenCategories(prev => ({ ...prev, [cat.id]: true }));
                }
            }
        });
    }, [pathname]);

    // Close mobile menu when route changes
    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    const toggleSidebar = () => setCollapsed(!collapsed);

    const toggleCategory = (categoryId: string) => {
        setOpenCategories(prev => ({
            ...prev,
            [categoryId]: !prev[categoryId]
        }));
    };

    // Filter categories and their sub-items based on user role
    const visibleCategories = navCategories
        .filter(cat => !userRole || cat.roles.includes(userRole))
        .map(cat => {
            if (!cat.items) return cat;
            const visibleItems = cat.items.filter(
                item => !userRole || item.roles.includes(userRole)
            );
            return {
                ...cat,
                items: visibleItems
            };
        })
        .filter(cat => (cat.href || (cat.items && cat.items.length > 0)));

    const isTechnician = userRole === "TECNICO" || userRole === "CONTRATISTA";

    return (
        <>
            {/* Mobile Toggle Button (Visible only on small screens) */}
            {!isTechnician && (
                <button
                    className="md:hidden fixed top-4 right-4 z-50 p-2 bg-white dark:bg-slate-800 rounded-full shadow-lg border text-blue-600 focus:outline-none"
                    onClick={() => setMobileOpen(!mobileOpen)}
                >
                    {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
            )}

            {/* Backdrop for mobile */}
            {mobileOpen && (
                <div 
                    className="md:hidden fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm transition-opacity"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            <aside
                className={cn(
                    "h-screen fixed md:relative top-0 left-0 z-40 bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-xl border-r border-slate-200 dark:border-slate-800 transition-all duration-300 flex flex-col shadow-2xl md:shadow-none",
                    collapsed ? "md:w-20" : "md:w-64",
                    "w-64", // Mobile is always full width of the drawer
                    mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
                    isTechnician ? "hidden md:flex" : "flex"
                )}
            >
                {/* Header / Logo */}
                <div className="h-16 flex items-center justify-center border-b border-gray-200/50 dark:border-gray-800/50 relative px-4">
                    <Link href="/" className={cn("flex items-center gap-2.5 transition-all duration-300", collapsed ? "scale-0 opacity-0 absolute" : "scale-100 opacity-100")}>
                        <img src="/logo.png" alt="HECHO Logo" className="h-9 w-auto object-contain max-w-[170px]" />
                    </Link>

                    {/* Collapsed Logo */}
                    <Link href="/" className={cn("absolute transition-all duration-300", collapsed ? "scale-100 opacity-100" : "scale-0 opacity-0")}>
                        <img src="/logo.png" alt="HECHO Logo" className="h-8 w-auto object-contain" />
                    </Link>

                    {/* Toggle Button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute -right-3 top-6 h-6 w-6 rounded-full bg-white dark:bg-slate-800 border shadow-md text-gray-500 hover:text-blue-600 z-50 hidden md:flex"
                        onClick={toggleSidebar}
                    >
                        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
                    </Button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1.5 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-800">

                    {/* CTA New Invoice - Only for Admin/Supervisor */}
                    {!isTechnician && (
                        <div className="mb-4 px-1">
                            <Button
                                className={cn(
                                    "w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-md shadow-blue-500/20 transition-all duration-300",
                                    collapsed ? "h-11 w-11 rounded-xl p-0 justify-center" : "justify-start gap-2.5 h-10"
                                )}
                                asChild
                            >
                                <Link href="/income/invoices/new">
                                    <Mic className={cn("h-4 w-4", collapsed ? "mr-0" : "")} />
                                    {!collapsed && <span className="text-sm font-medium">Nueva Factura</span>}
                                </Link>
                            </Button>
                        </div>
                    )}

                    {/* Categorized Menu Items */}
                    {visibleCategories.map((category) => {
                        // Direct Single Link (like Dashboard)
                        if (category.href && (!category.items || category.items.length === 0)) {
                            const isActive = pathname === category.href;
                            return (
                                <Link
                                    key={category.id}
                                    href={category.href}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 group relative",
                                        isActive
                                            ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium"
                                            : "text-gray-600 dark:text-gray-400 hover:bg-gray-100/70 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-200"
                                    )}
                                >
                                    <category.icon className={cn("h-5 w-5 shrink-0 transition-colors", isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-500 group-hover:text-gray-700 dark:text-gray-500")} />

                                    {!collapsed && (
                                        <span className="truncate text-sm">{category.label}</span>
                                    )}

                                    {collapsed && (
                                        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                                            {category.label}
                                        </div>
                                    )}

                                    {isActive && !collapsed && (
                                        <div className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
                                    )}
                                </Link>
                            );
                        }

                        // Collapsible Category Group
                        const isOpen = !!openCategories[category.id];
                        const hasActiveChild = (category.items || []).some(
                            item => pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
                        );

                        // In Collapsed Sidebar mode, render a Dropdown Menu on hover/click
                        if (collapsed) {
                            return (
                                <div key={category.id} className="relative group">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button
                                                className={cn(
                                                    "w-full flex items-center justify-center p-2.5 rounded-xl transition-all duration-200",
                                                    hasActiveChild
                                                        ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600"
                                                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50"
                                                )}
                                                title={category.label}
                                            >
                                                <category.icon className={cn("h-5 w-5", hasActiveChild ? "text-blue-600" : "text-gray-500")} />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent side="right" align="start" className="w-56 bg-white dark:bg-slate-900 shadow-xl border p-1.5">
                                            <DropdownMenuLabel className="text-xs font-bold text-gray-500 uppercase px-2 py-1">
                                                {category.label}
                                            </DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            {(category.items || []).map(item => {
                                                const isItemActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                                                return (
                                                    <DropdownMenuItem key={item.href} asChild>
                                                        <Link
                                                            href={item.href}
                                                            className={cn(
                                                                "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs cursor-pointer",
                                                                isItemActive
                                                                    ? "bg-blue-50 text-blue-600 font-semibold dark:bg-blue-950/50"
                                                                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-50"
                                                            )}
                                                        >
                                                            <item.icon className="h-4 w-4" />
                                                            <span>{item.label}</span>
                                                        </Link>
                                                    </DropdownMenuItem>
                                                );
                                            })}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            );
                        }

                        // Expanded Sidebar mode (Accordion Category)
                        return (
                            <div key={category.id} className="space-y-1">
                                <button
                                    type="button"
                                    onClick={() => toggleCategory(category.id)}
                                    className={cn(
                                        "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-200 group",
                                        hasActiveChild
                                            ? "text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/10"
                                            : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/40"
                                    )}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <category.icon className={cn("h-4 w-4 transition-colors", hasActiveChild ? "text-blue-600 dark:text-blue-400" : "text-gray-400 group-hover:text-gray-600")} />
                                        <span className="truncate">{category.label}</span>
                                    </div>
                                    <div className="flex items-center">
                                        {hasActiveChild && !isOpen && (
                                            <div className="h-1.5 w-1.5 rounded-full bg-blue-600 mr-2" />
                                        )}
                                        <ChevronDown
                                            className={cn(
                                                "h-3.5 w-3.5 transition-transform duration-200 opacity-70",
                                                isOpen ? "rotate-180 text-blue-600" : "rotate-0"
                                            )}
                                        />
                                    </div>
                                </button>

                                {/* Collapsible sub-items */}
                                {isOpen && (
                                    <div className="pl-3.5 pr-1 space-y-0.5 border-l-2 border-slate-100 dark:border-slate-800 ml-4 my-1 transition-all duration-300">
                                        {(category.items || []).map(item => {
                                            const isItemActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                                            return (
                                                <Link
                                                    key={item.href}
                                                    href={item.href}
                                                    className={cn(
                                                        "flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm transition-all duration-150 group relative",
                                                        isItemActive
                                                            ? "bg-blue-50 dark:bg-blue-900/25 text-blue-600 dark:text-blue-400 font-medium"
                                                            : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/40 hover:text-gray-900 dark:hover:text-gray-200"
                                                    )}
                                                >
                                                    <item.icon className={cn("h-4 w-4 shrink-0 transition-colors", isItemActive ? "text-blue-600 dark:text-blue-400" : "text-gray-400 group-hover:text-gray-600 dark:text-gray-500")} />
                                                    <span className="truncate text-xs">{item.label}</span>
                                                    {isItemActive && (
                                                        <div className="ml-auto h-1 w-1 rounded-full bg-blue-600 dark:bg-blue-400" />
                                                    )}
                                                </Link>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
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
                                {userRole === "TECNICO" ? "T" : userRole === "CONTRATISTA" ? "C" : userRole === "GERENTE_TICKETS" ? "GT" : userRole === "PROPERTY_MANAGER" ? "PM" : "A"}
                            </div>
                            {!collapsed && (
                                <div className="flex-1 min-w-0 text-left">
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{userName || "Cargando..."}</p>
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
        </>
    );
}
