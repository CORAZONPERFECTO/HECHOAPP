"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, collection, query, where, onSnapshot, deleteDoc, writeBatch, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Project, ProjectZone, ProjectArea, ProjectTaller } from "@/types/projects";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CheckCircle2, ChevronDown, ChevronRight, Clock, Loader2, Image as ImageIcon, User, Calendar, Trash2, Grid3X3, FileText, Printer, ShieldAlert, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { MatrixGeneratorModal } from "@/components/projects/matrix-generator-modal";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function AdminProjectDetailPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params.id as string;

    const [project, setProject] = useState<Project | null>(null);
    const [zones, setZones] = useState<ProjectZone[]>([]);
    const [loading, setLoading] = useState(true);

    const [expandedZone, setExpandedZone] = useState<string | null>(null);
    const [expandedArea, setExpandedArea] = useState<string | null>(null);

    // Modal para ver foto de evidencia
    const [viewingPhoto, setViewingPhoto] = useState<{ url: string, name: string, technician: string, date: any } | null>(null);

    // Matrix Generator State
    const [showMatrixModal, setShowMatrixModal] = useState(false);

    const handleUpdateZoneNotes = async (zoneId: string, notes: string) => {
        try {
            await updateDoc(doc(db, "projectZones", zoneId), { notes });
        } catch (error) {
            console.error("Error updating notes:", error);
        }
    };

    const handlePrintReport = () => {
        window.print();
    };

    const handleDeleteProject = async () => {
        if (!confirm("¿Estás seguro de eliminar este proyecto y todas sus zonas? Esta acción no se puede deshacer.")) return;
        try {
            const batch = writeBatch(db);
            // Delete zones
            zones.forEach(z => {
                batch.delete(doc(db, "projectZones", z.id));
            });
            // Delete project
            batch.delete(doc(db, "projects", projectId));
            await batch.commit();
            router.push("/projects");
        } catch (error) {
            console.error("Error eliminando proyecto:", error);
            alert("Error al eliminar el proyecto.");
        }
    };

    const handleDeleteZone = async (zoneId: string, zoneName: string) => {
        if (!confirm(`¿Eliminar la zona "${zoneName}"? Se perderá el avance de esta zona.`)) return;
        try {
            await deleteDoc(doc(db, "projectZones", zoneId));
        } catch (error) {
            console.error("Error eliminando zona:", error);
            alert("Error al eliminar zona.");
        }
    };

    const handleGenerateMatrix = async (generatedZones: { id: string; name: string; areas: { id: string; name: string }[] }[]) => {
        if (!project) return;
        try {
            const batch = writeBatch(db);
            let addedTalleres = 0;

            generatedZones.forEach(gz => {
                let zoneTalleres = 0;
                // Reconstruct full areas with talleres from the base areas
                const newAreas = gz.areas.map((areaInfo, index) => {
                    const baseArea = zones[0]?.areas[index];
                    const talleres: ProjectTaller[] = baseArea ? baseArea.talleres.map(t => ({
                        ...t,
                        id: crypto.randomUUID(),
                        status: 'PENDING',
                        completedAt: null as any,
                        evidencePhotoUrl: undefined,
                        assignedToTecnicoId: undefined,
                        assignedToTecnicoName: undefined
                    })) : [];

                    zoneTalleres += talleres.length;

                    return {
                        id: areaInfo.id,
                        name: areaInfo.name,
                        talleres
                    };
                });

                addedTalleres += zoneTalleres;

                const zoneRecord: ProjectZone = {
                    id: gz.id,
                    projectId: projectId,
                    name: gz.name,
                    areas: newAreas as ProjectArea[],
                    progressPercentage: 0,
                    totalTalleres: zoneTalleres,
                    completedTalleres: 0
                };

                batch.set(doc(db, "projectZones", gz.id), zoneRecord);
            });

            // Update project total talleres
            batch.update(doc(db, "projects", projectId), {
                totalTalleres: (project.totalTalleres || 0) + addedTalleres
            });

            await batch.commit();
        } catch (error) {
            console.error("Error generando matriz:", error);
            alert("Error al agregar las nuevas zonas.");
        }
    };

    useEffect(() => {
        if (!projectId) return;

        // Fetch Project Master
        const unsubProject = onSnapshot(doc(db, "projects", projectId), (docSnap) => {
            if (docSnap.exists()) {
                setProject({ id: docSnap.id, ...docSnap.data() } as Project);
            }
        });

        // Fetch Zones
        const qZones = query(collection(db, "projectZones"), where("projectId", "==", projectId));
        const unsubZones = onSnapshot(qZones, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProjectZone));
            setZones(data.sort((a, b) => a.name.localeCompare(b.name)));
            setLoading(false);
        });

        return () => {
            unsubProject();
            unsubZones();
        };
    }, [projectId]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-slate-800" />
                <p className="text-slate-500 font-medium text-xs">Cargando detalles del proyecto...</p>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <p className="text-sm text-slate-500 font-medium">Proyecto no encontrado.</p>
                <Button onClick={() => router.push("/projects")} variant="outline" className="text-xs">Volver a Proyectos</Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8">
            <div className="max-w-6xl mx-auto space-y-6">
                
                <style dangerouslySetInnerHTML={{__html: `
                    @media print {
                        body { background-color: white !important; }
                        .no-print { display: none !important; }
                        .print-break-inside-avoid { break-inside: avoid; }
                        .print-shadow-none { box-shadow: none !important; border: 1px solid #e5e7eb !important; }
                    }
                `}} />
                
                {/* Header Superior - Classic Navy */}
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" onClick={() => router.push("/projects")} className="bg-slate-50 border border-slate-200 shadow-sm hover:bg-slate-100 no-print text-xs">
                            <ArrowLeft className="mr-2 h-4 w-4 text-slate-900" />
                            Volver
                        </Button>
                        <div>
                            <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">{project.name}</h1>
                            <p className="text-slate-500 text-xs flex items-center gap-2 mt-1.5 font-semibold">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                    project.status === 'COMPLETED' ? 'bg-green-50 text-green-800 border border-green-100' :
                                    project.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-900 border border-blue-100' :
                                    'bg-amber-50 text-amber-900 border border-amber-100'
                                }`}>
                                    {project.status === 'IN_PROGRESS' ? 'En Curso' : project.status === 'COMPLETED' ? 'Completado' : 'Planificación'}
                                </span>
                                <span>• Cliente: {project.clientName}</span>
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-row gap-2 no-print shrink-0">
                        <Button variant="outline" className="text-slate-700 border-slate-200 hover:bg-slate-50 text-xs font-semibold" onClick={handlePrintReport}>
                            <Printer className="h-4 w-4 mr-2" /> Informe Final
                        </Button>
                        <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 text-xs font-semibold" onClick={handleDeleteProject}>
                            <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                        </Button>
                    </div>
                </div>

                {/* Tarjetas de Resumen KPI - Classic Navy */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="border-t-4 border-t-slate-900 shadow-sm rounded-xl bg-white print-shadow-none print-break-inside-avoid">
                        <CardContent className="pt-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Avance Global</p>
                                    <h2 className="text-3xl font-black text-slate-900 mt-2">{(project.progressPercentage || 0).toFixed(1)}%</h2>
                                </div>
                                <div className="p-2.5 bg-slate-100 rounded-lg text-slate-900">
                                    <CheckCircle2 className="h-5 w-5" />
                                </div>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-5 overflow-hidden">
                                <div className="bg-slate-900 h-full rounded-full transition-all duration-1000" style={{ width: `${project.progressPercentage || 0}%` }}></div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-t-4 border-t-blue-900 shadow-sm rounded-xl bg-white print-shadow-none print-break-inside-avoid">
                        <CardContent className="pt-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Hitos Completados</p>
                                    <h2 className="text-3xl font-black text-slate-900 mt-2">
                                        {project.completedTalleres || 0} <span className="text-base text-slate-400 font-normal">/ {project.totalTalleres || 0}</span>
                                    </h2>
                                </div>
                                <div className="p-2.5 bg-blue-50 rounded-lg text-blue-900">
                                    <CheckCircle2 className="h-5 w-5" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-t-4 border-t-slate-400 shadow-sm rounded-xl bg-white print-shadow-none print-break-inside-avoid">
                        <CardContent className="pt-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Estimación (ETA)</p>
                                    <h2 className="text-sm font-bold text-slate-900 mt-3 leading-tight">
                                        {project.estimatedCompletionDate 
                                            ? format((project.estimatedCompletionDate as any).toDate ? (project.estimatedCompletionDate as any).toDate() : new Date(project.estimatedCompletionDate as any), "dd 'de' MMMM, yyyy", { locale: es })
                                            : "Calculando..."}
                                    </h2>
                                </div>
                                <div className="p-2.5 bg-slate-100 rounded-lg text-slate-500">
                                    <Calendar className="h-5 w-5" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Detalle de Zonas y Áreas */}
                <div className="flex justify-between items-center mt-8 mb-4 border-b border-slate-200 pb-3">
                    <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider">Estructura y Avance por Zonas</h2>
                    {zones.length > 0 && (
                        <div className="flex gap-2 no-print">
                            <Button 
                                size="sm" 
                                variant="outline" 
                                className="bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100 hover:text-slate-900 text-xs font-semibold"
                                onClick={() => setShowMatrixModal(true)}
                            >
                                <Grid3X3 className="h-4 w-4 mr-2" />
                                Agregar Zonas (Matriz)
                            </Button>
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    {zones.length === 0 ? (
                        <div className="bg-white rounded-xl p-12 text-center border border-slate-200 shadow-sm">
                            <p className="text-slate-500 text-xs font-semibold">Este proyecto aún no tiene zonas creadas.</p>
                        </div>
                    ) : (
                        zones.map((zone) => (
                            <Card key={zone.id} className="overflow-hidden border-slate-200 shadow-sm hover:border-slate-300 transition-colors bg-white rounded-xl print-shadow-none print-break-inside-avoid">
                                {/* Zone Header (Click to expand) */}
                                <div 
                                    className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${expandedZone === zone.id ? 'bg-slate-50/50' : 'hover:bg-slate-50'}`}
                                    onClick={() => setExpandedZone(expandedZone === zone.id ? null : zone.id)}
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-sm font-bold text-slate-900">{zone.name}</h3>
                                            <span className="text-[10px] font-extrabold px-2 py-0.5 bg-slate-100 text-slate-600 rounded border border-slate-200 uppercase tracking-wider">
                                                {zone.areas.length} Áreas
                                            </span>
                                            {zone.notes && (
                                                <span className="text-[10px] font-extrabold px-2 py-0.5 bg-amber-50 text-amber-800 rounded border border-amber-100 uppercase tracking-wider flex items-center gap-1">
                                                    <FileText className="h-3 w-3" /> Notas
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 mt-2">
                                            <div className="w-36 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-slate-900 transition-all duration-1000"
                                                    style={{ width: `${zone.progressPercentage || 0}%` }}
                                                />
                                            </div>
                                            <p className="text-[10px] font-semibold text-slate-500">
                                                {zone.completedTalleres} / {zone.totalTalleres} completados ({zone.progressPercentage?.toFixed(0) || 0}%)
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 no-print">
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 h-auto"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteZone(zone.id, zone.name);
                                            }}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                        {expandedZone === zone.id ? <ChevronDown className="h-5 w-5 text-slate-400" /> : <ChevronRight className="h-5 w-5 text-slate-400" />}
                                    </div>
                                </div>

                                {/* Areas Accordion */}
                                {(expandedZone === zone.id || typeof window !== 'undefined' && window.matchMedia('print').matches) && (
                                    <div className="border-t border-slate-100 bg-slate-50/20 pb-4">
                                        {/* Zone Notes Editor */}
                                        <div className="mx-4 mt-4 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                                            <Label className="text-slate-800 font-bold mb-2 flex items-center gap-2 text-xs uppercase tracking-wider">
                                                <FileText className="h-4 w-4 text-slate-500" /> Notas / Materiales de la Zona
                                            </Label>
                                            <Textarea 
                                                className="min-h-[70px] bg-slate-50/50 border-slate-200 focus-visible:ring-slate-400 text-xs no-print"
                                                placeholder="Notas de materiales o avance específicos para esta zona..."
                                                defaultValue={zone.notes || ""}
                                                onBlur={(e) => {
                                                    if (e.target.value !== zone.notes) {
                                                        handleUpdateZoneNotes(zone.id, e.target.value);
                                                    }
                                                }}
                                            />
                                            {zone.notes && (
                                                <p className="hidden print:block text-xs text-slate-700 mt-2 p-2 bg-slate-50 rounded border border-slate-200">
                                                    {zone.notes}
                                                </p>
                                            )}
                                        </div>

                                        {zone.areas.map((area) => {
                                            const areaCompleted = area.talleres.filter(t => t.status === 'COMPLETED').length;
                                            const areaTotal = area.talleres.length;
                                            const isAreaExpanded = expandedArea === area.id;
                                            const isAllCompleted = areaCompleted === areaTotal && areaTotal > 0;

                                            return (
                                                <div key={area.id} className="border border-slate-200 last:border-0 mx-4 mt-3 bg-white rounded-xl shadow-sm overflow-hidden">
                                                    {/* Area Header */}
                                                    <div 
                                                        className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                                                        onClick={() => setExpandedArea(isAreaExpanded ? null : area.id)}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-2 h-2 rounded-full ${isAllCompleted ? 'bg-green-500' : 'bg-amber-400'}`} />
                                                            <span className="font-bold text-slate-900 text-xs">{area.name}</span>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${
                                                                isAllCompleted 
                                                                    ? 'bg-green-50 text-green-800 border-green-100' 
                                                                    : 'bg-amber-50 text-amber-800 border-amber-100'
                                                            }`}>
                                                                {areaCompleted}/{areaTotal} Completados
                                                            </span>
                                                            {isAreaExpanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                                                        </div>
                                                    </div>

                                                    {/* Talleres List (Admin View) */}
                                                    {isAreaExpanded && (
                                                        <div className="bg-slate-50/50 p-4 border-t border-slate-100 space-y-2">
                                                            {area.talleres.length === 0 ? (
                                                                <p className="text-xs text-slate-400 italic">No hay hitos definidos en esta área.</p>
                                                            ) : (
                                                                area.talleres.sort((a,b) => a.orderIndex - b.orderIndex).map((taller) => {
                                                                    const isCompleted = taller.status === 'COMPLETED';
                                                                    const isBlocked = taller.status === 'BLOCKED';
                                                                    return (
                                                                        <div 
                                                                            key={taller.id} 
                                                                            className={`flex flex-col p-3 rounded-lg border ${
                                                                                isCompleted ? 'bg-white border-green-200' : 
                                                                                isBlocked ? 'bg-red-50/20 border-red-200' :
                                                                                'bg-white border-slate-200'
                                                                            }`}
                                                                        >
                                                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                                                                <div className="flex items-center gap-3">
                                                                                    <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                                                                                        isCompleted ? 'bg-green-600 text-white' : 
                                                                                        isBlocked ? 'bg-red-600 text-white' :
                                                                                        'bg-slate-100 text-slate-400'
                                                                                    }`}>
                                                                                        {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : 
                                                                                         isBlocked ? <ShieldAlert className="h-4 w-4" /> :
                                                                                         <Clock className="h-4 w-4" />}
                                                                                    </div>
                                                                                    <div>
                                                                                        <span className={`text-xs font-semibold ${
                                                                                            isCompleted ? 'text-slate-800' : 
                                                                                            isBlocked ? 'text-red-950' : 
                                                                                            'text-slate-700'
                                                                                        }`}>
                                                                                            {taller.name}
                                                                                        </span>
                                                                                        {isCompleted && taller.completedAt && (
                                                                                            <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                                                                                                <CheckCircle2 className="h-3 w-3" />
                                                                                                {format((taller.completedAt as any).toDate ? (taller.completedAt as any).toDate() : new Date(taller.completedAt as any), "dd MMM yyyy, HH:mm", { locale: es })}
                                                                                            </p>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                                
                                                                                {/* Technician Info & Evidence Photo */}
                                                                                <div className="flex items-center gap-2 pl-9 md:pl-0 shrink-0">
                                                                                    {taller.assignedToTecnicoName && (
                                                                                        <div className={`flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded border font-semibold ${
                                                                                            isBlocked ? 'text-red-700 bg-red-50 border-red-100' : 'text-slate-700 bg-slate-50 border-slate-200'
                                                                                        }`}>
                                                                                            <User className="h-3 w-3" />
                                                                                            {taller.assignedToTecnicoName}
                                                                                        </div>
                                                                                    )}
                                                                                    {isCompleted && (
                                                                                        taller.evidencePhotoUrl ? (
                                                                                            <Button 
                                                                                                variant="outline" 
                                                                                                size="sm" 
                                                                                                className="h-6 text-[10px] bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50 no-print font-bold"
                                                                                                onClick={() => setViewingPhoto({
                                                                                                    url: taller.evidencePhotoUrl!,
                                                                                                    name: taller.name,
                                                                                                    technician: taller.assignedToTecnicoName || "Técnico Desconocido",
                                                                                                    date: taller.completedAt
                                                                                                })}
                                                                                            >
                                                                                                <ImageIcon className="h-3.5 w-3.5 mr-1" />
                                                                                                Ver Evidencia
                                                                                            </Button>
                                                                                        ) : (
                                                                                            <span className="text-xs text-slate-400 italic no-print">Sin foto</span>
                                                                                        )
                                                                                    )}
                                                                                    {isBlocked && (
                                                                                        <span className="text-[9px] font-bold text-red-700 bg-red-50 border border-red-100 px-2 py-0.5 rounded uppercase tracking-wider">
                                                                                            Bloqueado
                                                                                        </span>
                                                                                    )}
                                                                                    {!isCompleted && !isBlocked && (
                                                                                        <span className="text-[9px] font-bold text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded uppercase tracking-wider">
                                                                                            Pendiente
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            </div>

                                                                            {isBlocked && taller.blockedReason && (
                                                                                <div className="mt-2 ml-9 p-2.5 bg-red-50/50 border border-red-100 rounded-md text-xs text-red-950 font-medium">
                                                                                    <span className="font-extrabold text-red-900 block mb-0.5">Reporte de Bloqueo:</span>
                                                                                    {taller.blockedReason}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </Card>
                        ))
                    )}
                </div>
            </div>

            {/* Photo Viewer Modal */}
            <Dialog open={!!viewingPhoto} onOpenChange={(open) => !open && setViewingPhoto(null)}>
                <DialogContent className="sm:max-w-2xl bg-slate-900 text-white border-slate-800">
                    <DialogHeader>
                        <DialogTitle className="text-white text-sm font-bold">Evidencia: {viewingPhoto?.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
                            <span className="flex items-center gap-1 font-semibold"><User className="h-3.5 w-3.5" /> {viewingPhoto?.technician}</span>
                            <span className="flex items-center gap-1 font-semibold"><Clock className="h-3.5 w-3.5" /> 
                                {viewingPhoto?.date ? format((viewingPhoto.date as any).toDate ? (viewingPhoto.date as any).toDate() : new Date(viewingPhoto.date as any), "dd MMM yyyy, HH:mm", { locale: es }) : "Fecha desconocida"}
                            </span>
                        </div>
                        {viewingPhoto?.url && (
                            <img 
                                src={viewingPhoto.url} 
                                alt="Evidencia de tarea" 
                                className="w-full h-auto max-h-[65vh] object-contain rounded-lg border border-slate-800 shadow"
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Modal Matrix Generator */}
            <MatrixGeneratorModal 
                open={showMatrixModal}
                onOpenChange={setShowMatrixModal}
                baseAreas={zones[0]?.areas || []}
                onGenerate={handleGenerateMatrix}
            />
        </div>
    );
}
