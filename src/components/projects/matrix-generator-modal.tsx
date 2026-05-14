import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Grid3X3, Loader2 } from "lucide-react";

interface MatrixGeneratorModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    baseAreas: { id: string; name: string }[];
    onGenerate: (newZones: { id: string; name: string; areas: { id: string; name: string }[] }[]) => void;
}

export function MatrixGeneratorModal({ open, onOpenChange, baseAreas, onGenerate }: MatrixGeneratorModalProps) {
    const [prefix, setPrefix] = useState("A");
    const [startLevel, setStartLevel] = useState(1);
    const [numLevels, setNumLevels] = useState(4);
    const [unitsPerLevel, setUnitsPerLevel] = useState(2);
    const [zeroPad, setZeroPad] = useState(true);

    const handleGenerate = () => {
        const generatedZones: { id: string; name: string; areas: { id: string; name: string }[] }[] = [];

        for (let level = startLevel; level < startLevel + numLevels; level++) {
            for (let unit = 1; unit <= unitsPerLevel; unit++) {
                // Generar nombre. Ej: A101
                const levelPrefix = level.toString();
                const unitStr = zeroPad ? unit.toString().padStart(2, '0') : unit.toString();
                
                const name = `${prefix}${levelPrefix}${unitStr}`;

                generatedZones.push({
                    id: crypto.randomUUID(),
                    name: name,
                    areas: baseAreas.map(a => ({ id: crypto.randomUUID(), name: a.name }))
                });
            }
        }

        onGenerate(generatedZones);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Grid3X3 className="h-5 w-5 text-purple-600" />
                        Matriz Inmobiliaria Automática
                    </DialogTitle>
                    <DialogDescription>
                        Genera bloques completos de apartamentos o villas al instante.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Prefijo (Bloque/Torre)</Label>
                            <Input 
                                value={prefix} 
                                onChange={(e) => setPrefix(e.target.value)} 
                                placeholder="Ej. A, B, Torre Sur "
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Nivel/Piso Inicial</Label>
                            <Input 
                                type="number" 
                                value={startLevel} 
                                onChange={(e) => setStartLevel(parseInt(e.target.value) || 1)} 
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Cantidad de Niveles</Label>
                            <Input 
                                type="number" 
                                value={numLevels} 
                                onChange={(e) => setNumLevels(parseInt(e.target.value) || 1)} 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Unidades por Nivel</Label>
                            <Input 
                                type="number" 
                                value={unitsPerLevel} 
                                onChange={(e) => setUnitsPerLevel(parseInt(e.target.value) || 1)} 
                            />
                        </div>
                    </div>

                    <div className="flex items-center space-x-2 pt-2">
                        <Checkbox 
                            id="zeroPad" 
                            checked={zeroPad} 
                            onCheckedChange={(checked) => setZeroPad(!!checked)} 
                        />
                        <label htmlFor="zeroPad" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Rellenar unidad con cero (Ej. A101 vs A11)
                        </label>
                    </div>

                    {/* Vista Previa */}
                    <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg mt-2">
                        <p className="text-xs text-gray-500 font-semibold mb-2">VISTA PREVIA DE LAS PRIMERAS ZONAS:</p>
                        <div className="flex flex-wrap gap-2">
                            {Array.from({ length: Math.min(6, numLevels * unitsPerLevel) }).map((_, i) => {
                                const level = startLevel + Math.floor(i / unitsPerLevel);
                                const unit = (i % unitsPerLevel) + 1;
                                const unitStr = zeroPad ? unit.toString().padStart(2, '0') : unit.toString();
                                return (
                                    <span key={i} className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded font-bold">
                                        {prefix}{level}{unitStr}
                                    </span>
                                );
                            })}
                            {numLevels * unitsPerLevel > 6 && (
                                <span className="text-xs text-gray-400 self-center">... y {numLevels * unitsPerLevel - 6} más</span>
                            )}
                        </div>
                        <p className="text-xs text-blue-600 mt-2 font-medium">
                            * Se crearán {numLevels * unitsPerLevel} zonas, cada una con {baseAreas.length} áreas.
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button onClick={handleGenerate} className="bg-purple-600 hover:bg-purple-700">
                        Generar {numLevels * unitsPerLevel} Zonas
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
