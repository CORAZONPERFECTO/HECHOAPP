"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Camera, Trash2, Save } from "lucide-react";
import { InterventionType } from "@/types/hvac";
import { compressImage } from "@/lib/image-utils";
import { createIntervention, uploadInterventionPhoto } from "@/lib/hvac-service";

const interventionSchema = z.object({
    type: z.enum(['PREVENTIVE', 'CORRECTIVE', 'DIAGNOSIS', 'INSTALLATION', 'OTHER'] as const),
    summary: z.string().min(5, "El resumen es requerido"),
    technicalReport: z.string().min(10, "El reporte técnico es requerido (min 10 caracteres)"),
    recommendations: z.string().optional(),
});

interface InterventionFormProps {
    assetId: string;
    clientId: string;
    locationId: string;
    technicianId: string; // Passed from auth context
    technicianName: string;
    onSuccess: () => void;
    onCancel: () => void;
}

export function InterventionForm({ assetId, clientId, locationId, technicianId, technicianName, onSuccess, onCancel }: InterventionFormProps) {
    const [photos, setPhotos] = useState<{ file: Blob, preview: string, stage: 'BEFORE' | 'AFTER' }[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<z.infer<typeof interventionSchema>>({
        resolver: zodResolver(interventionSchema),
        defaultValues: {
            type: 'PREVENTIVE',
            summary: "",
            technicalReport: "",
            recommendations: "",
        },
    });

    const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>, stage: 'BEFORE' | 'AFTER') => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            try {
                const compressed = await compressImage(file);
                const preview = URL.createObjectURL(compressed);
                setPhotos(prev => [...prev, { file: compressed, preview, stage }]);
            } catch (err) {
                console.error("Error compressing image", err);
            }
        }
    };

    const removePhoto = (index: number) => {
        setPhotos(prev => prev.filter((_, i) => i !== index));
    };

    const onSubmit = async (data: z.infer<typeof interventionSchema>) => {
        setIsSubmitting(true);
        try {
            // 1. Create Intervention Document (Draft/Pending photos)
            // We generate a temporary ID or rely on Firestore to auto-gen ID. 
            // hvac-service createIntervention returns the ID.

            // Upload photos first? No, we need ID if we want to organize folders, 
            // but simplistic approach: upload then save. Or Save then update.
            // Better: Upload all, get URLs, then Save Intervention (atomic-ish).

            const uploadedPhotos = [];

            // Mocking an ID for filename prefix if needed, but the service handles it.
            // Actually, let's just use a random prefix for upload if we don't have ID yet.
            const tempId = crypto.randomUUID();

            for (const p of photos) {
                const url = await uploadInterventionPhoto(p.file, tempId);
                uploadedPhotos.push({
                    url,
                    caption: p.stage === 'BEFORE' ? "Evidencia Antes" : "Evidencia Después",
                    timestamp: new Date(), // This will be serialised or use Firestote Timestamp in backend
                    stage: p.stage
                });
            }

            await createIntervention({
                ...data,
                assetId,
                clientId,
                locationId,
                technicianId,
                technicianName,
                photos: uploadedPhotos as any, // Type cast for date/Timestamp compat
                status: 'COMPLETED', // Or PENDING_APPROVAL based on logic
                comments: []
            });

            onSuccess();
        } catch (error) {
            console.error("Error creating intervention", error);
            alert("Error al registrar intervención");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Tipo de Servicio</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccione tipo" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="PREVENTIVE">Mantenimiento Preventivo</SelectItem>
                                    <SelectItem value="CORRECTIVE">Correctivo</SelectItem>
                                    <SelectItem value="DIAGNOSIS">Diagnóstico</SelectItem>
                                    <SelectItem value="INSTALLATION">Instalación</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="summary"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Resumen (Título)</FormLabel>
                            <FormControl>
                                <Input placeholder="Ej. Cambio de Capacitor" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="technicalReport"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Reporte Técnico</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder="Detalles del trabajo realizado..."
                                    className="h-24"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Photo Upload Section */}
                <div className="space-y-2 border rounded-lg p-3 bg-slate-50">
                    <h4 className="text-sm font-medium">Evidencia Fotográfica</h4>
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-xs mb-1 text-gray-500">ANTES</label>
                            <Button type="button" variant="outline" size="sm" className="w-full relative overflow-hidden">
                                <Camera className="w-4 h-4 mr-2" />
                                Agregar
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={(e) => handlePhotoSelect(e, 'BEFORE')}
                                />
                            </Button>
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs mb-1 text-gray-500">DESPUÉS</label>
                            <Button type="button" variant="outline" size="sm" className="w-full relative overflow-hidden">
                                <Camera className="w-4 h-4 mr-2" />
                                Agregar
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={(e) => handlePhotoSelect(e, 'AFTER')}
                                />
                            </Button>
                        </div>
                    </div>

                    {/* Gallery */}
                    <div className="grid grid-cols-4 gap-2 mt-2">
                        {photos.map((p, index) => (
                            <div key={index} className="relative aspect-square rounded border bg-white overflow-hidden group">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={p.preview} alt="preview" className="w-full h-full object-cover" />
                                <div className="absolute bottom-0 w-full bg-black/50 text-[10px] text-white text-center py-0.5">
                                    {p.stage === 'BEFORE' ? 'ANTES' : 'DESPUÉS'}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removePhoto(index)}
                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex gap-2 pt-2">
                    <Button type="button" variant="ghost" className="flex-1" onClick={onCancel} disabled={isSubmitting}>
                        Cancelar
                    </Button>
                    <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Registrar Intervención
                    </Button>
                </div>
            </form>
        </Form>
    );
}
