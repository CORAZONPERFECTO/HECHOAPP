"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
    ArrowLeft, 
    Printer, 
    RefreshCw, 
    Building2, 
    Calendar, 
    Tag, 
    AlertTriangle, 
    CheckCircle2, 
    Wrench, 
    Camera, 
    FileText, 
    ExternalLink, 
    ShieldCheck, 
    Clock, 
    User as UserIcon,
    Gauge,
    Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EquipmentPassport, EquipmentIntervention } from "@/types/equipment";
import { getEquipmentById, getEquipmentByCodeOrQr, getEquipmentInterventions } from "@/lib/equipment-service";
import { QRLabelSheet } from "@/components/equipment/qr-label-sheet";
import { EquipmentReplacementModal } from "@/components/equipment/equipment-replacement-modal";

export default function EquipmentPassportPage() {
    const params = useParams();
    const router = useRouter();
    const id = params?.id as string;

    const [equipment, setEquipment] = useState<EquipmentPassport | null>(null);
    const [interventions, setInterventions] = useState<EquipmentIntervention[]>([]);
    const [loading, setLoading] = useState(true);
    const [qrSheetOpen, setQrSheetOpen] = useState(false);
    const [replaceModalOpen, setReplaceModalOpen] = useState(false);

    const loadData = async () => {
        if (!id) return;
        setLoading(true);
        try {
            // Intentar cargar por ID o por código EQ-XXXXX
            let eq = await getEquipmentById(id);
            if (!eq) {
                eq = await getEquipmentByCodeOrQr(id);
            }

            if (eq) {
                setEquipment(eq);
                const history = await getEquipmentInterventions(eq.id);
                setInterventions(history);
            }
        } catch (error) {
            console.error("Error loading equipment passport:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center space-y-3">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                    <p className="text-sm font-medium text-slate-600">Cargando Pasaporte Digital del Activo...</p>
                </div>
            </div>
        );
    }

    if (!equipment) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <Card className="max-w-md w-full text-center p-6">
                    <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                    <h2 className="text-lg font-bold text-slate-900">Equipo no encontrado</h2>
                    <p className="text-xs text-slate-500 mt-1 mb-4">
                        No se encontró ningún registro para el identificador o código <strong>{id}</strong>.
                    </p>
                    <Button onClick={() => router.back()} variant="outline">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Regresar
                    </Button>
                </Card>
            </div>
        );
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "OPERATIONAL":
                return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">Operacional</Badge>;
            case "WARNING":
                return <Badge className="bg-amber-100 text-amber-800 border-amber-300">Observación</Badge>;
            case "CRITICAL":
                return <Badge className="bg-red-100 text-red-800 border-red-300">Crítico / Averiado</Badge>;
            case "REPLACED":
                return <Badge className="bg-slate-200 text-slate-700 border-slate-400">Reemplazado</Badge>;
            case "RETIRED":
                return <Badge className="bg-slate-200 text-slate-700 border-slate-400">Desincorporado</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <div className="min-h-screen bg-slate-50/50 pb-16">
            {/* Header de Navegación */}
            <div className="bg-white border-b sticky top-0 z-10 px-4 py-3 shadow-xs">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <button
                        onClick={() => router.back()}
                        className="inline-flex items-center text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 mr-1" /> Volver
                    </button>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setQrSheetOpen(true)}
                            className="text-xs font-semibold h-8"
                        >
                            <Printer className="w-3.5 h-3.5 mr-1.5 text-slate-600" />
                            Imprimir Etiqueta QR
                        </Button>
                        {equipment.status !== "REPLACED" && equipment.status !== "RETIRED" && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setReplaceModalOpen(true)}
                                className="text-xs font-semibold h-8 text-amber-700 border-amber-300 hover:bg-amber-50"
                            >
                                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                                Reemplazar Equipo
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 pt-6 space-y-6">
                {/* Banner de Sustitución si el equipo fue reemplazado */}
                {equipment.status === "REPLACED" && (
                    <div className="p-4 bg-slate-100 border-2 border-slate-300 rounded-xl text-xs space-y-1">
                        <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
                            <RefreshCw className="w-4 h-4 text-slate-600" />
                            Este equipo ha sido sustituido y archivado
                        </div>
                        <p className="text-slate-600">
                            {equipment.retirementReason ? `Motivo: ${equipment.retirementReason}. ` : ''}
                            {equipment.replacedByEquipmentId && (
                                <span>
                                    Sustituido por el equipo:{" "}
                                    <Link href={`/equipment/${equipment.replacedByEquipmentId}`} className="font-bold text-blue-600 underline">
                                        Ver Nuevo Pasaporte
                                    </Link>
                                </span>
                            )}
                        </p>
                    </div>
                )}

                {/* Banner si sustituyó a otro equipo */}
                {equipment.replacesEquipmentId && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs flex items-center justify-between text-blue-900">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-blue-600" />
                            <span>Esta unidad sustituyó formalmente a una unidad anterior.</span>
                        </div>
                        <Link href={`/equipment/${equipment.replacesEquipmentId}`} className="font-bold underline text-blue-700">
                            Ver historial del equipo anterior
                        </Link>
                    </div>
                )}

                {/* Tarjeta Principal del Pasaporte */}
                <Card className="bg-white shadow-sm border-slate-200">
                    <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2.5">
                                    <span className="font-mono text-xs font-black bg-slate-900 text-white px-2.5 py-0.5 rounded tracking-wider">
                                        {equipment.code}
                                    </span>
                                    {getStatusBadge(equipment.status)}
                                </div>
                                <h1 className="text-2xl font-black text-slate-900">
                                    {equipment.areaName || equipment.name}
                                </h1>
                                <p className="text-xs text-slate-500 flex items-center gap-2">
                                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                    <span>{equipment.locationName || 'Villa'}</span>
                                    {equipment.locationArea && <span>• {equipment.locationArea}</span>}
                                    {equipment.clientName && <span>• Cliente: {equipment.clientName}</span>}
                                </p>
                            </div>

                            <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(
                                        typeof window !== "undefined" ? `${window.location.origin}/qr/${equipment.code}` : `/qr/${equipment.code}`
                                    )}`}
                                    alt={equipment.code}
                                    className="w-14 h-14 object-contain rounded"
                                />
                                <div className="text-[11px] space-y-0.5">
                                    <span className="font-bold text-slate-700 block">QR Físico de Campo</span>
                                    <span className="text-slate-400 block font-mono text-[10px]">{equipment.qrToken}</span>
                                    <button
                                        onClick={() => setQrSheetOpen(true)}
                                        className="text-blue-600 font-semibold hover:underline block pt-0.5"
                                    >
                                        Imprimir Adhesivo
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Ficha Técnica Rápida en Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6">
                            <div className="space-y-0.5">
                                <span className="text-[10px] font-bold uppercase text-slate-400">Marca</span>
                                <p className="text-sm font-bold text-slate-800">{equipment.specs.brand || "Genérica"}</p>
                            </div>
                            <div className="space-y-0.5">
                                <span className="text-[10px] font-bold uppercase text-slate-400">Capacidad</span>
                                <p className="text-sm font-bold text-slate-800">
                                    {equipment.specs.btu ? `${equipment.specs.btu} BTU` : "N/D"}
                                </p>
                            </div>
                            <div className="space-y-0.5">
                                <span className="text-[10px] font-bold uppercase text-slate-400">Refrigerante</span>
                                <p className="text-sm font-bold text-slate-800">{equipment.specs.refrigerant || "R410A"}</p>
                            </div>
                            <div className="space-y-0.5">
                                <span className="text-[10px] font-bold uppercase text-slate-400">Voltaje</span>
                                <p className="text-sm font-bold text-slate-800">{equipment.specs.voltage || "220V"}</p>
                            </div>
                            <div className="space-y-0.5">
                                <span className="text-[10px] font-bold uppercase text-slate-400">Modelo</span>
                                <p className="text-sm font-medium text-slate-800">{equipment.specs.model || "N/D"}</p>
                            </div>
                            <div className="space-y-0.5">
                                <span className="text-[10px] font-bold uppercase text-slate-400">Número de Serie</span>
                                <p className="text-sm font-mono text-slate-800">{equipment.specs.serialNumber || "N/D"}</p>
                            </div>
                            <div className="space-y-0.5">
                                <span className="text-[10px] font-bold uppercase text-slate-400">Tipo de Sistema</span>
                                <p className="text-sm font-medium text-slate-800">{equipment.specs.type || "Split Inverter"}</p>
                            </div>
                            <div className="space-y-0.5">
                                <span className="text-[10px] font-bold uppercase text-slate-400">Instalación</span>
                                <p className="text-sm font-medium text-slate-800">{equipment.installDate || "N/D"}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Pestañas: Historial de Intervenciones vs Ficha de Fotos Base */}
                <Tabs defaultValue="history" className="space-y-4">
                    <TabsList className="bg-slate-200/60 p-1">
                        <TabsTrigger value="history" className="gap-1.5 text-xs font-semibold">
                            <Wrench className="w-3.5 h-3.5" />
                            Historial de Intervenciones ({interventions.length})
                        </TabsTrigger>
                        <TabsTrigger value="specs" className="gap-1.5 text-xs font-semibold">
                            <Camera className="w-3.5 h-3.5" />
                            Fotos Base de Identificación
                        </TabsTrigger>
                    </TabsList>

                    {/* Contenido Pestaña 1: Historial de Intervenciones */}
                    <TabsContent value="history" className="space-y-4">
                        {interventions.length === 0 ? (
                            <Card className="text-center py-12 border-dashed">
                                <CardContent className="space-y-2">
                                    <Clock className="w-10 h-10 text-slate-300 mx-auto" />
                                    <h3 className="text-sm font-bold text-slate-700">Sin intervenciones registradas aún</h3>
                                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                                        Las visitas y mantenimientos ejecutados por los técnicos en este equipo se sincronizarán aquí de forma inmutable.
                                    </p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-4">
                                {interventions.map((int, idx) => (
                                    <Card key={int.id || idx} className="border-slate-200 shadow-xs">
                                        <CardHeader className="pb-3 pt-4 px-5 bg-slate-50/50 border-b">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="bg-white font-bold text-xs">
                                                        {int.serviceType}
                                                    </Badge>
                                                    <span className="text-xs text-slate-500 font-medium">
                                                        {(() => {
                                                            const d: any = int.date;
                                                            if (d && typeof d.toDate === "function") {
                                                                return d.toDate().toLocaleDateString("es-DO", { dateStyle: "long" });
                                                            }
                                                            return String(d || "");
                                                        })()}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-3 text-xs text-slate-600">
                                                    <span className="flex items-center gap-1 font-medium">
                                                        <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                                                        {int.technicianName}
                                                    </span>
                                                    {int.ticketId && (
                                                        <Link
                                                            href={`/tickets/${int.ticketId}`}
                                                            className="flex items-center gap-1 font-mono font-bold text-blue-600 hover:underline"
                                                        >
                                                            Ticket #{int.ticketId.slice(0, 8)}
                                                            <ExternalLink className="w-3 h-3" />
                                                        </Link>
                                                    )}
                                                </div>
                                            </div>
                                        </CardHeader>

                                        <CardContent className="p-5 space-y-4 text-xs">
                                            {int.workDone && (
                                                <div className="space-y-1">
                                                    <span className="font-bold text-slate-700 block">Trabajo Realizado:</span>
                                                    <p className="text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-lg border">
                                                        {int.workDone}
                                                    </p>
                                                </div>
                                            )}

                                            {int.diagnosis && (
                                                <div className="space-y-1">
                                                    <span className="font-bold text-slate-700 block">Diagnóstico / Hallazgos:</span>
                                                    <p className="text-slate-600 leading-relaxed">{int.diagnosis}</p>
                                                </div>
                                            )}

                                            {/* Mediciones técnicas si existen */}
                                            {int.measurements && (
                                                <div className="flex flex-wrap gap-4 p-2.5 bg-slate-50 rounded-lg border text-slate-700">
                                                    {int.measurements.psiLow !== undefined && (
                                                        <span><strong>PSI Baja:</strong> {int.measurements.psiLow}</span>
                                                    )}
                                                    {int.measurements.psiHigh !== undefined && (
                                                        <span><strong>PSI Alta:</strong> {int.measurements.psiHigh}</span>
                                                    )}
                                                    {int.measurements.amp !== undefined && (
                                                        <span><strong>Consumo:</strong> {int.measurements.amp} A</span>
                                                    )}
                                                    {int.measurements.tempDelta !== undefined && (
                                                        <span><strong>Salto Térmico (ΔT):</strong> {int.measurements.tempDelta} °C</span>
                                                    )}
                                                </div>
                                            )}

                                            {/* Evidencias fotográficas clasificadas */}
                                            {int.photos && int.photos.length > 0 && (
                                                <div className="space-y-2">
                                                    <span className="font-bold text-slate-700 block">Evidencias Fotográficas:</span>
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                        {int.photos.map((photo, pIdx) => (
                                                            <div key={pIdx} className="space-y-1">
                                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                <img
                                                                    src={photo.url}
                                                                    alt={photo.caption || `Foto ${photo.stage}`}
                                                                    className="w-full h-24 object-cover rounded-lg border shadow-2xs hover:opacity-90 cursor-pointer"
                                                                    onClick={() => window.open(photo.url, "_blank")}
                                                                />
                                                                <span className="text-[10px] font-bold text-slate-500 uppercase block text-center">
                                                                    {photo.stage === "BEFORE" ? "Antes" : photo.stage === "DURING" ? "Durante" : "Después"}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    {/* Contenido Pestaña 2: Fotos Base de Identificación */}
                    <TabsContent value="specs">
                        <Card className="border-slate-200">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-bold">Identificación Visual del Activo</CardTitle>
                                <CardDescription className="text-xs">
                                    Fotos maestras de la placa técnica, la tarjeta electrónica y las unidades físicas.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="p-3 border rounded-xl bg-slate-50 text-center space-y-2">
                                        <span className="font-bold text-xs text-slate-700 block">Placa Técnica / Especificaciones</span>
                                        {equipment.platePhotoUrl ? (
                                            /* eslint-disable-next-line @next/next/no-img-element */
                                            <img
                                                src={equipment.platePhotoUrl}
                                                alt="Placa"
                                                className="w-full h-44 object-cover rounded-lg border shadow-xs cursor-pointer"
                                                onClick={() => window.open(equipment.platePhotoUrl, "_blank")}
                                            />
                                        ) : (
                                            <div className="h-44 border-2 border-dashed rounded-lg flex items-center justify-center text-xs text-slate-400">
                                                Sin foto de placa
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-3 border rounded-xl bg-slate-50 text-center space-y-2">
                                        <span className="font-bold text-xs text-slate-700 block">Tarjeta Electrónica / Diagrama</span>
                                        {equipment.boardPhotoUrl ? (
                                            /* eslint-disable-next-line @next/next/no-img-element */
                                            <img
                                                src={equipment.boardPhotoUrl}
                                                alt="Tarjeta"
                                                className="w-full h-44 object-cover rounded-lg border shadow-xs cursor-pointer"
                                                onClick={() => window.open(equipment.boardPhotoUrl, "_blank")}
                                            />
                                        ) : (
                                            <div className="h-44 border-2 border-dashed rounded-lg flex items-center justify-center text-xs text-slate-400">
                                                Sin foto de tarjeta
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Modal de Impresión de Etiquetas */}
            <QRLabelSheet
                open={qrSheetOpen}
                onOpenChange={setQrSheetOpen}
                equipments={[equipment]}
                title={`Etiqueta QR - ${equipment.code}`}
            />

            {/* Modal de Sustitución de Equipos */}
            <EquipmentReplacementModal
                open={replaceModalOpen}
                onOpenChange={setReplaceModalOpen}
                equipment={equipment}
                onReplaced={(newId) => {
                    router.push(`/equipment/${newId}`);
                }}
            />
        </div>
    );
}
