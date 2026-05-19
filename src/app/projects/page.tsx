"use client";

import { useState, useEffect } from "react";
import { collection, query, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Project } from "@/types/projects";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Plus, Loader2, Calendar } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function ProjectsPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, "projects"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
            data.sort((a, b) => {
                const dateA = (a.createdAt as any)?.toMillis ? (a.createdAt as any).toMillis() : ((a.createdAt as any)?.getTime ? (a.createdAt as any).getTime() : Date.now());
                const dateB = (b.createdAt as any)?.toMillis ? (b.createdAt as any).toMillis() : ((b.createdAt as any)?.getTime ? (b.createdAt as any).getTime() : Date.now());
                return dateB - dateA;
            });
            setProjects(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    return (
        <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Header section - Classic Navy */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        Proyectos
                    </h1>
                    <p className="text-slate-500 text-xs mt-1">Gestión de proyectos, zonas y seguimiento de avance de técnicos en obras.</p>
                </div>
                <Button asChild className="bg-slate-950 text-white hover:bg-slate-800 border border-slate-900 transition-colors shadow-sm font-semibold text-xs py-2 h-9">
                    <Link href="/projects/new">
                        <Plus className="h-4 w-4 mr-2" /> Nuevo Proyecto
                    </Link>
                </Button>
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-800" />
                </div>
            ) : projects.length === 0 ? (
                <Card className="border-dashed border-2 border-slate-200 rounded-xl shadow-sm">
                    <CardContent className="flex flex-col items-center justify-center p-12 text-center text-slate-400 space-y-4">
                        <Building2 className="h-12 w-12 text-slate-300" />
                        <div>
                            <h3 className="text-base font-bold text-slate-800">No hay proyectos activos</h3>
                            <p className="text-xs text-slate-500 mt-1">Empieza creando un nuevo proyecto para asignar a tus técnicos.</p>
                        </div>
                        <Button asChild variant="outline" className="border-slate-200 hover:bg-slate-50 text-slate-700 text-xs">
                            <Link href="/projects/new">Crear el primer proyecto</Link>
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map((project) => (
                        <Card key={project.id} className="hover:border-slate-400 border border-slate-200 transition-all cursor-pointer relative overflow-hidden group shadow-sm bg-white rounded-xl">
                            {/* Blue top bar indicator */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-slate-200 group-hover:bg-blue-900 transition-colors" />
                            
                            <Link href={`/projects/${project.id}`}>
                                <CardHeader className="pb-3 pt-6 border-b border-slate-100">
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="text-base font-bold text-slate-900 truncate pr-4 group-hover:text-blue-900 transition-colors">
                                            {project.name}
                                        </CardTitle>
                                        <div className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase shrink-0 tracking-wider ${
                                            project.status === 'COMPLETED' ? 'bg-green-50 text-green-800 border border-green-100' :
                                            project.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-900 border border-blue-100' :
                                            'bg-amber-50 text-amber-900 border border-amber-100'
                                        }`}>
                                            {project.status === 'IN_PROGRESS' ? 'En Curso' : project.status === 'COMPLETED' ? 'Completado' : 'Planificación'}
                                        </div>
                                    </div>
                                    {project.clientName && (
                                        <p className="text-xs text-slate-500 font-semibold mt-1">{project.clientName}</p>
                                    )}
                                    {project.location && (
                                        <p className="text-[10px] text-slate-400 mt-0.5">{project.location}</p>
                                    )}
                                </CardHeader>
                                <CardContent className="py-4 space-y-4">
                                    {/* Stats */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">Avance Global</p>
                                            <p className="text-2xl font-black text-slate-900 mt-1">
                                                {project.progressPercentage?.toFixed(1) || 0}%
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">Talleres (Checklist)</p>
                                            <p className="text-2xl font-black text-slate-900 mt-1">
                                                {project.completedTalleres || 0} <span className="text-xs text-slate-400 font-normal">/ {project.totalTalleres || 0}</span>
                                            </p>
                                        </div>
                                    </div>

                                    {/* Mini Progress Bar */}
                                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-slate-900 group-hover:bg-blue-900 transition-all duration-500"
                                            style={{ width: `${project.progressPercentage || 0}%` }}
                                        />
                                    </div>
                                    
                                    {/* ETA Badge */}
                                    <div className="flex items-center gap-2 text-xs text-slate-700 bg-slate-50 p-2 rounded-lg font-semibold border border-slate-100">
                                        <Calendar className="h-3.5 w-3.5 text-slate-500" />
                                        {project.estimatedCompletionDate ? (
                                            <span>ETA Estimado: {format((project.estimatedCompletionDate as any).toDate ? (project.estimatedCompletionDate as any).toDate() : new Date(project.estimatedCompletionDate as any), "dd MMM yyyy", { locale: es })}</span>
                                        ) : (
                                            <span className="text-slate-400">Calculando velocidad...</span>
                                        )}
                                    </div>
                                </CardContent>
                            </Link>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
