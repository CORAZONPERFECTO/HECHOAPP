"use client";

import { useState } from "react";
import { PersonnelResource, PersonnelType } from "@/types/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, Share2, Trash2, Upload, FileText, Phone, Mail } from "lucide-react";
import { doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Image from "next/image";

interface PersonnelDetailProps {
    person: PersonnelResource | null;
    onBack: () => void;
    onSave: () => void;
}

const PERSONNEL_TYPES: PersonnelType[] = ['EMPLEADO', 'CONTRATISTA', 'TECNICO', 'AYUDANTE', 'GERENTE', 'ADMINISTRATIVO'];

export function PersonnelDetail({ person, onBack, onSave }: PersonnelDetailProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<PersonnelResource>(person || {
        id: crypto.randomUUID(),
        type: 'EMPLEADO',
        fullName: '',
        cedula: '',
        cedulaText: '',
        licenseNumber: '',
        licenseExpiry: '',
        phone: '',
        secondaryPhone: '',
        email: '',
        notes: '',
        documents: [],
        active: true
    });

    const handleSave = async () => {
        if (!formData.fullName || !formData.cedula) {
            alert("Nombre y Cédula son obligatorios");
            return;
        }
        setLoading(true);
        try {
            await setDoc(doc(db, "personnel", formData.id), {
                ...formData,
                updatedAt: serverTimestamp(),
                createdAt: person ? person.createdAt : serverTimestamp()
            });
            onSave();
        } catch (error) {
            console.error("Error saving personnel:", error);
            alert("Error al guardar");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (confirm("¿Estás seguro de eliminar este registro?")) {
            setLoading(true);
            try {
                await deleteDoc(doc(db, "personnel", formData.id));
                onSave();
            } catch (error) {
                console.error("Error deleting personnel:", error);
            }
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({
                    ...prev,
                    documents: [...prev.documents, reader.result as string]
                }));
            };
            reader.readAsDataURL(file);
        }
    };

    const removeDocument = (index: number) => {
        setFormData(prev => ({
            ...prev,
            documents: prev.documents.filter((_, i) => i !== index)
        }));
    };

    const handleShare = (method: 'whatsapp' | 'email') => {
        const text = `*Datos de Personal - HECHO SRL*\n\n` +
            `*Nombre:* ${formData.fullName}\n` +
            `*Cédula:* ${formData.cedula}\n` +
            (formData.cedulaText ? `*Cédula (Texto):* ${formData.cedulaText}\n` : '') +
            (formData.licenseNumber ? `*Licencia:* ${formData.licenseNumber} (Vence: ${formData.licenseExpiry})\n` : '') +
            `*Teléfono:* ${formData.phone}\n` +
            (formData.email ? `*Email:* ${formData.email}\n` : '');

        if (method === 'whatsapp') {
            const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
            window.open(url, '_blank');
        } else {
            const subject = `Datos de Personal: ${formData.fullName}`;
            const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
            window.location.href = mailto;
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-20">
            <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={onBack} className="gap-2">
                    <ArrowLeft className="h-4 w-4" /> Volver
                </Button>
                <div className="flex gap-2">
                    {person && (
                        <>
                            <Button variant="outline" onClick={() => handleShare('email')} title="Enviar por Correo">
                                <Mail className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" onClick={() => handleShare('whatsapp')} title="Enviar por WhatsApp" className="text-green-600 border-green-200 hover:bg-green-50">
                                <Share2 className="h-4 w-4" />
                            </Button>
                            <Button variant="destructive" size="icon" onClick={handleDelete}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </>
                    )}
                    <Button onClick={handleSave} disabled={loading} className="gap-2 bg-blue-600 hover:bg-blue-700">
                        <Save className="h-4 w-4" /> Guardar
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Main Info */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Información Personal</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Tipo</Label>
                                <Select
                                    value={formData.type}
                                    onValueChange={(val) => setFormData({ ...formData, type: val as PersonnelType })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PERSONNEL_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Estado</Label>
                                <Select
                                    value={formData.active ? "active" : "inactive"}
                                    onValueChange={(val) => setFormData({ ...formData, active: val === "active" })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Activo</SelectItem>
                                        <SelectItem value="inactive">Inactivo</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Nombre Completo</Label>
                            <Input
                                value={formData.fullName}
                                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                placeholder="Ej: Juan Pérez"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Cédula (Numérica)</Label>
                                <Input
                                    value={formData.cedula}
                                    onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
                                    placeholder="001-0000000-0"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Cédula (Texto)</Label>
                                <Input
                                    value={formData.cedulaText || ''}
                                    onChange={(e) => setFormData({ ...formData, cedulaText: e.target.value })}
                                    placeholder="Cero Cero Uno..."
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Teléfono Principal</Label>
                                <div className="relative">
                                    <Phone className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                                    <Input
                                        className="pl-8"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Email (Opcional)</Label>
                                <div className="relative">
                                    <Mail className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                                    <Input
                                        className="pl-8"
                                        value={formData.email || ''}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Notas Internas</Label>
                            <Textarea
                                value={formData.notes || ''}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                className="min-h-[100px]"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Side Info: License & Docs */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Licencia de Conducir</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Número</Label>
                                <Input
                                    value={formData.licenseNumber || ''}
                                    onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Vencimiento</Label>
                                <Input
                                    type="date"
                                    value={formData.licenseExpiry || ''}
                                    onChange={(e) => setFormData({ ...formData, licenseExpiry: e.target.value })}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex justify-between items-center">
                                Documentos
                                <div className="relative">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        onChange={handleFileUpload}
                                    />
                                    <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                                        <Upload className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {formData.documents.length === 0 && (
                                <p className="text-sm text-gray-400 text-center py-4">Sin documentos</p>
                            )}
                            {formData.documents.map((docUrl, idx) => (
                                <div key={idx} className="relative group border rounded-lg overflow-hidden aspect-video bg-gray-100">
                                    <Image src={docUrl} alt="Documento" fill className="object-cover" />
                                    <button
                                        onClick={() => removeDocument(idx)}
                                        className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <XIcon className="h-3 w-3" />
                                    </button>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function XIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M18 6 6 18" />
            <path d="m6 6 18 18" />
        </svg>
    );
}
