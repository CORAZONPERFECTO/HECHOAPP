"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Location, Ticket } from "@/types/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    HardDrive,
    Shield,
    AlertTriangle,
    CheckCircle2,
    Clock,
    Search,
    Building2,
    Calendar,
    Camera,
    RefreshCw,
    ExternalLink,
    ArrowLeft,
    Check,
    FolderArchive
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AdminAlmacenamientoPage() {
    const router = useRouter();
    const [locations, setLocations] = useState<Location[]>([]);
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchFilter, setSearchFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState<"ALL" | "NEED_REVIEW" | "PRESERVED" | "OPTIMIZED">("ALL");
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    // Cargar locations
    useEffect(() => {
        const qLoc = query(collection(db, "locations"), orderBy("createdAt", "desc"));
        const unsubLoc = onSnapshot(qLoc, (snap) => {
            const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Location));
            setLocations(list);
            setLoading(false);
        });
        return () => unsubLoc();
    }, []);

    // Cargar tickets para auditoria de evidencias y fechas
    useEffect(() => {
        const qTick = query(collection(db, "tickets"), orderBy("createdAt", "desc"));
        const unsubTick = onSnapshot(qTick, (snap) => {
            const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Ticket));
            setTickets(list);
        });
        return () => unsubTick();
    }, []);

    // Mapeo y analisis de retencion por villa
    const auditData = useMemo(() => {
        const threeYearsAgo = new Date();
        threeYearsAgo.setDate(threeYearsAgo.getDate() - 1095); // 3 anos = 1095 dias

        return locations.map((loc) => {
            // Tickets vinculados a esta villa
            const villaTickets = tickets.filter((t) => {
                const sameLoc = t.locationId && t.locationId === loc.id;
                const sameName = t.clientName && loc.nombre && t.clientName.toLowerCase().includes(loc.nombre.toLowerCase());
                return sameLoc || sameName;
            });

            // Tickets mayores a 3 anos
            const oldTickets = villaTickets.filter((t) => {
                const d = t.scheduledStart?.toDate ? t.scheduledStart.toDate() : (t.createdAt?.toDate ? t.createdAt.toDate() : null);
                return d && d < threeYearsAgo;
            });

            // Conteo de evidencias fotograficas en la villa
            let totalPhotos = 0;
            let oldPhotosCount = 0;

            villaTickets.forEach((t) => {
                const d = t.scheduledStart?.toDate ? t.scheduledStart.toDate() : (t.createdAt?.toDate ? t.createdAt.toDate() : null);
                const isOld = d && d < threeYearsAgo;

                // Fotos de areas
                t.surveyAreas?.forEach((a) => {
                    const cnt = (a.photos?.length || 0) + (a.platePhotoUrl ? 1 : 0) + (a.boardPhotoUrl ? 1 : 0);
                    totalPhotos += cnt;
                    if (isOld) oldPhotosCount += cnt;
                });

                // Fotos generales del ticket (BEFORE, DURING, AFTER, SURVEY)
                const ticketPhotosCnt = t.photos?.length || 0;
                totalPhotos += ticketPhotosCnt;
                if (isOld) oldPhotosCount += ticketPhotosCnt;
            });

            // Estimacion de almacenamiento (aprox 1.8 MB por foto promedio)
            const estimatedMb = Number((totalPhotos * 1.8).toFixed(1));
            const oldEstimatedMb = Number((oldPhotosCount * 1.8).toFixed(1));

            // Estado de retencion
            let retentionStatus: "NEED_REVIEW" | "PRESERVED" | "OPTIMIZED" = "OPTIMIZED";
            if (oldTickets.length > 0 && !loc.retentionDecision) {
                retentionStatus = "NEED_REVIEW";
            } else if (loc.retentionDecision === "PRESERVE_ALL") {
                retentionStatus = "PRESERVED";
            } else if (loc.retentionDecision === "PURGED_OLD") {
                retentionStatus = "OPTIMIZED";
            }

            return {
                location: loc,
                villaTickets,
                oldTickets,
                totalPhotos,
                oldPhotosCount,
                estimatedMb,
                oldEstimatedMb,
                retentionStatus,
            };
        });
    }, [locations, tickets]);

    // Metricas globales
    const metrics = useMemo(() => {
        let totalStorageMb = 0;
        let totalOldStorageMb = 0;
        let villasNeedingReview = 0;
        let totalPhotosAcrossAll = 0;

        auditData.forEach((item) => {
            totalStorageMb += item.estimatedMb;
            totalOldStorageMb += item.oldEstimatedMb;
            totalPhotosAcrossAll += item.totalPhotos;
            if (item.retentionStatus === "NEED_REVIEW") {
                villasNeedingReview++;
            }
        });

        return {
            totalStorageMb: (totalStorageMb / 1024).toFixed(2), // GB
            totalOldStorageMb: (totalOldStorageMb / 1024).toFixed(2), // GB
            villasNeedingReview,
            totalPhotosAcrossAll,
        };
    }, [auditData]);

    // Filtrar resultados
    const filteredData = useMemo(() => {
        return auditData.filter((item) => {
            const matchesSearch =
                item.location.nombre?.toLowerCase().includes(searchFilter.toLowerCase()) ||
                item.location.clientName?.toLowerCase().includes(searchFilter.toLowerCase()) ||
                item.location.direccion?.toLowerCase().includes(searchFilter.toLowerCase());

            if (!matchesSearch) return false;

            if (statusFilter === "ALL") return true;
            return item.retentionStatus === statusFilter;
        });
    }, [auditData, searchFilter, statusFilter]);

    // Aplicar decision de retencion
    const handleSetDecision = async (locationId: string, decision: "PRESERVE_ALL" | "PURGED_OLD") => {
        const confirmMsg = decision === "PRESERVE_ALL"
            ? "Confirmas conservar el archivo historico permanente de esta villa sin depuracion?"
            : "Confirmas marcar las fotos mayores a 3 anos para depuracion controlada?";

        if (!confirm(confirmMsg)) return;

        setUpdatingId(locationId);
        try {
            await updateDoc(doc(db, "locations", locationId), {
                retentionDecision: decision,
                retentionPolicyReviewedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
        } catch (error) {
            console.error("Error al actualizar politica:", error);
            alert("No se pudo guardar la decision.");
        } finally {
            setUpdatingId(null);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push("/tickets")}
                            className="rounded-xl"
                        >
                            <ArrowLeft className="w-5 h-5 text-slate-600" />
                        </Button>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                                    Auditoria de Almacenamiento & Retencion a 3 Anos
                                </h1>
                                <Badge className="bg-amber-100 text-amber-900 border-amber-300">
                                    Mision PHOENIX
                                </Badge>
                            </div>
                            <p className="text-sm text-slate-500 mt-0.5">
                                Supervision humana estricta para preservacion o depuracion de evidencias fotograficas en Firebase Storage.
                            </p>
                        </div>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                        <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
                            <span>Espacio Total Estimado</span>
                            <HardDrive className="w-4 h-4 text-blue-600" />
                        </div>
                        <p className="text-2xl font-black text-slate-900">{metrics.totalStorageMb} GB</p>
                        <p className="text-xs text-slate-400">{metrics.totalPhotosAcrossAll} fotos en el sistema</p>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                        <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
                            <span>Fotos &gt; 3 Anos</span>
                            <Clock className="w-4 h-4 text-amber-600" />
                        </div>
                        <p className="text-2xl font-black text-amber-950">{metrics.totalOldStorageMb} GB</p>
                        <p className="text-xs text-amber-700 font-medium">Ciclo contractual cumplido</p>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                        <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
                            <span>Villas por Revisar</span>
                            <AlertTriangle className="w-4 h-4 text-rose-600" />
                        </div>
                        <p className="text-2xl font-black text-rose-900">{metrics.villasNeedingReview}</p>
                        <p className="text-xs text-rose-600 font-medium">Requieren decision del admin</p>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                        <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
                            <span>Regla de Oro</span>
                            <Shield className="w-4 h-4 text-emerald-600" />
                        </div>
                        <p className="text-base font-bold text-emerald-950">Supervision Humana</p>
                        <p className="text-xs text-emerald-700">Cero borrado automatico silencioso</p>
                    </div>
                </div>

                {/* Filtros y Busqueda */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
                    <div className="relative w-full sm:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Buscar villa, cliente o zona..."
                            value={searchFilter}
                            onChange={(e) => setSearchFilter(e.target.value)}
                            className="pl-9 text-sm rounded-lg"
                        />
                    </div>

                    <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                        <Button
                            variant={statusFilter === "ALL" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setStatusFilter("ALL")}
                            className="text-xs"
                        >
                            Todas ({auditData.length})
                        </Button>
                        <Button
                            variant={statusFilter === "NEED_REVIEW" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setStatusFilter("NEED_REVIEW")}
                            className="text-xs text-amber-800 border-amber-200 hover:bg-amber-50"
                        >
                            <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-600" />
                            Requieren Decision ({metrics.villasNeedingReview})
                        </Button>
                        <Button
                            variant={statusFilter === "PRESERVED" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setStatusFilter("PRESERVED")}
                            className="text-xs text-blue-800 border-blue-200 hover:bg-blue-50"
                        >
                            <FolderArchive className="w-3.5 h-3.5 mr-1 text-blue-600" />
                            Historico Permanente
                        </Button>
                        <Button
                            variant={statusFilter === "OPTIMIZED" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setStatusFilter("OPTIMIZED")}
                            className="text-xs text-emerald-800 border-emerald-200 hover:bg-emerald-50"
                        >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                            Al Dia
                        </Button>
                    </div>
                </div>

                {/* Lista de Villas y Auditoria */}
                {loading ? (
                    <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
                        <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
                        <p className="text-sm text-slate-500 font-medium">Auditando almacenamiento de villas...</p>
                    </div>
                ) : filteredData.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 text-slate-500">
                        <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                        <p className="text-sm font-semibold text-slate-800">No se encontraron villas con este filtro</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredData.map(({ location: loc, villaTickets, oldTickets, totalPhotos, oldPhotosCount, estimatedMb, oldEstimatedMb, retentionStatus }) => (
                            <div
                                key={loc.id}
                                className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                            >
                                <div className="space-y-1.5 flex-1">
                                    <div className="flex items-center gap-2">
                                        <Building2 className="w-4 h-4 text-emerald-600" />
                                        <h3 className="text-base font-bold text-slate-900">{loc.nombre}</h3>
                                        <Badge
                                            className={
                                                retentionStatus === "NEED_REVIEW"
                                                    ? "bg-amber-100 text-amber-900 border-amber-300"
                                                    : retentionStatus === "PRESERVED"
                                                    ? "bg-blue-100 text-blue-900 border-blue-300"
                                                    : "bg-emerald-100 text-emerald-900 border-emerald-300"
                                            }
                                        >
                                            {retentionStatus === "NEED_REVIEW"
                                                ? "Aviso: Requiere Decision (> 3 Anos)"
                                                : retentionStatus === "PRESERVED"
                                                ? "Archivo Permanente"
                                                : "Al Dia"}
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-slate-500">
                                        {loc.clientName || "Cliente"} &bull; {loc.direccion || "Punta Cana"} &bull; {villaTickets.length} visitas registradas
                                    </p>

                                    <div className="flex flex-wrap items-center gap-4 text-xs pt-1">
                                        <span className="text-slate-600">
                                            Total fotos: <strong className="text-slate-900">{totalPhotos}</strong> (~{estimatedMb} MB)
                                        </span>
                                        {oldPhotosCount > 0 && (
                                            <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-medium">
                                                Antiguas (&gt; 3 anos): <strong>{oldPhotosCount} fotos</strong> (~{oldEstimatedMb} MB)
                                            </span>
                                        )}
                                        {loc.retentionPolicyReviewedAt && (
                                            <span className="text-slate-400 text-[11px]">
                                                Revisado: {loc.retentionPolicyReviewedAt?.toDate ? loc.retentionPolicyReviewedAt.toDate().toLocaleDateString() : "Recientemente"}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Acciones de Decision */}
                                <div className="flex flex-wrap items-center gap-2 shrink-0">
                                    <Link href={`/villas/${loc.id}`}>
                                        <Button variant="outline" size="sm" className="text-xs gap-1">
                                            <ExternalLink className="w-3.5 h-3.5" />
                                            Ver Bitacora
                                        </Button>
                                    </Link>

                                    <Button
                                        onClick={() => handleSetDecision(loc.id, "PRESERVE_ALL")}
                                        disabled={updatingId === loc.id || loc.retentionDecision === "PRESERVE_ALL"}
                                        size="sm"
                                        variant={loc.retentionDecision === "PRESERVE_ALL" ? "default" : "outline"}
                                        className={`text-xs gap-1 ${
                                            loc.retentionDecision === "PRESERVE_ALL"
                                                ? "bg-blue-600 hover:bg-blue-700 text-white"
                                                : "text-blue-700 border-blue-200 hover:bg-blue-50"
                                        }`}
                                    >
                                        <Check className="w-3.5 h-3.5" />
                                        Conservar Siempre
                                    </Button>

                                    {oldPhotosCount > 0 && (
                                        <Button
                                            onClick={() => handleSetDecision(loc.id, "PURGED_OLD")}
                                            disabled={updatingId === loc.id || loc.retentionDecision === "PURGED_OLD"}
                                            size="sm"
                                            variant="outline"
                                            className="text-xs text-red-700 border-red-300 hover:bg-red-50 gap-1"
                                        >
                                            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                                            Depurar &gt; 3 Anos
                                        </Button>
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
