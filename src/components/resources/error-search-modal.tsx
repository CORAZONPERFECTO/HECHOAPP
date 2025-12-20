"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Copy } from "lucide-react";
import { collection, query, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ACError } from "@/types/schema";
import { SYSTEM_TYPES } from "./error-detail";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ErrorSearchModalProps {
    brand?: string;
    onSelectSolution?: (solution: string) => void;
    trigger?: React.ReactNode;
}

export function ErrorSearchModal({ brand, onSelectSolution, trigger }: ErrorSearchModalProps) {
    const [open, setOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [systemTypeFilter, setSystemTypeFilter] = useState<string>("ALL");
    const [allData, setAllData] = useState<ACError[]>([]); // Store all loaded data
    const [results, setResults] = useState<ACError[]>([]);
    const [loading, setLoading] = useState(false);

    // Initial load when modal opens
    useEffect(() => {
        if (open) {
            loadAllErrors();
        }
    }, [open]);

    // Live filtering when search term, type filter, or data changes
    useEffect(() => {
        filterResults(searchTerm, systemTypeFilter);
    }, [searchTerm, systemTypeFilter, allData, brand]);

    const loadAllErrors = async () => {
        setLoading(true);
        try {
            // Load all errors without ordering to ensure we get everything (client sort is fast enough)
            const q = query(collection(db, "acErrors"));
            const snapshot = await getDocs(q);
            const loadedErrors = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ACError));
            setAllData(loadedErrors);
        } catch (error) {
            console.error("Error loading errors:", error);
        } finally {
            setLoading(false);
        }
    };

    const filterResults = (term: string, typeFilter: string) => {
        if (!allData.length) return;

        // Helper to normalize text (remove accents, lowercase)
        const normalizeText = (text: string | null | undefined) => {
            if (!text) return "";
            return text.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        };

        const searchNorm = normalizeText(term);

        const filtered = allData.filter(e => {
            // Safety checks for missing fields
            const eBrand = e.brand || "";
            const eCode = e.errorCode || "";
            const eSymptom = e.symptom || "";
            const eSystemType = e.systemType || "";
            const eTags = e.tags || [];

            // 1. Matches pre-filter (Brand prop)
            const matchesBrandProp = brand ? normalizeText(eBrand).includes(normalizeText(brand)) : true;

            // 2. Matches System Type Filter
            const matchesTypeFilter = typeFilter === "ALL" || eSystemType === typeFilter;

            // 3. Matches Search Term
            const matchesTerm =
                normalizeText(eCode).includes(searchNorm) ||
                normalizeText(eSymptom).includes(searchNorm) ||
                normalizeText(eBrand).includes(searchNorm) ||
                normalizeText(eSystemType).includes(searchNorm) ||
                eTags.some(t => normalizeText(t).includes(searchNorm));

            // 4. Status Check
            const matchesStatus = e.validationStatus !== 'PENDIENTE';

            return matchesBrandProp && matchesTypeFilter && matchesTerm && matchesStatus;
        });

        // Sort by Brand then Code
        filtered.sort((a, b) => {
            if (a.brand !== b.brand) return a.brand.localeCompare(b.brand);
            return (a.errorCode || "").localeCompare(b.errorCode || "");
        });

        setResults(filtered);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || <Button variant="outline" size="sm">Buscar Solución</Button>}
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Base de Conocimiento de Errores</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="flex gap-2">
                        <Input
                            className="flex-1"
                            placeholder="Buscar por código, síntoma, marca..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            // No need for onKeyDown, it's live
                            autoFocus
                        />
                        <Select value={systemTypeFilter} onValueChange={setSystemTypeFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Tipo de Equipo" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Todos</SelectItem>
                                {SYSTEM_TYPES.map(type => (
                                    <SelectItem key={type} value={type}>{type}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {/* Visual indicator only now */}
                        <Button disabled size="icon" variant="ghost">
                            <Search className="h-4 w-4" />
                        </Button>
                    </div>

                    <div className="space-y-3">
                        {loading && <p className="text-center text-gray-500">Cargando base de datos...</p>}

                        {!loading && results.length === 0 && (
                            <div className="text-center py-8">
                                <p className="text-gray-500">No se encontraron resultados.</p>
                                {allData.length === 0 && <p className="text-xs text-red-400 mt-2">La base de datos parece estar vacía.</p>}
                            </div>
                        )}

                        {results.map(error => (
                            <div key={error.id} className="border rounded-lg p-4 hover:bg-slate-50 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-lg">{error.errorCode || "Sin Código"}</span>
                                        <span className="text-xs bg-gray-200 px-2 py-1 rounded">{error.brand}</span>
                                        {error.systemType && (
                                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">{error.systemType}</span>
                                        )}
                                        <span className={`text-xs px-2 py-1 rounded font-bold ${error.criticality === 'ALTA' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                                            }`}>{error.criticality}</span>
                                    </div>
                                    {onSelectSolution && (
                                        <Button size="sm" variant="ghost" onClick={() => {
                                            onSelectSolution(error.solution || "");
                                            setOpen(false);
                                        }}>
                                            <Copy className="h-4 w-4 mr-2" /> Usar Solución
                                        </Button>
                                    )}
                                </div>
                                <p className="font-medium text-gray-800 mb-1">{error.symptom}</p>
                                <div className="text-sm text-gray-600 bg-orange-50 p-2 rounded border border-orange-100">
                                    <strong>Solución:</strong> {error.solution}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
