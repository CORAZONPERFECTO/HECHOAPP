"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, collection, query, where, onSnapshot, deleteDoc, writeBatch, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Project, ProjectZone, ProjectArea, ProjectTaller } from "@/types/projects";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CheckCircle2, ChevronDown, ChevronRight, Clock, Loader2, Image as ImageIcon, User, Calendar, Trash2, Plus, Grid3X3, Edit, Printer, FileText } from "lucide-react";
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
                    // Extract template from zones[0] corresponding area
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
            // Ordenar por nombre
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
                <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                <p className="text-gray-500 font-medium">Cargando detalles del proyecto...</p>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <p className="text-xl text-gray-500 font-medium">Proyecto no encontrado (404).</p>
                <Button onClick={() => router.push("/projects")} variant="outline">Volver a Proyectos</Button>
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
                
                {/* Header Superior */}
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" onClick={() => router.push("/projects")} className="bg-white shadow-sm hover:bg-gray-50 no-print">
                            <ArrowLeft className="mr-2 h-4 w-4 text-blue-600" />
                            Volver
                        </Button>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">{project.name}</h1>
                            <p className="text-gray-500 flex items-center gap-2 mt-1">
                                <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                                    project.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                    project.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                                    'bg-yellow-100 text-yellow-700'
                                }`}>
                                    {project.status.replace('_', ' ')}
                                </span>
                                • Cliente: {project.clientName}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-col md:flex-row gap-2 mt-4 md:mt-0 no-print">
                        <Button variant="outline" className="text-emerald-700 border-emerald-200 hover:bg-emerald-50" onClick={handlePrintReport}>
                            <Printer className="h-4 w-4 mr-2" /> Informe Final
                        </Button>
                        <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={handleDeleteProject}>
                            <Trash2 className="h-4 w-4 mr-2" /> Eliminar Proyecto
                        </Button>
                    </div>
                </div>

                {/* Tarjetas de Resumen KPI */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="border-t-4 border-t-blue-500 shadow-sm print-shadow-none print-break-inside-avoid">
                        <CardContent className="pt-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Avance Global</p>
                                    <h2 className="text-4xl font-black text-gray-900 mt-2">{project.progressPercentage?.toFixed(1) || 0}%</h2>
                                </div>
                                <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
                                    <CheckCircle2 className="h-6 w-6" />
                                </div>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2 mt-4">
                                <div className="bg-blue-600 h-2 rounded-full transition-all duration-1000" style={{ width: `${project.progressPercentage || 0}%` }}></div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-t-4 border-t-purple-500 shadow-sm print-shadow-none print-break-inside-avoid">
                        <CardContent className="pt-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Hitos Completados</p>
                                    <h2 className="text-4xl font-black text-gray-900 mt-2">
                                        {project.completedTalleres || 0} <span className="text-xl text-gray-400 font-normal">/ {project.totalTalleres || 0}</span>
                                    </h2>
                                </div>
                                <div className="p-3 bg-purple-50 rounded-lg text-purple-600">
                                    <CheckCircle2 className="h-6 w-6" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-t-4 border-t-emerald-500 shadow-sm print-shadow-none print-break-inside-avoid">
                        <CardContent className="pt-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Estimación (ETA)</p>
                                    <h2 className="text-xl font-bold text-gray-900 mt-3">
                                        {project.estimatedCompletionDate 
                                            ? format((project.estimatedCompletionDate as any).toDate ? (project.estimatedCompletionDate as any).toDate() : new Date(project.estimatedCompletionDate as any), "dd 'de' MMMM, yyyy", { locale: es })
                                            : "Calculando..."}
                                    </h2>
                                </div>
                                <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
                                    <Calendar className="h-6 w-6" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Detalle de Zonas y Áreas */}
                <div className="flex justify-between items-center mt-8 mb-4 border-b pb-2">
                    <h2 className="text-xl font-bold text-gray-800">Estructura y Seguimiento de Zonas</h2>
                    {zones.length > 0 && (
                        <div className="flex gap-2 no-print">
                            <Button 
                                size="sm" 
                                variant="outline" 
                                className="bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
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
                        <div className="bg-white rounded-xl p-12 text-center border shadow-sm">
                            <p className="text-gray-500">Este proyecto aún no tiene zonas creadas.</p>
                        </div>
                    ) : (
                        zones.map((zone) => (
                            <Card key={zone.id} className="overflow-hidden shadow-sm hover:shadow-md transition-shadow border-gray-200 print-shadow-none print-break-inside-avoid">
                                {/* Zone Header (Click to expand) */}
                                <div 
                                    className={`p-5 flex items-center justify-between cursor-pointer transition-colors ${expandedZone === zone.id ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}
                                    onClick={() => setExpandedZone(expandedZone === zone.id ? null : zone.id)}
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-lg font-bold text-gray-900">{zone.name}</h3>
                                            <span className="text-xs font-semibold px-2 py-1 bg-gray-100 text-gray-600 rounded-md">
                                                {zone.areas.length} Áreas
                                            </span>
                                            {zone.notes && (
                                                <span className="text-xs font-semibold px-2 py-1 bg-amber-100 text-amber-700 rounded-md flex items-center gap-1">
                                                    <FileText className="h-3 w-3" /> Con Notas
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-2">
                                            <div className="w-48 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-blue-500 transition-all duration-1000"
                                                    style={{ width: `${zone.progressPercentage || 0}%` }}
                                                />
                                            </div>
                                            <p className="text-xs font-medium text-gray-500">
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
                                        {expandedZone === zone.id ? <ChevronDown className="h-6 w-6 text-gray-400" /> : <ChevronRight className="h-6 w-6 text-gray-400" />}
                                    </div>
                                </div>

                                {/* Areas Accordion */}
                                {(expandedZone === zone.id || typeof window !== 'undefined' && window.matchMedia('print').matches) && (
                                    <div className="border-t border-gray-100 bg-slate-50/50 pb-4">
                                        {/* Zone Notes Editor */}
                                        <div className="mx-4 mt-4 p-4 bg-white rounded-lg border border-amber-100 shadow-sm">
                                            <Label className="text-amber-800 font-semibold mb-2 flex items-center gap-2">
                                                <FileText className="h-4 w-4" /> Notas / Materiales de la Zona
                                            </Label>
                                            <Textarea 
                                                className="min-h-[80px] bg-amber-50/30 border-amber-200 focus-visible:ring-amber-500 resize-y no-print"
                                                placeholder="Ej. Falta tubería de cobre de 3/8, el cliente no ha pagado la cuota..."
                                                defaultValue={zone.notes || ""}
                                                onBlur={(e) => {
                                                    if (e.target.value !== zone.notes) {
                                                        handleUpdateZoneNotes(zone.id, e.target.value);
                                                    }
                                                }}
                                            />
                                            {/* Vista solo para imprimir */}
                                            {zone.notes && (
                                                <p className="hidden print:block text-sm text-gray-700 mt-2 p-2 bg-amber-50 rounded border border-amber-100">
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
                                                <div key={area.id} className="border-b border-gray-100 last:border-0 mx-4 mt-2 bg-white rounded-lg shadow-sm overflow-hidden">
                                                    {/* Area Header */}
                                                    <div 
                                                        className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                                                        onClick={() => setExpandedArea(isAreaExpanded ? null : area.id)}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-2.5 h-2.5 rounded-full shadow-inner ${isAllCompleted ? 'bg-green-500' : 'bg-yellow-400'}`} />
                                                            <span className="font-semibold text-gray-800">{area.name}</span>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${isAllCompleted ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                                {areaCompleted}/{areaTotal} Hitos
                                                            </span>
                                                            {isAreaExpanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                                                        </div>
                                                    </div>

                                                    {/* Talleres List (Admin View) */}
                                                    {isAreaExpanded && (
                                                        <div className="bg-slate-50 p-4 border-t border-gray-100 space-y-2">
                                                            {area.talleres.length === 0 ? (
                                                                <p className="text-xs text-gray-400 italic">No hay hitos (talleres) definidos en esta área.</p>
                                                            ) : (
                                                                area.talleres.sort((a,b) => a.orderIndex - b.orderIndex).map((taller) => {
                                                                    const isCompleted = taller.status === 'COMPLETED';
                                                                    return (
                                                                        <div 
                                                                            key={taller.id} 
                                                                            className={`flex flex-col md:flex-row md:items-center justify-between p-3 rounded-lg border ${
                                                                                isCompleted ? 'bg-white border-green-200' : 'bg-white border-gray-200'
                                                                            }`}
                                                                        >
                                                                            <div className="flex items-center gap-3 mb-2 md:mb-0">
                                                                                <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                                                                                    isCompleted ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'
                                                                                }`}>
                                                                                    {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                                                                                </div>
                                                                                <div>
                                                                                    <span className={`text-sm font-medium ${isCompleted ? 'text-gray-800' : 'text-gray-600'}`}>
                                                                                        {taller.name}
                                                                                    </span>
                                                                                    {isCompleted && taller.completedAt && (
                                                                                        <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                                                                                            <CheckCircle2 className="h-3 w-3" />
                                                                                            {format((taller.completedAt as any).toDate ? (taller.completedAt as any).toDate() : new Date(taller.completedAt as any), "dd MMM yyyy, HH:mm", { locale: es })}
                                                                                        </p>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                            
                                                                            {/* Technician Info & Evidence Photo */}
                                                                            {isCompleted ? (
                                                                                <div className="flex items-center gap-4 pl-9 md:pl-0">
                                                                                    {taller.assignedToTecnicoName && (
                                                                                        <div className="flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded-md border border-blue-100">
                                                                                            <User className="h-3 w-3" />
                                                                                            {taller.assignedToTecnicoName}
                                                                                        </div>
                                                                                    )}
                                                                                    {taller.evidencePhotoUrl ? (
                                                                                        <Button 
                                                                                            variant="outline" 
                                                                                            size="sm" 
                                                                                            className="h-7 text-xs bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50 no-print"
                                                                                            onClick={() => setViewingPhoto({
                                                                                                url: taller.evidencePhotoUrl!,
                                                                                                name: taller.name,
                                                                                                technician: taller.assignedToTecnicoName || "Técnico Desconocido",
                                                                                                date: taller.completedAt
                                                                                            })}
                                                                                        >
                                                                                            <ImageIcon className="h-3 w-3 mr-1.5" />
                                                                                            Ver Evidencia
                                                                                        </Button>
                                                                                    ) : (
                                                                                        <span className="text-xs text-gray-400 italic no-print">Sin foto</span>
                                                                                    )}
                                                                                </div>
                                                                            ) : (
                                                                                <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded border border-yellow-100 pl-9 md:pl-0 w-fit">
                                                                                    Pendiente
                                                                                </span>
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
                <DialogContent className="sm:max-w-2xl bg-black/95 text-white border-gray-800">
                    <DialogHeader>
                        <DialogTitle className="text-white">Evidencia: {viewingPhoto?.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between text-sm text-gray-400">
                            <span className="flex items-center gap-1"><User className="h-4 w-4" /> {viewingPhoto?.technician}</span>
                            <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> 
                                {viewingPhoto?.date ? format((viewingPhoto.date as any).toDate ? (viewingPhoto.date as any).toDate() : new Date(viewingPhoto.date as any), "dd MMM yyyy, HH:mm") : "Fecha desconocida"}
                            </span>
                        </div>
                        {viewingPhoto?.url && (
                            <img 
                                src={viewingPhoto.url} 
                                alt="Evidencia de tarea" 
                                className="w-full h-auto max-h-[70vh] object-contain rounded-md"
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
