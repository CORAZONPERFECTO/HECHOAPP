"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Plus, Save, Trash2, GripVertical, CheckCircle2, ChevronRight, Settings2, Copy, Grid3X3, X } from "lucide-react";
import Link from "next/link";
import { collection, doc, serverTimestamp, writeBatch, getDocs } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { DEFAULT_TALLERES_TEMPLATES, ProjectTallerTemplate, ProjectZone, ProjectArea, ProjectTaller, Project } from "@/types/projects";
import { MatrixGeneratorModal } from "@/components/projects/matrix-generator-modal";
import { useEffect } from "react";
import { Loader2, ShieldCheck, User } from "lucide-react";

export default function NewProjectPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<1 | 2 | 3>(1);

    // Step 1: Basic Info
    const [projectData, setProjectData] = useState({
        name: "",
        clientName: "",
        location: "",
        description: "",
    });

    // Technicians & Retention lifecycle states
    const [technicians, setTechnicians] = useState<{ id: string; nombre: string; email: string }[]>([]);
    const [selectedTechs, setSelectedTechs] = useState<string[]>([]);
    const [documentRetentionMonths, setDocumentRetentionMonths] = useState<number>(18);
    const [techsLoading, setTechsLoading] = useState(false);
    const [techSearch, setTechSearch] = useState("");

    useEffect(() => {
        const fetchTechs = async () => {
            setTechsLoading(true);
            try {
                const usersSnap = await getDocs(collection(db, "users"));
                const techList = usersSnap.docs
                    .map(doc => ({ id: doc.id, ...doc.data() } as any))
                    .filter(u => u.rol === "TECNICO" || u.role === "TECNICO" || u.rol === "CONTRATISTA");
                setTechnicians(techList);
            } catch (err) {
                console.error("Error loading technicians:", err);
            } finally {
                setTechsLoading(false);
            }
        };
        fetchTechs();
    }, []);

    const filteredTechs = technicians.filter(t => 
        t.nombre?.toLowerCase().includes(techSearch.toLowerCase()) || 
        t.email?.toLowerCase().includes(techSearch.toLowerCase())
    );

    // Step 2: Templates Configuration
    const [templates, setTemplates] = useState<ProjectTallerTemplate[]>(
        [...DEFAULT_TALLERES_TEMPLATES].sort((a, b) => a.orderIndex - b.orderIndex)
    );

    // Step 3: Zones & Areas
    const [zones, setZones] = useState<{ id: string; name: string; areas: { id: string; name: string }[] }[]>([
        { id: crypto.randomUUID(), name: "Bloque A / Nivel 1", areas: [{ id: crypto.randomUUID(), name: "Habitación Principal" }] }
    ]);

    const [showMatrixModal, setShowMatrixModal] = useState(false);
    const [matrixBaseZone, setMatrixBaseZone] = useState<{ id: string; name: string; areas: { id: string; name: string }[] } | null>(null);

    const handleAddTemplate = () => {
        setTemplates([
            ...templates,
            {
                id: `custom-${crypto.randomUUID()}`,
                name: "Nuevo Hito / Taller",
                orderIndex: templates.length + 1,
                estimatedMinutes: 60,
            }
        ]);
    };

    const handleRemoveTemplate = (id: string) => {
        setTemplates(templates.filter(t => t.id !== id));
    };

    const handleUpdateTemplate = (id: string, field: keyof ProjectTallerTemplate, value: any) => {
        setTemplates(templates.map(t => t.id === id ? { ...t, [field]: value } : t));
    };

    const handleAddZone = () => {
        setZones([...zones, { id: crypto.randomUUID(), name: "Nueva Zona / Apto", areas: [] }]);
    };

    const handleAddArea = (zoneId: string) => {
        setZones(zones.map(z => z.id === zoneId ? {
            ...z,
            areas: [...z.areas, { id: crypto.randomUUID(), name: "Nueva Área" }]
        } : z));
    };

    const handleDuplicateZone = (zoneId: string) => {
        const zoneToClone = zones.find(z => z.id === zoneId);
        if (!zoneToClone) return;

        const copiesStr = prompt(`¿Cuántas zonas secuenciales deseas crear a partir de "${zoneToClone.name}"?`, "1");
        if (!copiesStr) return;
        
        const numCopies = parseInt(copiesStr);
        if (isNaN(numCopies) || numCopies < 1 || numCopies > 50) {
            alert("Número inválido. Por favor ingrese un número entre 1 y 50.");
            return;
        }

        const newZones = [...zones];
        
        const match = zoneToClone.name.match(/(\d+)(?!.*\d)/);
        let baseName = zoneToClone.name;
        let startNumber = 1;

        if (match && match.index !== undefined) {
            startNumber = parseInt(match[0]);
            baseName = zoneToClone.name.substring(0, match.index);
        } else {
            baseName = zoneToClone.name + " ";
        }

        for (let i = 1; i <= numCopies; i++) {
            const nextNum = startNumber + i;
            const nextNumStr = match ? nextNum.toString().padStart(match[0].length, '0') : nextNum.toString();
            const newName = `${baseName}${nextNumStr}`;
            
            newZones.push({
                id: crypto.randomUUID(),
                name: newName,
                areas: zoneToClone.areas.map(a => ({
                    id: crypto.randomUUID(),
                    name: a.name
                }))
            });
        }

        setZones(newZones);
    };

    const handleSaveProject = async () => {
        if (!projectData.name) {
            alert("Por favor ingresa un nombre para el proyecto.");
            return;
        }

        const user = auth.currentUser;
        if (!user) {
            alert("Debes estar autenticado");
            return;
        }

        setLoading(true);
        try {
            const batch = writeBatch(db);
            const projectRef = doc(collection(db, "projects"));
            
            let totalProjectTalleres = 0;

            zones.forEach((z) => {
                const zoneId = crypto.randomUUID();
                let zoneTotalTalleres = 0;
                
                const areasData = z.areas.map((a) => {
                    const areaId = crypto.randomUUID();
                    const talleres: ProjectTaller[] = templates.map((t) => ({
                        id: crypto.randomUUID(),
                        templateId: t.id,
                        name: t.name,
                        status: 'PENDING',
                        orderIndex: t.orderIndex,
                    }));
                    
                    zoneTotalTalleres += talleres.length;
                    
                    return {
                        id: areaId,
                        name: a.name,
                        talleres
                    } as ProjectArea;
                });
                
                totalProjectTalleres += zoneTotalTalleres;

                const zoneRecord: ProjectZone = {
                    id: zoneId,
                    projectId: projectRef.id,
                    name: z.name,
                    areas: areasData,
                    progressPercentage: 0,
                    totalTalleres: zoneTotalTalleres,
                    completedTalleres: 0
                };
                
                const zoneRef = doc(db, "projectZones", zoneId);
                batch.set(zoneRef, zoneRecord);
            });

            const newProject: Project = {
                id: projectRef.id,
                name: projectData.name,
                clientName: projectData.clientName,
                location: projectData.location,
                description: projectData.description,
                status: 'PLANNING',
                totalTalleres: totalProjectTalleres,
                completedTalleres: 0,
                progressPercentage: 0,
                createdBy: user.uid,
                createdAt: serverTimestamp() as any,
                updatedAt: serverTimestamp() as any,
                assignedTechnicianIds: selectedTechs,
                documentRetentionMonths: documentRetentionMonths,
                documents: [],
                documentsRetentionNotificationSent: false,
                evidenceDeleted: false
            };

            batch.set(projectRef, newProject);

            await batch.commit();

            router.push(`/projects`);
        } catch (error) {
            console.error("Error saving project:", error);
            alert("Hubo un error al guardar el proyecto.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 pb-24 max-w-4xl mx-auto px-4 py-6">
            {/* Header / Navigation */}
            <div className="flex items-center justify-between bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                <Button variant="ghost" size="sm" asChild className="text-slate-600 hover:text-slate-900">
                    <Link href="/projects">
                        <ArrowLeft className="h-4 w-4 mr-2" /> Volver
                    </Link>
                </Button>
                <div className="flex gap-2">
                    {step > 1 && (
                        <Button variant="outline" size="sm" onClick={() => setStep(step - 1 as any)} className="text-xs font-semibold border-slate-200 hover:bg-slate-50">
                            Atrás
                        </Button>
                    )}
                    {step < 3 ? (
                        <Button size="sm" onClick={() => setStep(step + 1 as any)} className="bg-slate-950 hover:bg-slate-800 text-white text-xs font-semibold">
                            Siguiente <ChevronRight className="ml-1.5 h-4 w-4" />
                        </Button>
                    ) : (
                        <Button size="sm" onClick={handleSaveProject} disabled={loading} className="bg-slate-950 hover:bg-slate-800 text-white text-xs font-semibold">
                            {loading ? "Creando..." : "Crear Proyecto"} <Save className="ml-1.5 h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Stepper Progress */}
            <div className="flex items-center justify-between px-6 py-2 bg-white border border-slate-200 rounded-xl shadow-sm">
                <div className="flex flex-col items-center gap-1.5 py-1.5">
                    <div className={`h-7 w-7 rounded-full flex items-center justify-center font-bold text-xs ${step >= 1 ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}>1</div>
                    <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Datos Base</span>
                </div>
                <div className={`flex-1 h-0.5 mx-4 ${step >= 2 ? 'bg-slate-900' : 'bg-slate-100'}`} />
                <div className="flex flex-col items-center gap-1.5 py-1.5">
                    <div className={`h-7 w-7 rounded-full flex items-center justify-center font-bold text-xs ${step >= 2 ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}>2</div>
                    <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Configurar Hitos</span>
                </div>
                <div className={`flex-1 h-0.5 mx-4 ${step >= 3 ? 'bg-slate-900' : 'bg-slate-100'}`} />
                <div className="flex flex-col items-center gap-1.5 py-1.5">
                    <div className={`h-7 w-7 rounded-full flex items-center justify-center font-bold text-xs ${step >= 3 ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}>3</div>
                    <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Zonas y Áreas</span>
                </div>
            </div>

            {step === 1 && (
                <Card className="animate-in fade-in slide-in-from-bottom-4 duration-300 border-slate-200 rounded-xl shadow-sm">
                    <CardHeader className="border-b border-slate-100 pb-4">
                        <CardTitle className="text-base font-bold text-slate-950">Datos Base del Proyecto</CardTitle>
                        <CardDescription className="text-xs text-slate-500">Ingresa la información general sobre la obra o proyecto.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-5">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-800 uppercase tracking-wider">Nombre del Proyecto *</Label>
                            <Input 
                                value={projectData.name} 
                                onChange={e => setProjectData({...projectData, name: e.target.value})}
                                placeholder="Ej. Torre Bella Vista"
                                className="font-semibold text-sm border-slate-200 focus-visible:ring-slate-400 h-9"
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-800 uppercase tracking-wider">Cliente / Desarrolladora</Label>
                                <Input 
                                    value={projectData.clientName} 
                                    onChange={e => setProjectData({...projectData, clientName: e.target.value})}
                                    placeholder="Constructora ABC"
                                    className="text-xs border-slate-200 focus-visible:ring-slate-400 h-9"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-800 uppercase tracking-wider">Ubicación / Dirección</Label>
                                <Input 
                                    value={projectData.location} 
                                    onChange={e => setProjectData({...projectData, location: e.target.value})}
                                    placeholder="Av. Principal #123"
                                    className="text-xs border-slate-200 focus-visible:ring-slate-400 h-9"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-800 uppercase tracking-wider">Descripción Breve</Label>
                            <Textarea 
                                value={projectData.description} 
                                onChange={e => setProjectData({...projectData, description: e.target.value})}
                                placeholder="Instalación de sistemas VRF para torre residencial de 10 niveles."
                                className="text-xs border-slate-200 focus-visible:ring-slate-400 min-h-[80px]"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                            {/* Selector de Flotilla (Técnicos) */}
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                    <User className="h-4 w-4 text-slate-500" /> Asignar Técnicos (Flotilla)
                                </Label>
                                <Input
                                    placeholder="Buscar técnico..."
                                    value={techSearch}
                                    onChange={(e) => setTechSearch(e.target.value)}
                                    className="text-xs h-8 bg-slate-50"
                                />
                                {techsLoading ? (
                                    <div className="flex items-center gap-2 text-xs text-slate-500 justify-center py-4">
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Cargando técnicos...
                                    </div>
                                ) : (
                                    <div className="border border-slate-200 rounded-lg p-2 max-h-36 overflow-y-auto space-y-1 bg-white">
                                        {filteredTechs.length === 0 ? (
                                            <p className="text-xs text-slate-400 text-center py-2">No se encontraron técnicos.</p>
                                        ) : (
                                            filteredTechs.map(tech => {
                                                const isChecked = selectedTechs.includes(tech.id);
                                                return (
                                                    <label key={tech.id} className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded cursor-pointer text-xs">
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setSelectedTechs([...selectedTechs, tech.id]);
                                                                } else {
                                                                    setSelectedTechs(selectedTechs.filter(id => id !== tech.id));
                                                                }
                                                            }}
                                                            className="h-3.5 w-3.5 rounded text-slate-900 border-slate-300 focus:ring-slate-400 cursor-pointer"
                                                        />
                                                        <div className="leading-tight">
                                                            <span className="font-medium text-slate-700">{tech.nombre}</span>
                                                            <span className="block text-[10px] text-slate-400">{tech.email}</span>
                                                        </div>
                                                    </label>
                                                );
                                            })
                                        )}
                                    </div>
                                )}
                                <span className="text-[10px] text-slate-400 font-medium block">
                                    {selectedTechs.length} técnicos seleccionados.
                                </span>
                            </div>

                            {/* Vida Útil de Documentos (Retención) */}
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                    <ShieldCheck className="h-4 w-4 text-slate-500" /> Vida Útil de Documentos
                                </Label>
                                <select
                                    value={documentRetentionMonths}
                                    onChange={(e) => setDocumentRetentionMonths(Number(e.target.value))}
                                    className="w-full text-xs h-9 border border-slate-200 rounded-lg px-2.5 bg-white focus-visible:ring-1 focus-visible:ring-slate-400 font-semibold text-slate-800"
                                >
                                    <option value={12}>12 Meses (1 Año)</option>
                                    <option value={18}>18 Meses (1.5 Años) - Recomendado</option>
                                    <option value={24}>24 Meses (2 Años)</option>
                                    <option value={36}>36 Meses (3 Años)</option>
                                    <option value={60}>60 Meses (5 Años)</option>
                                </select>
                                <p className="text-[10px] text-slate-400 leading-normal">
                                    Los archivos (planos, requerimientos, procesos, tablas de errores) asociados al proyecto se purgarán automáticamente tras este periodo. Se notificará 1 mes antes de expirar.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {step === 2 && (
                <Card className="animate-in fade-in slide-in-from-bottom-4 duration-300 border-slate-200 rounded-xl shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-4">
                        <div>
                            <CardTitle className="text-base font-bold text-slate-950">Configurar Plantilla de Hitos (Talleres)</CardTitle>
                            <CardDescription className="text-[11px] text-slate-500 mt-1">
                                Esta es la lista de talleres estándar que se le asignará automáticamente a cada área. Puedes agregar, editar o borrar hitos.
                            </CardDescription>
                        </div>
                        <Button onClick={handleAddTemplate} variant="outline" size="sm" className="text-xs font-semibold border-slate-200 hover:bg-slate-50 shrink-0">
                            <Plus className="h-3.5 w-3.5 mr-1" /> Agregar Hito
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-5">
                        {templates.map((template, index) => (
                            <div key={template.id} className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200 group transition-colors">
                                <GripVertical className="h-4 w-4 text-slate-400 cursor-move" />
                                <div className="h-7 w-7 rounded-full bg-slate-200 flex items-center justify-center text-slate-900 font-bold text-xs shrink-0">
                                    {index + 1}
                                </div>
                                <div className="flex-1">
                                    <Input 
                                        value={template.name}
                                        onChange={(e) => handleUpdateTemplate(template.id, 'name', e.target.value)}
                                        className="h-8 border-transparent hover:border-slate-300 focus:border-slate-400 bg-transparent text-xs font-semibold"
                                    />
                                </div>
                                <div className="w-24">
                                    <Input 
                                        type="number"
                                        value={template.estimatedMinutes || ''}
                                        onChange={(e) => handleUpdateTemplate(template.id, 'estimatedMinutes', parseInt(e.target.value))}
                                        className="h-8 text-xs text-right border-slate-200"
                                        placeholder="Minutos"
                                    />
                                </div>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                                    onClick={() => handleRemoveTemplate(template.id)}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {step === 3 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-100 p-4 rounded-xl border border-slate-200 gap-4">
                        <div>
                            <h3 className="font-bold text-slate-900 text-sm">Estructura del Proyecto</h3>
                            <p className="text-xs text-slate-500 mt-1">Define las Zonas (Ej. Apartamentos) y sus Áreas (Ej. Habitaciones). Cada área recibirá la plantilla de {templates.length} hitos automáticamente.</p>
                        </div>
                        <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
                            <Button 
                                onClick={() => {
                                    setMatrixBaseZone(zones[0] || { id: "", name: "", areas: [] });
                                    setShowMatrixModal(true);
                                }} 
                                variant="outline" 
                                size="sm"
                                className="bg-white text-slate-800 border-slate-200 hover:bg-slate-50 flex-1 md:flex-none text-xs font-semibold"
                            >
                                <Grid3X3 className="h-3.5 w-3.5 mr-1" /> Generar Matriz
                            </Button>
                            <Button size="sm" onClick={handleAddZone} className="bg-slate-950 hover:bg-slate-800 text-white flex-1 md:flex-none text-xs font-semibold">
                                <Plus className="h-3.5 w-3.5 mr-1" /> Agregar Zona
                            </Button>
                        </div>
                    </div>

                    {zones.map((zone, zIndex) => (
                        <Card key={zone.id} className="border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
                            <CardHeader className="bg-slate-50/50 border-b border-slate-200 py-3 px-4 flex flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="h-6 w-6 rounded bg-slate-900 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                                        Z{zIndex + 1}
                                    </div>
                                    <Input 
                                        value={zone.name}
                                        onChange={(e) => {
                                            const newZones = [...zones];
                                            newZones[zIndex].name = e.target.value;
                                            setZones(newZones);
                                        }}
                                        className="font-bold text-sm h-8 w-1/2 border-transparent hover:border-slate-300 focus:border-slate-400 bg-transparent"
                                        placeholder="Nombre de la Zona (Ej. Apto 101)"
                                    />
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        className="text-slate-800 hover:bg-slate-100 border-slate-200 bg-white text-xs font-semibold h-8"
                                        onClick={() => handleDuplicateZone(zone.id)}
                                        title="Duplicar Zona y sus áreas"
                                    >
                                        <Copy className="h-3.5 w-3.5 mr-1.5" />
                                        Clonar
                                    </Button>
                                    <Button 
                                        variant="ghost" 
                                        size="sm"
                                        className="text-red-600 hover:bg-red-50 text-xs font-semibold h-8"
                                        onClick={() => setZones(zones.filter(z => z.id !== zone.id))}
                                    >
                                        Eliminar
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 space-y-4">
                                {zone.areas.length === 0 && (
                                    <p className="text-xs text-slate-400 text-center py-4 border-dashed border border-slate-200 rounded-lg bg-slate-50/50">No hay áreas definidas en esta zona.</p>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {zone.areas.map((area, aIndex) => (
                                        <div key={area.id} className="flex items-center gap-2 p-2 border border-slate-200 rounded-lg bg-white">
                                            <Settings2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                            <Input 
                                                value={area.name}
                                                onChange={(e) => {
                                                    const newZones = [...zones];
                                                    newZones[zIndex].areas[aIndex].name = e.target.value;
                                                    setZones(newZones);
                                                }}
                                                className="h-7 border-none shadow-none focus-visible:ring-1 focus-visible:ring-slate-400 text-xs"
                                                placeholder="Ej. Habitación Principal"
                                            />
                                            <Button 
                                                variant="ghost" 
                                                size="icon"
                                                className="h-6 w-6 text-slate-400 hover:text-red-500 shrink-0"
                                                onClick={() => {
                                                    const newZones = [...zones];
                                                    newZones[zIndex].areas = newZones[zIndex].areas.filter(a => a.id !== area.id);
                                                    setZones(newZones);
                                                }}
                                            >
                                                <X className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    ))}
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        className="border-dashed border-slate-200 h-9 flex items-center justify-center gap-1.5 text-slate-500 hover:text-slate-900 hover:border-slate-400 hover:bg-slate-50 font-bold"
                                        onClick={() => handleAddArea(zone.id)}
                                    >
                                        <Plus className="h-3.5 w-3.5" /> Agregar Área
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
            
            {/* Modal Matrix Generator */}
            <MatrixGeneratorModal 
                open={showMatrixModal}
                onOpenChange={setShowMatrixModal}
                baseAreas={matrixBaseZone?.areas || []}
                onGenerate={(generatedZones) => {
                    setZones([...zones, ...generatedZones]);
                }}
            />
        </div>
    );
}
