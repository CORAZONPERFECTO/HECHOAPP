"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { CompanySettings } from "@/types/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Save, Upload, Building2 } from "lucide-react";
import Image from "next/image";

import { compressImage } from "@/lib/image-utils";

export function CompanyProfile() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [settings, setSettings] = useState<CompanySettings>({
        name: "HECHO SRL",
        rnc: "",
        address: "",
        phone: "",
        email: "",
        website: "",
        logoUrl: ""
    });

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const docRef = doc(db, "settings", "company");
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setSettings(docSnap.data() as CompanySettings);
                }
            } catch (error) {
                console.error("Error loading company settings:", error);
            } finally {
                setLoading(false);
            }
        };

        loadSettings();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await setDoc(doc(db, "settings", "company"), settings);
            alert("Configuración guardada correctamente.");
        } catch (error) {
            console.error("Error saving settings:", error);
            alert("Error al guardar la configuración.");
        } finally {
            setSaving(false);
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setUploading(true);

            // Compress image before upload (max 800px width, 0.8 quality)
            const compressedBlob = await compressImage(file, 800, 0.8);

            const storageRef = ref(storage, `company/logo_${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, compressedBlob);
            const url = await getDownloadURL(storageRef);

            setSettings(prev => ({ ...prev, logoUrl: url }));
        } catch (error) {
            console.error("Error uploading logo:", error);
            alert("Error al subir el logo. Intenta con una imagen más pequeña.");
        } finally {
            setUploading(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-6 w-6 text-blue-600" />
                        Perfil de la Empresa
                    </CardTitle>
                    <CardDescription>
                        Estos datos aparecerán automáticamente en los encabezados y pies de página de los reportes.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Logo Section */}
                    <div className="flex flex-col items-center space-y-4 p-6 border-2 border-dashed rounded-lg bg-gray-50">
                        <div className="relative w-48 h-24 bg-white rounded shadow-sm flex items-center justify-center overflow-hidden">
                            {settings.logoUrl ? (
                                <Image src={settings.logoUrl} alt="Logo Empresa" fill className="object-contain p-2" />
                            ) : (
                                <span className="text-gray-400 text-sm">Sin Logo</span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <Input
                                id="logo-upload"
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleLogoUpload}
                                disabled={uploading || saving}
                            />
                            <Button variant="outline" onClick={() => document.getElementById('logo-upload')?.click()} disabled={uploading || saving}>
                                {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                                {uploading ? "Subiendo..." : settings.logoUrl ? "Cambiar Logo" : "Subir Logo"}
                            </Button>
                        </div>
                        <p className="text-xs text-gray-500">Recomendado: PNG transparente. Se optimizará automáticamente.</p>
                    </div>

                    {/* Form Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Nombre de la Empresa</Label>
                            <Input
                                value={settings.name}
                                onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                                placeholder="Ej: HECHO SRL"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>RNC / Identificación Fiscal</Label>
                            <Input
                                value={settings.rnc}
                                onChange={(e) => setSettings({ ...settings, rnc: e.target.value })}
                                placeholder="Ej: 1-31-xxxxx-x"
                            />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label>Dirección</Label>
                            <Input
                                value={settings.address}
                                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                                placeholder="Dirección completa"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Teléfono</Label>
                            <Input
                                value={settings.phone}
                                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                                placeholder="Ej: 809-555-5555"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input
                                value={settings.email}
                                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                                placeholder="info@empresa.com"
                            />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label>Sitio Web</Label>
                            <Input
                                value={settings.website}
                                onChange={(e) => setSettings({ ...settings, website: e.target.value })}
                                placeholder="www.empresa.com"
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                        <Button onClick={handleSave} disabled={saving} className="bg-green-600 hover:bg-green-700">
                            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                            Guardar Cambios
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
