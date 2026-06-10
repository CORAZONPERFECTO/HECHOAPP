"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, collection, query, where, onSnapshot, deleteDoc, writeBatch, updateDoc, getDoc, runTransaction, getDocs, serverTimestamp, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Project, ProjectZone, ProjectArea, ProjectTaller, ProjectStatus, DEFAULT_TALLERES_TEMPLATES, BlockReportAudit } from "@/types/projects";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CheckCircle2, ChevronDown, ChevronRight, Clock, Loader2, Image as ImageIcon, User, Calendar, Trash2, Grid3X3, FileText, Printer, ShieldAlert, AlertTriangle, Edit, Plus, Pencil, Building2 } from "lucide-react";
import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { MatrixGeneratorModal } from "@/components/projects/matrix-generator-modal";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function AdminProjectDetailPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params.id as string;

    const [project, setProject] = useState<Project | null>(null);
    const [zones, setZones] = useState<ProjectZone[]>([]);
    const [loading, setLoading] = useState(true);
    const [audits, setAudits] = useState<BlockReportAudit[]>([]);

    const [expandedZone, setExpandedZone] = useState<string | null>(null);
    const [expandedArea, setExpandedArea] = useState<string | null>(null);
    const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

    // Generic Admin Dialog State
    const [adminDialogOpen, setAdminDialogOpen] = useState(false);
    const [adminDialogType, setAdminDialogType] = useState<'ADD_ZONE' | 'EDIT_ZONE' | 'ADD_AREA' | 'EDIT_AREA' | 'ADD_TALLER' | 'EDIT_TALLER' | null>(null);
    const [adminDialogTarget, setAdminDialogTarget] = useState<{ zoneId?: string; areaId?: string; tallerId?: string; name?: string }>({});
    const [adminDialogInput, setAdminDialogInput] = useState("");
    const [isAdminActionLoading, setIsAdminActionLoading] = useState(false);

    // Modal para ver foto de evidencia
    const [viewingPhoto, setViewingPhoto] = useState<{ url: string, name: string, technician: string, date: any } | null>(null);

    // Matrix Generator State
    const [showMatrixModal, setShowMatrixModal] = useState(false);

    // Technicians list state
    const [technicians, setTechnicians] = useState<{ id: string; name: string }[]>([]);

    // Edit project state
    const [isEditingProject, setIsEditingProject] = useState(false);
    const [editProjectName, setEditProjectName] = useState("");
    const [editClientName, setEditClientName] = useState("");
    const [editStatus, setEditStatus] = useState<ProjectStatus>('PLANNING');
    const [editEstimatedDate, setEditEstimatedDate] = useState("");

    useEffect(() => {
        if (!projectId) return;
        const q = query(collection(db, "blockReportAudits"), where("projectId", "==", projectId));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list: BlockReportAudit[] = [];
            snapshot.forEach((doc) => {
                list.push({ id: doc.id, ...doc.data() } as BlockReportAudit);
            });
            list.sort((a, b) => {
                const dateA = (a.exportedAt as any)?.toDate ? (a.exportedAt as any).toDate() : new Date(a.exportedAt as any);
                const dateB = (b.exportedAt as any)?.toDate ? (b.exportedAt as any).toDate() : new Date(b.exportedAt as any);
                return dateB - dateA;
            });
            setAudits(list);
        });
        return () => unsubscribe();
    }, [projectId]);

    const blockedTalleres = useMemo(() => {
        const list: { zoneName: string; areaName: string; taller: ProjectTaller; zoneId: string; areaId: string }[] = [];
        zones.forEach(z => {
            z.areas.forEach(a => {
                a.talleres.forEach(t => {
                    if (t.status === 'BLOCKED') {
                        list.push({
                            zoneName: z.name,
                            areaName: a.name,
                            taller: t,
                            zoneId: z.id,
                            areaId: a.id
                        });
                    }
                });
            });
        });
        return list;
    }, [zones]);

    const handlePrintContractorReport = async (contractor: string, items: typeof blockedTalleres) => {
        try {
            const { auth } = await import("@/lib/firebase");
            const user = auth.currentUser;
            const auditData = {
                projectId,
                projectName: project?.name || "Proyecto",
                contractor,
                exportedAt: serverTimestamp(),
                exportedBy: user?.displayName || user?.email || "Administrador",
                blockedItemsCount: items.length,
                details: items.map(i => `${i.zoneName} - ${i.areaName}: ${i.taller.name}`).join("\n"),
                notified: true
            };
            
            await addDoc(collection(db, "blockReportAudits"), auditData);
            
            const printWindow = window.open("", "_blank");
            if (printWindow) {
                const dateStr = new Date().toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                printWindow.document.write(`
                    <html>
                    <head>
                        <title>Reporte de Bloqueo - ${contractor}</title>
                        <style>
                            body { font-family: sans-serif; padding: 40px; color: #333; line-height: 1.5; }
                            .header { border-bottom: 2px solid #0f172a; padding-bottom: 20px; margin-bottom: 30px; }
                            .title { font-size: 24px; font-weight: bold; color: #0f172a; }
                            .subtitle { font-size: 14px; color: #64748b; margin-top: 5px; }
                            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px; background: #f8fafc; padding: 15px; rounded: 8px; border: 1px solid #e2e8f0; }
                            .meta-item { font-size: 13px; }
                            .meta-item strong { color: #0f172a; }
                            .table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                            .table th { background: #0f172a; color: white; padding: 12px; text-align: left; font-size: 13px; }
                            .table td { padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
                            .table tr:nth-child(even) { background: #f8fafc; }
                            .reason-box { background: #fef2f2; border-left: 4px solid #ef4444; padding: 8px; font-size: 12px; color: #991b1b; margin-top: 5px; rounded-r: 4px; }
                            .footer { margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 11px; color: #64748b; text-align: center; }
                            .signature-area { display: flex; justify-content: space-between; margin-top: 80px; }
                            .signature-line { border-top: 1px solid #94a3b8; width: 200px; text-align: center; padding-top: 10px; font-size: 12px; }
                            @media print {
                                body { padding: 20px; }
                                button { display: none; }
                            }
                        </style>
                    </head>
                    <body>
                        <div style="display: flex; justify-content: space-between; align-items: center;" class="no-print">
                            <button onclick="window.print()" style="background: #0f172a; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer; margin-bottom: 20px;">Imprimir Reporte</button>
                        </div>
                        <div class="header">
                            <div class="title">INFORME DE HITOS BLOQUEADOS</div>
                            <div class="subtitle">CONTRATISTA RESPONSABLE: ${contractor.toUpperCase()}</div>
                        </div>
                        
                        <div class="meta-grid">
                            <div class="meta-item"><strong>Proyecto:</strong> ${project?.name || ""}</div>
                            <div class="meta-item"><strong>Cliente:</strong> ${project?.clientName || ""}</div>
                            <div class="meta-item"><strong>Fecha de Emisión:</strong> ${dateStr}</div>
                            <div class="meta-item"><strong>Emitido Por:</strong> ${user?.displayName || user?.email || ""}</div>
                        </div>

                        <p style="font-size: 14px; margin-bottom: 20px;">
                            Por medio de la presente, se notifica formalmente al contratista de <strong>${contractor}</strong> los siguientes hitos/áreas bloqueados en la obra que impiden el avance de la instalación de climatización:
                        </p>

                        <table class="table">
                            <thead>
                                <tr>
                                    <th style="width: 25%;">Zona / Apto</th>
                                    <th style="width: 25%;">Área</th>
                                    <th style="width: 25%;">Hito Bloqueado</th>
                                    <th style="width: 25%;">Detalle / Razón</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${items.map(item => `
                                    <tr>
                                        <td><strong>${item.zoneName}</strong></td>
                                        <td>${item.areaName}</td>
                                        <td>${item.taller.name}</td>
                                        <td>
                                            <div class="reason-box">
                                                ${item.taller.blockedReason || "Sin especificar"}
                                            </div>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>

                        <div class="signature-area">
                            <div class="signature-line">
                                Reportado Por (HECHO)
                            </div>
                            <div class="signature-line">
                                Recibido Por (${contractor})
                            </div>
                        </div>

                        <div class="footer">
                            Este documento es una constancia de bloqueo generada por el sistema HECHOAPP el ${dateStr}.
                        </div>
                    </body>
                    </html>
                `);
                printWindow.document.close();
            }
        } catch (error) {
            console.error("Error printing contractor report:", error);
        }
    };

    useEffect(() => {
        const fetchTechnicians = async () => {
            try {
                const usersSnap = await getDocs(collection(db, "users"));
                const techs = usersSnap.docs
                    .filter(doc => doc.data().role === "TECNICO")
                    .map(doc => ({
                        id: doc.id,
                        name: doc.data().name || doc.data().email || "Técnico sin nombre",
                    }));
                setTechnicians(techs);
            } catch (error) {
                console.error("Error fetching technicians:", error);
            }
        };
        fetchTechnicians();
    }, []);

    const openEditModal = () => {
        if (!project) return;
        setEditProjectName(project.name);
        setEditClientName(project.clientName || "");
        setEditStatus(project.status);
        if (project.estimatedCompletionDate) {
            const date = (project.estimatedCompletionDate as any).toDate 
                ? (project.estimatedCompletionDate as any).toDate() 
                : new Date(project.estimatedCompletionDate as any);
            setEditEstimatedDate(date.toISOString().split('T')[0]);
        } else {
            setEditEstimatedDate("");
        }
        setIsEditingProject(true);
    };

    const handleSaveProject = async () => {
        try {
            const projectRef = doc(db, "projects", projectId);
            const updateData: any = {
                name: editProjectName,
                clientName: editClientName,
                status: editStatus,
                updatedAt: serverTimestamp()
            };
            if (editEstimatedDate) {
                updateData.estimatedCompletionDate = new Date(editEstimatedDate + "T12:00:00");
            } else {
                updateData.estimatedCompletionDate = null;
            }
            await updateDoc(projectRef, updateData);
            setIsEditingProject(false);
        } catch (error) {
            console.error("Error updating project:", error);
            alert("Error al actualizar el proyecto.");
        }
    };

    const handleAssignTechnician = async (zoneId: string, areaId: string, tallerId: string, tecnicoId: string) => {
        try {
            const zoneRef = doc(db, "projectZones", zoneId);
            const zoneDoc = await getDoc(zoneRef);
            if (!zoneDoc.exists()) return;
            const zoneData = zoneDoc.data() as ProjectZone;

            const tech = technicians.find(t => t.id === tecnicoId);
            const techName = tech ? tech.name : undefined;

            let updated = false;
            for (let a of zoneData.areas) {
                if (a.id === areaId) {
                    for (let t of a.talleres) {
                        if (t.id === tallerId) {
                            if (tecnicoId === "unassigned") {
                                t.assignedToTecnicoId = undefined;
                                t.assignedToTecnicoName = undefined;
                            } else {
                                t.assignedToTecnicoId = tecnicoId;
                                t.assignedToTecnicoName = techName;
                            }
                            updated = true;
                            break;
                        }
                    }
                }
            }

            if (updated) {
                await updateDoc(zoneRef, { areas: zoneData.areas });
                await updateProjectAssignedTechnicians(projectId);
            }
        } catch (error) {
            console.error("Error assigning technician:", error);
            alert("Error al asignar técnico.");
        }
    };

    const updateProjectAssignedTechnicians = async (projId: string) => {
        try {
            const qZones = query(collection(db, "projectZones"), where("projectId", "==", projId));
            const zonesSnap = await getDocs(qZones);
            const uniqueTechIds = new Set<string>();
            zonesSnap.forEach(docSnap => {
                const zone = docSnap.data() as ProjectZone;
                zone.areas.forEach(area => {
                    area.talleres.forEach(t => {
                        if (t.assignedToTecnicoId) {
                            uniqueTechIds.add(t.assignedToTecnicoId);
                        }
                    });
                });
            });
            const projectRef = doc(db, "projects", projId);
            await updateDoc(projectRef, {
                assignedTechnicianIds: Array.from(uniqueTechIds)
            });
        } catch (err) {
            console.error("Error updating project assigned technicians list:", err);
        }
    };

    const handleToggleTallerStatus = async (zoneId: string, areaId: string, tallerId: string, newStatus: 'COMPLETED' | 'PENDING') => {
        try {
            await runTransaction(db, async (transaction) => {
                const projectRef = doc(db, "projects", projectId);
                const zoneRef = doc(db, "projectZones", zoneId);
                
                const projectDoc = await transaction.get(projectRef);
                const zoneDoc = await transaction.get(zoneRef);
                
                if (!projectDoc.exists() || !zoneDoc.exists()) {
                    throw new Error("Documentos no encontrados");
                }
                
                const zoneData = zoneDoc.data() as ProjectZone;
                const projectData = projectDoc.data() as Project;

                let stateChanged = false;
                let isCompletedChange = 0;

                for (let a of zoneData.areas) {
                    if (a.id === areaId) {
                        for (let t of a.talleres) {
                            if (t.id === tallerId) {
                                const oldStatus = t.status;
                                if (oldStatus === newStatus) return; // No change

                                t.status = newStatus;
                                if (newStatus === 'COMPLETED') {
                                    t.completedAt = serverTimestamp() as any;
                                    t.blockedReason = undefined;
                                    isCompletedChange = 1;
                                } else {
                                    t.completedAt = undefined;
                                    t.evidencePhotoUrl = undefined;
                                    t.blockedReason = undefined;
                                    if (oldStatus === 'COMPLETED') {
                                        isCompletedChange = -1;
                                    }
                                }
                                stateChanged = true;
                                break;
                            }
                        }
                    }
                }

                if (!stateChanged) return;

                // Recalcular completados en la zona
                const completedCount = zoneData.areas.reduce(
                    (acc, a) => acc + a.talleres.filter(t => t.status === 'COMPLETED').length,
                    0
                );
                zoneData.completedTalleres = completedCount;
                zoneData.progressPercentage = zoneData.totalTalleres > 0 ? (completedCount / zoneData.totalTalleres) * 100 : 0;

                const newProjectCompleted = Math.max(0, projectData.completedTalleres + isCompletedChange);
                const newProjectProgress = projectData.totalTalleres > 0 ? (newProjectCompleted / projectData.totalTalleres) * 100 : 0;

                transaction.update(zoneRef, zoneData as any);
                transaction.update(projectRef, {
                    completedTalleres: newProjectCompleted,
                    progressPercentage: newProjectProgress
                });
            });
        } catch (error) {
            console.error("Error toggling status:", error);
            alert("Error al cambiar el estado de la tarea.");
        }
    };

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
        if (!confirm(`¿Eliminar la zona "${zoneName}"? Se perderá el avance de esta zona y no se puede deshacer.`)) return;
        try {
            await runTransaction(db, async (transaction) => {
                const projectRef = doc(db, "projects", projectId);
                const zoneRef = doc(db, "projectZones", zoneId);
                
                const projectDoc = await transaction.get(projectRef);
                const zoneDoc = await transaction.get(zoneRef);
                
                if (!zoneDoc.exists()) return;
                const zoneData = zoneDoc.data() as ProjectZone;
                
                const projectData = projectDoc.exists() ? projectDoc.data() as Project : null;
                
                const zoneTotal = zoneData.totalTalleres || 0;
                const zoneCompleted = zoneData.completedTalleres || 0;
                
                transaction.delete(zoneRef);
                
                if (projectData) {
                    const newTotal = Math.max(0, (projectData.totalTalleres || 0) - zoneTotal);
                    const newCompleted = Math.max(0, (projectData.completedTalleres || 0) - zoneCompleted);
                    const newProgress = newTotal > 0 ? (newCompleted / newTotal) * 100 : 0;
                    
                    transaction.update(projectRef, {
                        totalTalleres: newTotal,
                        completedTalleres: newCompleted,
                        progressPercentage: newProgress
                    });
                }
            });
        } catch (error) {
            console.error("Error deleting zone:", error);
            alert("Error al eliminar la zona.");
        }
    };

    const handleAddZone = async (name: string) => {
        if (!name.trim()) return;
        try {
            const zoneRef = doc(collection(db, "projectZones"));
            const newZone: ProjectZone = {
                id: zoneRef.id,
                projectId,
                name: name.trim(),
                areas: [],
                progressPercentage: 0,
                totalTalleres: 0,
                completedTalleres: 0
            };
            await updateDoc(doc(db, "projects", projectId), {
                updatedAt: serverTimestamp()
            });
            await updateDoc(zoneRef, newZone as any);
        } catch (error) {
            console.error("Error adding zone:", error);
            alert("Error al agregar la zona.");
        }
    };

    const handleRenameZone = async (zoneId: string, newName: string) => {
        if (!newName.trim()) return;
        try {
            await updateDoc(doc(db, "projectZones", zoneId), { name: newName.trim() });
        } catch (error) {
            console.error("Error renaming zone:", error);
            alert("Error al renombrar la zona.");
        }
    };

    const handleAddArea = async (zoneId: string, name: string) => {
        if (!name.trim()) return;
        try {
            const zoneRef = doc(db, "projectZones", zoneId);
            const zoneDoc = await getDoc(zoneRef);
            if (!zoneDoc.exists()) return;
            
            const zoneData = zoneDoc.data() as ProjectZone;
            const newArea: ProjectArea = {
                id: crypto.randomUUID(),
                name: name.trim(),
                talleres: []
            };
            
            const updatedAreas = [...zoneData.areas, newArea];
            await updateDoc(zoneRef, { areas: updatedAreas });
        } catch (error) {
            console.error("Error adding area:", error);
            alert("Error al agregar el área.");
        }
    };

    const handleRenameArea = async (zoneId: string, areaId: string, newName: string) => {
        if (!newName.trim()) return;
        try {
            const zoneRef = doc(db, "projectZones", zoneId);
            const zoneDoc = await getDoc(zoneRef);
            if (!zoneDoc.exists()) return;
            
            const zoneData = zoneDoc.data() as ProjectZone;
            const updatedAreas = zoneData.areas.map(a => {
                if (a.id === areaId) {
                    return { ...a, name: newName.trim() };
                }
                return a;
            });
            
            await updateDoc(zoneRef, { areas: updatedAreas });
        } catch (error) {
            console.error("Error renaming area:", error);
            alert("Error al renombrar el área.");
        }
    };

    const handleDeleteArea = async (zoneId: string, areaId: string, areaName: string) => {
        if (!confirm(`¿Eliminar el área "${areaName}" y todos sus hitos asociados? Esta acción no se puede deshacer.`)) return;
        try {
            await runTransaction(db, async (transaction) => {
                const projectRef = doc(db, "projects", projectId);
                const zoneRef = doc(db, "projectZones", zoneId);
                
                const projectDoc = await transaction.get(projectRef);
                const zoneDoc = await transaction.get(zoneRef);
                
                if (!zoneDoc.exists() || !projectDoc.exists()) return;
                const zoneData = zoneDoc.data() as ProjectZone;
                const projectData = projectDoc.data() as Project;
                
                const area = zoneData.areas.find(a => a.id === areaId);
                if (!area) return;
                
                const areaTotal = area.talleres.length;
                const areaCompleted = area.talleres.filter(t => t.status === 'COMPLETED').length;
                
                const updatedAreas = zoneData.areas.filter(a => a.id !== areaId);
                
                const newZoneTotal = Math.max(0, (zoneData.totalTalleres || 0) - areaTotal);
                const newZoneCompleted = Math.max(0, (zoneData.completedTalleres || 0) - areaCompleted);
                const newZoneProgress = newZoneTotal > 0 ? (newZoneCompleted / newZoneTotal) * 100 : 0;
                
                const newProjectTotal = Math.max(0, (projectData.totalTalleres || 0) - areaTotal);
                const newProjectCompleted = Math.max(0, (projectData.completedTalleres || 0) - areaCompleted);
                const newProjectProgress = newProjectTotal > 0 ? (newProjectCompleted / newProjectTotal) * 100 : 0;
                
                transaction.update(zoneRef, {
                    areas: updatedAreas,
                    totalTalleres: newZoneTotal,
                    completedTalleres: newZoneCompleted,
                    progressPercentage: newZoneProgress
                });
                
                transaction.update(projectRef, {
                    totalTalleres: newProjectTotal,
                    completedTalleres: newProjectCompleted,
                    progressPercentage: newProjectProgress
                });
            });
        } catch (error) {
            console.error("Error deleting area:", error);
            alert("Error al eliminar el área.");
        }
    };

    const handleCreateTaller = async (zoneId: string, areaId: string, name: string) => {
        if (!name.trim()) return;
        try {
            await runTransaction(db, async (transaction) => {
                const projectRef = doc(db, "projects", projectId);
                const zoneRef = doc(db, "projectZones", zoneId);
                
                const projectDoc = await transaction.get(projectRef);
                const zoneDoc = await transaction.get(zoneRef);
                
                if (!zoneDoc.exists() || !projectDoc.exists()) return;
                const zoneData = zoneDoc.data() as ProjectZone;
                const projectData = projectDoc.data() as Project;
                
                const area = zoneData.areas.find(a => a.id === areaId);
                if (!area) return;
                
                const newTaller: ProjectTaller = {
                    id: crypto.randomUUID(),
                    name: name.trim(),
                    status: 'PENDING',
                    orderIndex: area.talleres.length,
                    evidencePhotoUrl: undefined,
                    assignedToTecnicoId: undefined,
                    assignedToTecnicoName: undefined
                };
                
                const updatedAreas = zoneData.areas.map(a => {
                    if (a.id === areaId) {
                        return { ...a, talleres: [...a.talleres, newTaller] };
                    }
                    return a;
                });
                
                const newZoneTotal = (zoneData.totalTalleres || 0) + 1;
                const newZoneCompleted = zoneData.completedTalleres || 0;
                const newZoneProgress = (newZoneCompleted / newZoneTotal) * 100;
                
                const newProjectTotal = (projectData.totalTalleres || 0) + 1;
                const newProjectCompleted = projectData.completedTalleres || 0;
                const newProjectProgress = (newProjectCompleted / newProjectTotal) * 100;
                
                transaction.update(zoneRef, {
                    areas: updatedAreas,
                    totalTalleres: newZoneTotal,
                    completedTalleres: newZoneCompleted,
                    progressPercentage: newZoneProgress
                });
                
                transaction.update(projectRef, {
                    totalTalleres: newProjectTotal,
                    completedTalleres: newProjectCompleted,
                    progressPercentage: newProjectProgress
                });
            });
        } catch (error) {
            console.error("Error creating taller:", error);
            alert("Error al agregar el hito.");
        }
    };

    const handleRenameTaller = async (zoneId: string, areaId: string, tallerId: string, newName: string) => {
        if (!newName.trim()) return;
        try {
            const zoneRef = doc(db, "projectZones", zoneId);
            const zoneDoc = await getDoc(zoneRef);
            if (!zoneDoc.exists()) return;
            
            const zoneData = zoneDoc.data() as ProjectZone;
            const updatedAreas = zoneData.areas.map(a => {
                if (a.id === areaId) {
                    const updatedTalleres = a.talleres.map(t => {
                        if (t.id === tallerId) {
                            return { ...t, name: newName.trim() };
                        }
                        return t;
                    });
                    return { ...a, talleres: updatedTalleres };
                }
                return a;
            });
            
            await updateDoc(zoneRef, { areas: updatedAreas });
        } catch (error) {
            console.error("Error renaming taller:", error);
            alert("Error al renombrar el hito.");
        }
    };

    const handleDeleteTaller = async (zoneId: string, areaId: string, tallerId: string, tallerName: string) => {
        if (!confirm(`¿Eliminar el hito "${tallerName}"? Esta acción no se puede deshacer.`)) return;
        try {
            await runTransaction(db, async (transaction) => {
                const projectRef = doc(db, "projects", projectId);
                const zoneRef = doc(db, "projectZones", zoneId);
                
                const projectDoc = await transaction.get(projectRef);
                const zoneDoc = await transaction.get(zoneRef);
                
                if (!zoneDoc.exists() || !projectDoc.exists()) return;
                const zoneData = zoneDoc.data() as ProjectZone;
                const projectData = projectDoc.data() as Project;
                
                const area = zoneData.areas.find(a => a.id === areaId);
                if (!area) return;
                
                const taller = area.talleres.find(t => t.id === tallerId);
                if (!taller) return;
                
                const wasCompleted = taller.status === 'COMPLETED';
                const completedChange = wasCompleted ? -1 : 0;
                
                const updatedTalleres = area.talleres.filter(t => t.id !== tallerId);
                
                const updatedAreas = zoneData.areas.map(a => {
                    if (a.id === areaId) {
                        return { ...a, talleres: updatedTalleres };
                    }
                    return a;
                });
                
                const newZoneTotal = Math.max(0, (zoneData.totalTalleres || 0) - 1);
                const newZoneCompleted = Math.max(0, (zoneData.completedTalleres || 0) + completedChange);
                const newZoneProgress = newZoneTotal > 0 ? (newZoneCompleted / newZoneTotal) * 100 : 0;
                
                const newProjectTotal = Math.max(0, (projectData.totalTalleres || 0) - 1);
                const newProjectCompleted = Math.max(0, (projectData.completedTalleres || 0) + completedChange);
                const newProjectProgress = newProjectTotal > 0 ? (newProjectCompleted / newProjectTotal) * 100 : 0;
                
                transaction.update(zoneRef, {
                    areas: updatedAreas,
                    totalTalleres: newZoneTotal,
                    completedTalleres: newZoneCompleted,
                    progressPercentage: newZoneProgress
                });
                
                transaction.update(projectRef, {
                    totalTalleres: newProjectTotal,
                    completedTalleres: newProjectCompleted,
                    progressPercentage: newProjectProgress
                });
            });
        } catch (error) {
            console.error("Error deleting taller:", error);
            alert("Error al eliminar el hito.");
        }
    };

    const openAdminDialog = (type: any, target: any, defaultVal: string = "") => {
        setAdminDialogType(type);
        setAdminDialogTarget(target);
        setAdminDialogInput(defaultVal);
        setAdminDialogOpen(true);
    };

    const handleAdminDialogSubmit = async () => {
        if (!adminDialogInput.trim()) return;
        setIsAdminActionLoading(true);
        try {
            switch (adminDialogType) {
                case 'ADD_ZONE':
                    await handleAddZone(adminDialogInput);
                    break;
                case 'EDIT_ZONE':
                    if (adminDialogTarget.zoneId) {
                        await handleRenameZone(adminDialogTarget.zoneId, adminDialogInput);
                    }
                    break;
                case 'ADD_AREA':
                    if (adminDialogTarget.zoneId) {
                        await handleAddArea(adminDialogTarget.zoneId, adminDialogInput);
                    }
                    break;
                case 'EDIT_AREA':
                    if (adminDialogTarget.zoneId && adminDialogTarget.areaId) {
                        await handleRenameArea(adminDialogTarget.zoneId, adminDialogTarget.areaId, adminDialogInput);
                    }
                    break;
                case 'ADD_TALLER':
                    if (adminDialogTarget.zoneId && adminDialogTarget.areaId) {
                        await handleCreateTaller(adminDialogTarget.zoneId, adminDialogTarget.areaId, adminDialogInput);
                    }
                    break;
                case 'EDIT_TALLER':
                    if (adminDialogTarget.zoneId && adminDialogTarget.areaId && adminDialogTarget.tallerId) {
                        await handleRenameTaller(adminDialogTarget.zoneId, adminDialogTarget.areaId, adminDialogTarget.tallerId, adminDialogInput);
                    }
                    break;
            }
            setAdminDialogOpen(false);
        } catch (error) {
            console.error("Error in admin action:", error);
        } finally {
            setIsAdminActionLoading(false);
        }
    };

    const handleGenerateMatrix = async (generatedZones: { id: string; name: string; areas: { id: string; name: string }[] }[]) => {
        if (!project) return;
        try {
            const batch = writeBatch(db);
            let addedTalleres = 0;

            generatedZones.forEach(gz => {
                let zoneTalleres = 0;
                // Reconstruct full areas with talleres from the template or existing matching areas
                const newAreas = gz.areas.map((areaInfo) => {
                    let sourceTalleres: ProjectTaller[] = [];

                    // Search in existing zones for an area with the exact name to replicate the workshop steps
                    for (const zone of zones) {
                        const matchingArea = zone.areas.find(a => a.name.trim().toLowerCase() === areaInfo.name.trim().toLowerCase());
                        if (matchingArea && matchingArea.talleres && matchingArea.talleres.length > 0) {
                            sourceTalleres = matchingArea.talleres;
                            break;
                        }
                    }

                    let talleres: ProjectTaller[] = [];
                    if (sourceTalleres.length > 0) {
                        talleres = sourceTalleres.map(t => ({
                            id: crypto.randomUUID(),
                            name: t.name,
                            status: 'PENDING',
                            orderIndex: t.orderIndex,
                            templateId: t.templateId || undefined
                        }));
                    } else {
                        // Fallback to default templates
                        talleres = DEFAULT_TALLERES_TEMPLATES.map(t => ({
                            id: crypto.randomUUID(),
                            name: t.name,
                            status: 'PENDING',
                            orderIndex: t.orderIndex,
                            templateId: t.id
                        }));
                    }

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
            setZones(data.sort((a, b) => a.name.localeCompare(b.name)));
            setLoading(false);
        });

        return () => {
            unsubProject();
            unsubZones();
        };
    }, [projectId]);

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

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-slate-800" />
                <p className="text-slate-500 font-medium text-xs">Cargando detalles del proyecto...</p>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <p className="text-sm text-slate-500 font-medium">Proyecto no encontrado.</p>
                <Button onClick={() => router.push("/projects")} variant="outline" className="text-xs">Volver a Proyectos</Button>
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
                
                {/* Header Superior - Classic Navy */}
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" onClick={() => router.push("/projects")} className="bg-slate-50 border border-slate-200 shadow-sm hover:bg-slate-100 no-print text-xs">
                            <ArrowLeft className="mr-2 h-4 w-4 text-slate-900" />
                            Volver
                        </Button>
                        <div>
                            <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">{project.name}</h1>
                            <p className="text-slate-500 text-xs flex items-center gap-2 mt-1.5 font-semibold">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                    project.status === 'COMPLETED' ? 'bg-green-50 text-green-800 border border-green-100' :
                                    project.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-900 border border-blue-100' :
                                    project.status === 'ON_HOLD' ? 'bg-yellow-50 text-yellow-900 border border-yellow-100' :
                                    project.status === 'CANCELLED' ? 'bg-red-50 text-red-900 border border-red-100' :
                                    'bg-amber-50 text-amber-900 border border-amber-100'
                                }`}>
                                    {project.status === 'IN_PROGRESS' ? 'En Curso' : 
                                     project.status === 'COMPLETED' ? 'Completado' : 
                                     project.status === 'ON_HOLD' ? 'En Pausa' :
                                     project.status === 'CANCELLED' ? 'Cancelado' :
                                     'Planificación'}
                                </span>
                                <span>• Cliente: {project.clientName}</span>
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-row gap-2 no-print shrink-0">
                        <Button variant="outline" className="text-slate-700 border-slate-200 hover:bg-slate-50 text-xs font-semibold" onClick={openEditModal}>
                            <Edit className="h-4 w-4 mr-2" /> Editar Proyecto
                        </Button>
                        <Button variant="outline" className="text-slate-700 border-slate-200 hover:bg-slate-50 text-xs font-semibold" onClick={handlePrintReport}>
                            <Printer className="h-4 w-4 mr-2" /> Informe Final
                        </Button>
                        <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 text-xs font-semibold" onClick={handleDeleteProject}>
                            <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                        </Button>
                    </div>
                </div>

                {/* Tarjetas de Resumen KPI - Classic Navy */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="border-t-4 border-t-slate-900 shadow-sm rounded-xl bg-white print-shadow-none print-break-inside-avoid">
                        <CardContent className="pt-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Avance Global</p>
                                    <h2 className="text-3xl font-black text-slate-900 mt-2">{(project.progressPercentage || 0).toFixed(1)}%</h2>
                                </div>
                                <div className="p-2.5 bg-slate-100 rounded-lg text-slate-900">
                                    <CheckCircle2 className="h-5 w-5" />
                                </div>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-5 overflow-hidden">
                                <div className="bg-slate-900 h-full rounded-full transition-all duration-1000" style={{ width: `${project.progressPercentage || 0}%` }}></div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-t-4 border-t-blue-900 shadow-sm rounded-xl bg-white print-shadow-none print-break-inside-avoid">
                        <CardContent className="pt-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Hitos Completados</p>
                                    <h2 className="text-3xl font-black text-slate-900 mt-2">
                                        {project.completedTalleres || 0} <span className="text-base text-slate-400 font-normal">/ {project.totalTalleres || 0}</span>
                                    </h2>
                                </div>
                                <div className="p-2.5 bg-blue-50 rounded-lg text-blue-900">
                                    <CheckCircle2 className="h-5 w-5" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-t-4 border-t-slate-400 shadow-sm rounded-xl bg-white print-shadow-none print-break-inside-avoid">
                        <CardContent className="pt-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Estimación (ETA)</p>
                                    <h2 className="text-sm font-bold text-slate-900 mt-3 leading-tight">
                                        {project.estimatedCompletionDate 
                                            ? format((project.estimatedCompletionDate as any).toDate ? (project.estimatedCompletionDate as any).toDate() : new Date(project.estimatedCompletionDate as any), "dd 'de' MMMM, yyyy", { locale: es })
                                            : "Calculando..."}
                                    </h2>
                                </div>
                                <div className="p-2.5 bg-slate-100 rounded-lg text-slate-500">
                                    <Calendar className="h-5 w-5" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                {/* Panel de Bloqueos y Auditoría de Contratistas */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6 print:hidden">
                    {/* Hitos Bloqueados */}
                    <Card className="lg:col-span-2 border-l-4 border-l-red-650 shadow-sm rounded-xl bg-white">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-red-600" />
                                Hitos Bloqueados por Contratistas Externos
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {blockedTalleres.length === 0 ? (
                                <p className="text-xs text-slate-500 italic">No hay hitos bloqueados actualmente en este proyecto.</p>
                            ) : (
                                <div className="space-y-3">
                                    {/* Group by contractor */}
                                    {Object.entries(
                                        blockedTalleres.reduce((acc, curr) => {
                                            const contractor = curr.taller.blockedByContractor || "No especificado";
                                            if (!acc[contractor]) acc[contractor] = [];
                                            acc[contractor].push(curr);
                                            return acc;
                                        }, {} as Record<string, typeof blockedTalleres>)
                                    ).map(([contractor, items]) => (
                                        <div key={contractor} className="border border-slate-100 rounded-lg p-3 bg-slate-50/50 space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-bold text-red-950 bg-red-100/50 px-2 py-0.5 rounded">
                                                    {contractor} ({items.length})
                                                </span>
                                                <Button 
                                                    size="sm" 
                                                    variant="outline" 
                                                    className="h-7 text-[10px] font-bold border-slate-200 text-slate-800 bg-white hover:bg-slate-100"
                                                    onClick={() => handlePrintContractorReport(contractor, items)}
                                                >
                                                    <FileText className="h-3 w-3 mr-1" /> Notificar y Auditar
                                                </Button>
                                            </div>
                                            <div className="space-y-1">
                                                {items.map((item, idx) => (
                                                    <div key={idx} className="text-[10px] text-slate-600 bg-white p-2 rounded border border-slate-100">
                                                        <div className="flex justify-between font-semibold text-slate-700">
                                                            <span>{item.zoneName} &bull; {item.areaName} &bull; {item.taller.name}</span>
                                                        </div>
                                                        <p className="mt-1 text-red-800 bg-red-50/30 p-1 rounded border border-red-100/50">
                                                            <strong>Razón:</strong> {item.taller.blockedReason || "Sin especificar"}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Historial de Auditoría de Reportes */}
                    <Card className="border-l-4 border-l-slate-600 shadow-sm rounded-xl bg-white">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <FileText className="h-5 w-5 text-slate-600" />
                                Historial de Reportes Enviados
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {audits.length === 0 ? (
                                <p className="text-xs text-slate-500 italic">No se han registrado envíos de reportes aún.</p>
                            ) : (
                                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                                    {audits.map((audit) => {
                                        const date = (audit.exportedAt as any)?.toDate ? (audit.exportedAt as any).toDate() : new Date(audit.exportedAt as any);
                                        return (
                                            <div key={audit.id} className="text-[10px] border border-slate-100 rounded-lg p-2.5 bg-slate-50/50">
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="font-bold text-slate-800">{audit.contractor}</span>
                                                    <span className="text-[9px] text-slate-500">{format(date, "dd MMM, HH:mm", { locale: es })}</span>
                                                </div>
                                                <p className="text-[9px] text-slate-600">
                                                    <strong>Hitos reportados:</strong> {audit.blockedItemsCount}
                                                </p>
                                                <p className="text-[9px] text-slate-600 mt-0.5">
                                                    <strong>Emitido por:</strong> {audit.exportedBy}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                     {/* Detalle de Zonas y Áreas */}
                <div className="flex justify-between items-center mt-8 mb-4 border-b border-slate-200 pb-3">
                    <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider">Estructura y Avance por Zonas</h2>
                    <div className="flex gap-2 no-print">
                        <Button 
                            size="sm" 
                            variant="outline" 
                            className="bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100 hover:text-slate-900 text-xs font-semibold"
                            onClick={() => openAdminDialog('ADD_ZONE', {})}
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Agregar Zona
                        </Button>
                        {zones.length > 0 && (
                            <Button 
                                size="sm" 
                                variant="outline" 
                                className="bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100 hover:text-slate-900 text-xs font-semibold"
                                onClick={() => setShowMatrixModal(true)}
                            >
                                <Grid3X3 className="h-4 w-4 mr-2" />
                                Agregar Zonas (Matriz)
                            </Button>
                        )}
                    </div>
                </div>

                <div className="space-y-4">
                    {groupedZones.length === 0 ? (
                        <div className="bg-white rounded-xl p-12 text-center border border-slate-200 shadow-sm">
                            <p className="text-slate-500 text-xs font-semibold">Este proyecto aún no tiene zonas creadas.</p>
                            <Button 
                                size="sm" 
                                className="mt-4 bg-slate-900 text-white hover:bg-slate-850 text-xs font-bold"
                                onClick={() => openAdminDialog('ADD_ZONE', {})}
                            >
                                <Plus className="h-4 w-4 mr-1.5" /> Agregar Primera Zona
                            </Button>
                        </div>
                    ) : (
                        groupedZones.map((group) => {
                            const isGroupExpanded = expandedGroup === group.name;
                            const groupProgress = group.totalTalleres > 0 ? (group.completedTalleres / group.totalTalleres) * 100 : 0;
                            return (
                                <div key={group.name} className="border border-slate-250 rounded-xl overflow-hidden shadow-sm bg-white mb-4">
                                    {/* Block Accordion Header */}
                                    <div 
                                        onClick={() => setExpandedGroup(isGroupExpanded ? null : group.name)}
                                        className={`p-4 flex items-center justify-between cursor-pointer transition-colors border-b border-slate-100 ${isGroupExpanded ? 'bg-slate-900 text-white' : 'bg-slate-55 hover:bg-slate-100 text-slate-800'}`}
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <Building2 className={`h-4.5 w-4.5 ${isGroupExpanded ? 'text-blue-400' : 'text-slate-500'}`} />
                                                <span className="font-bold text-sm tracking-tight">{group.name}</span>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${isGroupExpanded ? 'bg-slate-800 text-blue-300' : 'bg-slate-200 text-slate-700'}`}>
                                                    {group.items.length} Aptos
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 mt-2">
                                                <div className={`w-32 h-1.5 rounded-full overflow-hidden ${isGroupExpanded ? 'bg-slate-850' : 'bg-slate-200'}`}>
                                                    <div 
                                                        className={`h-full transition-all duration-500 ${isGroupExpanded ? 'bg-blue-400' : 'bg-slate-900'}`}
                                                        style={{ width: `${groupProgress}%` }}
                                                    />
                                                </div>
                                                <span className="text-[10px] font-semibold">
                                                    {group.completedTalleres} / {group.totalTalleres} hitos ({groupProgress.toFixed(0)}%)
                                                </span>
                                            </div>
                                        </div>
                                        <div>
                                            {isGroupExpanded ? <ChevronDown className="h-5 w-5 text-slate-400" /> : <ChevronRight className="h-5 w-5 text-slate-400" />}
                                        </div>
                                    </div>

                                    {/* Block Content (Apartments/Zones inside the block) */}
                                    {isGroupExpanded && (
                                        <div className="p-4 bg-slate-50/30 space-y-4">
                                            {group.items.map((zone) => (
                                                <Card key={zone.id} className="overflow-hidden border-slate-200 shadow-sm hover:border-slate-300 transition-colors bg-white rounded-xl print-shadow-none print-break-inside-avoid">
                                                    {/* Zone Header (Click to expand) */}
                                                    <div 
                                                        className={`p-3.5 flex items-center justify-between cursor-pointer transition-colors ${expandedZone === zone.id ? 'bg-slate-50/50' : 'hover:bg-slate-50'}`}
                                                        onClick={() => setExpandedZone(expandedZone === zone.id ? null : zone.id)}
                                                    >
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <h3 className="text-xs font-bold text-slate-900">{zone.name}</h3>
                                                                <span className="text-[9px] font-extrabold px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded border border-slate-200 uppercase tracking-wider">
                                                                    {zone.areas.length} Áreas
                                                                </span>
                                                                {zone.notes && (
                                                                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 bg-amber-50 text-amber-800 rounded border border-amber-100 uppercase tracking-wider flex items-center gap-1">
                                                                        <FileText className="h-3 w-3" /> Notas
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-3 mt-2">
                                                                <div className="w-28 h-1 bg-slate-100 rounded-full overflow-hidden">
                                                                    <div 
                                                                        className="h-full bg-slate-900 transition-all duration-500"
                                                                        style={{ width: `${zone.progressPercentage || 0}%` }}
                                                                    />
                                                                </div>
                                                                <p className="text-[9px] font-semibold text-slate-500">
                                                                    {zone.completedTalleres} / {zone.totalTalleres} completados ({zone.progressPercentage?.toFixed(0) || 0}%)
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 no-print" onClick={(e) => e.stopPropagation()}>
                                                            <Button 
                                                                variant="ghost" 
                                                                size="sm" 
                                                                className="text-slate-500 hover:text-slate-800 hover:bg-slate-100 p-1.5 h-7 w-7 rounded"
                                                                onClick={() => openAdminDialog('ADD_AREA', { zoneId: zone.id })}
                                                                title="Agregar Área"
                                                            >
                                                                <Plus className="h-4 w-4 text-slate-500" />
                                                            </Button>
                                                            <Button 
                                                                variant="ghost" 
                                                                size="sm" 
                                                                className="text-slate-500 hover:text-slate-800 hover:bg-slate-100 p-1.5 h-7 w-7 rounded"
                                                                onClick={() => openAdminDialog('EDIT_ZONE', { zoneId: zone.id }, zone.name)}
                                                                title="Renombrar Zona"
                                                            >
                                                                <Pencil className="h-3.5 w-3.5" />
                                                            </Button>
                                                            <Button 
                                                                variant="ghost" 
                                                                size="sm" 
                                                                className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 h-7 w-7 rounded"
                                                                onClick={() => handleDeleteZone(zone.id, zone.name)}
                                                                title="Eliminar Zona"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-slate-400 p-1.5 h-7 w-7 rounded"
                                                                onClick={() => setExpandedZone(expandedZone === zone.id ? null : zone.id)}
                                                            >
                                                                {expandedZone === zone.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                                            </Button>
                                                        </div>
                                                    </div>

                                                    {/* Areas Accordion */}
                                                    {(expandedZone === zone.id || typeof window !== 'undefined' && window.matchMedia('print').matches) && (
                                                        <div className="border-t border-slate-100 bg-slate-50/20 pb-4">
                                                            {/* Zone Notes Editor */}
                                                            <div className="mx-4 mt-4 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                                                                <Label className="text-slate-800 font-bold mb-2 flex items-center gap-2 text-xs uppercase tracking-wider">
                                                                    <FileText className="h-4 w-4 text-slate-500" /> Notas / Materiales de la Zona
                                                                </Label>
                                                                <Textarea 
                                                                    className="min-h-[70px] bg-slate-50/50 border-slate-200 focus-visible:ring-slate-400 text-xs no-print"
                                                                    placeholder="Notas de materiales o avance específicos para esta zona..."
                                                                    defaultValue={zone.notes || ""}
                                                                    onBlur={(e) => {
                                                                        if (e.target.value !== zone.notes) {
                                                                            handleUpdateZoneNotes(zone.id, e.target.value);
                                                                        }
                                                                    }}
                                                                />
                                                                {zone.notes && (
                                                                    <p className="hidden print:block text-xs text-slate-700 mt-2 p-2 bg-slate-50 rounded border border-slate-200">
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
                                                                    <div key={area.id} className="border border-slate-200 last:border-0 mx-4 mt-3 bg-white rounded-xl shadow-sm overflow-hidden">
                                                                        {/* Area Header */}
                                                                        <div 
                                                                            className="p-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                                                                            onClick={() => setExpandedArea(isAreaExpanded ? null : area.id)}
                                                                        >
                                                                            <div className="flex items-center gap-2">
                                                                                <div className={`w-1.5 h-1.5 rounded-full ${isAllCompleted ? 'bg-green-500' : 'bg-amber-400'}`} />
                                                                                <span className="font-bold text-slate-900 text-xs">{area.name}</span>
                                                                            </div>
                                                                            <div className="flex items-center gap-1.5 no-print" onClick={(e) => e.stopPropagation()}>
                                                                                <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border mr-2 ${
                                                                                    isAllCompleted 
                                                                                        ? 'bg-green-50 text-green-800 border-green-100' 
                                                                                        : 'bg-amber-50 text-amber-800 border-amber-100'
                                                                                }`}>
                                                                                    {areaCompleted}/{areaTotal} Completados
                                                                                </span>
                                                                                <Button 
                                                                                    variant="ghost" 
                                                                                    size="sm" 
                                                                                    className="text-slate-500 hover:text-slate-800 hover:bg-slate-100 p-1 h-6 w-6 rounded"
                                                                                    onClick={() => openAdminDialog('ADD_TALLER', { zoneId: zone.id, areaId: area.id })}
                                                                                    title="Agregar Hito"
                                                                                >
                                                                                    <Plus className="h-3.5 w-3.5" />
                                                                                </Button>
                                                                                <Button 
                                                                                    variant="ghost" 
                                                                                    size="sm" 
                                                                                    className="text-slate-500 hover:text-slate-800 hover:bg-slate-100 p-1 h-6 w-6 rounded"
                                                                                    onClick={() => openAdminDialog('EDIT_AREA', { zoneId: zone.id, areaId: area.id }, area.name)}
                                                                                    title="Renombrar Área"
                                                                                >
                                                                                    <Pencil className="h-3.5 w-3.5" />
                                                                                </Button>
                                                                                <Button 
                                                                                    variant="ghost" 
                                                                                    size="sm" 
                                                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 h-6 w-6 rounded"
                                                                                    onClick={() => handleDeleteArea(zone.id, area.id, area.name)}
                                                                                    title="Eliminar Área"
                                                                                >
                                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                                </Button>
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="sm"
                                                                                    className="text-slate-400 p-1 h-6 w-6 rounded"
                                                                                    onClick={() => setExpandedArea(isAreaExpanded ? null : area.id)}
                                                                                >
                                                                                    {isAreaExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                                                                </Button>
                                                                            </div>
                                                                        </div>

                                                                        {/* Talleres List */}
                                                                        {isAreaExpanded && (
                                                                            <div className="bg-slate-50/50 p-3 border-t border-slate-100 space-y-2">
                                                                                {area.talleres.length === 0 ? (
                                                                                    <p className="text-[11px] text-slate-400 italic">No hay hitos definidos en esta área.</p>
                                                                                ) : (
                                                                                    area.talleres.sort((a,b) => a.orderIndex - b.orderIndex).map((taller) => {
                                                                                        const isCompleted = taller.status === 'COMPLETED';
                                                                                        const isBlocked = taller.status === 'BLOCKED';
                                                                                        return (
                                                                                            <div 
                                                                                                key={taller.id} 
                                                                                                className={`flex flex-col p-2.5 rounded-lg border ${
                                                                                                    isCompleted ? 'bg-white border-green-250' : 
                                                                                                    isBlocked ? 'bg-red-50/20 border-red-250' :
                                                                                                    'bg-white border-slate-200'
                                                                                                }`}
                                                                                            >
                                                                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                                                                                                    <div className="flex items-center justify-between w-full md:w-auto">
                                                                                                        <div className="flex items-center gap-2">
                                                                                                            <div className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                                                                                                                isCompleted ? 'bg-green-600 text-white' : 
                                                                                                                isBlocked ? 'bg-red-600 text-white' :
                                                                                                                'bg-slate-100 text-slate-400'
                                                                                                            }`}>
                                                                                                                {isCompleted ? <CheckCircle2 className="h-3 w-3" /> : 
                                                                                                                 isBlocked ? <ShieldAlert className="h-3 w-3" /> :
                                                                                                                 <Clock className="h-3 w-3" />}
                                                                                                            </div>
                                                                                                            <div>
                                                                                                                <span className={`text-[11px] font-semibold ${
                                                                                                                    isCompleted ? 'text-slate-800' : 
                                                                                                                    isBlocked ? 'text-red-950' : 
                                                                                                                    'text-slate-700'
                                                                                                                }`}>
                                                                                                                    {taller.name}
                                                                                                                </span>
                                                                                                                {isCompleted && taller.completedAt && (
                                                                                                                    <p className="text-[9px] text-slate-400 mt-0.5">
                                                                                                                        {format((taller.completedAt as any).toDate ? (taller.completedAt as any).toDate() : new Date(taller.completedAt as any), "dd MMM, HH:mm", { locale: es })}
                                                                                                                    </p>
                                                                                                                )}
                                                                                                                {isBlocked && (
                                                                                                                    <div className="mt-1 space-y-0.5 text-[9px] text-red-800 bg-red-50/50 rounded p-1.5 border border-red-100 max-w-sm">
                                                                                                                        <p>
                                                                                                                            <strong className="font-semibold">Responsable:</strong> {taller.blockedByContractor || "No especificado"}
                                                                                                                        </p>
                                                                                                                        <p>
                                                                                                                            <strong className="font-semibold">Razón:</strong> {taller.blockedReason || "Sin razón especificada"}
                                                                                                                        </p>
                                                                                                                        <p className="text-[8px] text-slate-400">
                                                                                                                            Reportado por {taller.assignedToTecnicoName || "Técnico"}
                                                                                                                            {taller.blockedAt && (
                                                                                                                                <> el {format((taller.blockedAt as any).toDate ? (taller.blockedAt as any).toDate() : new Date(taller.blockedAt as any), "dd MMM, HH:mm", { locale: es })}</>
                                                                                                                            )}
                                                                                                                        </p>
                                                                                                                    </div>
                                                                                                                )}
                                                                                                            </div>
                                                                                                        </div>
                                                                                                        <div className="flex items-center gap-1 md:hidden no-print">
                                                                                                            <Button 
                                                                                                                variant="ghost" 
                                                                                                                size="sm" 
                                                                                                                className="h-6 w-6 p-0 text-slate-400 hover:text-slate-700"
                                                                                                                onClick={() => openAdminDialog('EDIT_TALLER', { zoneId: zone.id, areaId: area.id, tallerId: taller.id }, taller.name)}
                                                                                                            >
                                                                                                                <Pencil className="h-3 w-3" />
                                                                                                            </Button>
                                                                                                            <Button 
                                                                                                                variant="ghost" 
                                                                                                                size="sm" 
                                                                                                                className="h-6 w-6 p-0 text-red-400 hover:text-red-600"
                                                                                                                onClick={() => handleDeleteTaller(zone.id, area.id, taller.id, taller.name)}
                                                                                                            >
                                                                                                                <Trash2 className="h-3 w-3" />
                                                                                                            </Button>
                                                                                                        </div>
                                                                                                    </div>

                                                                                                    <div className="flex flex-wrap items-center gap-2 shrink-0 justify-end w-full md:w-auto">
                                                                                                        {/* Action button bar */}
                                                                                                        <div className="flex items-center gap-1.5 no-print">
                                                                                                            <User className="h-3 w-3 text-slate-400" />
                                                                                                            <select
                                                                                                                value={taller.assignedToTecnicoId || "unassigned"}
                                                                                                                onChange={(e) => handleAssignTechnician(zone.id, area.id, taller.id, e.target.value)}
                                                                                                                className="text-[9px] bg-white border border-slate-200 rounded px-1 py-0.5 font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400 mr-2"
                                                                                                            >
                                                                                                                <option value="unassigned">Sin Asignar</option>
                                                                                                                {technicians.map(tech => (
                                                                                                                    <option key={tech.id} value={tech.id}>
                                                                                                                        {tech.name}
                                                                                                                    </option>
                                                                                                                ))}
                                                                                                            </select>

                                                                                                            <Button 
                                                                                                                variant="ghost" 
                                                                                                                size="sm" 
                                                                                                                className="hidden md:inline-flex h-6 w-6 p-0 text-slate-400 hover:text-slate-700"
                                                                                                                onClick={() => openAdminDialog('EDIT_TALLER', { zoneId: zone.id, areaId: area.id, tallerId: taller.id }, taller.name)}
                                                                                                                title="Renombrar Hito"
                                                                                                            >
                                                                                                                <Pencil className="h-3 w-3" />
                                                                                                            </Button>
                                                                                                            <Button 
                                                                                                                variant="ghost" 
                                                                                                                size="sm" 
                                                                                                                className="hidden md:inline-flex h-6 w-6 p-0 text-red-400 hover:text-red-650"
                                                                                                                onClick={() => handleDeleteTaller(zone.id, area.id, taller.id, taller.name)}
                                                                                                                title="Eliminar Hito"
                                                                                                            >
                                                                                                                <Trash2 className="h-3 w-3" />
                                                                                                            </Button>
                                                                                                        </div>

                                                                                                        {/* Evidencia photo button */}
                                                                                                        {isCompleted && taller.evidencePhotoUrl && (
                                                                                                            <Button 
                                                                                                                variant="outline" 
                                                                                                                size="sm" 
                                                                                                                className="h-6 text-[9px] bg-white text-emerald-600 border-emerald-250 hover:bg-emerald-50 no-print font-bold"
                                                                                                                onClick={() => setViewingPhoto({
                                                                                                                    url: taller.evidencePhotoUrl!,
                                                                                                                    name: taller.name,
                                                                                                                    technician: taller.assignedToTecnicoName || "Técnico Desconocido",
                                                                                                                    date: taller.completedAt
                                                                                                                })}
                                                                                                            >
                                                                                                                <ImageIcon className="h-3 w-3 mr-1" />
                                                                                                                Ver Evidencia
                                                                                                            </Button>
                                                                                                        )}

                                                                                                        {/* Control button reopen/ listo */}
                                                                                                        <div className="flex items-center gap-1.5 no-print">
                                                                                                            {isCompleted ? (
                                                                                                                <Button 
                                                                                                                    variant="outline" 
                                                                                                                    size="sm" 
                                                                                                                    className="h-6 text-[9px] bg-white text-slate-600 border-slate-200 hover:bg-slate-50 font-medium"
                                                                                                                    onClick={() => handleToggleTallerStatus(zone.id, area.id, taller.id, 'PENDING')}
                                                                                                                >
                                                                                                                    Reabrir
                                                                                                                </Button>
                                                                                                            ) : isBlocked ? (
                                                                                                                <Button 
                                                                                                                    variant="outline" 
                                                                                                                    size="sm" 
                                                                                                                    className="h-6 text-[9px] bg-white text-emerald-600 border-emerald-250 hover:bg-emerald-50 font-bold"
                                                                                                                    onClick={() => handleToggleTallerStatus(zone.id, area.id, taller.id, 'PENDING')}
                                                                                                                >
                                                                                                                    Resolver
                                                                                                                </Button>
                                                                                                            ) : (
                                                                                                                <Button 
                                                                                                                    variant="outline" 
                                                                                                                    size="sm" 
                                                                                                                    className="h-6 text-[9px] bg-slate-900 text-white border-transparent hover:bg-slate-800 font-bold"
                                                                                                                    onClick={() => handleToggleTallerStatus(zone.id, area.id, taller.id, 'COMPLETED')}
                                                                                                                >
                                                                                                                    Listo
                                                                                                                </Button>
                                                                                                            )}
                                                                                                        </div>
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>
                                                                                        );
                                                                                    }))}
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
                        })
                    )}
                </div>
            </div>

            {/* Photo Viewer Modal */}
            <Dialog open={!!viewingPhoto} onOpenChange={(open) => !open && setViewingPhoto(null)}>
                <DialogContent className="sm:max-w-2xl bg-slate-900 text-white border-slate-800">
                    <DialogHeader>
                        <DialogTitle className="text-white text-sm font-bold">Evidencia: {viewingPhoto?.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
                            <span className="flex items-center gap-1 font-semibold"><User className="h-3.5 w-3.5" /> {viewingPhoto?.technician}</span>
                            <span className="flex items-center gap-1 font-semibold"><Clock className="h-3.5 w-3.5" /> 
                                {viewingPhoto?.date ? format((viewingPhoto.date as any).toDate ? (viewingPhoto.date as any).toDate() : new Date(viewingPhoto.date as any), "dd MMM yyyy, HH:mm", { locale: es }) : "Fecha desconocida"}
                            </span>
                        </div>
                        {viewingPhoto?.url && (
                            <img 
                                src={viewingPhoto.url} 
                                alt="Evidencia de tarea" 
                                className="w-full h-auto max-h-[65vh] object-contain rounded-lg border border-slate-800 shadow"
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

            {/* Modal Editar Detalles del Proyecto */}
            <Dialog open={isEditingProject} onOpenChange={setIsEditingProject}>
                <DialogContent className="sm:max-w-md bg-white text-slate-900 border-slate-200">
                    <DialogHeader>
                        <DialogTitle className="text-slate-900 text-sm font-bold uppercase tracking-wider">Editar Detalles del Proyecto</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1">
                            <Label htmlFor="projectName" className="text-xs font-bold text-slate-700 uppercase">Nombre del Proyecto</Label>
                            <Input 
                                id="projectName" 
                                value={editProjectName} 
                                onChange={(e) => setEditProjectName(e.target.value)} 
                                className="text-xs h-9"
                                placeholder="Ej: Torre Bella Vista"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="clientName" className="text-xs font-bold text-slate-700 uppercase">Cliente</Label>
                            <Input 
                                id="clientName" 
                                value={editClientName} 
                                onChange={(e) => setEditClientName(e.target.value)} 
                                className="text-xs h-9"
                                placeholder="Ej: Constructora XYZ"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="projectStatus" className="text-xs font-bold text-slate-700 uppercase">Estado del Proyecto</Label>
                            <select
                                id="projectStatus"
                                value={editStatus}
                                onChange={(e) => setEditStatus(e.target.value as ProjectStatus)}
                                className="w-full text-xs h-9 bg-white border border-slate-200 rounded px-2 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400"
                            >
                                <option value="PLANNING">Planificación</option>
                                <option value="IN_PROGRESS">En Desarrollo / En Curso</option>
                                <option value="ON_HOLD">En Pausa / En Espera</option>
                                <option value="CANCELLED">Cancelado</option>
                                <option value="COMPLETED">Completado</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="estimatedDate" className="text-xs font-bold text-slate-700 uppercase">Fecha Estimada de Entrega (ETA)</Label>
                            <Input 
                                id="estimatedDate" 
                                type="date"
                                value={editEstimatedDate} 
                                onChange={(e) => setEditEstimatedDate(e.target.value)} 
                                className="text-xs h-9"
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-xs h-9"
                            onClick={() => setIsEditingProject(false)}
                        >
                            Cancelar
                        </Button>
                        <Button 
                            variant="default" 
                            size="sm" 
                            className="text-xs h-9 bg-slate-900 text-white hover:bg-slate-800"
                            onClick={handleSaveProject}
                            disabled={!editProjectName.trim()}
                        >
                            Guardar Cambios
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal de Acciones Administrativas Dinámicas */}
            <Dialog open={adminDialogOpen} onOpenChange={setAdminDialogOpen}>
                <DialogContent className="sm:max-w-md bg-white text-slate-900 border-slate-200">
                    <DialogHeader>
                        <DialogTitle className="text-slate-900 text-sm font-bold uppercase tracking-wider">
                            {adminDialogType === 'ADD_ZONE' && 'Agregar Nueva Zona'}
                            {adminDialogType === 'EDIT_ZONE' && 'Renombrar Zona'}
                            {adminDialogType === 'ADD_AREA' && 'Agregar Nueva Área'}
                            {adminDialogType === 'EDIT_AREA' && 'Renombrar Área'}
                            {adminDialogType === 'ADD_TALLER' && 'Agregar Hito / Taller'}
                            {adminDialogType === 'EDIT_TALLER' && 'Renombrar Hito / Taller'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1">
                            <Label htmlFor="adminInput" className="text-xs font-bold text-slate-700 uppercase">
                                {adminDialogType?.startsWith('ADD') ? 'Nombre del nuevo elemento' : 'Nuevo nombre'}
                            </Label>
                            <Input 
                                id="adminInput" 
                                value={adminDialogInput} 
                                onChange={(e) => setAdminDialogInput(e.target.value)} 
                                className="text-xs h-9"
                                placeholder="Escribe el nombre aquí..."
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && adminDialogInput.trim() && !isAdminActionLoading) {
                                        handleAdminDialogSubmit();
                                    }
                                }}
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-xs h-9"
                            onClick={() => setAdminDialogOpen(false)}
                            disabled={isAdminActionLoading}
                        >
                            Cancelar
                        </Button>
                        <Button 
                            variant="default" 
                            size="sm" 
                            className="text-xs h-9 bg-slate-900 text-white hover:bg-slate-800"
                            onClick={handleAdminDialogSubmit}
                            disabled={!adminDialogInput.trim() || isAdminActionLoading}
                        >
                            {isAdminActionLoading ? 'Procesando...' : 'Confirmar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    </div>
);
}
