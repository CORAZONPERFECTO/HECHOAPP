"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle2, XCircle, AlertCircle, Save, ArrowLeft } from "lucide-react";
import { ACError, ACErrorCriticality } from "@/types/schema";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db, storage } from "@/lib/firebase"; // Assumes storage is exported
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

interface ExtractedError {
    codigo: string;
    nombre_error?: string;
    descripcion?: string;
    causa?: string;
    solucion?: string;
}

interface ErrorValidationPanelProps {
    data: ExtractedError[];
    brand: string;
    model: string;
    photos: File[]; // For uploading to storage
    onComplete: () => void;
    onCancel: () => void;
}

type RowStatus = 'PENDING' | 'APPROVED' | 'IGNORED' | 'ERROR';

interface ValidationRow extends ExtractedError {
    status: RowStatus;
    id: string; // temp id for list
}

export function ErrorValidationPanel({ data, brand, model, photos, onComplete, onCancel }: ErrorValidationPanelProps) {
    const [rows, setRows] = useState<ValidationRow[]>(
        data.map((item, idx) => ({ ...item, status: 'PENDING', id: `tmp-${idx}` }))
    );
    const [saving, setSaving] = useState(false);

    const handleRowChange = (id: string, field: keyof ExtractedError, value: string) => {
        setRows(prev => prev.map(row =>
            row.id === id ? { ...row, [field]: value } : row
        ));
    };

    const toggleStatus = (id: string, newStatus: RowStatus) => {
        setRows(prev => prev.map(row =>
            row.id === id ? { ...row, status: newStatus } : row
        ));
    };

    const handleApproveAll = () => {
        setRows(prev => prev.map(row =>
            row.status === 'PENDING' ? { ...row, status: 'APPROVED' } : row
        ));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // 1. Upload photos first to get a URL (Source of Truth)
            // Just upload the first one for reference in the error record, or creating a source record?
            // User requested: "Guardar foto(s) en Storage y referencia en DB, guardar también texto extraído."

            // Let's create an 'ErrorSource' record first.
            const photoUrls: string[] = [];
            for (const photo of photos) {
                const storageRef = ref(storage, `error_sources/${brand}/${Date.now()}_${photo.name}`);
                const snapshot = await uploadBytes(storageRef, photo);
                const url = await getDownloadURL(snapshot.ref);
                photoUrls.push(url);
            }

            const sourceRef = await addDoc(collection(db, "error_sources"), {
                brand,
                model,
                photoUrls,
                extractedData: data,
                processedAt: serverTimestamp(),
                status: 'PROCESSED'
            });

            // 2. Save Approved Errors
            const approvedRows = rows.filter(r => r.status === 'APPROVED');
            let savedCount = 0;

            for (const row of approvedRows) {
                const newError: Partial<ACError> = {
                    brand: brand,
                    model: model,
                    errorCode: row.codigo,
                    symptom: row.descripcion || row.nombre_error || "Sin descripción",
                    cause: row.causa,
                    solution: row.solucion,
                    criticality: 'MEDIA',
                    tags: ['IMPORTADO_IA'],
                    validationStatus: 'VALIDADO',
                    sourcePhotoUrl: photoUrls[0], // Link to first photo as ref
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                };

                await addDoc(collection(db, "acErrors"), newError);
                savedCount++;
            }

            alert(`Proceso completado. Se guardaron ${savedCount} errores.`);
            onComplete();

        } catch (error) {
            console.error("Save Error:", error);
            alert("Error al guardar: " + error);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Validación de Resultados</h2>
                    <p className="text-gray-500">Revisa los datos extraídos para {brand} {model}</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={onCancel} disabled={saving}>
                        Cancelar
                    </Button>
                    <Button onClick={handleApproveAll} variant="secondary" disabled={saving}>
                        Aprobar Pendientes
                    </Button>
                    <Button onClick={handleSave} disabled={saving} className="bg-green-600 hover:bg-green-700 gap-2">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Finalizar y Guardar
                    </Button>
                </div>
            </div>

            <Card>
                <CardContent className="p-0 overflow-auto max-h-[70vh]">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[100px]">Estado</TableHead>
                                <TableHead className="w-[120px]">Código</TableHead>
                                <TableHead className="min-w-[200px]">Descripción / Síntoma</TableHead>
                                <TableHead className="min-w-[200px]">Causa Probable</TableHead>
                                <TableHead className="min-w-[200px]">Solución</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.map((row) => (
                                <TableRow key={row.id} className={row.status === 'IGNORED' ? 'opacity-50 bg-gray-50' : ''}>
                                    <TableCell>
                                        <div className="flex gap-1">
                                            <Button
                                                size="icon"
                                                variant={row.status === 'APPROVED' ? 'default' : 'outline'}
                                                className={row.status === 'APPROVED' ? 'bg-green-600 hover:bg-green-700' : ''}
                                                onClick={() => toggleStatus(row.id, 'APPROVED')}
                                                title="Aprobar"
                                            >
                                                <CheckCircle2 className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant={row.status === 'IGNORED' ? 'destructive' : 'outline'}
                                                onClick={() => toggleStatus(row.id, 'IGNORED')}
                                                title="Ignorar"
                                            >
                                                <XCircle className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            value={row.codigo}
                                            onChange={(e) => handleRowChange(row.id, 'codigo', e.target.value)}
                                            className="font-bold font-mono"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            value={row.descripcion || row.nombre_error || ''}
                                            onChange={(e) => handleRowChange(row.id, 'descripcion', e.target.value)}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            value={row.causa || ''}
                                            onChange={(e) => handleRowChange(row.id, 'causa', e.target.value)}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            value={row.solucion || ''}
                                            onChange={(e) => handleRowChange(row.id, 'solucion', e.target.value)}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
