"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Copy, Check } from "lucide-react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ACError } from "@/types/schema";

interface ErrorSearchModalProps {
    brand?: string;
    onSelectSolution?: (solution: string) => void;
    trigger?: React.ReactNode;
}

export function ErrorSearchModal({ brand, onSelectSolution, trigger }: ErrorSearchModalProps) {
    const [open, setOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [results, setResults] = useState<ACError[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open && brand) {
            searchErrors(brand);
        } else if (open) {
            searchErrors("");
        }
    }, [open, brand]);

    const searchErrors = async (term: string) => {
        setLoading(true);
        try {
            // Simple client-side filtering for now as Firestore text search is limited
            // In production, use Algolia or similar for advanced search
            const q = query(collection(db, "acErrors"), orderBy("brand"));
            const snapshot = await getDocs(q);
            const allErrors = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ACError));

            const filtered = allErrors.filter(e => {
                const searchLower = term.toLowerCase();
                const matchesBrand = brand ? e.brand.toLowerCase().includes(brand.toLowerCase()) : true;
                const matchesTerm =
                    e.errorCode?.toLowerCase().includes(searchLower) ||
                    e.symptom.toLowerCase().includes(searchLower) ||
                    e.brand.toLowerCase().includes(searchLower) ||
                    e.tags?.some(t => t.toLowerCase().includes(searchLower));

                return (brand ? matchesBrand : true) && (term ? matchesTerm : true);
            });

            setResults(filtered);
        } catch (error) {
            console.error("Error searching errors:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        searchErrors(searchTerm);
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
                            placeholder="Buscar por código, síntoma, marca..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        />
                        <Button onClick={handleSearch} disabled={loading}>
                            <Search className="h-4 w-4" />
                        </Button>
                    </div>

                    <div className="space-y-3">
                        {loading && <p className="text-center text-gray-500">Buscando...</p>}
                        {!loading && results.length === 0 && <p className="text-center text-gray-500">No se encontraron resultados.</p>}

                        {results.map(error => (
                            <div key={error.id} className="border rounded-lg p-4 hover:bg-slate-50 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-lg">{error.errorCode || "Sin Código"}</span>
                                        <span className="text-xs bg-gray-200 px-2 py-1 rounded">{error.brand}</span>
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
