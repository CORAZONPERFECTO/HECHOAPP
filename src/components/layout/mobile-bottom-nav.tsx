"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    LayoutDashboard,
    Ticket,
    Wrench,
    QrCode,
    Building2,
    Users,
    Plus,
    Download,
    Smartphone,
    Menu,
    Settings
} from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { usePWAInstall } from "@/context/pwa-context";
import { EquipmentQrScannerModal } from "@/components/equipment/equipment-qr-scanner-modal";

export function MobileBottomNav() {
    const pathname = usePathname();
    const router = useRouter();
    const { canInstall, promptInstall, isInstalled, isIOS } = usePWAInstall();
    const [userRole, setUserRole] = useState<string | null>(null);
    const [scannerOpen, setScannerOpen] = useState(false);

    useEffect(() => {
        const unsub = auth.onAuthStateChanged(async (currentUser) => {
            if (currentUser) {
                try {
                    const snap = await getDoc(doc(db, "users", currentUser.uid));
                    if (snap.exists()) {
                        setUserRole(snap.data()?.role || "ADMIN");
                    } else {
                        setUserRole("ADMIN");
                    }
                } catch {
                    setUserRole("ADMIN");
                }
            }
        });
        return () => unsub();
    }, []);

    // Don't render on public / auth / standalone print pages
    const hiddenRoutes = ["/login", "/signup", "/c/", "/r/", "/print/"];
    if (hiddenRoutes.some(route => pathname.startsWith(route))) {
        return null;
    }

    const isTechnician = userRole === "TECNICO" || userRole === "CONTRATISTA";

    const handleScanResult = (codeOrToken: string) => {
        router.push(`/qr/${codeOrToken}`);
    };

    return (
        <>
            <nav
                className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
                aria-label="Navegación Móvil Inferior"
            >
                <div className="flex items-center justify-around h-16 px-1 max-w-lg mx-auto">
                    {isTechnician ? (
                        // Technician navigation items
                        <>
                            <Link
                                href="/technician/my-day"
                                className={cn(
                                    "flex flex-col items-center justify-center flex-1 py-1 transition-colors",
                                    pathname.startsWith("/technician/my-day")
                                        ? "text-blue-600 dark:text-blue-400 font-semibold"
                                        : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
                                )}
                            >
                                <Wrench className="w-5 h-5 mb-0.5" />
                                <span className="text-[10px] tracking-tight">Mi Día</span>
                            </Link>

                            <Link
                                href="/tickets"
                                className={cn(
                                    "flex flex-col items-center justify-center flex-1 py-1 transition-colors",
                                    pathname === "/tickets" || pathname.startsWith("/technician/tickets")
                                        ? "text-blue-600 dark:text-blue-400 font-semibold"
                                        : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
                                )}
                            >
                                <Ticket className="w-5 h-5 mb-0.5" />
                                <span className="text-[10px] tracking-tight">Tickets</span>
                            </Link>

                            {/* Center Action: Scanner QR */}
                            <div className="flex-1 flex justify-center -mt-5">
                                <button
                                    onClick={() => setScannerOpen(true)}
                                    className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/35 hover:scale-105 active:scale-95 transition-all border-4 border-white dark:border-slate-900"
                                    aria-label="Escanear Código QR de Equipo"
                                >
                                    <QrCode className="w-5 h-5" />
                                </button>
                            </div>

                            <Link
                                href="/technician/projects"
                                className={cn(
                                    "flex flex-col items-center justify-center flex-1 py-1 transition-colors",
                                    pathname.startsWith("/technician/projects")
                                        ? "text-blue-600 dark:text-blue-400 font-semibold"
                                        : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
                                )}
                            >
                                <Building2 className="w-5 h-5 mb-0.5" />
                                <span className="text-[10px] tracking-tight">Proyectos</span>
                            </Link>

                            {canInstall ? (
                                <button
                                    onClick={() => promptInstall()}
                                    className="flex flex-col items-center justify-center flex-1 py-1 text-blue-600 dark:text-blue-400 transition-colors animate-pulse"
                                >
                                    {isIOS ? <Smartphone className="w-5 h-5 mb-0.5" /> : <Download className="w-5 h-5 mb-0.5" />}
                                    <span className="text-[10px] font-bold">Instalar</span>
                                </button>
                            ) : (
                                <Link
                                    href="/settings"
                                    className={cn(
                                        "flex flex-col items-center justify-center flex-1 py-1 transition-colors",
                                        pathname.startsWith("/settings")
                                            ? "text-blue-600 dark:text-blue-400 font-semibold"
                                            : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
                                    )}
                                >
                                    <Settings className="w-5 h-5 mb-0.5" />
                                    <span className="text-[10px] tracking-tight">Ajustes</span>
                                </Link>
                            )}
                        </>
                    ) : (
                        // Admin / Operations navigation items
                        <>
                            <Link
                                href="/"
                                className={cn(
                                    "flex flex-col items-center justify-center flex-1 py-1 transition-colors",
                                    pathname === "/"
                                        ? "text-blue-600 dark:text-blue-400 font-semibold"
                                        : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
                                )}
                            >
                                <LayoutDashboard className="w-5 h-5 mb-0.5" />
                                <span className="text-[10px] tracking-tight">Dashboard</span>
                            </Link>

                            <Link
                                href="/tickets"
                                className={cn(
                                    "flex flex-col items-center justify-center flex-1 py-1 transition-colors",
                                    pathname.startsWith("/tickets") && pathname !== "/tickets/new"
                                        ? "text-blue-600 dark:text-blue-400 font-semibold"
                                        : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
                                )}
                            >
                                <Ticket className="w-5 h-5 mb-0.5" />
                                <span className="text-[10px] tracking-tight">Tickets</span>
                            </Link>

                            {/* Center Action: Nuevo Ticket */}
                            <div className="flex-1 flex justify-center -mt-5">
                                <Link
                                    href="/tickets/new"
                                    className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/35 hover:scale-105 active:scale-95 transition-all border-4 border-white dark:border-slate-900"
                                    aria-label="Crear Nuevo Ticket"
                                >
                                    <Plus className="w-6 h-6 stroke-[2.5]" />
                                </Link>
                            </div>

                            <Link
                                href="/clients"
                                className={cn(
                                    "flex flex-col items-center justify-center flex-1 py-1 transition-colors",
                                    pathname.startsWith("/clients")
                                        ? "text-blue-600 dark:text-blue-400 font-semibold"
                                        : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
                                )}
                            >
                                <Users className="w-5 h-5 mb-0.5" />
                                <span className="text-[10px] tracking-tight">Villas</span>
                            </Link>

                            {canInstall ? (
                                <button
                                    onClick={() => promptInstall()}
                                    className="flex flex-col items-center justify-center flex-1 py-1 text-blue-600 dark:text-blue-400 transition-colors"
                                >
                                    {isIOS ? <Smartphone className="w-5 h-5 mb-0.5" /> : <Download className="w-5 h-5 mb-0.5" />}
                                    <span className="text-[10px] font-bold">Instalar</span>
                                </button>
                            ) : (
                                <Link
                                    href="/settings"
                                    className={cn(
                                        "flex flex-col items-center justify-center flex-1 py-1 transition-colors",
                                        pathname.startsWith("/settings")
                                            ? "text-blue-600 dark:text-blue-400 font-semibold"
                                            : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
                                    )}
                                >
                                    <Settings className="w-5 h-5 mb-0.5" />
                                    <span className="text-[10px] tracking-tight">Ajustes</span>
                                </Link>
                            )}
                        </>
                    )}
                </div>
            </nav>

            {/* Modal for camera QR scanning */}
            <EquipmentQrScannerModal
                open={scannerOpen}
                onOpenChange={setScannerOpen}
                onScan={handleScanResult}
            />
        </>
    );
}
