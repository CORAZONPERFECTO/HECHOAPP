"use client";

import { useState, useEffect } from "react";
import { collection, query, onSnapshot, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Project } from "@/types/projects";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Loader2, HardHat } from "lucide-react";
import Link from "next/link";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { initDB, saveProjectOffline } from "@/lib/offline-storage";

export default function TechnicianProjectsPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const isOnline = useOnlineStatus();

    useEffect(() => {
        if (!isOnline) {
            // Cargar localmente de IndexedDB si está offline
            initDB().then((database) => {
                const transaction = database.transaction(['projects'], 'readonly');
                const store = transaction.objectStore('projects');
                const request = store.getAll();
                request.onsuccess = () => {
                    const localProjects = request.result as Project[];
                    // Filtrar activos y ordenar
                    const filtered = localProjects.filter(p => ["PLANNING", "IN_PROGRESS"].includes(p.status));
                    filtered.sort((a, b) => {
                        const dateA = (a.createdAt as any)?.getTime ? (a.createdAt as any).getTime() : 0;
                        const dateB = (b.createdAt as any)?.getTime ? (b.createdAt as any).getTime() : 0;
                        return dateB - dateA;
                    });
                    setProjects(filtered);
                    setLoading(false);
                };
            }).catch(err => {
                console.error("Error reading projects offline:", err);
                setLoading(false);
            });
            return;
        }

        // Si está online, usar onSnapshot
        const q = query(
            collection(db, "projects"), 
            where("status", "in", ["PLANNING", "IN_PROGRESS"])
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
            
            // Ordenar en memoria (descendente por createdAt)
            data.sort((a, b) => {
                const dateA = (a.createdAt as any)?.toDate ? (a.createdAt as any).toDate().getTime() : ((a.createdAt as any)?.getTime ? (a.createdAt as any).getTime() : 0);
                const dateB = (b.createdAt as any)?.toDate ? (b.createdAt as any).toDate().getTime() : ((b.createdAt as any)?.getTime ? (b.createdAt as any).getTime() : 0);
                return dateB - dateA;
            });
            
            setProjects(data);
            setLoading(false);

            // Caching offline
            data.forEach(p => {
                const projectCopy = {
                    ...p,
                    createdAt: (p.createdAt as any)?.toDate ? (p.createdAt as any).toDate() : p.createdAt,
                    updatedAt: (p.updatedAt as any)?.toDate ? (p.updatedAt as any).toDate() : p.updatedAt,
                    estimatedCompletionDate: (p.estimatedCompletionDate as any)?.toDate ? (p.estimatedCompletionDate as any).toDate() : p.estimatedCompletionDate,
                    startDate: (p.startDate as any)?.toDate ? (p.startDate as any).toDate() : p.startDate,
                };
                saveProjectOffline(projectCopy);
            });
        }, (error) => {
            console.error("Firestore onSnapshot error, falling back to local:", error);
        });

        return () => unsubscribe();
    }, [isOnline]);

    return (
        <div className="space-y-6 pb-24 max-w-lg mx-auto px-4 pt-4">
            {/* Header Módulo Estilo Classic Navy */}
            <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-slate-100 text-slate-900 rounded-lg">
                        <HardHat className="h-5 w-5 text-blue-900" />
                    </div>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight">Obras Asignadas</h1>
                </div>
                <p className="text-slate-500 text-xs">
                    Selecciona una obra para revisar las zonas de trabajo y registrar tu avance.
                </p>
                {!isOnline && (
                    <div className="mt-3 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 rounded px-2.5 py-1 w-fit uppercase">
                        Modo Offline Activo
                    </div>
                )}
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-800" />
                </div>
            ) : projects.length === 0 ? (
                <Card className="border-dashed border-2 border-slate-200">
                    <CardContent className="flex flex-col items-center justify-center p-12 text-center text-slate-400 space-y-4">
                        <Building2 className="h-10 w-10 text-slate-300" />
                        <div>
                            <h3 className="text-sm font-semibold text-slate-800">No hay proyectos activos</h3>
                            <p className="text-xs text-slate-500">Por el momento no tienes obras asignadas en ejecución.</p>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {projects.map((project) => (
                        <Link href={`/technician/projects/${project.id}`} key={project.id}>
                            <Card className="hover:border-slate-400 border border-slate-200 transition-all cursor-pointer relative overflow-hidden shadow-sm hover:shadow bg-white">
                                {/* Border top indicator */}
                                <div className="absolute top-0 left-0 w-full h-1 bg-slate-200" />
                                
                                <CardContent className="p-5 flex flex-col gap-3 pt-6">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-base font-bold text-slate-900 line-clamp-1">{project.name}</h3>
                                            <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{project.location || 'Sin ubicación'}</p>
                                        </div>
                                        <div className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase shrink-0 tracking-wider ${
                                            project.status === 'IN_PROGRESS' 
                                                ? 'bg-blue-50 text-blue-900 border border-blue-100' 
                                                : 'bg-amber-50 text-amber-900 border border-amber-100'
                                        }`}>
                                            {project.status === 'IN_PROGRESS' ? 'En Curso' : 'Planificación'}
                                        </div>
                                    </div>

                                    {/* Barra de progreso minimalista */}
                                    <div className="space-y-1 mt-1">
                                        <div className="flex justify-between items-center text-[10px] text-slate-500">
                                            <span className="font-semibold">Progreso General</span>
                                            <span className="font-bold text-slate-900">{(project.progressPercentage || 0).toFixed(0)}%</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-slate-900 transition-all duration-500"
                                                style={{ width: `${project.progressPercentage || 0}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between mt-2 pt-3 border-t border-slate-100 text-xs text-slate-600">
                                        <span className="text-[11px] text-slate-500">
                                            Hitos: <strong className="text-slate-800 font-semibold">{project.completedTalleres || 0}</strong> de {project.totalTalleres || 0}
                                        </span>
                                        <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                                            {project.clientName || 'Cliente General'}
                                        </span>
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
