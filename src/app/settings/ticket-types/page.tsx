"use client";

import { useState, useEffect } from "react";
import { collection, addDoc, updateDoc, doc, getDocs, serverTimestamp, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { TicketType } from "@/types/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChecklistEditor } from "@/components/settings/checklist-editor";
import { SERVICE_CHECKLISTS } from "@/lib/constants/checklists";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";

export default function TicketTypesPage() {
    const [types, setTypes] = useState<TicketType[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingType, setEditingType] = useState<TicketType | null>(null);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState<Partial<TicketType>>({
        name: "",
        key: "",
        description: "",
        color: "#3b82f6",
        active: true,
        requiresPhotos: true,
        requiresSignature: true,
        requiresMaterials: false,
        defaultChecklist: [],
    });

    useEffect(() => {
        fetchTypes();
    }, []);

    const fetchTypes = async () => {
        try {
            const q = query(collection(db, "ticketTypes"));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TicketType));
            setTypes(data);
        } catch (error) {
            console.error("Error fetching ticket types:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (type?: TicketType) => {
        if (type) {
            setEditingType(type);
            setFormData(type);
        } else {
            setEditingType(null);
            setFormData({
                name: "",
                key: "",
                description: "",
                color: "#3b82f6",
                active: true,
                requiresPhotos: true,
                requiresSignature: true,
                requiresMaterials: false,
                defaultChecklist: [],
            });
        }
        setIsDialogOpen(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const dataToSave = {
                ...formData,
                updatedAt: serverTimestamp(),
            };

            if (editingType) {
                await updateDoc(doc(db, "ticketTypes", editingType.id), dataToSave);
            } else {
                await addDoc(collection(db, "ticketTypes"), {
                    ...dataToSave,
                    order: types.length,
                    createdAt: serverTimestamp(),
                });
            }

            await fetchTypes();
            setIsDialogOpen(false);
        } catch (error) {
            console.error("Error saving ticket type:", error);
            alert("Error al guardar: " + (error as any).message); // Show alert to user
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-medium text-gray-900">Tipos de Ticket</h2>
                    <p className="text-sm text-gray-500">Configura los tipos de servicios y sus checklists.</p>
                </div>
                <Button onClick={() => handleOpenDialog()}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo Tipo
                </Button>
            </div>

            {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin h-8 w-8 text-gray-400" /></div>
            ) : (
                <div className="grid gap-4">
                    {types.map((type) => (
                        <div key={type.id} className="bg-white p-4 rounded-lg border shadow-sm flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: type.color }}>
                                    {type.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-medium text-gray-900">{type.name}</h3>
                                    <p className="text-sm text-gray-500">{type.description}</p>
                                    <div className="flex gap-2 mt-1">
                                        {type.requiresPhotos && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">Fotos</span>}
                                        {type.requiresSignature && <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded">Firma</span>}
                                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{type.defaultChecklist?.length || 0} ítems</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(type)}>
                                    <Pencil className="h-4 w-4 text-gray-500" />
                                </Button>
                            </div>
                        </div>
                    ))}
                    {types.length === 0 && (
                        <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed">
                            <p className="text-gray-500">No hay tipos de ticket configurados.</p>
                        </div>
                    )}
                </div>
            )}

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingType ? "Editar Tipo de Ticket" : "Nuevo Tipo de Ticket"}</DialogTitle>
                    </DialogHeader>

                    <div className="grid gap-6 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Nombre</Label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Ej. Mantenimiento"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Clave (Interna)</Label>
                                <Input
                                    value={formData.key}
                                    onChange={(e) => setFormData({ ...formData, key: e.target.value.toUpperCase() })}
                                    placeholder="MANTENIMIENTO"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Descripción</Label>
                            <Textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Descripción corta del servicio..."
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Color</Label>
                                <div className="flex gap-2">
                                    <Input
                                        type="color"
                                        value={formData.color}
                                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                        className="w-12 h-10 p-1 cursor-pointer"
                                    />
                                    <Input
                                        value={formData.color}
                                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                        placeholder="#000000"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-6">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="reqPhotos"
                                    checked={formData.requiresPhotos}
                                    onCheckedChange={(c) => setFormData({ ...formData, requiresPhotos: c as boolean })}
                                />
                                <Label htmlFor="reqPhotos">Requiere Fotos</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="reqSig"
                                    checked={formData.requiresSignature}
                                    onCheckedChange={(c) => setFormData({ ...formData, requiresSignature: c as boolean })}
                                />
                                <Label htmlFor="reqSig">Requiere Firma</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="active"
                                    checked={formData.active}
                                    onCheckedChange={(c) => setFormData({ ...formData, active: c as boolean })}
                                />
                                <Label htmlFor="active">Activo</Label>
                            </div>
                        </div>

                        <div className="space-y-2 border-t pt-4">
                            <div className="flex justify-between items-center">
                                <div>
                                    <Label className="text-base">Checklist Base</Label>
                                    <p className="text-xs text-gray-500">Define los pasos que se cargarán por defecto.</p>
                                </div>
                                <Select onValueChange={(val) => {
                                    if (val && SERVICE_CHECKLISTS[val as keyof typeof SERVICE_CHECKLISTS]) {
                                        setFormData({ ...formData, defaultChecklist: SERVICE_CHECKLISTS[val as keyof typeof SERVICE_CHECKLISTS] });
                                    }
                                }}>
                                    <SelectTrigger className="w-[200px] h-8 text-xs">
                                        <SelectValue placeholder="Cargar Plantilla..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.keys(SERVICE_CHECKLISTS).map((key) => (
                                            <SelectItem key={key} value={key}>{key}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <ChecklistEditor
                                items={formData.defaultChecklist || []}
                                onChange={(items) => setFormData({ ...formData, defaultChecklist: items })}
                            />
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
