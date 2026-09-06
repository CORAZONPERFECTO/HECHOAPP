"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Location, Ticket, TicketSurveyArea } from "@/types/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Shield,
    Calendar,
    Wrench,
    MapPin,
    Share2,
    Camera,
    CheckCircle2,
    Clock,
    AlertTriangle,
    ExternalLink,
    Eye,
    Copy,
    Plus,
    Building2,
    Sparkles,
    FileText,
    ChevronRight,
    X,
    Info
} from "lucide-react";
import { useRouter } from "next/navigation";

interface VillaBitacoraProps {
    locationId: string;
    isAdmin?: boolean;
}

export function VillaBitacora({ locationId, isAdmin = true }: VillaBitacoraProps) {
    const router = useRouter();
    const [location, setLocation] = useState<Location | null>(null);
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("equipos");
    const [timeFilterYears, setTimeFilterYears] = useState<number>(3); // 1, 2, 3 años
    const [copiedLink, setCopiedLink] = useState(false);

    // Modal de ampliación de imagen (lightbox para placa / tarjeta)
    const [zoomedImage, setZoomedImage] = useState<{ url: string; title: string; subtitle?: string } | null>(null);

    // Modal de edición rápida de villa / próximo mantenimiento (admin)
    const [isEditingSchedule, setIsEditingSchedule] = useState(false);
    const [nextDateInput, setNextDateInput] = useState("");
    const [frequencyInput, setFrequencyInput] = useState<"MENSUAL" | "BIMESTRAL" | "TRIMESTRAL">("MENSUAL");
    const [locationUrlInput, setLocationUrlInput] = useState("");
    const [savingSchedule, setSavingSchedule] = useState(false);

    // Modal de nuevo equipo / área
    const [isAddingEquipment, setIsAddingEquipment] = useState(false);
    const [newAreaName, setNewAreaName] = useState("");
    const [newAreaBrand, setNewAreaBrand] = useState("");
    const [newAreaModel, setNewAreaModel] = useState("");
    const [newAreaSerial, setNewAreaSerial] = useState("");
    const [newAreaBtu, setNewAreaBtu] = useState("12,000 BTU");
    const [newAreaGas, setNewAreaGas] = useState("R410A");

    // Escuchar documento de la ubicación / villa
    useEffect(() => {
        if (!locationId) return;
        const locRef = doc(db, "locations", locationId);
        const unsubscribe = onSnapshot(locRef, (snap) => {
            if (snap.exists()) {
                const data = { id: snap.id, ...snap.data() } as Location;
                setLocation(data);
                setNextDateInput(data.nextMaintenanceDate || "");
                setFrequencyInput(data.maintenanceFrequency || "MENSUAL");
                setLocationUrlInput(data.locationUrl || "");
            }
        });
        return () => unsubscribe();
    }, [locationId]);

    // Escuchar tickets asociados a la villa
    useEffect(() => {
        if (!locationId) return;

        // Query principal por locationId
        const q = query(
            collection(db, "tickets"),
            where("locationId", "==", locationId),
            orderBy("createdAt", "desc")
        );

        const unsubscribe = onSnapshot(q, async (snap) => {
            let loadedTickets = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Ticket));

            // Si no hay tickets directos con locationId, buscar por clientId y coincidencia de nombre
            if (loadedTickets.length === 0 && location?.clientId) {
                try {
                    const fallbackQ = query(
                        collection(db, "tickets"),
                        where("clientId", "==", location.clientId),
                        orderBy("createdAt", "desc")
                    );
                    const fallbackSnap = await new Promise<any>((resolve) => {
                        const unsub = onSnapshot(fallbackQ, (res) => {
                            unsub();
                            resolve(res);
                        });
                    });

                    const filtered = fallbackSnap.docs
                        .map((d: any) => ({ id: d.id, ...d.data() } as Ticket))
                        .filter((t: Ticket) => {
                            const locName = (location.nombre || "").toLowerCase();
                            const tLoc = (t.locationName || t.specificLocation || "").toLowerCase();
                            return tLoc.includes(locName) || locName.includes(tLoc);
                        });

                    if (filtered.length > 0) {
                        loadedTickets = filtered;
                    }
                } catch (e) {
                    console.error("Error in fallback tickets query:", e);
                }
            }

            setTickets(loadedTickets);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [locationId, location?.clientId, location?.nombre]);

    // Extraer el censo de equipos más actualizado
    // Prioridad: 1) location.equipmentCensus, 2) el ticket más reciente que tenga surveyAreas
    const currentEquipmentCensus = useMemo<TicketSurveyArea[]>(() => {
        if (location?.equipmentCensus && location.equipmentCensus.length > 0) {
            return location.equipmentCensus;
        }
        for (const t of tickets) {
            if (t.surveyAreas && t.surveyAreas.length > 0) {
                return t.surveyAreas;
            }
        }
        return [];
    }, [location?.equipmentCensus, tickets]);

    // Historial de visitas dentro de los últimos 3 años (o filtro seleccionado)
    const now = new Date();
    const cutoffDate = new Date(now.getFullYear() - timeFilterYears, now.getMonth(), now.getDate());

    const filteredTickets = useMemo(() => {
        return tickets.filter((t) => {
            const ticketDate = t.createdAt?.seconds ? new Date(t.createdAt.seconds * 1000) : new Date();
            return ticketDate >= cutoffDate;
        });
    }, [tickets, cutoffDate]);

    // Auditoría de 3 años: Detectar fotos o tickets más viejos de 3 años
    const threeYearsAgo = new Date(now.getFullYear() - 3, now.getMonth(), now.getDate());
    const oldTicketsBeyond3Years = useMemo(() => {
        return tickets.filter((t) => {
            const ticketDate = t.createdAt?.seconds ? new Date(t.createdAt.seconds * 1000) : new Date();
            return ticketDate < threeYearsAgo;
        });
    }, [tickets, threeYearsAgo]);

    // Ticket activo hoy / en progreso
    const activeTicket = useMemo(() => {
        return tickets.find((t) => t.status === "IN_PROGRESS" || t.status === "OPEN");
    }, [tickets]);

    // Visita más reciente completada
    const lastCompletedTicket = useMemo(() => {
        return tickets.find((t) => t.status === "COMPLETED") || tickets[0];
    }, [tickets]);

    // Compartir por WhatsApp
    const handleShareWhatsApp = () => {
        const shareUrl = typeof window !== "undefined"
            ? `${window.location.origin}/villas/${locationId}`
            : "";
        const message = `*Bitácora Digital de la Villa* 🛡️\n` +
            `Villa: *${location?.nombre || "Villa"}*\n` +
            `Equipos censados: ${currentEquipmentCensus.length}\n` +
            `Acceda a la ficha técnica e historial de mantenimientos aquí:\n${shareUrl}`;

        if (navigator.clipboard) {
            navigator.clipboard.writeText(shareUrl);
            setCopiedLink(true);
            setTimeout(() => setCopiedLink(false), 3000);
        }

        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, "_blank");
    };

    const handleCopyLink = () => {
        const shareUrl = typeof window !== "undefined"
            ? `${window.location.origin}/villas/${locationId}`
            : "";
        if (navigator.clipboard) {
            navigator.clipboard.writeText(shareUrl);
            setCopiedLink(true);
            setTimeout(() => setCopiedLink(false), 3000);
        }
    };

    // Guardar fecha de próximo mantenimiento y GPS (Admin)
    const handleSaveSchedule = async () => {
        if (!locationId) return;
        setSavingSchedule(true);
        try {
            await updateDoc(doc(db, "locations", locationId), {
                nextMaintenanceDate: nextDateInput,
                maintenanceFrequency: frequencyInput,
                locationUrl: locationUrlInput,
                updatedAt: serverTimestamp(),
            });
            setIsEditingSchedule(false);
        } catch (error) {
            console.error("Error saving maintenance schedule:", error);
            alert("Error al actualizar la programación.");
        } finally {
            setSavingSchedule(false);
        }
    };

    // Agregar nueva área / equipo al censo (Admin)
    const handleAddEquipment = async () => {
        if (!newAreaName.trim()) return;
        try {
            const newArea: TicketSurveyArea = {
                id: `area-${Date.now()}`,
                name: newAreaName.trim(),
                brand: newAreaBrand.trim() || "Daikin",
                model: newAreaModel.trim() || "",
                serialNumber: newAreaSerial.trim() || "",
                btuCapacity: newAreaBtu,
                refrigerantType: newAreaGas,
                equipmentType: "Split Inverter",
                photos: [],
            };

            const updatedCensus = [...currentEquipmentCensus, newArea];
            await updateDoc(doc(db, "locations", locationId), {
                equipmentCensus: updatedCensus,
                updatedAt: serverTimestamp(),
            });

            setNewAreaName("");
            setNewAreaBrand("");
            setNewAreaModel("");
            setNewAreaSerial("");
            setIsAddingEquipment(false);
        } catch (error) {
            console.error("Error adding equipment:", error);
            alert("Error al registrar equipo.");
        }
    };

    // Decisión de retención de 3 años (Admin)
    const handleRetentionDecision = async (decision: "PRESERVE_ALL" | "PURGED_OLD") => {
        if (!locationId) return;
        const confirmMsg = decision === "PRESERVE_ALL"
            ? "¿Deseas conservar todo el archivo histórico permanente para esta villa sin purgar fotos?"
            : "¿Estás seguro de archivar/depurar fotos con más de 3 años de antigüedad? Esta acción no se puede deshacer.";

        if (!confirm(confirmMsg)) return;

        try {
            await updateDoc(doc(db, "locations", locationId), {
                retentionDecision: decision,
                retentionPolicyReviewedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
            alert("Decisión de retención registrada correctamente.");
        } catch (error) {
            console.error("Error updating retention decision:", error);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm text-slate-500 font-medium">Cargando Bitácora Digital de la Villa...</p>
            </div>
        );
    }

    const isIguala = location?.isRetainer || location?.contractType === "IGUALA" || true;

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-16">
            {/* Cabecera Principal - Ficha de la Villa */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden border border-slate-700">
                <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full filter blur-3xl pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                                {isIguala ? "Villa con Iguala (Contrato Activo)" : "Servicio Eventual"}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                <Sparkles className="w-3 h-3 text-blue-400" />
                                Bitácora Polaris
                            </span>
                        </div>

                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
                                <Building2 className="w-7 h-7 text-emerald-400 inline-block" />
                                {location?.nombre || "Villa Sin Nombre"}
                            </h1>
                            <p className="text-slate-400 text-sm mt-1">
                                {location?.clientName || "Cliente / Propietario"} &bull; {location?.locationArea || location?.direccion || "Punta Cana"}
                            </p>
                        </div>

                        {/* Botón GPS a Google Maps / Waze */}
                        {location?.locationUrl ? (
                            <a
                                href={location.locationUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-emerald-300 transition-colors border border-white/10 w-fit"
                            >
                                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                                Ver Ubicación GPS (Google Maps / Waze)
                                <ExternalLink className="w-3 h-3 ml-0.5 opacity-70" />
                            </a>
                        ) : isAdmin ? (
                            <button
                                onClick={() => setIsEditingSchedule(true)}
                                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 underline underline-offset-4"
                            >
                                <MapPin className="w-3 h-3" />
                                + Agregar enlace GPS (Google Maps / Waze)
                            </button>
                        ) : null}
                    </div>

                    {/* Acciones Rápidas en Cabecera */}
                    <div className="flex flex-wrap items-center gap-3">
                        <Button
                            onClick={handleShareWhatsApp}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-md gap-2 text-sm"
                        >
                            <Share2 className="w-4 h-4" />
                            Compartir Bitácora (WhatsApp)
                        </Button>

                        <Button
                            onClick={handleCopyLink}
                            variant="outline"
                            className="bg-white/10 hover:bg-white/20 text-white border-white/20 gap-1.5 text-sm"
                        >
                            <Copy className="w-4 h-4" />
                            {copiedLink ? "¡Enlace Copiado!" : "Copiar Link"}
                        </Button>

                        {isAdmin && (
                            <Button
                                onClick={() => setIsEditingSchedule(true)}
                                variant="outline"
                                className="bg-white/10 hover:bg-white/20 text-white border-white/20 gap-1.5 text-sm"
                            >
                                <Calendar className="w-4 h-4" />
                                Programar Visita
                            </Button>
                        )}
                    </div>
                </div>

                {/* Métricas / KPIs de la Villa */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-700/80">
                    <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/50">
                        <p className="text-xs font-medium text-slate-400">Equipos Censados</p>
                        <p className="text-2xl font-bold text-white mt-1">
                            {currentEquipmentCensus.length} <span className="text-xs font-normal text-slate-400">unidades</span>
                        </p>
                    </div>

                    <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/50">
                        <p className="text-xs font-medium text-slate-400">Última Visita</p>
                        <p className="text-base font-semibold text-emerald-400 mt-1 truncate">
                            {lastCompletedTicket?.createdAt?.seconds
                                ? new Date(lastCompletedTicket.createdAt.seconds * 1000).toLocaleDateString("es-DO", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric"
                                })
                                : "Sin visitas"}
                        </p>
                    </div>

                    <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/50">
                        <p className="text-xs font-medium text-slate-400">Próximo Mantenimiento</p>
                        <p className="text-base font-semibold text-blue-400 mt-1 truncate">
                            {location?.nextMaintenanceDate ? location.nextMaintenanceDate : "Por definir"}
                        </p>
                    </div>

                    <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/50">
                        <p className="text-xs font-medium text-slate-400">Historial Activo</p>
                        <p className="text-2xl font-bold text-white mt-1">
                            {filteredTickets.length} <span className="text-xs font-normal text-slate-400">visitas (3a)</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* Pestañas de Navegación de la Bitácora */}
            <Tabs defaultValue="equipos" value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-white border border-slate-200 p-1.5 rounded-xl w-full sm:w-auto grid grid-cols-2 sm:grid-cols-4 gap-1 shadow-sm">
                    <TabsTrigger value="equipos" className="gap-2 text-xs sm:text-sm font-medium py-2.5">
                        <Wrench className="w-4 h-4 text-emerald-600" />
                        Equipos & Ficha ({currentEquipmentCensus.length})
                    </TabsTrigger>
                    <TabsTrigger value="historial" className="gap-2 text-xs sm:text-sm font-medium py-2.5">
                        <Clock className="w-4 h-4 text-blue-600" />
                        Historial ("Lo que se hizo")
                    </TabsTrigger>
                    <TabsTrigger value="estado" className="gap-2 text-xs sm:text-sm font-medium py-2.5">
                        <Calendar className="w-4 h-4 text-purple-600" />
                        Próxima Visita
                    </TabsTrigger>
                    {isAdmin && (
                        <TabsTrigger value="retencion" className="gap-2 text-xs sm:text-sm font-medium py-2.5">
                            <Shield className="w-4 h-4 text-amber-600" />
                            Retención 3 Años
                            {oldTicketsBeyond3Years.length > 0 && (
                                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                            )}
                        </TabsTrigger>
                    )}
                </TabsList>

                {/* ========================================================================= */}
                {/* PESTAÑA 1: EQUIPOS & FICHA TÉCNICA (CENSO DE AIRES ACONDICIONADOS)        */}
                {/* ========================================================================= */}
                <TabsContent value="equipos" className="mt-6 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <Wrench className="w-5 h-5 text-emerald-600" />
                                Censo Técnico de Equipos de Climatización
                            </h2>
                            <p className="text-sm text-slate-500 mt-0.5">
                                Ficha técnica detallada por área: capacidad, gas, placa de modelo y tarjeta electrónica del condensador.
                            </p>
                        </div>
                        {isAdmin && (
                            <Button
                                onClick={() => setIsAddingEquipment(true)}
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-1.5 shadow-sm"
                            >
                                <Plus className="w-4 h-4" />
                                Agregar Equipo / Área
                            </Button>
                        )}
                    </div>

                    {currentEquipmentCensus.length === 0 ? (
                        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center space-y-4">
                            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                                <Wrench className="w-7 h-7" />
                            </div>
                            <h3 className="text-base font-semibold text-slate-800">Censo de Equipos Pendiente</h3>
                            <p className="text-sm text-slate-500 max-w-md mx-auto">
                                En el primer mantenimiento de esta villa, el técnico registrará las áreas, modelos y fotos de tarjetas para que queden archivadas en esta ficha técnica permanente.
                            </p>
                            {isAdmin && (
                                <Button onClick={() => setIsAddingEquipment(true)} variant="outline" className="gap-1.5">
                                    <Plus className="w-4 h-4" />
                                    Registrar Primer Equipo Ahora
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {currentEquipmentCensus.map((area, idx) => (
                                <div
                                    key={area.id || idx}
                                    className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col justify-between"
                                >
                                    <div className="p-5 space-y-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                                                    Zona {idx + 1}
                                                </span>
                                                <h3 className="text-base font-bold text-slate-900 mt-1">{area.name}</h3>
                                            </div>
                                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                                {area.btuCapacity || "Capacidad N/A"}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-lg border border-slate-100">
                                            <div>
                                                <span className="text-slate-400 block font-medium">Marca / Modelo:</span>
                                                <span className="font-semibold text-slate-800 truncate block">
                                                    {area.brand || "Daikin"} {area.model ? `• ${area.model}` : ""}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-slate-400 block font-medium">Gas Refrigerante:</span>
                                                <span className="font-semibold text-emerald-700 block">
                                                    {area.refrigerantType || "R410A"}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-slate-400 block font-medium">Tipo:</span>
                                                <span className="font-semibold text-slate-800 block">
                                                    {area.equipmentType || "Split Inverter"}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-slate-400 block font-medium">No. Serie:</span>
                                                <span className="font-mono text-slate-700 truncate block">
                                                    {area.serialNumber || "No registrado"}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Fotos Técnicas: Placa del Fabricante & Tarjeta Electrónica */}
                                        <div className="space-y-2">
                                            <p className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                                                <Camera className="w-3.5 h-3.5 text-slate-500" />
                                                Fotos de Referencia Técnica
                                            </p>
                                            <div className="grid grid-cols-2 gap-3">
                                                {/* Foto Placa */}
                                                <div className="border border-slate-200 rounded-lg p-2 bg-slate-50/50 flex flex-col items-center">
                                                    <span className="text-[10px] font-medium text-slate-500 mb-1.5">Placa de Modelo</span>
                                                    {area.platePhotoUrl ? (
                                                        <div
                                                            onClick={() => setZoomedImage({
                                                                url: area.platePhotoUrl!,
                                                                title: `Placa Técnica - ${area.name}`,
                                                                subtitle: `${area.brand || ""} ${area.model || ""} (${area.btuCapacity || ""})`
                                                            })}
                                                            className="relative aspect-video w-full rounded overflow-hidden cursor-pointer group bg-black/5"
                                                        >
                                                            <img
                                                                src={area.platePhotoUrl}
                                                                alt={`Placa ${area.name}`}
                                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                                            />
                                                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium gap-1">
                                                                <Eye className="w-3.5 h-3.5" /> Ampliar
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="aspect-video w-full rounded border border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-[11px] text-center p-2">
                                                            Sin foto de placa
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Foto Tarjeta Electrónica / PCB */}
                                                <div className="border border-slate-200 rounded-lg p-2 bg-slate-50/50 flex flex-col items-center">
                                                    <span className="text-[10px] font-medium text-slate-500 mb-1.5">Tarjeta PCB Condensador</span>
                                                    {area.boardPhotoUrl ? (
                                                        <div
                                                            onClick={() => setZoomedImage({
                                                                url: area.boardPhotoUrl!,
                                                                title: `Tarjeta Electrónica - ${area.name}`,
                                                                subtitle: `Condensador ${area.brand || ""} ${area.model || ""}`
                                                            })}
                                                            className="relative aspect-video w-full rounded overflow-hidden cursor-pointer group bg-black/5"
                                                        >
                                                            <img
                                                                src={area.boardPhotoUrl}
                                                                alt={`Tarjeta ${area.name}`}
                                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                                            />
                                                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium gap-1">
                                                                <Eye className="w-3.5 h-3.5" /> Ampliar
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="aspect-video w-full rounded border border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-[11px] text-center p-2">
                                                            Sin foto de tarjeta
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {area.technicianNotes && (
                                            <p className="text-xs text-slate-500 italic bg-amber-50/60 p-2 rounded border border-amber-100">
                                                Nota: {area.technicianNotes}
                                            </p>
                                        )}
                                    </div>

                                    <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                                        <span className="flex items-center gap-1 text-emerald-600 font-medium">
                                            <CheckCircle2 className="w-3.5 h-3.5" /> Censado en Bitácora
                                        </span>
                                        {area.photos && area.photos.length > 0 && (
                                            <span>{area.photos.length} fotos de evidencia</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* ========================================================================= */}
                {/* PESTAÑA 2: HISTORIAL DE MANTENIMIENTOS ("LO QUE SE HIZO" — 3 AÑOS)        */}
                {/* ========================================================================= */}
                <TabsContent value="historial" className="mt-6 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <Clock className="w-5 h-5 text-blue-600" />
                                Historial de Mantenimientos & Visitas Técnicas
                            </h2>
                            <p className="text-sm text-slate-500 mt-0.5">
                                Registro cronológico de intervenciones preventivas y correctivas de los últimos {timeFilterYears} años.
                            </p>
                        </div>

                        {/* Selector de Años */}
                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-medium self-start sm:self-auto">
                            <button
                                onClick={() => setTimeFilterYears(1)}
                                className={`px-2.5 py-1 rounded-md transition-colors ${timeFilterYears === 1 ? "bg-white text-slate-900 shadow-xs font-bold" : "text-slate-600 hover:text-slate-900"}`}
                            >
                                1 Año
                            </button>
                            <button
                                onClick={() => setTimeFilterYears(2)}
                                className={`px-2.5 py-1 rounded-md transition-colors ${timeFilterYears === 2 ? "bg-white text-slate-900 shadow-xs font-bold" : "text-slate-600 hover:text-slate-900"}`}
                            >
                                2 Años
                            </button>
                            <button
                                onClick={() => setTimeFilterYears(3)}
                                className={`px-2.5 py-1 rounded-md transition-colors ${timeFilterYears === 3 ? "bg-white text-slate-900 shadow-xs font-bold" : "text-slate-600 hover:text-slate-900"}`}
                            >
                                3 Años (Vigencia)
                            </button>
                        </div>
                    </div>

                    {filteredTickets.length === 0 ? (
                        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center space-y-3">
                            <Clock className="w-12 h-12 text-slate-300 mx-auto" />
                            <h3 className="text-base font-semibold text-slate-800">No hay visitas registradas</h3>
                            <p className="text-sm text-slate-500">
                                No se encontraron intervenciones en este período de {timeFilterYears} años.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredTickets.map((ticket, idx) => {
                                const ticketDate = ticket.createdAt?.seconds
                                    ? new Date(ticket.createdAt.seconds * 1000)
                                    : new Date();

                                // Fotos de este ticket: unificamos fotos generales y fotos de áreas
                                const visitPhotos: { url: string; tag?: string }[] = [];
                                if (ticket.photos && Array.isArray(ticket.photos)) {
                                    ticket.photos.forEach((p) => visitPhotos.push({ url: p.url, tag: p.category || "evidencia" }));
                                }
                                if (ticket.surveyAreas && Array.isArray(ticket.surveyAreas)) {
                                    ticket.surveyAreas.forEach((area) => {
                                        if (area.photos) {
                                            area.photos.forEach((p) => visitPhotos.push({ url: p.url, tag: p.tag || area.name }));
                                        }
                                    });
                                }

                                return (
                                    <div
                                        key={ticket.id}
                                        className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 hover:shadow-md transition-shadow space-y-4"
                                    >
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                                                    #{filteredTickets.length - idx}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-bold text-slate-900 text-sm">
                                                            {ticket.ticketNumber || ticket.number || `TK-${ticket.id.slice(0, 6)}`}
                                                        </h4>
                                                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-700">
                                                            {ticket.serviceType || "Mantenimiento"}
                                                        </span>
                                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ticket.status === "COMPLETED"
                                                            ? "bg-emerald-100 text-emerald-800"
                                                            : "bg-blue-100 text-blue-800"
                                                            }`}>
                                                            {ticket.status === "COMPLETED" ? "Completado" : "En Curso"}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-500 mt-0.5">
                                                        {ticketDate.toLocaleDateString("es-DO", {
                                                            weekday: "long",
                                                            year: "numeric",
                                                            month: "long",
                                                            day: "numeric"
                                                        })} &bull; Técnico: <span className="font-medium text-slate-700">{ticket.technicianName || "No asignado"}</span>
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <Button
                                                    onClick={() => router.push(`/tickets/${ticket.id}/report`)}
                                                    size="sm"
                                                    variant="outline"
                                                    className="gap-1.5 text-xs text-blue-700 border-blue-200 hover:bg-blue-50"
                                                >
                                                    <FileText className="w-3.5 h-3.5" />
                                                    Ver Informe Oficial
                                                </Button>
                                                {isAdmin && (
                                                    <Button
                                                        onClick={() => router.push(`/tickets/${ticket.id}`)}
                                                        size="sm"
                                                        variant="ghost"
                                                        className="text-xs text-slate-600"
                                                    >
                                                        Detalle Ticket <ChevronRight className="w-3.5 h-3.5 ml-1" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Áreas trabajadas */}
                                        {ticket.surveyAreas && ticket.surveyAreas.length > 0 && (
                                            <div className="space-y-1.5">
                                                <p className="text-xs font-semibold text-slate-600">Áreas inspeccionadas:</p>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {ticket.surveyAreas.map((area, aIdx) => (
                                                        <span
                                                            key={area.id || aIdx}
                                                            className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200"
                                                        >
                                                            {area.name} ({area.btuCapacity || "AC"})
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Galería de fotos de la visita */}
                                        {visitPhotos.length > 0 && (
                                            <div className="space-y-2">
                                                <p className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                                                    <Camera className="w-3.5 h-3.5 text-slate-500" />
                                                    Evidencias fotográficas del servicio ({visitPhotos.length}):
                                                </p>
                                                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                                                    {visitPhotos.slice(0, 6).map((img, photoIdx) => (
                                                        <div
                                                            key={photoIdx}
                                                            onClick={() => setZoomedImage({
                                                                url: img.url,
                                                                title: `Evidencia - ${ticket.ticketNumber || "Ticket"}`,
                                                                subtitle: `${img.tag ? `Etiqueta: ${img.tag} • ` : ""}${ticketDate.toLocaleDateString()}`
                                                            })}
                                                            className="relative aspect-square rounded-lg overflow-hidden bg-slate-100 border border-slate-200 cursor-pointer group"
                                                        >
                                                            <img
                                                                src={img.url}
                                                                alt={`Foto ${photoIdx + 1}`}
                                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                                            />
                                                            {img.tag && (
                                                                <span className="absolute bottom-1 left-1 right-1 bg-black/60 text-white text-[9px] px-1 py-0.5 rounded truncate text-center">
                                                                    {img.tag}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                                {visitPhotos.length > 6 && (
                                                    <p className="text-[11px] text-slate-400 italic">
                                                        +{visitPhotos.length - 6} fotos adicionales visibles en el informe completo.
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </TabsContent>

                {/* ========================================================================= */}
                {/* PESTAÑA 3: ESTADO ACTUAL & PRÓXIMA VISITA ("LO QUE SE ESTÁ HACIENDO")     */}
                {/* ========================================================================= */}
                <TabsContent value="estado" className="mt-6 space-y-6">
                    {/* "Lo que se está haciendo" */}
                    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <span className="relative flex h-3 w-3">
                                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${activeTicket ? "bg-emerald-400" : "bg-blue-400"} opacity-75`}></span>
                                    <span className={`relative inline-flex rounded-full h-3 w-3 ${activeTicket ? "bg-emerald-500" : "bg-blue-500"}`}></span>
                                </span>
                                Lo que se está haciendo (Estado Actual)
                            </h2>
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                                Tiempo Real
                            </span>
                        </div>

                        {activeTicket ? (
                            <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-5 space-y-3">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                                            Intervención Activa Hoy
                                        </span>
                                        <h3 className="text-base font-bold text-emerald-950 mt-1">
                                            Ticket {activeTicket.ticketNumber || activeTicket.number} &bull; {activeTicket.serviceType || "Mantenimiento Preventivo"}
                                        </h3>
                                        <p className="text-xs text-emerald-700 mt-1">
                                            Técnico en sitio: <span className="font-semibold">{activeTicket.technicianName || "Equipo Técnico"}</span>
                                        </p>
                                    </div>
                                    <Button
                                        onClick={() => router.push(`/tickets/${activeTicket.id}`)}
                                        size="sm"
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1"
                                    >
                                        Ver En Vivo <ChevronRight className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center space-y-2">
                                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                                <h3 className="text-sm font-semibold text-slate-800">Operación Normal en la Villa</h3>
                                <p className="text-xs text-slate-500 max-w-md mx-auto">
                                    No hay tickets activos en este momento. Todos los equipos censados están en régimen de operación normal según el último mantenimiento preventivo.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* "Lo que se va a hacer" */}
                    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-purple-600" />
                                    Lo que se va a hacer (Próximo Mantenimiento)
                                </h2>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Frecuencia contratada: <span className="font-semibold text-slate-700">{location?.maintenanceFrequency || "MENSUAL"}</span>
                                </p>
                            </div>
                            {isAdmin && (
                                <Button
                                    onClick={() => setIsEditingSchedule(true)}
                                    size="sm"
                                    variant="outline"
                                    className="gap-1.5 text-xs"
                                >
                                    <Calendar className="w-3.5 h-3.5" />
                                    Editar Calendario
                                </Button>
                            )}
                        </div>

                        <div className="bg-gradient-to-br from-purple-50 to-indigo-50/50 border border-purple-100 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="space-y-1 text-center sm:text-left">
                                <p className="text-xs font-semibold text-purple-800 uppercase tracking-wide">Próxima Visita Programada</p>
                                <p className="text-2xl font-black text-purple-950">
                                    {location?.nextMaintenanceDate
                                        ? location.nextMaintenanceDate
                                        : "Fecha por confirmar"}
                                </p>
                                <p className="text-xs text-purple-700">
                                    Rutina programada: Lavado a presión de condensadores, higienización de serpentines, chequeo de presiones y amperajes.
                                </p>
                            </div>

                            {isAdmin && (
                                <Button
                                    onClick={() => router.push(`/tickets/new?clientId=${location?.clientId || ""}&locationId=${locationId}&isRetainer=true`)}
                                    className="bg-purple-600 hover:bg-purple-700 text-white font-medium text-xs gap-1.5 shrink-0 shadow-sm"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    Crear Ticket de Mantenimiento
                                </Button>
                            )}
                        </div>
                    </div>
                </TabsContent>

                {/* ========================================================================= */}
                {/* PESTAÑA 4: AUDITORÍA DE RETENCIÓN A 3 AÑOS (SOLO ADMINISTRADOR)           */}
                {/* ========================================================================= */}
                {isAdmin && (
                    <TabsContent value="retencion" className="mt-6 space-y-6">
                        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                        <Shield className="w-5 h-5 text-amber-600" />
                                        Política de Retención a 3 Años & Auditoría de Almacenamiento
                                    </h2>
                                    <p className="text-sm text-slate-500 mt-1 max-w-2xl">
                                        Por política de servicio de villas con iguala, los clientes tienen acceso continuo a la bitácora de los últimos 3 años. El sistema <strong>nunca borra datos automáticamente</strong>: te informa como administrador para que tú tomes la decisión final de conservar el histórico completo o liberar espacio de evidencias antiguas.
                                    </p>
                                </div>
                                <span className="text-xs font-bold uppercase px-3 py-1 rounded-full bg-amber-100 text-amber-900 shrink-0">
                                    Control de Datos
                                </span>
                            </div>

                            {/* Estado del diagnóstico de retención */}
                            {oldTicketsBeyond3Years.length > 0 ? (
                                <div className="bg-amber-50 border border-amber-300 rounded-xl p-5 space-y-4">
                                    <div className="flex items-start gap-3">
                                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                        <div className="space-y-1">
                                            <h3 className="text-sm font-bold text-amber-900">
                                                Atención Administrador: Existen {oldTicketsBeyond3Years.length} visitas con más de 3 años de antigüedad
                                            </h3>
                                            <p className="text-xs text-amber-800">
                                                Estos registros superaron el ciclo contractual de 3 años garantizados al cliente. Puedes decidir si mantenerlos archivados indefinidamente o depurarlos para optimizar el almacenamiento de Firebase Storage.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-3 pt-2">
                                        <Button
                                            onClick={() => handleRetentionDecision("PRESERVE_ALL")}
                                            className="bg-slate-900 hover:bg-slate-800 text-white text-xs gap-1.5"
                                        >
                                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                            Conservar Archivo Histórico Permanente
                                        </Button>

                                        <Button
                                            onClick={() => handleRetentionDecision("PURGED_OLD")}
                                            variant="outline"
                                            className="text-xs text-red-700 border-red-300 hover:bg-red-50 gap-1.5"
                                        >
                                            <AlertTriangle className="w-4 h-4 text-red-500" />
                                            Depurar Evidencias &gt; 3 Años
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 flex items-start gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                                    <div>
                                        <h3 className="text-sm font-bold text-emerald-950">
                                            Todo en orden: Todos los registros se encuentran dentro del período activo de 3 años
                                        </h3>
                                        <p className="text-xs text-emerald-700 mt-0.5">
                                            No hay evidencias ni fotos que superen el límite de 3 años. La bitácora se encuentra 100% al día y dentro del contrato vigente.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Resumen técnico de la política */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100 text-xs">
                                <div className="p-3 bg-slate-50 rounded-lg">
                                    <span className="text-slate-400 block font-medium">Ciclo de Visualización:</span>
                                    <span className="font-semibold text-slate-800">3 Años continuos garantizados</span>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-lg">
                                    <span className="text-slate-400 block font-medium">Regla de Borrado:</span>
                                    <span className="font-semibold text-slate-800">Supervisión humana estricta</span>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-lg">
                                    <span className="text-slate-400 block font-medium">Decisión Actual:</span>
                                    <span className="font-semibold text-slate-800">
                                        {location?.retentionDecision === "PRESERVE_ALL"
                                            ? "Conservación histórica permanente aprobada"
                                            : "Supervisión activa"}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </TabsContent>
                )}
            </Tabs>

            {/* ========================================================================= */}
            {/* MODAL: ZOOM DE FOTO TÉCNICA (LIGHTBOX PARA PLACA O TARJETA)               */}
            {/* ========================================================================= */}
            {zoomedImage && (
                <div
                    className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
                    onClick={() => setZoomedImage(null)}
                >
                    <div
                        className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl space-y-3 p-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between text-white pb-2 border-b border-slate-800">
                            <div>
                                <h3 className="font-bold text-sm sm:text-base">{zoomedImage.title}</h3>
                                {zoomedImage.subtitle && (
                                    <p className="text-xs text-slate-400 mt-0.5">{zoomedImage.subtitle}</p>
                                )}
                            </div>
                            <button
                                onClick={() => setZoomedImage(null)}
                                className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="relative aspect-4/3 w-full bg-black rounded-lg overflow-hidden flex items-center justify-center">
                            <img
                                src={zoomedImage.url}
                                alt={zoomedImage.title}
                                className="max-h-full max-w-full object-contain"
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <a
                                href={zoomedImage.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700"
                            >
                                <ExternalLink className="w-3.5 h-3.5" /> Abrir Original en Nueva Pestaña
                            </a>
                            <Button
                                onClick={() => setZoomedImage(null)}
                                size="sm"
                                variant="outline"
                                className="text-xs bg-white text-slate-900"
                            >
                                Cerrar
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* MODAL: PROGRAMAR PRÓXIMA VISITA Y GPS (ADMIN)                             */}
            {/* ========================================================================= */}
            {isEditingSchedule && (
                <div
                    className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
                    onClick={() => setIsEditingSchedule(false)}
                >
                    <div
                        className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-emerald-600" />
                                Programación & Ubicación de la Villa
                            </h3>
                            <button
                                onClick={() => setIsEditingSchedule(false)}
                                className="p-1 text-slate-400 hover:text-slate-600 rounded-full"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="schedule-date" className="text-xs font-semibold text-slate-700">
                                    Fecha del Próximo Mantenimiento
                                </Label>
                                <Input
                                    id="schedule-date"
                                    type="date"
                                    value={nextDateInput}
                                    onChange={(e) => setNextDateInput(e.target.value)}
                                    className="text-sm"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="schedule-freq" className="text-xs font-semibold text-slate-700">
                                    Frecuencia Contractual
                                </Label>
                                <select
                                    id="schedule-freq"
                                    value={frequencyInput}
                                    onChange={(e: any) => setFrequencyInput(e.target.value)}
                                    className="w-full text-sm border border-slate-200 rounded-md p-2 bg-white"
                                >
                                    <option value="MENSUAL">Mensual (Recomendado Villas con Iguala)</option>
                                    <option value="BIMESTRAL">Bimestral (Cada 2 Meses)</option>
                                    <option value="TRIMESTRAL">Trimestral (Cada 3 Meses)</option>
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="schedule-gps" className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                                    Enlace de Ubicación GPS (Google Maps o Waze)
                                </Label>
                                <Input
                                    id="schedule-gps"
                                    type="url"
                                    placeholder="https://maps.app.goo.gl/... o https://waze.com/ul/..."
                                    value={locationUrlInput}
                                    onChange={(e) => setLocationUrlInput(e.target.value)}
                                    className="text-sm"
                                />
                                <p className="text-[11px] text-slate-400">
                                    Permite a los técnicos y administradores abrir el GPS en un toque.
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                            <Button
                                onClick={() => setIsEditingSchedule(false)}
                                variant="outline"
                                size="sm"
                                className="text-xs"
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleSaveSchedule}
                                disabled={savingSchedule}
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium"
                            >
                                {savingSchedule ? "Guardando..." : "Guardar Cambios"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* MODAL: AGREGAR EQUIPO / ÁREA MANUALMENTE (ADMIN)                          */}
            {/* ========================================================================= */}
            {isAddingEquipment && (
                <div
                    className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
                    onClick={() => setIsAddingEquipment(false)}
                >
                    <div
                        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                                <Plus className="w-5 h-5 text-emerald-600" />
                                Registrar Aire Acondicionado
                            </h3>
                            <button
                                onClick={() => setIsAddingEquipment(false)}
                                className="p-1 text-slate-400 hover:text-slate-600 rounded-full"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div className="space-y-1">
                                <Label className="text-xs font-semibold text-slate-700">Nombre del Área / Habitación *</Label>
                                <Input
                                    placeholder="Ej. Habitación Principal, Sala, Gazebo"
                                    value={newAreaName}
                                    onChange={(e) => setNewAreaName(e.target.value)}
                                    className="text-sm"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-xs font-semibold text-slate-700">Capacidad</Label>
                                    <select
                                        value={newAreaBtu}
                                        onChange={(e) => setNewAreaBtu(e.target.value)}
                                        className="w-full text-sm border border-slate-200 rounded-md p-2 bg-white"
                                    >
                                        <option value="12,000 BTU">12,000 BTU (1 Ton)</option>
                                        <option value="18,000 BTU">18,000 BTU (1.5 Ton)</option>
                                        <option value="24,000 BTU">24,000 BTU (2 Ton)</option>
                                        <option value="36,000 BTU">36,000 BTU (3 Ton)</option>
                                        <option value="48,000 BTU">48,000 BTU (4 Ton)</option>
                                        <option value="60,000 BTU">60,000 BTU (5 Ton)</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs font-semibold text-slate-700">Refrigerante</Label>
                                    <select
                                        value={newAreaGas}
                                        onChange={(e) => setNewAreaGas(e.target.value)}
                                        className="w-full text-sm border border-slate-200 rounded-md p-2 bg-white"
                                    >
                                        <option value="R410A">R410A</option>
                                        <option value="R32">R32</option>
                                        <option value="R22">R22</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-xs font-semibold text-slate-700">Marca</Label>
                                    <Input
                                        placeholder="Daikin, Carrier, TGM"
                                        value={newAreaBrand}
                                        onChange={(e) => setNewAreaBrand(e.target.value)}
                                        className="text-sm"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs font-semibold text-slate-700">Modelo</Label>
                                    <Input
                                        placeholder="Ej. FTXM35N"
                                        value={newAreaModel}
                                        onChange={(e) => setNewAreaModel(e.target.value)}
                                        className="text-sm"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs font-semibold text-slate-700">Número de Serie (Opcional)</Label>
                                <Input
                                    placeholder="Ej. SN-892348123"
                                    value={newAreaSerial}
                                    onChange={(e) => setNewAreaSerial(e.target.value)}
                                    className="text-sm font-mono"
                                />
                            </div>

                            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-[11px] text-slate-500 flex items-start gap-2">
                                <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                Las fotos de placa y tarjeta electrónica se podrán subir o actualizar desde la app móvil del técnico durante la visita de mantenimiento.
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                            <Button
                                onClick={() => setIsAddingEquipment(false)}
                                variant="outline"
                                size="sm"
                                className="text-xs"
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleAddEquipment}
                                disabled={!newAreaName.trim()}
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium"
                            >
                                Guardar en Censo
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
