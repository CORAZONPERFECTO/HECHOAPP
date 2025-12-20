"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Upload, X, Loader2, Camera, Image as ImageIcon } from "lucide-react";

import { SYSTEM_TYPES } from "./error-detail";

interface ErrorUploadFormProps {
    onCancel: () => void;
    onProcessingComplete: (results: any, brand: string, model: string, photos: File[], systemType: string) => void;
}

export function ErrorUploadForm({ onCancel, onProcessingComplete }: ErrorUploadFormProps) {
    const [loading, setLoading] = useState(false);
    const [brand, setBrand] = useState("");
    const [model, setModel] = useState("");
    const [systemType, setSystemType] = useState<string>("Split Muro");
    const [source, setSource] = useState("Manual");
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [notes, setNotes] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            // Limit to 10
            if (selectedFiles.length + newFiles.length > 10) {
                alert("Máximo 10 fotos permitidas");
                return;
            }
            setSelectedFiles(prev => [...prev, ...newFiles]);
        }
    };

    const removeFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!brand || selectedFiles.length === 0) {
            alert("Marca y al menos una foto son obligatorias");
            return;
        }

        setLoading(true);
        const formData = new FormData();
        formData.append("brand", brand);
        formData.append("model", model);
        formData.append("systemType", systemType);
        formData.append("source", source);
        formData.append("notes", notes);

        selectedFiles.forEach(file => {
            formData.append("photos", file);
        });

        try {
            const response = await fetch("/api/resources/process-error-photo", {
                method: "POST",
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Error processing photos");
            }

            onProcessingComplete(data.data, brand, model, selectedFiles, systemType);

        } catch (error: any) {
            console.error("Upload Error:", error);
            alert("Error al procesar: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="max-w-3xl mx-auto">
            <CardHeader>
                <CardTitle>Subir Evidencia de Errores</CardTitle>
                <CardDescription>
                    Sube fotos de tablas de errores, manuales o stickers para extraer la información automáticamente.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Fabricante / Marca <span className="text-red-500">*</span></Label>
                        <Input
                            value={brand}
                            onChange={(e) => setBrand(e.target.value)}
                            placeholder="Ej: Samsung, Carrier"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Modelo / Serie (Opcional)</Label>
                        <Input
                            value={model}
                            onChange={(e) => setModel(e.target.value)}
                            placeholder="Ej: VRF V5"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Tipo de Equipo</Label>
                        <Select value={systemType} onValueChange={setSystemType}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {SYSTEM_TYPES.map(type => (
                                    <SelectItem key={type} value={type}>{type}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Fuente</Label>
                        <Select value={source} onValueChange={setSource}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Manual">Manual de Servicio</SelectItem>
                                <SelectItem value="Sticker">Sticker en Equipo</SelectItem>
                                <SelectItem value="Tabla">Tabla Impresa</SelectItem>
                                <SelectItem value="Pantalla">Pantalla de Termostato</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>Fotos de Tabla de Errores (Máx 10) <span className="text-red-500">*</span></Label>
                    <div
                        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            multiple
                            accept="image/*"
                            onChange={handleFileSelect}
                        />
                        <div className="flex flex-col items-center gap-2 text-gray-500">
                            <Camera className="h-8 w-8" />
                            <p>Haz clic para seleccionar o tomar fotos</p>
                        </div>
                    </div>

                    {selectedFiles.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-4">
                            {selectedFiles.map((file, idx) => (
                                <div key={idx} className="relative group aspect-square bg-gray-100 rounded-lg overflow-hidden border">
                                    <img
                                        src={URL.createObjectURL(file)}
                                        alt={`Preview ${idx}`}
                                        className="w-full h-full object-cover"
                                    />
                                    <button
                                        onClick={() => removeFile(idx)}
                                        className="absolute top-1 right-1 bg-black/50 hover:bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="space-y-2">
                    <Label>Notas Adicionales</Label>
                    <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Contexto adicional sobre las fotos..."
                    />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button variant="outline" onClick={onCancel} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={loading || selectedFiles.length === 0 || !brand}
                        className="bg-orange-600 hover:bg-orange-700 gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" /> Procesando con IA...
                            </>
                        ) : (
                            <>
                                <Upload className="h-4 w-4" /> Procesar Fotos
                            </>
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
