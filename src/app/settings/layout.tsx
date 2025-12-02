"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Settings, Users, FileText, Shield, ArrowLeft, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SettingsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    const navItems = [
        {
            title: "Tipos de Ticket",
            href: "/settings/ticket-types",
            icon: FileText,
        },
        {
            title: "Técnicos",
            href: "/settings/technicians",
            icon: Users,
        },
        {
            title: "Roles y Permisos",
            href: "/settings/roles",
            icon: Shield,
        },
        {
            title: "Perfil de Empresa",
            href: "/settings/company",
            icon: Building2,
        },
    ];

    return (
        <div className="min-h-screen bg-slate-50">
            <header className="bg-white border-b sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-4">
                    <Link href="/">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div className="flex items-center gap-2">
                        <Settings className="h-5 w-5 text-gray-500" />
                        <h1 className="text-xl font-bold text-gray-900">Ajustes del Sistema</h1>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col md:flex-row gap-8">
                    <aside className="w-full md:w-64 shrink-0">
                        <nav className="space-y-1">
                            {navItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                                        pathname === item.href
                                            ? "bg-blue-50 text-blue-700"
                                            : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                                    )}
                                >
                                    <item.icon className="h-4 w-4" />
                                    {item.title}
                                </Link>
                            ))}
                        </nav>
                    </aside>
                    <main className="flex-1">
                        {children}
                    </main>
                </div>
            </div>
        </div>
    );
}
