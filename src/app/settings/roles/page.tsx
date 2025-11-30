"use client";

import { useState, useEffect } from "react";
import { collection, addDoc, updateDoc, doc, getDocs, serverTimestamp, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Role, Permission } from "@/types/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Shield, Loader2 } from "lucide-react";

const AVAILABLE_PERMISSIONS: Permission[] = [
    { id: 'p1', key: 'create_ticket', label: 'Crear Tickets', group: 'TICKETS' },
    { id: 'p2', key: 'view_all_tickets', label: 'Ver Todos los Tickets', group: 'TICKETS' },
    { id: 'p3', key: 'edit_ticket', label: 'Editar Tickets', group: 'TICKETS' },
    { id: 'p4', key: 'close_ticket', label: 'Cerrar Tickets', group: 'TICKETS' },
    { id: 'p5', key: 'manage_technicians', label: 'Gestionar Técnicos', group: 'USERS' },
    { id: 'p6', key: 'manage_settings', label: 'Gestionar Ajustes', group: 'SETTINGS' },
];

export default function RolesPage() {
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState<Partial<Role>>({
        name: "",
        description: "",
        permissions: [],
    });

    useEffect(() => {
        fetchRoles();
    }, []);

    const fetchRoles = async () => {
        try {
            const q = query(collection(db, "roles"), orderBy("name", "asc"));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Role));
            setRoles(data);
        } catch (error) {
            console.error("Error fetching roles:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (role?: Role) => {
        if (role) {
            setEditingRole(role);
            setFormData(role);
        } else {
            setEditingRole(null);
            setFormData({
                name: "",
                description: "",
                permissions: [],
            });
        }
        setIsDialogOpen(true);
    };

    const handleTogglePermission = (key: string) => {
        const current = formData.permissions || [];
        if (current.includes(key)) {
            setFormData({ ...formData, permissions: current.filter(k => k !== key) });
        } else {
            setFormData({ ...formData, permissions: [...current, key] });
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const dataToSave = {
                ...formData,
                updatedAt: serverTimestamp(),
            };

            if (editingRole) {
                await updateDoc(doc(db, "roles", editingRole.id), dataToSave);
            } else {
                await addDoc(collection(db, "roles"), {
                    ...dataToSave,
                    createdAt: serverTimestamp(),
                });
            }

            await fetchRoles();
            setIsDialogOpen(false);
        } catch (error) {
            console.error("Error saving role:", error);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-medium text-gray-900">Roles y Permisos</h2>
                    <p className="text-sm text-gray-500">Define los roles de usuario y sus capacidades.</p>
                </div>
                <Button onClick={() => handleOpenDialog()}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo Rol
                </Button>
            </div>

            {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin h-8 w-8 text-gray-400" /></div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {roles.map((role) => (
                        <div key={role.id} className="bg-white p-6 rounded-lg border shadow-sm space-y-4">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-2">
                                    <Shield className="h-5 w-5 text-blue-600" />
                                    <h3 className="font-bold text-gray-900">{role.name}</h3>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(role)}>
                                    <Pencil className="h-4 w-4 text-gray-500" />
                                </Button>
                            </div>
                            <p className="text-sm text-gray-500">{role.description || "Sin descripción"}</p>
                            <div className="pt-2 border-t">
                                <p className="text-xs font-medium text-gray-500 mb-2">Permisos ({role.permissions?.length || 0})</p>
                                <div className="flex flex-wrap gap-1">
                                    {role.permissions?.slice(0, 5).map(p => (
                                        <span key={p} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                            {AVAILABLE_PERMISSIONS.find(ap => ap.key === p)?.label || p}
                                        </span>
                                    ))}
                                    {(role.permissions?.length || 0) > 5 && (
                                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                            +{role.permissions!.length - 5} más
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingRole ? "Editar Rol" : "Nuevo Rol"}</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        <div className="space-y-2">
                            <Label>Nombre del Rol</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Ej. Supervisor"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Descripción</Label>
                            <Input
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Descripción breve..."
                            />
                        </div>

                        <div className="space-y-3">
                            <Label>Permisos</Label>
                            <div className="grid grid-cols-2 gap-4 border rounded-lg p-4 bg-slate-50">
                                {AVAILABLE_PERMISSIONS.map((perm) => (
                                    <div key={perm.id} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={perm.id}
                                            checked={formData.permissions?.includes(perm.key)}
                                            onCheckedChange={() => handleTogglePermission(perm.key)}
                                        />
                                        <Label htmlFor={perm.id} className="text-sm font-normal cursor-pointer">
                                            {perm.label}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSave} disabled={saving || !formData.name}>
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Guardar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
