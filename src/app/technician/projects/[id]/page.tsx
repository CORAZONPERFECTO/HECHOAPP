"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, collection, query, where, onSnapshot, runTransaction, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Project, ProjectZone, ProjectArea, ProjectTaller } from "@/types/projects";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, CheckCircle2, ChevronDown, ChevronRight, Clock, Loader2, Upload, Camera } from "lucide-react";
import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export default function TechnicianProjectDetailPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params.id as string;

    const [project, setProject] = useState<Project | null>(null);
    const [zones, setZones] = useState<ProjectZone[]>([]);
    const [loading, setLoading] = useState(true);

    const [expandedZone, setExpandedZone] = useState<string | null>(null);
    const [expandedArea, setExpandedArea] = useState<string | null>(null);

    // Photo Upload Modal State
    const [selectedTaller, setSelectedTaller] = useState<{zoneId: string, areaId: string, taller: ProjectTaller} | null>(null);
    const [evidencePhoto, setEvidencePhoto] = useState<string | null>(null);
    const [completing, setCompleting] = useState(false);

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
            // Sort by name or creation if needed
            setZones(data.sort((a, b) => a.name.localeCompare(b.name)));
            setLoading(false);
        });

        return () => {
            unsubProject();
            unsubZones();
        };
    }, [projectId]);

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                setEvidencePhoto(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const confirmCompletion = async () => {
        if (!selectedTaller) return;
        const user = auth.currentUser;
        if (!user) {
            alert("Debes estar autenticado");
            return;
        }

        if (!evidencePhoto) {
            alert("La foto de evidencia es obligatoria para completar la tarea.");
            return;
        }

        setCompleting(true);
        try {
            const { zoneId, areaId, taller } = selectedTaller;
            
            // Transaction para asegurar atomicidad matemática
            await runTransaction(db, async (transaction) => {
                const projectRef = doc(db, "projects", projectId);
                const zoneRef = doc(db, "projectZones", zoneId);
                
                const projectDoc = await transaction.get(projectRef);
                const zoneDoc = await transaction.get(zoneRef);
                
                if (!projectDoc.exists() || !zoneDoc.exists()) {
                    throw "Documentos no encontrados";
                }
                
                const zoneData = zoneDoc.data() as ProjectZone;
                const projectData = projectDoc.data() as Project;

                // Encontrar y modificar el taller
                let tallerEncontrado = false;
                for (let a of zoneData.areas) {
                    if (a.id === areaId) {
                        for (let t of a.talleres) {
                            if (t.id === taller.id && t.status !== 'COMPLETED') {
                                t.status = 'COMPLETED';
                                t.completedAt = serverTimestamp() as any;
                                t.evidencePhotoUrl = evidencePhoto;
                                t.assignedToTecnicoId = user.uid;
                                t.assignedToTecnicoName = user.displayName || user.email || "Técnico";
                                tallerEncontrado = true;
                                break;
                            }
                        }
                    }
                }

                if (!tallerEncontrado) {
                    // Quizás ya fue completado por otro
                    return;
                }

                // Incrementar Zone
                zoneData.completedTalleres += 1;
                zoneData.progressPercentage = (zoneData.completedTalleres / zoneData.totalTalleres) * 100;

                // Incrementar Project
                const newProjectCompleted = projectData.completedTalleres + 1;
                const newProjectProgress = (newProjectCompleted / projectData.totalTalleres) * 100;

                // Aplicar Cambios
                transaction.update(zoneRef, zoneData as any);
                transaction.update(projectRef, {
                    completedTalleres: newProjectCompleted,
                    progressPercentage: newProjectProgress,
                    status: projectData.status === 'PLANNING' ? 'IN_PROGRESS' : projectData.status
                });
            });

            // Cleanup modal
            setSelectedTaller(null);
            setEvidencePhoto(null);
        } catch (error) {
            console.error("Error confirmando taller:", error);
            alert("Error al guardar el progreso.");
        } finally {
            setCompleting(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
    }

    if (!project) {
        return <div className="p-6 text-center text-gray-500">Proyecto no encontrado.</div>;
    }

    return (
        <div className="space-y-4 pb-24 max-w-lg mx-auto">
            {/* Header Módulo */}
            <div className="bg-white sticky top-0 z-10 pt-4 pb-2 px-4 shadow-sm border-b">
                <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2 text-blue-600">
                    <Link href="/technician/projects">
                        <ArrowLeft className="h-4 w-4 mr-2" /> Volver a Obras
                    </Link>
                </Button>
                <h1 className="text-xl font-bold text-gray-900 leading-tight">{project.name}</h1>
                <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-blue-600 transition-all duration-1000"
                            style={{ width: `${project.progressPercentage || 0}%` }}
                        />
                    </div>
                    <span className="text-xs font-bold text-blue-700">{project.progressPercentage?.toFixed(0) || 0}%</span>
                </div>
            </div>

            <div className="px-4 space-y-3">
                {zones.map((zone) => (
                    <Card key={zone.id} className="overflow-hidden border-gray-200">
                        {/* Zone Header (Click to expand) */}
                        <div 
                            className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${expandedZone === zone.id ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}
                            onClick={() => setExpandedZone(expandedZone === zone.id ? null : zone.id)}
                        >
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-800">{zone.name}</h3>
                                <p className="text-xs text-gray-500">
                                    {zone.completedTalleres} / {zone.totalTalleres} completados
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-bold text-blue-600">
                                    {zone.progressPercentage?.toFixed(0) || 0}%
                                </span>
                                {expandedZone === zone.id ? <ChevronDown className="h-5 w-5 text-gray-400" /> : <ChevronRight className="h-5 w-5 text-gray-400" />}
                            </div>
                        </div>

                        {/* Areas Accordion */}
                        {expandedZone === zone.id && (
                            <div className="border-t border-gray-100 bg-slate-50">
                                {zone.areas.map((area) => {
                                    const areaCompleted = area.talleres.filter(t => t.status === 'COMPLETED').length;
                                    const areaTotal = area.talleres.length;
                                    const isAreaExpanded = expandedArea === area.id;

                                    return (
                                        <div key={area.id} className="border-b border-gray-100 last:border-0">
                                            {/* Area Header */}
                                            <div 
                                                className="p-3 pl-6 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors"
                                                onClick={() => setExpandedArea(isAreaExpanded ? null : area.id)}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${areaCompleted === areaTotal ? 'bg-green-500' : 'bg-yellow-400'}`} />
                                                    <span className="font-medium text-sm text-gray-700">{area.name}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-gray-400">{areaCompleted}/{areaTotal}</span>
                                                    {isAreaExpanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                                                </div>
                                            </div>

                                            {/* Talleres List */}
                                            {isAreaExpanded && (
                                                <div className="bg-white p-2 pl-8 pb-4 space-y-1">
                                                    {area.talleres.sort((a,b) => a.orderIndex - b.orderIndex).map((taller) => {
                                                        const isCompleted = taller.status === 'COMPLETED';
                                                        return (
                                                            <div 
                                                                key={taller.id} 
                                                                className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
                                                                    isCompleted ? 'bg-green-50/50 border-green-100' : 'bg-white border-gray-100 hover:border-blue-200 cursor-pointer'
                                                                }`}
                                                                onClick={() => {
                                                                    if (!isCompleted) {
                                                                        setSelectedTaller({ zoneId: zone.id, areaId: area.id, taller });
                                                                    }
                                                                }}
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`h-5 w-5 rounded-full border flex items-center justify-center shrink-0 ${
                                                                        isCompleted ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 bg-gray-50'
                                                                    }`}>
                                                                        {isCompleted && <CheckCircle2 className="h-3 w-3" />}
                                                                    </div>
                                                                    <span className={`text-sm ${isCompleted ? 'text-gray-500 line-through' : 'text-gray-700 font-medium'}`}>
                                                                        {taller.name}
                                                                    </span>
                                                                </div>
                                                                {!isCompleted && (
                                                                    <div className="h-6 w-6 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
                                                                        <Camera className="h-3 w-3" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </Card>
                ))}
            </div>

            {/* Modal de Validación (Evidencia) */}
            <Dialog open={!!selectedTaller} onOpenChange={(open) => !open && !completing && setSelectedTaller(null)}>
                <DialogContent className="sm:max-w-md w-[95vw] rounded-xl">
                    <DialogHeader>
                        <DialogTitle className="text-left leading-tight">
                            Completar: <span className="text-blue-600">{selectedTaller?.taller.name}</span>
                        </DialogTitle>
                    </DialogHeader>
                    
                    <div className="py-4 space-y-4">
                        <p className="text-sm text-gray-500">
                            Para marcar este hito como completado, debes subir una foto de evidencia.
                        </p>

                        <div className="space-y-2">
                            <div className="relative h-40 w-full rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 transition-colors flex flex-col items-center justify-center overflow-hidden">
                                {evidencePhoto ? (
                                    <img src={evidencePhoto} alt="Evidencia" className="w-full h-full object-cover" />
                                ) : (
                                    <>
                                        <Camera className="h-8 w-8 text-gray-400 mb-2" />
                                        <span className="text-sm font-medium text-gray-500">Tocar para tomar foto</span>
                                    </>
                                )}
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    capture="environment"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    onChange={handlePhotoUpload}
                                />
                            </div>
                            {evidencePhoto && (
                                <p className="text-xs text-center text-green-600 font-medium">Foto capturada correctamente</p>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="flex-row gap-2 justify-end">
                        <Button variant="outline" onClick={() => setSelectedTaller(null)} disabled={completing} className="flex-1">
                            Cancelar
                        </Button>
                        <Button onClick={confirmCompletion} disabled={!evidencePhoto || completing} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
                            {completing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                            Validar Tarea
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
