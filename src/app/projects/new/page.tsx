"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Plus, Save, Trash2, GripVertical, CheckCircle2, ChevronRight, Settings2 } from "lucide-react";
import Link from "next/link";
import { collection, doc, setDoc, serverTimestamp, writeBatch } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { DEFAULT_TALLERES_TEMPLATES, ProjectTallerTemplate, ProjectZone, ProjectArea, ProjectTaller, Project } from "@/types/projects";

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

    // Step 2: Templates Configuration
    const [templates, setTemplates] = useState<ProjectTallerTemplate[]>(
        [...DEFAULT_TALLERES_TEMPLATES].sort((a, b) => a.orderIndex - b.orderIndex)
    );

    // Step 3: Zones & Areas
    // Simple state: an array of zones, each with an array of areas
    const [zones, setZones] = useState<{ id: string; name: string; areas: { id: string; name: string }[] }[]>([
        { id: crypto.randomUUID(), name: "Bloque A / Nivel 1", areas: [{ id: crypto.randomUUID(), name: "Habitación Principal" }] }
    ]);

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

            // Prepare Zones, Areas, and Talleres for batch writing
            const zonesData = zones.map((z, zIndex) => {
                const zoneId = crypto.randomUUID();
                
                let zoneTotalTalleres = 0;
                
                const areasData = z.areas.map((a, aIndex) => {
                    const areaId = crypto.randomUUID();
                    // Each area gets a fresh copy of the active templates as "Talleres"
                    const talleres: ProjectTaller[] = templates.map((t, tIndex) => ({
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
                
                // We'll store zones inside a subcollection or as top-level doc. 
                // Using top-level `projectZones` collection makes queries easier.
                const zoneRef = doc(db, "projectZones", zoneId);
                batch.set(zoneRef, zoneRecord);
                
                return zoneRecord;
            });

            // Master Project Record
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
        <div className="space-y-6 pb-24 max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
                <Button variant="ghost" asChild>
                    <Link href="/projects">
                        <ArrowLeft className="h-4 w-4 mr-2" /> Volver
                    </Link>
                </Button>
                <div className="flex gap-2">
                    {step > 1 && (
                        <Button variant="outline" onClick={() => setStep(step - 1 as any)}>
                            Atrás
                        </Button>
                    )}
                    {step < 3 ? (
                        <Button onClick={() => setStep(step + 1 as any)} className="bg-blue-600">
                            Siguiente <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                    ) : (
                        <Button onClick={handleSaveProject} disabled={loading} className="bg-gradient-to-r from-blue-600 to-purple-600">
                            {loading ? "Creando..." : "Crear Proyecto"} <Save className="ml-2 h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Stepper Progress */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex flex-col items-center gap-2">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>1</div>
                    <span className="text-xs font-medium text-gray-500">Datos Base</span>
                </div>
                <div className={`flex-1 h-1 mx-4 rounded ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`} />
                <div className="flex flex-col items-center gap-2">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>2</div>
                    <span className="text-xs font-medium text-gray-500">Configurar Hitos</span>
                </div>
                <div className={`flex-1 h-1 mx-4 rounded ${step >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`} />
                <div className="flex flex-col items-center gap-2">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>3</div>
                    <span className="text-xs font-medium text-gray-500">Zonas y Áreas</span>
                </div>
            </div>

            {step === 1 && (
                <Card className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <CardHeader>
                        <CardTitle>Datos Base del Proyecto</CardTitle>
                        <CardDescription>Información general sobre la obra o proyecto.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Nombre del Proyecto *</Label>
                            <Input 
                                value={projectData.name} 
                                onChange={e => setProjectData({...projectData, name: e.target.value})}
                                placeholder="Ej. Torre Bella Vista"
                                className="text-lg font-medium"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Cliente / Desarrolladora</Label>
                                <Input 
                                    value={projectData.clientName} 
                                    onChange={e => setProjectData({...projectData, clientName: e.target.value})}
                                    placeholder="Constructora ABC"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Ubicación / Dirección</Label>
                                <Input 
                                    value={projectData.location} 
                                    onChange={e => setProjectData({...projectData, location: e.target.value})}
                                    placeholder="Av. Principal #123"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Descripción Breve</Label>
                            <Textarea 
                                value={projectData.description} 
                                onChange={e => setProjectData({...projectData, description: e.target.value})}
                                placeholder="Instalación de sistemas VRF para torre residencial de 10 niveles."
                            />
                        </div>
                    </CardContent>
                </Card>
            )}

            {step === 2 && (
                <Card className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <CardHeader className="flex flex-row items-start justify-between">
                        <div>
                            <CardTitle>Configurar Plantilla de Hitos (Talleres)</CardTitle>
                            <CardDescription>
                                Esta es la lista de talleres estándar que se le asignará automáticamente a cada área (habitación, sala) que crees. Puedes agregar, editar o borrar según la naturaleza de este proyecto.
                            </CardDescription>
                        </div>
                        <Button onClick={handleAddTemplate} variant="outline" size="sm">
                            <Plus className="h-4 w-4 mr-2" /> Agregar Hito
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {templates.map((template, index) => (
                            <div key={template.id} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border group">
                                <GripVertical className="h-5 w-5 text-gray-400 cursor-move" />
                                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs shrink-0">
                                    {index + 1}
                                </div>
                                <div className="flex-1 space-y-1">
                                    <Input 
                                        value={template.name}
                                        onChange={(e) => handleUpdateTemplate(template.id, 'name', e.target.value)}
                                        className="h-8 border-transparent hover:border-gray-300 focus:border-blue-500 bg-transparent font-medium"
                                    />
                                </div>
                                <div className="w-32">
                                    <Label className="text-[10px] text-gray-500">Mins. Estimados</Label>
                                    <Input 
                                        type="number"
                                        value={template.estimatedMinutes || ''}
                                        onChange={(e) => handleUpdateTemplate(template.id, 'estimatedMinutes', parseInt(e.target.value))}
                                        className="h-8"
                                    />
                                </div>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => handleRemoveTemplate(template.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {step === 3 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex justify-between items-center bg-blue-50 p-4 rounded-lg border border-blue-100">
                        <div>
                            <h3 className="font-semibold text-blue-900">Estructura del Proyecto</h3>
                            <p className="text-sm text-blue-700">Define las Zonas (Ej. Apartamentos) y sus Áreas (Ej. Habitaciones). Cada área recibirá la plantilla de {templates.length} hitos automáticamente.</p>
                        </div>
                        <Button onClick={handleAddZone} className="bg-blue-600 hover:bg-blue-700">
                            <Plus className="h-4 w-4 mr-2" /> Agregar Zona
                        </Button>
                    </div>

                    {zones.map((zone, zIndex) => (
                        <Card key={zone.id} className="border-blue-200 shadow-sm">
                            <CardHeader className="bg-slate-50 border-b py-3 flex flex-row items-center justify-between">
                                <div className="flex items-center gap-3 flex-1">
                                    <div className="h-6 w-6 rounded bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                                        Z{zIndex + 1}
                                    </div>
                                    <Input 
                                        value={zone.name}
                                        onChange={(e) => {
                                            const newZones = [...zones];
                                            newZones[zIndex].name = e.target.value;
                                            setZones(newZones);
                                        }}
                                        className="font-bold text-lg h-9 w-1/2 border-transparent hover:border-gray-300 focus:border-blue-500"
                                        placeholder="Nombre de la Zona (Ej. Bloque A - Apto 202)"
                                    />
                                </div>
                                <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="text-red-500 hover:bg-red-50"
                                    onClick={() => setZones(zones.filter(z => z.id !== zone.id))}
                                >
                                    Eliminar Zona
                                </Button>
                            </CardHeader>
                            <CardContent className="p-4 space-y-3">
                                {zone.areas.length === 0 && (
                                    <p className="text-sm text-gray-500 text-center py-4 border-dashed border-2 rounded">No hay áreas definidas en esta zona.</p>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {zone.areas.map((area, aIndex) => (
                                        <div key={area.id} className="flex items-center gap-2 p-2 border rounded-md bg-white">
                                            <Settings2 className="h-4 w-4 text-gray-400" />
                                            <Input 
                                                value={area.name}
                                                onChange={(e) => {
                                                    const newZones = [...zones];
                                                    newZones[zIndex].areas[aIndex].name = e.target.value;
                                                    setZones(newZones);
                                                }}
                                                className="h-8 border-none shadow-none focus-visible:ring-1"
                                                placeholder="Nombre del Área (Ej. Hab. Principal)"
                                            />
                                            <Button 
                                                variant="ghost" 
                                                size="icon"
                                                className="h-6 w-6 text-gray-400 hover:text-red-500"
                                                onClick={() => {
                                                    const newZones = [...zones];
                                                    newZones[zIndex].areas = newZones[zIndex].areas.filter(a => a.id !== area.id);
                                                    setZones(newZones);
                                                }}
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    ))}
                                    <Button 
                                        variant="outline" 
                                        className="border-dashed h-auto py-2 flex items-center gap-2 text-gray-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50"
                                        onClick={() => handleAddArea(zone.id)}
                                    >
                                        <Plus className="h-4 w-4" /> Agregar Área
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

function X({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M18 6 6 18" />
            <path d="m6 6 18 18" />
        </svg>
    );
}
