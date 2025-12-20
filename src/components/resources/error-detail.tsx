"use client";

import { useState } from "react";
import { ACError, ACErrorCriticality } from "@/types/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, Trash2, Plus, X } from "lucide-react";
import { doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface ErrorDetailProps {
    error: ACError | null;
    onBack: () => void;
    onSave: () => void;
}

export const CRITICALITY_LEVELS: ACErrorCriticality[] = ['BAJA', 'MEDIA', 'ALTA'];

export const SYSTEM_TYPES = [
    "Split Muro",
    "Cassette",
    "Piso Techo",
    "VRF",
    "Mini VRF",
    "Paquete / Central",
    "Chiller",
    "Portátil",
    "Fancoil",
    "Manejadora",
    "Otro"
] as const;


export function ErrorDetail({ error, onBack, onSave }: ErrorDetailProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<ACError>(error || {
        id: crypto.randomUUID(),
        brand: '',
        model: '',
        systemType: '',
        errorCode: '',
        symptom: '',
        cause: '',
        solution: '',
        criticality: 'MEDIA',
        notes: '',
        tags: [],
        createdAt: null
    });
    const [newTag, setNewTag] = useState("");

    const handleSave = async () => {
        if (!formData.brand || !formData.symptom) {
            alert("Marca y Síntoma son obligatorios");
            return;
        }
        setLoading(true);
        try {
            await setDoc(doc(db, "acErrors", formData.id), {
                ...formData,
                updatedAt: serverTimestamp(),
                createdAt: error ? error.createdAt : serverTimestamp()
            });
            onSave();
        } catch (err) {
            console.error("Error saving error record:", err);
            alert("Error al guardar");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (confirm("¿Estás seguro de eliminar este registro?")) {
            setLoading(true);
            try {
                await deleteDoc(doc(db, "acErrors", formData.id));
                onSave();
            } catch (err) {
                console.error("Error deleting record:", err);
            }
        }
    };

    const addTag = () => {
        if (newTag && !formData.tags?.includes(newTag)) {
            setFormData(prev => ({ ...prev, tags: [...(prev.tags || []), newTag] }));
            setNewTag("");
        }
    };

    const removeTag = (tagToRemove: string) => {
        setFormData(prev => ({ ...prev, tags: prev.tags?.filter(t => t !== tagToRemove) }));
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-20">
            <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={onBack} className="gap-2">
                    <ArrowLeft className="h-4 w-4" /> Volver
                </Button>
                <div className="flex gap-2">
                    {error && (
                        <Button variant="destructive" size="icon" onClick={handleDelete}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                    <Button onClick={handleSave} disabled={loading} className="gap-2 bg-orange-600 hover:bg-orange-700">
                        <Save className="h-4 w-4" /> Guardar
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Detalles de la Falla</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Marca</Label>
                                <Input
                                    value={formData.brand}
                                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                                    placeholder="Ej: Daikin"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Modelo (Opcional)</Label>
                                <Input
                                    value={formData.model || ''}
                                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                                    placeholder="Ej: RXN50"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Código de Error</Label>
                                <Input
                                    value={formData.errorCode || ''}
                                    onChange={(e) => setFormData({ ...formData, errorCode: e.target.value })}
                                    placeholder="Ej: E5"
                                    className="font-mono font-bold"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Criticidad</Label>
                                <Select
                                    value={formData.criticality}
                                    onValueChange={(val) => setFormData({ ...formData, criticality: val as ACErrorCriticality })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CRITICALITY_LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Síntoma (Lo que ve el cliente/técnico)</Label>
                            <Input
                                value={formData.symptom}
                                onChange={(e) => setFormData({ ...formData, symptom: e.target.value })}
                                placeholder="Ej: Unidad no enfría y parpadea luz verde"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Causa Probable</Label>
                            <Textarea
                                value={formData.cause || ''}
                                onChange={(e) => setFormData({ ...formData, cause: e.target.value })}
                                placeholder="Ej: Compresor sobrecalentado, falta de refrigerante..."
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-orange-700 font-bold">Posibles Soluciones</Label>
                            <Textarea
                                value={formData.solution || ''}
                                onChange={(e) => setFormData({ ...formData, solution: e.target.value })}
                                placeholder="1. Verificar presiones...&#10;2. Limpiar condensador..."
                                className="min-h-[150px] bg-orange-50 border-orange-200"
                            />
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Clasificación</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Tipo de Sistema</Label>
                                <Select
                                    value={formData.systemType || ''}
                                    onValueChange={(val) => setFormData({ ...formData, systemType: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {SYSTEM_TYPES.map(type => (
                                            <SelectItem key={type} value={type}>{type}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Tags / Etiquetas</Label>
                                <div className="flex gap-2">
                                    <Input
                                        value={newTag}
                                        onChange={(e) => setNewTag(e.target.value)}
                                        placeholder="Nueva etiqueta"
                                        onKeyDown={(e) => e.key === 'Enter' && addTag()}
                                    />
                                    <Button size="icon" variant="outline" onClick={addTag}>
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {formData.tags?.map(tag => (
                                        <span key={tag} className="flex items-center gap-1 text-xs bg-gray-100 px-2 py-1 rounded-full">
                                            {tag}
                                            <button onClick={() => removeTag(tag)} className="hover:text-red-500"><X className="h-3 w-3" /></button>
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Notas Adicionales</Label>
                                <Textarea
                                    value={formData.notes || ''}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    className="min-h-[100px]"
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
