"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Location, Ticket } from "@/types/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Shield,
    Calendar,
    AlertCircle,
    CheckCircle2,
    Clock,
    Plus,
    Share2,
    MapPin,
    ExternalLink,
    Search,
    BookOpen,
    Building2,
    Sparkles,
    AlertTriangle,
    RefreshCw
} from "lucide-react";
import { useRouter } from "next/navigation";

export function RecurringMaintenanceTracker() {
    const router = useRouter();
    const [locations, setLocations] = useState<Location[]>([]);
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<"ALL" | "OVERDUE" | "UPCOMING" | "UP_TO_DATE" | "UNSCHEDULED">("ALL");

    // 1. Cargar todas las villas clasificadas como Iguala
    useEffect(() => {
        const q = query(
            collection(db, "locations"),
            orderBy("createdAt", "desc")
        );

        const unsubscribe = onSnapshot(q, (snap) => {
            const locs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Location));
            // Filtrar las que son igualas
            const igualas = locs.filter((l) => l.isRetainer || l.contractType === "IGUALA" || true);
            setLocations(igualas);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // 2. Cargar todos los tickets para calcular historial y fechas de visitas
    useEffect(() => {
        const tQ = query(collection(db, "tickets"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(tQ, (snap) => {
            const tData = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Ticket));
            setTickets(tData);
        });
        return () => unsubscribe();
    }, []);

    // 3. Procesar el estado de cada villa respecto a su ciclo de mantenimiento
    const processedVillas = useMemo(() => {
        const now = new Date();
        const todayStr = now.toISOString().slice(0, 10);
        const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

        return locations.map((loc) => {
            // Buscar tickets de esta villa (por locationId o clientId + nombre)
            const villaTickets = tickets.filter((t) => {
                if (t.locationId && t.locationId === loc.id) return true;
                if (t.clientId && loc.clientId && t.clientId === loc.clientId) {
                    const locName = (loc.nombre || "").toLowerCase();
                    const tLoc = (t.locationName || t.specificLocation || "").toLowerCase();
                    return locName.includes(tLoc) || tLoc.includes(locName);
                }
                return false;
            });

            // Último ticket completado
            const lastCompleted = villaTickets.find((t) => t.status === "COMPLETED");
            const lastDate = lastCompleted?.createdAt?.seconds
                ? new Date(lastCompleted.createdAt.seconds * 1000)
                : null;

            // Días transcurridos
            const daysSinceLast = lastDate
                ? Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
                : null;

            // Ciclo en días según frecuencia
            const freq = loc.maintenanceFrequency || "MENSUAL";
            const cycleDays = freq === "TRIMESTRAL" ? 90 : freq === "BIMESTRAL" ? 60 : 30;

            // Hay un ticket activo hoy o en progreso
            const hasActiveTicket = villaTickets.some((t) => t.status === "OPEN" || t.status === "IN_PROGRESS");

            // Clasificación del estado
            let status: "OVERDUE" | "UPCOMING" | "UP_TO_DATE" | "UNSCHEDULED" = "UNSCHEDULED";
            let statusLabel = "Sin Programar";
            let statusBadgeColor = "bg-slate-100 text-slate-700 border-slate-200";

            if (hasActiveTicket) {
                status = "UP_TO_DATE";
                statusLabel = "Intervención en Curso";
                statusBadgeColor = "bg-blue-100 text-blue-800 border-blue-200";
            } else if (loc.nextMaintenanceDate) {
                if (loc.nextMaintenanceDate < todayStr) {
                    status = "OVERDUE";
                    statusLabel = "Vencido / Atrasado";
                    statusBadgeColor = "bg-red-100 text-red-800 border-red-300";
                } else if (loc.nextMaintenanceDate <= in7Days) {
                    status = "UPCOMING";
                    statusLabel = "Próximo (Esta Semana)";
                    statusBadgeColor = "bg-amber-100 text-amber-800 border-amber-300";
                } else {
                    status = "UP_TO_DATE";
                    statusLabel = "Al Día";
                    statusBadgeColor = "bg-emerald-100 text-emerald-800 border-emerald-200";
                }
            } else if (daysSinceLast !== null) {
                if (daysSinceLast > cycleDays) {
                    status = "OVERDUE";
                    statusLabel = "Ciclo Cumplido (+30d)";
                    statusBadgeColor = "bg-red-100 text-red-800 border-red-300";
                } else {
                    status = "UP_TO_DATE";
                    statusLabel = "Al Día";
                    statusBadgeColor = "bg-emerald-100 text-emerald-800 border-emerald-200";
                }
            }

            return {
                ...loc,
                lastCompletedTicket: lastCompleted,
                daysSinceLast,
                status,
                statusLabel,
                statusBadgeColor,
                cycleDays,
                hasActiveTicket,
                ticketCount: villaTickets.length,
            };
        });
    }, [locations, tickets]);

    // Filtrar por término de búsqueda y estado
    const filteredVillas = useMemo(() => {
        return processedVillas.filter((v) => {
            const matchesSearch =
                (v.nombre || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                (v.clientName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                (v.direccion || "").toLowerCase().includes(searchTerm.toLowerCase());

            const matchesStatus = statusFilter === "ALL" || v.status === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [processedVillas, searchTerm, statusFilter]);

    // Conteo por estado para los badges superiores
    const counts = useMemo(() => {
        return {
            total: processedVillas.length,
            overdue: processedVillas.filter((v) => v.status === "OVERDUE").length,
            upcoming: processedVillas.filter((v) => v.status === "UPCOMING").length,
            upToDate: processedVillas.filter((v) => v.status === "UP_TO_DATE").length,
            unscheduled: processedVillas.filter((v) => v.status === "UNSCHEDULED").length,
        };
    }, [processedVillas]);

    // Enviar recordatorio de mantenimiento por WhatsApp al propietario
    const handleSendReminderWhatsApp = (villa: any) => {
        const clientName = villa.clientName || "Estimado cliente";
        const dateText = villa.nextMaintenanceDate ? `el ${villa.nextMaintenanceDate}` : "en los próximos días";
        const msg = `*Recordatorio de Mantenimiento Preventivo* ❄️\n` +
            `Hola ${clientName}, le saludamos de *HECHO SRL*.\n` +
            `Le recordamos que el mantenimiento de climatización para su villa *${villa.nombre}* está programado para ${dateText}.\n\n` +
            `¿Desea confirmar el acceso para nuestro equipo técnico?\n` +
            `Consulte su Bitácora Digital aquí: ${window.location.origin}/villas/${villa.id}`;

        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, "_blank");
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 space-y-3 bg-white rounded-2xl border border-slate-200">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm text-slate-500">Cargando Centro de Control de Igualas...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Cabecera & Semáforo del Ciclo */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
                <div
                    onClick={() => setStatusFilter("ALL")}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${statusFilter === "ALL"
                        ? "bg-slate-900 text-white border-slate-900 shadow-md"
                        : "bg-white text-slate-900 border-slate-200 hover:border-slate-300"
                        }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold opacity-80">Total Villas con Iguala</span>
                        <Shield className="w-4 h-4 text-emerald-400" />
                    </div>
                    <p className="text-2xl font-black mt-2">{counts.total}</p>
                    <p className="text-[11px] opacity-70 mt-0.5">Contratos vigentes</p>
                </div>

                <div
                    onClick={() => setStatusFilter("OVERDUE")}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${statusFilter === "OVERDUE"
                        ? "bg-red-600 text-white border-red-600 shadow-md"
                        : "bg-red-50 text-red-950 border-red-200 hover:border-red-300"
                        }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold opacity-90">Atención / Vencidos</span>
                        <AlertCircle className="w-4 h-4 text-red-500" />
                    </div>
                    <p className="text-2xl font-black mt-2">{counts.overdue}</p>
                    <p className="text-[11px] opacity-80 mt-0.5">Requieren visita urgente</p>
                </div>

                <div
                    onClick={() => setStatusFilter("UPCOMING")}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${statusFilter === "UPCOMING"
                        ? "bg-amber-500 text-white border-amber-500 shadow-md"
                        : "bg-amber-50 text-amber-950 border-amber-200 hover:border-amber-300"
                        }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold opacity-90">Próximos (Esta Semana)</span>
                        <Clock className="w-4 h-4 text-amber-500" />
                    </div>
                    <p className="text-2xl font-black mt-2">{counts.upcoming}</p>
                    <p className="text-[11px] opacity-80 mt-0.5">Visitas en los próximos 7 días</p>
                </div>

                <div
                    onClick={() => setStatusFilter("UP_TO_DATE")}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${statusFilter === "UP_TO_DATE"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
                        : "bg-emerald-50 text-emerald-950 border-emerald-200 hover:border-emerald-300"
                        }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold opacity-90">Al Día</span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    </div>
                    <p className="text-2xl font-black mt-2">{counts.upToDate}</p>
                    <p className="text-[11px] opacity-80 mt-0.5">Mantenimiento completado</p>
                </div>
            </div>

            {/* Barra de Búsqueda y Filtros Rápidos */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                        placeholder="Buscar villa, cliente o sector..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 text-xs"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
                    <Button
                        onClick={() => setStatusFilter("ALL")}
                        size="sm"
                        variant={statusFilter === "ALL" ? "default" : "outline"}
                        className="text-xs shrink-0"
                    >
                        Todos ({counts.total})
                    </Button>
                    <Button
                        onClick={() => setStatusFilter("OVERDUE")}
                        size="sm"
                        variant={statusFilter === "OVERDUE" ? "destructive" : "outline"}
                        className="text-xs shrink-0"
                    >
                        Vencidos ({counts.overdue})
                    </Button>
                    <Button
                        onClick={() => setStatusFilter("UPCOMING")}
                        size="sm"
                        variant={statusFilter === "UPCOMING" ? "default" : "outline"}
                        className="text-xs shrink-0"
                    >
                        Esta Semana ({counts.upcoming})
                    </Button>
                    <Button
                        onClick={() => setStatusFilter("UNSCHEDULED")}
                        size="sm"
                        variant={statusFilter === "UNSCHEDULED" ? "default" : "outline"}
                        className="text-xs shrink-0"
                    >
                        Sin Fecha ({counts.unscheduled})
                    </Button>
                    <Button
                        onClick={() => router.push("/admin/almacenamiento")}
                        size="sm"
                        variant="outline"
                        className="text-xs shrink-0 text-amber-900 border-amber-300 hover:bg-amber-50 gap-1.5 font-semibold ml-auto"
                        title="Supervisión global de fotos y retención a 3 años"
                    >
                        <Shield className="w-3.5 h-3.5 text-amber-600" />
                        Auditoría Retención 3 Años
                    </Button>
                </div>
            </div>

            {/* Listado de Villas & Control de Ciclo */}
            {filteredVillas.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center space-y-3">
                    <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
                    <h3 className="text-base font-semibold text-slate-800">No se encontraron villas</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        No hay villas que coincidan con el filtro seleccionado. Cambia de filtro o da de alta una nueva villa con contrato de iguala.
                    </p>
                </div>
            ) : (
                <div className="grid gap-3">
                    {filteredVillas.map((villa) => {
                        const newTicketUrl = `/tickets/new?clientId=${villa.clientId || ""}&locationId=${villa.id}&isRetainer=true`;

                        return (
                            <div
                                key={villa.id}
                                className="bg-white rounded-xl border border-slate-200 p-4 md:p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                            >
                                <div className="space-y-2 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${villa.statusBadgeColor}`}>
                                            {villa.statusLabel}
                                        </span>
                                        <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                            Ciclo: {villa.maintenanceFrequency || "Mensual"}
                                        </span>
                                        {villa.hasActiveTicket && (
                                            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-1">
                                                <RefreshCw className="w-3 h-3 animate-spin" /> Ticket Activo Hoy
                                            </span>
                                        )}
                                    </div>

                                    <div>
                                        <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                                            <Building2 className="w-4 h-4 text-emerald-600 inline-block" />
                                            {villa.nombre}
                                        </h3>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            Propietario: <span className="font-semibold text-slate-700">{villa.clientName || "No registrado"}</span> &bull; {villa.direccion || "Punta Cana"}
                                        </p>
                                    </div>

                                    {/* Métricas de tiempo de la Villa */}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-1">
                                        <div className="bg-slate-50 p-2 rounded-lg">
                                            <span className="text-slate-400 block text-[10px] font-medium">Última Visita:</span>
                                            <span className="font-semibold text-slate-800">
                                                {villa.lastCompletedTicket?.createdAt?.seconds
                                                    ? new Date(villa.lastCompletedTicket.createdAt.seconds * 1000).toLocaleDateString("es-DO")
                                                    : "Sin registros"}
                                            </span>
                                            {villa.daysSinceLast !== null && (
                                                <span className="text-[10px] text-slate-500 block">hace {villa.daysSinceLast} días</span>
                                            )}
                                        </div>

                                        <div className="bg-slate-50 p-2 rounded-lg">
                                            <span className="text-slate-400 block text-[10px] font-medium">Próxima Fecha:</span>
                                            <span className="font-semibold text-slate-800">
                                                {villa.nextMaintenanceDate || "Por programar"}
                                            </span>
                                        </div>

                                        <div className="bg-slate-50 p-2 rounded-lg col-span-2 sm:col-span-1">
                                            <span className="text-slate-400 block text-[10px] font-medium">Historial:</span>
                                            <span className="font-semibold text-slate-800">
                                                {villa.ticketCount} mantenimientos
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Acciones Directas para Supervisores */}
                                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 shrink-0">
                                    {/* Botón GPS */}
                                    {villa.locationUrl && (
                                        <a
                                            href={villa.locationUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-slate-100 transition-colors"
                                            title="Abrir GPS de la Villa"
                                        >
                                            <MapPin className="w-4 h-4 text-emerald-600" />
                                        </a>
                                    )}

                                    {/* Botón WhatsApp Recordatorio */}
                                    <Button
                                        onClick={() => handleSendReminderWhatsApp(villa)}
                                        size="sm"
                                        variant="outline"
                                        className="text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50 gap-1.5"
                                        title="Enviar recordatorio de acceso por WhatsApp al dueño"
                                    >
                                        <Share2 className="w-3.5 h-3.5" />
                                        Avisar WhatsApp
                                    </Button>

                                    {/* Botón Ver Bitácora */}
                                    <Button
                                        onClick={() => router.push(`/clients/locations/${villa.id}`)}
                                        size="sm"
                                        variant="outline"
                                        className="text-xs text-slate-700 gap-1.5"
                                    >
                                        <BookOpen className="w-3.5 h-3.5" />
                                        Bitácora
                                    </Button>

                                    {/* Botón Crear Ticket del Ciclo */}
                                    <Button
                                        onClick={() => router.push(newTicketUrl)}
                                        size="sm"
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5 shadow-sm"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        Crear Ticket
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
