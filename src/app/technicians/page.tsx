"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { User } from "@/types/schema";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft, Mail, Phone, Shield, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";

const ROL_LABELS: Record<string, string> = {
    ADMIN: "Administrador",
    SUPERVISOR: "Supervisor",
    GERENTE: "Gerente",
    GERENTE_TICKETS: "Gerente de Tickets",
    TECNICO: "Técnico",
    CONTRATISTA: "Contratista",
    CLIENTE: "Cliente",
    PROPERTY_MANAGER: "Gestor de Propiedades",
};

const ROL_COLORS: Record<string, string> = {
    ADMIN: "bg-red-100 text-red-700 border-red-200",
    SUPERVISOR: "bg-purple-100 text-purple-700 border-purple-200",
    GERENTE: "bg-blue-100 text-blue-700 border-blue-200",
    GERENTE_TICKETS: "bg-indigo-100 text-indigo-700 border-indigo-200",
    TECNICO: "bg-green-100 text-green-700 border-green-200",
    CONTRATISTA: "bg-orange-100 text-orange-700 border-orange-200",
    CLIENTE: "bg-gray-100 text-gray-700 border-gray-200",
    PROPERTY_MANAGER: "bg-cyan-100 text-cyan-700 border-cyan-200",
};

const FILTER_TABS = [
    { label: "Todos", value: "ALL" },
    { label: "Administradores", value: "ADMIN" },
    { label: "Supervisores", value: "SUPERVISOR" },
    { label: "Ger. Tickets", value: "GERENTE_TICKETS" },
    { label: "Técnicos", value: "TECNICO" },
    { label: "Contratistas", value: "CONTRATISTA" },
    { label: "Clientes", value: "CLIENTE" },
    { label: "Gestores", value: "PROPERTY_MANAGER" },
];

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState("ALL");
    const [search, setSearch] = useState("");
    const router = useRouter();

    useEffect(() => {
        // Fetch ALL users regardless of role
        const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as User[];
            // Sort by name
            data.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
            setUsers(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const filtered = users.filter((u) => {
        const matchesRole = activeFilter === "ALL" || u.rol === activeFilter;
        const q = search.toLowerCase();
        const matchesSearch =
            !q ||
            u.nombre?.toLowerCase().includes(q) ||
            u.email?.toLowerCase().includes(q) ||
            u.telefono?.toLowerCase().includes(q);
        return matchesRole && matchesSearch;
    });

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b sticky top-0 z-10 px-6 py-4">
                <div className="max-w-6xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => router.push("/")}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <Users className="h-5 w-5 text-blue-600" />
                                Gestión de Usuarios
                            </h1>
                            <p className="text-sm text-gray-500">
                                {users.length} usuario{users.length !== 1 ? "s" : ""} registrado{users.length !== 1 ? "s" : ""}
                            </p>
                        </div>
                    </div>
                    <Link href="/technicians/new">
                        <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-md gap-2">
                            <Plus className="h-4 w-4" />
                            Nuevo Usuario
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="max-w-6xl mx-auto p-6 space-y-4">
                {/* Search */}
                <input
                    type="text"
                    placeholder="Buscar por nombre, email o teléfono..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                {/* Role Filter Tabs */}
                <div className="flex gap-2 flex-wrap">
                    {FILTER_TABS.map((tab) => {
                        const count = tab.value === "ALL"
                            ? users.length
                            : users.filter(u => u.rol === tab.value).length;
                        return (
                            <button
                                key={tab.value}
                                onClick={() => setActiveFilter(tab.value)}
                                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                                    activeFilter === tab.value
                                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                        : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                                }`}
                            >
                                {tab.label}
                                <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                                    activeFilter === tab.value ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-500"
                                }`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* User Cards */}
                {loading ? (
                    <div className="text-center py-16 text-gray-400">Cargando usuarios...</div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                        No hay usuarios{activeFilter !== "ALL" ? ` con rol ${ROL_LABELS[activeFilter] || activeFilter}` : ""}.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filtered.map((user) => (
                            <div
                                key={user.id}
                                onClick={() => router.push(`/technicians/${user.id}`)}
                                className="bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        {/* Avatar */}
                                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                                            {(user.nombre || user.email || "?").charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                                                {user.nombre || "Sin nombre"}
                                            </p>
                                            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${ROL_COLORS[user.rol] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
                                                {ROL_LABELS[user.rol] || user.rol}
                                            </span>
                                        </div>
                                    </div>
                                    <Badge variant={user.activo ? "default" : "secondary"} className="text-xs shrink-0">
                                        {user.activo ? "Activo" : "Inactivo"}
                                    </Badge>
                                </div>

                                <div className="space-y-1.5 text-sm text-gray-500">
                                    {user.email && (
                                        <div className="flex items-center gap-2">
                                            <Mail className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                            <span className="truncate">{user.email}</span>
                                        </div>
                                    )}
                                    {user.telefono && (
                                        <div className="flex items-center gap-2">
                                            <Phone className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                            <span>{user.telefono}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
