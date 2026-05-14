"use client";

import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Project } from "@/types/projects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Loader2, Calendar, HardHat } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function TechnicianProjectsPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // En un futuro se podría filtrar solo por proyectos asignados al técnico.
        // Por ahora, mostrar todos los proyectos "IN_PROGRESS" o "PLANNING".
        // Para evitar el error de índice de Firestore, filtramos por status en la BD 
        // y ordenamos por fecha en la memoria del cliente.
        const q = query(
            collection(db, "projects"), 
            where("status", "in", ["PLANNING", "IN_PROGRESS"])
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
            
            // Ordenar en memoria (descendente por createdAt)
            data.sort((a, b) => {
                const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
                const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
                return dateB - dateA;
            });
            
            setProjects(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    return (
        <div className="space-y-6 pb-24 max-w-lg mx-auto">
            <div className="bg-gradient-to-r from-blue-700 to-blue-900 p-6 rounded-2xl text-white shadow-xl">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                        <HardHat className="h-6 w-6 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight">Mis Proyectos</h1>
                </div>
                <p className="text-blue-100 text-sm">Selecciona una obra para ver tus áreas y avanzar los talleres asignados.</p>
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
                            <p className="text-sm">Por el momento no tienes obras o proyectos en ejecución.</p>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {projects.map((project) => (
                        <Link href={`/technician/projects/${project.id}`} key={project.id}>
                            <Card className="hover:border-blue-300 transition-colors cursor-pointer relative overflow-hidden shadow-sm">
                                {/* Progress bar background indicator */}
                                <div 
                                    className="absolute bottom-0 left-0 h-1.5 bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-1000"
                                    style={{ width: `${project.progressPercentage || 0}%` }}
                                />
                                
                                <CardContent className="p-5 flex flex-col gap-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900 line-clamp-1">{project.name}</h3>
                                            <p className="text-sm text-gray-500 line-clamp-1">{project.location || 'Sin ubicación'}</p>
                                        </div>
                                        <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase shrink-0 ${
                                            project.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                                            'bg-yellow-100 text-yellow-700'
                                        }`}>
                                            {project.status === 'IN_PROGRESS' ? 'EN CURSO' : 'PLANIFICACIÓN'}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between mt-2 pt-3 border-t border-gray-100">
                                        <div className="flex items-center gap-1 text-sm text-gray-600">
                                            <span className="font-bold text-gray-900">{project.progressPercentage?.toFixed(0) || 0}%</span>
                                            <span className="text-xs text-gray-400">completado</span>
                                        </div>
                                        <div className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-md border">
                                            {project.completedTalleres || 0} / {project.totalTalleres || 0} hitos
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
