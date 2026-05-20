"use client";

import { useState, useEffect } from "react";
import { collection, query, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, where } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { User } from "@/types/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { CheckCircle, Truck, Plus, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function LogisticsAdminPage() {
    const [tasks, setTasks] = useState<any[]>([]);
    const [technicians, setTechnicians] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();

    // Form state
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [assignedToId, setAssignedToId] = useState("");

    useEffect(() => {
        // Fetch Technicians
        const qTechs = query(
            collection(db, "users"),
            where("role", "in", ["TECNICO", "CONTRATISTA"]) // Try role
        );
        const qTechsRol = query(
            collection(db, "users"),
            where("rol", "in", ["TECNICO", "CONTRATISTA"]) // Try rol (some DBs use rol)
        );

        const unsubTechs = onSnapshot(qTechs, (snap) => {
            const techs1 = snap.docs.map(d => ({ id: d.id, ...d.data() } as User));
            onSnapshot(qTechsRol, (snapRol) => {
                const techs2 = snapRol.docs.map(d => ({ id: d.id, ...d.data() } as User));
                // merge unique
                const merged = [...techs1, ...techs2].reduce((acc, curr) => {
                    if (!acc.find(t => t.id === curr.id)) acc.push(curr);
                    return acc;
                }, [] as User[]);
                setTechnicians(merged);
            });
        });

        // Fetch Tasks (unified under Tickets collection with serviceType == 'LOGISTICA')
        const qTasks = query(
            collection(db, "tickets"),
            where("serviceType", "==", "LOGISTICA")
        );
        
        const unsubTasks = onSnapshot(qTasks, (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
            // Sort by createdAt desc in memory to avoid index requirement errors
            list.sort((a, b) => {
                const dateA = a.createdAt?.seconds || 0;
                const dateB = b.createdAt?.seconds || 0;
                return dateB - dateA;
            });
            setTasks(list);
            setLoading(false);
        });

        return () => {
            unsubTechs();
            unsubTasks();
        };
    }, []);

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !assignedToId) {
            toast({ title: "Datos incompletos", description: "El título y el técnico son obligatorios.", variant: "destructive" });
            return;
        }

        const tech = technicians.find(t => t.id === assignedToId);
        if (!tech) return;

        setSaving(true);
        try {
            // Import ticket number generator
            const { generateNextTicketNumber } = await import("@/lib/tickets");
            const ticketNumber = await generateNextTicketNumber();

            await addDoc(collection(db, "tickets"), {
                ticketNumber,
                number: ticketNumber,
                clientName: "Logística / Recados Internos",
                locationName: "Taller / Oficina / Campo",
                serviceType: "LOGISTICA",
                title: title, // Store title for compatibility and quick search
                description: description || title,
                priority: "MEDIUM",
                status: "OPEN",
                technicianId: assignedToId,
                technicianName: tech.nombre || tech.email || "Técnico",
                checklist: [
                    { id: `chk-${Date.now()}-0`, text: "Completar tarea: " + title, checked: false }
                ],
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                createdBy: auth.currentUser?.uid || "Admin"
            });

            toast({ title: "Recado creado", description: "Se creó el ticket de logística asignado al técnico." });
            setTitle("");
            setDescription("");
            setAssignedToId("");
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "No se pudo crear el ticket de logística", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const markAsCompleted = async (taskId: string) => {
        try {
            await updateDoc(doc(db, "tickets", taskId), {
                status: 'COMPLETED',
                updatedAt: serverTimestamp(),
                completedAt: serverTimestamp()
            });
            toast({ title: "Tarea completada", description: "El ticket de logística se marcó como completado." });
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "No se pudo actualizar la tarea.", variant: "destructive" });
        }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                    <Truck className="h-8 w-8 text-blue-600" />
                    Tareas Logísticas
                </h1>
                <p className="text-gray-500 mt-2">
                    Asigna recados, entregas de documentos o búsqueda de equipos a los técnicos. 
                    Las tareas se crean como tickets especiales y el técnico no podrá cerrar su jornada hasta completarlas.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Formulario de creación */}
                <div className="md:col-span-1">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Nueva Tarea</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleCreateTask} className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Título de la Tarea *</Label>
                                    <Input 
                                        placeholder="Ej: Buscar tarjeta en taller" 
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Descripción (Opcional)</Label>
                                    <Textarea 
                                        placeholder="Detalles adicionales..."
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                        className="resize-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Asignar a *</Label>
                                    <Select value={assignedToId} onValueChange={setAssignedToId} required>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccione un técnico" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {technicians.map(t => (
                                                <SelectItem key={t.id} value={t.id!}>{t.nombre || t.email}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button type="submit" className="w-full" disabled={saving}>
                                    {saving ? "Creando..." : <><Plus className="w-4 h-4 mr-2" /> Asignar Tarea</>}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                {/* Lista de Tareas */}
                <div className="md:col-span-2 space-y-4">
                    {loading ? (
                        <div className="text-center p-8 text-gray-500">Cargando tareas...</div>
                    ) : tasks.length === 0 ? (
                        <div className="text-center p-8 border border-dashed rounded-lg text-gray-500">
                            No hay tareas logísticas registradas.
                        </div>
                    ) : (
                        tasks.map(task => (
                            <Card key={task.id} className={task.status === 'COMPLETED' ? "opacity-75 bg-gray-50" : "bg-white"}>
                                <CardContent className="p-4 flex items-start justify-between gap-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className={`font-semibold ${task.status === 'COMPLETED' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                                                {task.title || task.description}
                                            </h3>
                                            <Badge variant={task.status === 'COMPLETED' ? "secondary" : "default"} className={task.status !== 'COMPLETED' ? 'bg-orange-100 text-orange-800 hover:bg-orange-100' : ''}>
                                                {task.status === 'COMPLETED' ? 'Completado' : 'Pendiente'}
                                            </Badge>
                                        </div>
                                        {task.description && task.title && <p className="text-sm text-gray-600">{task.description}</p>}
                                        <div className="text-xs text-gray-500 flex items-center gap-2 mt-2">
                                            <span className="font-medium text-blue-600">👤 {task.technicianName}</span>
                                            <span>•</span>
                                            <span>Creado: {task.createdAt?.toDate ? task.createdAt.toDate().toLocaleDateString() : 'Reciente'}</span>
                                        </div>
                                    </div>
                                    
                                    {task.status !== 'COMPLETED' && (
                                        <Button 
                                            variant="outline" 
                                            size="sm"
                                            className="text-green-600 border-green-200 hover:bg-green-50"
                                            onClick={() => markAsCompleted(task.id!)}
                                        >
                                            <Check className="w-4 h-4 mr-1" /> Marcar
                                        </Button>
                                    )}
                                    {task.status === 'COMPLETED' && (
                                        <div className="text-green-600">
                                            <CheckCircle className="w-6 h-6" />
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
