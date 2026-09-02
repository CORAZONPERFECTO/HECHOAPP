"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, collection, query, where, onSnapshot, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Project, ProjectZone, ProjectArea, ProjectTaller } from "@/types/projects";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, CheckCircle2, ChevronDown, ChevronRight, Loader2, Camera, Building2, AlertTriangle, ShieldAlert, FileText, Download } from "lucide-react";
import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useOfflineSync } from "@/hooks/use-offline-sync";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { initDB, saveProjectOffline, saveProjectZoneOffline, getProjectOffline, getProjectZonesOffline } from "@/lib/offline-storage";

export default function TechnicianProjectDetailPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params.id as string;
    const isOnline = useOnlineStatus();
    const { queueProjectTallerCompletion, queueProjectTallerBlock } = useOfflineSync();

    const [project, setProject] = useState<Project | null>(null);
    const [zones, setZones] = useState<ProjectZone[]>([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (user) {
                try {
                    const userDoc = await getDoc(doc(db, "users", user.uid));
                    if (userDoc.exists()) {
                        setUserRole(userDoc.data().role || null);
                    }
                } catch (err) {
                    console.error("Error fetching user role:", err);
                }
            } else {
                setUserRole(null);
            }
        });
        return () => unsubscribe();
    }, []);

    const [expandedZone, setExpandedZone] = useState<string | null>(null);
    const [expandedArea, setExpandedArea] = useState<string | null>(null);
    const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

    // Photo Upload Modal State
    const [selectedTaller, setSelectedTaller] = useState<{zoneId: string, areaId: string, taller: ProjectTaller} | null>(null);
    const [evidencePhoto, setEvidencePhoto] = useState<string | null>(null);
    const [completing, setCompleting] = useState(false);

    // Blocker Modal State
    const [selectedBlockTaller, setSelectedBlockTaller] = useState<{zoneId: string, areaId: string, taller: ProjectTaller} | null>(null);
    const [blockedReason, setBlockedReason] = useState("");
    const [blocking, setBlocking] = useState(false);
    const [blockedByContractor, setBlockedByContractor] = useState("");
    const [customContractor, setCustomContractor] = useState("");

    const daysRemaining = useMemo(() => {
        if (!project || !project.createdAt) return null;
        const retentionMonths = project.documentRetentionMonths || 18;
        const createdAt = (project.createdAt as any).toDate ? (project.createdAt as any).toDate() : new Date(project.createdAt as any);
        const expirationDate = new Date(createdAt);
        expirationDate.setMonth(expirationDate.getMonth() + retentionMonths);
        const today = new Date();
        const timeDiff = expirationDate.getTime() - today.getTime();
        return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    }, [project]);

    const groupedZones = useMemo(() => {
        const groups: Record<string, ProjectZone[]> = {};
        zones.forEach(z => {
            const match = z.name.match(/^([^0-9]+)/);
            let groupName = match ? match[1].trim().toUpperCase() : "OTROS";
            
            if (!groups[groupName]) {
                groups[groupName] = [];
            }
            groups[groupName].push(z);
        });

        return Object.entries(groups)
            .map(([name, items]) => ({
                name,
                items: items.sort((a, b) => a.name.localeCompare(b.name)),
                totalTalleres: items.reduce((acc, curr) => acc + curr.totalTalleres, 0),
                completedTalleres: items.reduce((acc, curr) => acc + curr.completedTalleres, 0),
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [zones]);

    // Offline / Online fetching
    useEffect(() => {
        if (!projectId) return;

        if (!isOnline) {
            // Load offline details from IndexedDB
            getProjectOffline(projectId).then(cachedProj => {
                if (cachedProj) setProject(cachedProj);
            });
            getProjectZonesOffline(projectId).then(cachedZones => {
                if (cachedZones) {
                    setZones(cachedZones.sort((a, b) => a.name.localeCompare(b.name)));
                }
                setLoading(false);
            });
            return;
        }

        // Fetch Project Master online
        const unsubProject = onSnapshot(doc(db, "projects", projectId), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data() as Project;
                const normalized = {
                    ...data,
                    id: docSnap.id,
                    createdAt: (data.createdAt as any)?.toDate ? (data.createdAt as any).toDate() : data.createdAt,
                    updatedAt: (data.updatedAt as any)?.toDate ? (data.updatedAt as any).toDate() : data.updatedAt,
                    estimatedCompletionDate: (data.estimatedCompletionDate as any)?.toDate ? (data.estimatedCompletionDate as any).toDate() : data.estimatedCompletionDate,
                };
                setProject(normalized);
                saveProjectOffline(normalized);
            }
        });

        // Fetch Zones online
        const qZones = query(collection(db, "projectZones"), where("projectId", "==", projectId));
        const unsubZones = onSnapshot(qZones, (snapshot) => {
            const data = snapshot.docs.map(doc => {
                const zoneData = doc.data() as ProjectZone;
                return {
                    ...zoneData,
                    id: doc.id
                };
            });
            
            const sorted = data.sort((a, b) => a.name.localeCompare(b.name));
            setZones(sorted);
            setLoading(false);

            // Cache zones to IndexedDB
            sorted.forEach(z => {
                saveProjectZoneOffline(z);
            });
        });

        return () => {
            unsubProject();
            unsubZones();
        };
    }, [projectId, isOnline]);

    const compressImageTaller = (file: File): Promise<string> => {
        return new Promise((resolve) => {
            const img = new Image();
            const reader = new FileReader();
            reader.onload = (e) => { img.src = e.target?.result as string; };
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    const fallbackReader = new FileReader();
                    fallbackReader.onloadend = () => resolve(fallbackReader.result as string);
                    fallbackReader.readAsDataURL(file);
                    return;
                }

                // Resize to max 2048px (2K) to keep high details of machinery/labels
                let { width, height } = img;
                const MAX = 2048;
                if (width > MAX || height > MAX) {
                    if (width > height) {
                        height = Math.round(height * MAX / width);
                        width = MAX;
                    } else {
                        width = Math.round(width * MAX / height);
                        height = MAX;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                // Compress using 90% JPEG quality to ensure legibility of diagnostics
                const dataUrl = canvas.toDataURL('image/jpeg', 0.90);
                resolve(dataUrl);
            };
            img.onerror = () => {
                const fallbackReader = new FileReader();
                fallbackReader.onloadend = () => resolve(fallbackReader.result as string);
                fallbackReader.readAsDataURL(file);
            };
            reader.onerror = () => {
                const fallbackReader = new FileReader();
                fallbackReader.onloadend = () => resolve(fallbackReader.result as string);
                fallbackReader.readAsDataURL(file);
            };
            reader.readAsDataURL(file);
        });
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            try {
                const compressedBase64 = await compressImageTaller(file);
                setEvidencePhoto(compressedBase64);
            } catch (err) {
                console.error("Error compressing photo:", err);
                const reader = new FileReader();
                reader.onloadend = () => {
                    setEvidencePhoto(reader.result as string);
                };
                reader.readAsDataURL(file);
            }
        }
    };

    const handleCompleteTallerLocal = async (zoneId: string, areaId: string, tallerId: string, base64Photo: string) => {
        const user = auth.currentUser;
        if (!user) return;

        setZones(prevZones => {
            const updated = prevZones.map(z => {
                if (z.id !== zoneId) return z;
                
                const updatedAreas = z.areas.map(a => {
                    if (a.id !== areaId) return a;
                    
                    const updatedTalleres = a.talleres.map(t => {
                        if (t.id !== tallerId) return t;
                        return {
                            ...t,
                            status: 'COMPLETED' as const,
                            completedAt: new Date(),
                            evidencePhotoUrl: base64Photo,
                            assignedToTecnicoId: user.uid,
                            assignedToTecnicoName: user.displayName || user.email || "Técnico",
                            blockedReason: undefined
                        };
                    });
                    return { ...a, talleres: updatedTalleres };
                });

                const completedCount = updatedAreas.reduce(
                    (acc, a) => acc + a.talleres.filter(t => t.status === 'COMPLETED').length,
                    0
                );
                
                const zoneCopy = {
                    ...z,
                    areas: updatedAreas,
                    completedTalleres: completedCount,
                    progressPercentage: z.totalTalleres > 0 ? (completedCount / z.totalTalleres) * 100 : 0
                };

                saveProjectZoneOffline(zoneCopy);
                return zoneCopy;
            });
            return updated;
        });

        if (project) {
            setProject(prev => {
                if (!prev) return null;
                const newCompleted = prev.completedTalleres + 1;
                const newProgress = prev.totalTalleres > 0 ? (newCompleted / prev.totalTalleres) * 100 : 0;
                const projCopy = {
                    ...prev,
                    completedTalleres: newCompleted,
                    progressPercentage: newProgress
                };
                saveProjectOffline(projCopy);
                return projCopy;
            });
        }
    };

    const handleBlockTallerLocal = async (zoneId: string, areaId: string, tallerId: string, reason: string, contractor?: string) => {
        const user = auth.currentUser;
        if (!user) return;

        setZones(prevZones => {
            const updated = prevZones.map(z => {
                if (z.id !== zoneId) return z;
                
                const updatedAreas = z.areas.map(a => {
                    if (a.id !== areaId) return a;
                    
                    const updatedTalleres = a.talleres.map(t => {
                        if (t.id !== tallerId) return t;
                        return {
                            ...t,
                            status: 'BLOCKED' as const,
                            blockedReason: reason,
                            blockedByContractor: contractor || undefined,
                            blockedAt: new Date(),
                            assignedToTecnicoId: user.uid,
                            assignedToTecnicoName: user.displayName || user.email || "Técnico"
                        };
                    });
                    return { ...a, talleres: updatedTalleres };
                });

                const zoneCopy = {
                    ...z,
                    areas: updatedAreas
                };
                saveProjectZoneOffline(zoneCopy);
                return zoneCopy;
            });
            return updated;
        });
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
            
            // 1. Guardar localmente
            await handleCompleteTallerLocal(zoneId, areaId, taller.id, evidencePhoto);

            // 2. Encolar en background sync
            await queueProjectTallerCompletion({
                projectId,
                zoneId,
                areaId,
                tallerId: taller.id,
                evidencePhotoBase64: evidencePhoto,
                userId: user.uid,
                userName: user.displayName || user.email || "Técnico"
            });

            // Limpieza
            setSelectedTaller(null);
            setEvidencePhoto(null);
        } catch (error) {
            console.error("Error confirmando taller:", error);
            alert("Error al registrar la tarea.");
        } finally {
            setCompleting(false);
        }
    };

    const confirmBlock = async () => {
        if (!selectedBlockTaller) return;
        const user = auth.currentUser;
        if (!user) {
            alert("Debes estar autenticado");
            return;
        }

        if (!blockedReason.trim()) {
            alert("Debes escribir una razón para el bloqueo.");
            return;
        }

        const contractorValue = blockedByContractor === "Otro" ? customContractor.trim() : blockedByContractor;
        if (!contractorValue) {
            alert("Debes seleccionar o escribir el contratista responsable.");
            return;
        }

        setBlocking(true);
        try {
            const { zoneId, areaId, taller } = selectedBlockTaller;

            // 1. Guardar localmente
            await handleBlockTallerLocal(zoneId, areaId, taller.id, blockedReason, contractorValue);

            // 2. Encolar en background sync
            await queueProjectTallerBlock({
                projectId,
                zoneId,
                areaId,
                tallerId: taller.id,
                blockedReason: blockedReason,
                blockedByContractor: contractorValue,
                userId: user.uid,
                userName: user.displayName || user.email || "Técnico"
            });

            // Limpieza
            setSelectedBlockTaller(null);
            setBlockedReason("");
            setBlockedByContractor("");
            setCustomContractor("");
        } catch (error) {
            console.error("Error bloqueando taller:", error);
            alert("Error al registrar el bloqueo.");
        } finally {
            setBlocking(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-slate-800" /></div>;
    }

    if (!project) {
        return <div className="p-6 text-center text-slate-500">Proyecto no encontrado.</div>;
    }

    return (
        <div className="space-y-4 pb-24 max-w-lg mx-auto">
            {/* Admin Access Redirect Banner */}
            {userRole && ['ADMIN', 'SUPERVISOR', 'GERENTE', 'GERENTE_TICKETS'].includes(userRole) && (
                <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-xl p-3.5 mx-4 mt-4 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-2">
                        <ShieldAlert className="h-5 w-5 text-blue-600 shrink-0" />
                        <div>
                            <p className="text-xs font-bold">Vista de Técnico (Limitada)</p>
                            <p className="text-[10px] text-blue-700 font-semibold">Para agregar, modificar o eliminar zonas, áreas e hitos, ve al panel de gestión.</p>
                        </div>
                    </div>
                    <Button size="sm" variant="default" className="bg-blue-600 hover:bg-blue-700 text-[10px] text-white font-bold h-7 shrink-0 ml-2 px-3" asChild>
                        <Link href={`/projects/${projectId}`}>
                            Ir a Gestión
                        </Link>
                    </Button>
                </div>
            )}

            {/* Header Sticky Módulo - Classic Navy */}
            <div className="bg-white sticky top-0 z-10 pt-4 pb-3 px-4 shadow-sm border-b border-slate-200">
                <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2 text-slate-600 hover:text-slate-900">
                    <Link href="/technician/projects">
                        <ArrowLeft className="h-4 w-4 mr-2" /> Volver a Obras
                    </Link>
                </Button>
                <h1 className="text-lg font-bold text-slate-900 leading-tight tracking-tight">{project.name}</h1>
                
                <div className="flex items-center gap-2 mt-2.5">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-slate-900 transition-all duration-500"
                            style={{ width: `${project.progressPercentage || 0}%` }}
                        />
                    </div>
                    <span className="text-[11px] font-bold text-slate-800">{project.progressPercentage?.toFixed(0) || 0}%</span>
                </div>
            </div>

            <div className="px-4 space-y-3">
                {/* Sección de Documentos para Técnico */}
                <Card className="border-slate-200 shadow-sm rounded-xl bg-white overflow-hidden">
                    <div className="p-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                            <FileText className="h-4 w-4 text-slate-800" />
                            Documentos del Proyecto
                        </h3>
                        {project.documentRetentionMonths && (
                            <span className="text-[10px] text-slate-500 font-medium">
                                Retención: {project.documentRetentionMonths} meses
                            </span>
                        )}
                    </div>
                    <CardContent className="p-3.5 space-y-2.5">
                        {project.evidenceDeleted ? (
                            <p className="text-[11px] text-red-600 font-semibold text-center bg-red-50/50 p-2.5 rounded-lg border border-red-100">
                                🔒 Las evidencias y documentos de este proyecto han sido eliminadas.
                            </p>
                        ) : !project.documents || project.documents.length === 0 ? (
                            <p className="text-[11px] text-slate-400 font-medium text-center py-2">
                                No hay documentos cargados en este proyecto.
                            </p>
                        ) : (
                            <div className="grid grid-cols-2 gap-2">
                                {(['PLANO', 'REQUERIMIENTO', 'PROCESO', 'TABLA_ERRORES'] as const).map(type => {
                                    const docFile = project.documents?.find(d => d.type === type);
                                    let typeTitle = "";
                                    if (type === "PLANO") typeTitle = "Planos";
                                    else if (type === "REQUERIMIENTO") typeTitle = "Requerimientos";
                                    else if (type === "PROCESO") typeTitle = "Procesos";
                                    else if (type === "TABLA_ERRORES") typeTitle = "Tabla de Errores";

                                    if (!docFile) return null;

                                    return (
                                        <div key={type} className="border border-slate-100 rounded-lg p-2.5 bg-slate-50/50 flex flex-col justify-between h-20">
                                            <div>
                                                <span className="text-[10px] font-bold text-slate-800 block truncate">{typeTitle}</span>
                                                <span className="text-[9px] text-slate-400 block truncate" title={docFile.name}>
                                                    {docFile.name}
                                                </span>
                                            </div>
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                asChild
                                                className="w-full bg-white text-[9px] h-6 hover:bg-slate-50 font-bold border-slate-200 p-0"
                                            >
                                                <a href={docFile.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1">
                                                    <Download className="h-2.5 w-2.5" /> Descargar
                                                </a>
                                            </Button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {daysRemaining !== null && daysRemaining > 0 && daysRemaining <= 30 && !project.evidenceDeleted && (
                            <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-2 flex items-start gap-1.5">
                                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                                <span className="text-[9px] leading-normal font-semibold">
                                    Atención: Los documentos del proyecto vencerán en {daysRemaining} días y ya no estarán disponibles.
                                </span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {groupedZones.map((group) => {
                    const isGroupExpanded = expandedGroup === group.name;
                    const groupProgress = group.totalTalleres > 0 ? (group.completedTalleres / group.totalTalleres) * 100 : 0;
                    
                    return (
                        <div key={group.name} className="space-y-2">
                            {/* Header del Grupo (ej. BLOQUE A) */}
                            <div 
                                className="flex items-center justify-between p-3.5 bg-white rounded-xl cursor-pointer border border-slate-200 shadow-sm hover:border-slate-400 transition-colors"
                                onClick={() => setExpandedGroup(isGroupExpanded ? null : group.name)}
                            >
                                <div className="flex-1">
                                    <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2 uppercase tracking-wide">
                                        <Building2 className="h-4.5 w-4.5 text-slate-800" />
                                        {group.name}
                                    </h2>
                                    <p className="text-[10px] text-slate-400 font-semibold">{group.items.length} unidades registradas</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-800">
                                        {groupProgress.toFixed(0)}%
                                    </span>
                                    {isGroupExpanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                                </div>
                            </div>

                            {/* Contenido del Grupo */}
                            {isGroupExpanded && (
                                <div className="pl-2 space-y-2 border-l border-slate-200 ml-2.5 py-1">
                                    {group.items.map((zone) => (
                                        <Card key={zone.id} className="overflow-hidden border-slate-200 shadow-sm rounded-xl bg-white">
                                            {/* Zone Header (Click to expand) */}
                                            <div 
                                                className={`p-3.5 flex items-center justify-between cursor-pointer transition-colors ${expandedZone === zone.id ? 'bg-slate-50/50' : 'hover:bg-slate-50'}`}
                                                onClick={() => setExpandedZone(expandedZone === zone.id ? null : zone.id)}
                                            >
                                                <div className="flex-1">
                                                    <h3 className="font-bold text-slate-900 text-xs">{zone.name}</h3>
                                                    <p className="text-[10px] text-slate-400 font-semibold">
                                                        {zone.completedTalleres} / {zone.totalTalleres} completados
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-slate-700">
                                                        {zone.progressPercentage?.toFixed(0) || 0}%
                                                    </span>
                                                    {expandedZone === zone.id ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                                                </div>
                                            </div>

                                            {/* Areas Accordion */}
                                            {expandedZone === zone.id && (
                                                <div className="border-t border-slate-100 bg-slate-50/30">
                                                    {zone.areas.map((area) => {
                                                        const areaCompleted = area.talleres.filter(t => t.status === 'COMPLETED').length;
                                                        const areaTotal = area.talleres.length;
                                                        const isAreaExpanded = expandedArea === area.id;

                                                        return (
                                                            <div key={area.id} className="border-b border-slate-100 last:border-0">
                                                                {/* Area Header */}
                                                                <div 
                                                                    className="p-3 pl-5 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                                                                    onClick={() => setExpandedArea(isAreaExpanded ? null : area.id)}
                                                                >
                                                                    <div className="flex items-center gap-2">
                                                                        <div className={`w-1.5 h-1.5 rounded-full ${
                                                                            areaCompleted === areaTotal ? 'bg-green-500' : 'bg-amber-500'
                                                                        }`} />
                                                                        <span className="font-semibold text-xs text-slate-800">{area.name}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[10px] text-slate-400 font-bold">{areaCompleted}/{areaTotal}</span>
                                                                        {isAreaExpanded ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
                                                                    </div>
                                                                </div>

                                                                {/* Talleres List */}
                                                                {isAreaExpanded && (
                                                                    <div className="bg-white p-2 pl-6 pb-3 space-y-1">
                                                                        {area.talleres.sort((a,b) => a.orderIndex - b.orderIndex).map((taller) => {
                                                                            const isCompleted = taller.status === 'COMPLETED';
                                                                            const isBlocked = taller.status === 'BLOCKED';
                                                                            
                                                                            return (
                                                                                <div 
                                                                                    key={taller.id} 
                                                                                    className={`flex flex-col p-2.5 rounded-lg border transition-all ${
                                                                                        isCompleted 
                                                                                            ? 'bg-green-50/20 border-green-100' 
                                                                                            : isBlocked 
                                                                                                ? 'bg-red-50/20 border-red-100'
                                                                                                : 'bg-white border-slate-100 hover:border-slate-300'
                                                                                    }`}
                                                                                >
                                                                                    <div className="flex items-center justify-between">
                                                                                        <div className="flex items-center gap-2.5">
                                                                                            <div className={`h-4.5 w-4.5 rounded-full border flex items-center justify-center shrink-0 ${
                                                                                                isCompleted 
                                                                                                    ? 'bg-green-600 border-green-600 text-white' 
                                                                                                    : isBlocked 
                                                                                                        ? 'bg-red-600 border-red-600 text-white'
                                                                                                        : 'border-slate-300 bg-slate-50'
                                                                                            }`}>
                                                                                                {isCompleted && <CheckCircle2 className="h-2.5 w-2.5" />}
                                                                                                {isBlocked && <ShieldAlert className="h-2.5 w-2.5" />}
                                                                                            </div>
                                                                                            <span className={`text-xs ${
                                                                                                isCompleted 
                                                                                                    ? 'text-slate-400 line-through' 
                                                                                                    : isBlocked 
                                                                                                        ? 'text-red-950 font-bold'
                                                                                                        : 'text-slate-800 font-semibold'
                                                                                            }`}>
                                                                                                {taller.name}
                                                                                            </span>
                                                                                        </div>
                                                                                        
                                                                                        {!isCompleted && (
                                                                                            <div className="flex items-center gap-1.5">
                                                                                                {/* Botón de Bloqueo */}
                                                                                                {!isBlocked && (
                                                                                                    <Button 
                                                                                                        variant="ghost" 
                                                                                                        className="h-6 w-6 p-0 hover:bg-red-50 text-red-500 hover:text-red-600"
                                                                                                        onClick={() => setSelectedBlockTaller({ zoneId: zone.id, areaId: area.id, taller })}
                                                                                                    >
                                                                                                        <AlertTriangle className="h-3.5 w-3.5" />
                                                                                                    </Button>
                                                                                                )}
                                                                                                {/* Botón de Cámara para Completar */}
                                                                                                <Button 
                                                                                                    variant="ghost"
                                                                                                    className="h-6 w-6 p-0 hover:bg-slate-100 text-slate-600"
                                                                                                    onClick={() => setSelectedTaller({ zoneId: zone.id, areaId: area.id, taller })}
                                                                                                >
                                                                                                    <Camera className="h-3.5 w-3.5" />
                                                                                                </Button>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                    
                                                                                    {isBlocked && taller.blockedReason && (
                                                                                        <p className="text-[10px] text-red-700 bg-red-50/50 border border-red-100 p-1.5 rounded mt-2 font-medium">
                                                                                            Razón: {taller.blockedReason}
                                                                                        </p>
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
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Modal de Validación (Evidencia Foto) */}
            <Dialog open={!!selectedTaller} onOpenChange={(open) => !open && !completing && setSelectedTaller(null)}>
                <DialogContent className="sm:max-w-md w-[95vw] rounded-xl border border-slate-200">
                    <DialogHeader>
                        <DialogTitle className="text-left leading-tight text-slate-900 text-base font-bold">
                            Completar: <span className="text-slate-800">{selectedTaller?.taller.name}</span>
                        </DialogTitle>
                    </DialogHeader>
                    
                    <div className="py-2 space-y-3">
                        <p className="text-xs text-slate-500">
                            Para marcar este hito como completado, debes adjuntar una foto de evidencia.
                        </p>

                        <div className="space-y-2">
                            <div className="relative h-44 w-full rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 transition-colors flex flex-col items-center justify-center overflow-hidden">
                                {evidencePhoto ? (
                                    <img src={evidencePhoto} alt="Evidencia" className="w-full h-full object-cover" />
                                ) : (
                                    <>
                                        <Camera className="h-6 w-6 text-slate-400 mb-1" />
                                        <span className="text-xs font-semibold text-slate-500">Capturar Foto</span>
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
                                <p className="text-[10px] text-center text-green-700 font-bold uppercase tracking-wider">Foto cargada correctamente</p>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="flex-row gap-2 justify-end pt-2 border-t border-slate-100">
                        <Button variant="outline" onClick={() => setSelectedTaller(null)} disabled={completing} className="flex-1 text-slate-700 text-xs">
                            Cancelar
                        </Button>
                        <Button onClick={confirmCompletion} disabled={!evidencePhoto || completing} className="flex-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold">
                            {completing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-2" />}
                            Validar Hito
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal de Bloqueo */}
            <Dialog open={!!selectedBlockTaller} onOpenChange={(open) => !open && !blocking && setSelectedBlockTaller(null)}>
                <DialogContent className="sm:max-w-md w-[95vw] rounded-xl border border-slate-200">
                    <DialogHeader>
                        <DialogTitle className="text-left leading-tight text-red-950 text-base font-bold flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-red-600" />
                            Reportar Bloqueo
                        </DialogTitle>
                    </DialogHeader>
                    
                    <div className="py-2 space-y-3">
                        <div>
                            <label className="text-xs font-semibold text-slate-700 block mb-1">
                                Contratista / Responsable del Bloqueo:
                            </label>
                            <select
                                value={blockedByContractor}
                                onChange={(e) => setBlockedByContractor(e.target.value)}
                                className="w-full text-xs rounded-lg border border-slate-200 p-2 focus:outline-none focus:ring-1 focus:ring-slate-400 bg-white"
                            >
                                <option value="">-- Seleccionar Contratista --</option>
                                <option value="Albañilería">Albañilería</option>
                                <option value="Electricidad">Electricidad</option>
                                <option value="Plomería">Plomería</option>
                                <option value="Pintura">Pintura</option>
                                <option value="Estructuras / Drywall">Estructuras / Drywall</option>
                                <option value="Vidriería / Carpintería">Vidriería / Carpintería</option>
                                <option value="Propietario / Cliente">Propietario / Cliente</option>
                                <option value="Otro">Otro (Especificar)</option>
                            </select>
                        </div>

                        {blockedByContractor === "Otro" && (
                            <div>
                                <label className="text-xs font-semibold text-slate-700 block mb-1">
                                    Especificar Contratista:
                                </label>
                                <input
                                    type="text"
                                    value={customContractor}
                                    onChange={(e) => setCustomContractor(e.target.value)}
                                    placeholder="Nombre del contratista responsable"
                                    className="w-full text-xs rounded-lg border border-slate-200 p-2 focus:outline-none focus:ring-1 focus:ring-slate-400 bg-white"
                                />
                            </div>
                        )}

                        <div>
                            <label className="text-xs font-semibold text-slate-700 block mb-1">
                                Razón del Bloqueo:
                            </label>
                            <Textarea 
                                value={blockedReason}
                                onChange={(e) => setBlockedReason(e.target.value)}
                                placeholder="Ej: Falta de materiales, sin acceso al apartamento, tuberías rotas..."
                                className="text-xs min-h-[90px] border-slate-200 focus-visible:ring-slate-400"
                            />
                        </div>
                    </div>

                    <DialogFooter className="flex-row gap-2 justify-end pt-2 border-t border-slate-100">
                        <Button variant="outline" onClick={() => setSelectedBlockTaller(null)} disabled={blocking} className="flex-1 text-slate-700 text-xs">
                            Cancelar
                        </Button>
                        <Button 
                            onClick={confirmBlock} 
                            disabled={!blockedReason.trim() || !blockedByContractor || (blockedByContractor === "Otro" && !customContractor.trim()) || blocking} 
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
                        >
                            {blocking ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <ShieldAlert className="h-3.5 w-3.5 mr-2" />}
                            Registrar Bloqueo
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
