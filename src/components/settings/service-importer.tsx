"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { collection, getDocs, query, where, addDoc, updateDoc, doc, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { TicketType, ChecklistItem } from "@/types/schema";

interface ServiceImportRow {
    servicio: string;
    descripcion_tecnica: string;
    checklist: string;
}

export function ServiceImporter() {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [summary, setSummary] = useState<{ created: number; updated: number; errors: string[] } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setError(null);
            setSummary(null);
            setProgress(0);
        }
    };

    const processFile = async () => {
        if (!file) return;

        setLoading(true);
        setError(null);
        setSummary({ created: 0, updated: 0, errors: [] });
        setProgress(0);

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { type: "array" });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);

            if (jsonData.length === 0) {
                throw new Error("El archivo está vacío.");
            }

            // Validate columns
            const firstRow = jsonData[0];
            if (!("servicio" in firstRow) || !("descripcion_tecnica" in firstRow) || !("checklist" in firstRow)) {
                throw new Error("El archivo no tiene el formato correcto. Columnas requeridas: servicio, descripcion_tecnica, checklist");
            }

            let createdCount = 0;
            let updatedCount = 0;
            const errors: string[] = [];
            const total = jsonData.length;

            // Fetch all existing ticket types once to minimize reads
            const existingTypesSnapshot = await getDocs(collection(db, "ticketTypes"));
            const existingTypesMap = new Map();
            existingTypesSnapshot.docs.forEach(doc => {
                const data = doc.data();
                // Map by name (lowercase for case-insensitive check if needed, or exact)
                // Using exact name as per requirement
                existingTypesMap.set(data.name, doc.id);
            });

            for (let i = 0; i < total; i++) {
                const row = jsonData[i];
                const serviceName = row.servicio?.toString().trim();
                const description = row.descripcion_tecnica?.toString().trim() || "";
                const checklistRaw = row.checklist?.toString().trim() || "";

                if (!serviceName) {
                    errors.push(`Fila ${i + 2}: Nombre de servicio vacío.`);
                    continue;
                }

                try {
                    // Parse checklist
                    const checklistItems: ChecklistItem[] = checklistRaw
                        .split(/[\n,]+/) // Split by newline or comma
                        .map((item: string) => item.trim())
                        .filter((item: string) => item.length > 0)
                        .map((text: string) => ({
                            id: crypto.randomUUID(),
                            text: text,
                            checked: false
                        }));

                    const serviceData = {
                        name: serviceName,
                        key: serviceName.toUpperCase().replace(/\s+/g, "_"),
                        description: description,
                        defaultChecklist: checklistItems,
                        updatedAt: serverTimestamp(),
                        // Defaults for new items
                        active: true,
                        color: "bg-blue-500",
                        requiresPhotos: true,
                        requiresSignature: true,
                        requiresMaterials: false,
                    };

                    if (existingTypesMap.has(serviceName)) {
                        // Update
                        const docId = existingTypesMap.get(serviceName);
                        await updateDoc(doc(db, "ticketTypes", docId), {
                            description: description,
                            defaultChecklist: checklistItems,
                            updatedAt: serverTimestamp()
                        });
                        updatedCount++;
                    } else {
                        // Create
                        const newDocRef = await addDoc(collection(db, "ticketTypes"), {
                            ...serviceData,
                            createdAt: serverTimestamp(),
                        });
                        // Add to map so subsequent rows with same name (if any) update this one
                        existingTypesMap.set(serviceName, newDocRef.id);
                        createdCount++;
                    }

                } catch (err: any) {
                    console.error(err);
                    errors.push(`Fila ${i + 2}: ${err.message}`);
                }

                setProgress(Math.round(((i + 1) / total) * 100));
            }

            setSummary({ created: createdCount, updated: updatedCount, errors });

        } catch (err: any) {
            setError(err.message || "Error al procesar el archivo.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="h-6 w-6 text-green-600" />
                    Importar Servicios desde Excel
                </CardTitle>
                <CardDescription>
                    Sube un archivo .xlsx con las columnas: <strong>servicio</strong>, <strong>descripcion_tecnica</strong>, <strong>checklist</strong>.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid w-full max-w-sm items-center gap-1.5">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="outline"
                            className="w-full relative"
                            disabled={loading}
                        >
                            <input
                                type="file"
                                accept=".xlsx"
                                onChange={handleFileChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <Upload className="mr-2 h-4 w-4" />
                            {file ? file.name : "Seleccionar archivo .xlsx"}
                        </Button>
                        {file && (
                            <Button onClick={processFile} disabled={loading}>
                                {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : "Procesar"}
                            </Button>
                        )}
                    </div>
                </div>

                {loading && (
                    <div className="space-y-2">
                        <Progress value={progress} />
                        <p className="text-sm text-center text-gray-500">Procesando... {progress}%</p>
                    </div>
                )}

                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {summary && (
                    <div className="bg-slate-50 p-4 rounded-lg space-y-3 border">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            Resumen de Importación
                        </h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="bg-green-100 p-3 rounded text-green-800">
                                <span className="block font-bold text-lg">{summary.created}</span>
                                Creados
                            </div>
                            <div className="bg-blue-100 p-3 rounded text-blue-800">
                                <span className="block font-bold text-lg">{summary.updated}</span>
                                Actualizados
                            </div>
                        </div>
                        {summary.errors.length > 0 && (
                            <div className="mt-4">
                                <p className="font-semibold text-red-600 mb-2">Errores ({summary.errors.length})</p>
                                <ul className="text-xs text-red-600 space-y-1 max-h-32 overflow-y-auto">
                                    {summary.errors.map((err, i) => (
                                        <li key={i}>{err}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
