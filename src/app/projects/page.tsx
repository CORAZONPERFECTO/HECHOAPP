"use client";

import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Project } from "@/types/projects";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Plus, ArrowRight, Loader2, Calendar } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export default function ProjectsPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, "projects"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
            setProjects(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-purple-600">
                        Proyectos
                    </h1>
                    <p className="text-gray-500">Gestión de proyectos, zonas y seguimiento de avance de técnicos.</p>
                </div>
                <Button asChild className="bg-gradient-to-r from-blue-600 to-purple-600">
                    <Link href="/projects/new">
                        <Plus className="h-4 w-4 mr-2" /> Nuevo Proyecto
                    </Link>
                </Button>
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
            ) : projects.length === 0 ? (
                <Card className="border-dashed border-2">
                    <CardContent className="flex flex-col items-center justify-center p-12 text-center text-gray-500 space-y-4">
                        <Building2 className="h-12 w-12 text-gray-300" />
                        <div>
                            <h3 className="text-lg font-medium text-gray-900">No hay proyectos activos</h3>
                            <p className="text-sm">Empieza creando un nuevo proyecto para asignar a tus técnicos.</p>
                        </div>
                        <Button asChild variant="outline">
                            <Link href="/projects/new">Crear el primer proyecto</Link>
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map((project) => (
                        <Card key={project.id} className="hover:shadow-lg transition-shadow cursor-pointer relative overflow-hidden group">
                            {/* Progress bar background indicator */}
                            <div 
                                className="absolute bottom-0 left-0 h-1.5 bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-1000"
                                style={{ width: `${project.progressPercentage || 0}%` }}
                            />
                            
                            <Link href={`/projects/${project.id}`}>
                                <CardHeader className="pb-3 border-b border-gray-100">
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="text-lg font-semibold truncate pr-4 group-hover:text-blue-600 transition-colors">
                                            {project.name}
                                        </CardTitle>
                                        <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                                            project.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                            project.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                                            'bg-yellow-100 text-yellow-700'
                                        }`}>
                                            {project.status.replace('_', ' ')}
                                        </div>
                                    </div>
                                    {project.clientName && (
                                        <p className="text-xs text-gray-500 font-medium">{project.clientName}</p>
                                    )}
                                </CardHeader>
                                <CardContent className="py-4 space-y-4">
                                    {/* Stats */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Avance Global</p>
                                            <p className="text-2xl font-bold text-gray-900">
                                                {project.progressPercentage?.toFixed(1) || 0}%
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Talleres (Checklist)</p>
                                            <p className="text-2xl font-bold text-gray-900">
                                                {project.completedTalleres || 0} <span className="text-sm text-gray-400 font-normal">/ {project.totalTalleres || 0}</span>
                                            </p>
                                        </div>
                                    </div>
                                    
                                    {/* AI Prediction preview */}
                                    <div className="flex items-center gap-2 text-xs text-purple-600 bg-purple-50 p-2 rounded-md font-medium border border-purple-100">
                                        <Calendar className="h-3 w-3" />
                                        {project.estimatedCompletionDate ? (
                                            <span>ETA Estimado: {format((project.estimatedCompletionDate as any).toDate ? (project.estimatedCompletionDate as any).toDate() : new Date(project.estimatedCompletionDate as any), "dd MMM yyyy")}</span>
                                        ) : (
                                            <span>Calculando velocidad...</span>
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
