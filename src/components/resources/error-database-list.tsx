"use client";

import { useState, useEffect, useRef } from "react";
import { ACError, ACErrorCriticality, UserRole } from "@/types/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, AlertTriangle, Tag, Download, Upload, FileSpreadsheet, Loader2 } from "lucide-react";
import { collection, query, onSnapshot, orderBy, addDoc, serverTimestamp, doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import * as XLSX from 'xlsx';

interface ErrorDatabaseListProps {
    onSelect: (error: ACError) => void;
    onNew: () => void;
    currentUserRole?: UserRole;
}

export function ErrorDatabaseList({ onSelect, onNew, currentUserRole }: ErrorDatabaseListProps) {
    const [errors, setErrors] = useState<ACError[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [brandFilter, setBrandFilter] = useState("ALL");
    const [importing, setImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const q = query(collection(db, "acErrors"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ACError));
            // Client-side sort
            data.sort((a, b) => a.brand.localeCompare(b.brand));
            setErrors(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const brands = Array.from(new Set(errors.map(e => e.brand))).sort();

    // Helper to normalize text (remove accents, lowercase)
    const normalizeText = (text: string | null | undefined) => {
        if (!text) return "";
        return text.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    };

    const filteredErrors = errors.filter(e => {
        const matchesBrand = brandFilter === "ALL" || e.brand === brandFilter;
        const searchNorm = normalizeText(searchTerm);

        const matchesSearch =
            normalizeText(e.errorCode).includes(searchNorm) ||
            normalizeText(e.symptom).includes(searchNorm) ||
            normalizeText(e.model).includes(searchNorm) ||
            e.tags?.some(t => normalizeText(t).includes(searchNorm));

        return matchesBrand && matchesSearch;
    });

    const handleExport = () => {
        const dataToExport = errors.map(e => ({
            Marca: e.brand,
            Modelo: e.model || "",
            Codigo: e.errorCode || "",
            Sintoma: e.symptom,
            Causa: e.cause || "",
            Solucion: e.solution || "",
            Criticidad: e.criticality,
            Tags: e.tags?.join(", ") || ""
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Errores");
        XLSX.writeFile(wb, "base_errores_aire.xlsx");
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0]) return;

        const file = e.target.files[0];
        setImporting(true);

        try {
            let jsonData: any[] = [];

            if (file.name.endsWith('.json')) {
                const text = await file.text();
                jsonData = JSON.parse(text);
            } else {
                const data = await file.arrayBuffer();
                const workbook = XLSX.read(data);
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];
            }

            let count = 0;
            let skipped = 0;

            for (const row of jsonData) {
                // Normalize keys from JSON or Excel - Expanded mapping
                const brand = row.Marca || row.marca || row.Brand || row.brand;
                const symptom = row.Sintoma || row.sintoma || row.descripcion_es || row.Description || row.description || row.Symptom;
                const code = row.Codigo || row.codigo || row.Error_Code || row.error_code || row.code;
                const cause = row.Causa || row.causa || row.causa_probable || row.Probable_Cause;
                const solution = row.Solucion || row.solucion || row.solucion_recomendada || row.Recommended_Solution;
                const model = row.Modelo || row.modelo || row.Model || row.model;

                if (!brand || !symptom) {
                    skipped++;
                    continue;
                }

                const newError: Partial<ACError> = {
                    brand: brand.toString().trim().toUpperCase(), // Standardize brand
                    model: model ? model.toString() : "",
                    errorCode: code ? code.toString().trim() : "",
                    symptom: symptom.toString().trim(),
                    cause: cause ? cause.toString().trim() : "",
                    solution: solution ? solution.toString().trim() : "",
                    criticality: (['BAJA', 'MEDIA', 'ALTA'].includes(row.Criticidad || row.criticality) ? (row.Criticidad || row.criticality) : 'MEDIA') as ACErrorCriticality,
                    tags: row.Tags ? row.Tags.split(",").map((t: string) => t.trim()) : [],
                    validationStatus: 'VALIDADO',
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                };

                // Use custom ID to prevent duplicates: Brand_Code
                // Normalize ID: remove spaces, special chars
                const cleanBrand = newError.brand?.replace(/[^a-zA-Z0-9]/g, '') || 'UNKNOWN';
                const cleanCode = newError.errorCode?.replace(/[^a-zA-Z0-9]/g, '') || `NOCODE_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

                const customId = `${cleanBrand}_${cleanCode}`;

                await setDoc(doc(db, "acErrors", customId), newError, { merge: true });
                count++;
            }

            alert(`Importación completada: \n- ${count} errores guardados/actualizados.\n- ${skipped} registros omitidos (sin Marca o Síntoma).`);
            if (fileInputRef.current) fileInputRef.current.value = "";
        } catch (error) {
            console.error("Error importing file:", error);
            alert("Error crítico al importar el archivo. Revisa la consola para más detalles.");
        } finally {
            setImporting(false);
        }
    };

    const isAdmin = currentUserRole === 'ADMIN' || currentUserRole === 'SUPERVISOR';

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row gap-2 justify-between items-center">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Buscar por código, síntoma..."
                            className="pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto flex-wrap justify-end">
                        <Select value={brandFilter} onValueChange={setBrandFilter}>
                            <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Marca" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Todas</SelectItem>
                                {brands.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                            </SelectContent>
                        </Select>

                        {isAdmin && (
                            <>
                                <Button variant="outline" onClick={handleExport} title="Descargar Excel">
                                    <Download className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" onClick={handleImportClick} disabled={importing} title="Importar JSON/Excel">
                                    {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                                </Button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    accept=".xlsx, .xls, .json"
                                    className="hidden"
                                />
                            </>
                        )}

                        <Button onClick={onNew} className="gap-2 bg-orange-600 hover:bg-orange-700">
                            <Plus className="h-4 w-4" /> Nuevo
                        </Button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
                {filteredErrors.map((error) => (
                    <Card key={error.id} className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-orange-500" onClick={() => onSelect(error)}>
                        <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-bold text-lg text-gray-900">{error.errorCode || "Sin Código"}</span>
                                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded font-medium">{error.brand}</span>
                                        {error.model && <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">{error.model}</span>}
                                    </div>
                                    <p className="text-gray-700 font-medium">{error.symptom}</p>
                                    {error.tags && error.tags.length > 0 && (
                                        <div className="flex gap-2 mt-2">
                                            {error.tags.map(tag => (
                                                <span key={tag} className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                                    <Tag className="h-3 w-3" /> {tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className={`px-2 py-1 rounded text-xs font-bold ${error.criticality === 'ALTA' ? 'bg-red-100 text-red-700' :
                                    error.criticality === 'MEDIA' ? 'bg-yellow-100 text-yellow-700' :
                                        'bg-green-100 text-green-700'
                                    }`}>
                                    {error.criticality}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {filteredErrors.length === 0 && !loading && (
                    <div className="text-center py-12 text-gray-500">
                        No se encontraron errores registrados.
                    </div>
                )}
            </div>
        </div>
    );
}
