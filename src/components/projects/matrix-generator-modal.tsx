import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Grid3X3, Plus, Sparkles } from "lucide-react";

interface MatrixGeneratorModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    baseAreas: { id: string; name: string }[];
    onGenerate: (newZones: { id: string; name: string; areas: { id: string; name: string }[] }[]) => void;
}

const DEFAULT_AREAS_PRELOAD = [
    "Habitación Principal",
    "Habitación 2",
    "Habitación 3",
    "Habitación de Servicio",
    "Sala",
    "Comedor",
    "Cocina",
    "Balcón",
    "Baño Principal",
    "Baño Común",
    "Área de Lavado",
    "Estudio",
    "Terraza"
];

export function MatrixGeneratorModal({ open, onOpenChange, baseAreas, onGenerate }: MatrixGeneratorModalProps) {
    const [prefix, setPrefix] = useState("A");
    const [startLevel, setStartLevel] = useState(1);
    const [numLevels, setNumLevels] = useState(4);
    const [unitsPerLevel, setUnitsPerLevel] = useState(2);
    const [zeroPad, setZeroPad] = useState(true);

    // Common areas checklist state
    const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
    const [customAreaInput, setCustomAreaInput] = useState("");

    // Update selected areas when baseAreas changes or modal opens
    useEffect(() => {
        if (open) {
            if (baseAreas && baseAreas.length > 0) {
                setSelectedAreas(baseAreas.map(a => a.name));
            } else {
                // Default: Standard apartment template
                setSelectedAreas(["Habitación Principal", "Habitación 2", "Sala", "Cocina", "Baño Principal"]);
            }
        }
    }, [open, baseAreas]);

    const handleGenerate = () => {
        const generatedZones: { id: string; name: string; areas: { id: string; name: string }[] }[] = [];

        for (let level = startLevel; level < startLevel + numLevels; level++) {
            for (let unit = 1; unit <= unitsPerLevel; unit++) {
                // Generar nombre. Ej: A101 o Bloque A101
                const levelPrefix = level.toString();
                const unitStr = zeroPad ? unit.toString().padStart(2, '0') : unit.toString();
                
                const name = `${prefix}${levelPrefix}${unitStr}`;

                generatedZones.push({
                    id: crypto.randomUUID(),
                    name: name,
                    areas: selectedAreas.map(areaName => ({ id: crypto.randomUUID(), name: areaName }))
                });
            }
        }

        onGenerate(generatedZones);
        onOpenChange(false);
    };

    const handleAddCustomArea = () => {
        if (customAreaInput.trim()) {
            const newArea = customAreaInput.trim();
            if (!selectedAreas.includes(newArea)) {
                setSelectedAreas([...selectedAreas, newArea]);
            }
            setCustomAreaInput("");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg bg-white border border-slate-200 text-slate-900 rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
                <DialogHeader className="space-y-1">
                    <DialogTitle className="flex items-center gap-2 text-slate-900 font-bold uppercase tracking-wider text-sm">
                        <Grid3X3 className="h-5 w-5 text-indigo-600" />
                        Matriz Inmobiliaria Automática
                    </DialogTitle>
                    <DialogDescription className="text-slate-500 text-xs">
                        Genera bloques completos de apartamentos o villas al instante con la distribución que desees.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 py-2">
                    {/* Configuración de Numeración */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
                            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                            Configuración de la Estructura
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-slate-600 uppercase">Prefijo (Bloque/Torre)</Label>
                                <Input 
                                    value={prefix} 
                                    onChange={(e) => setPrefix(e.target.value)} 
                                    className="text-xs h-9 bg-white border-slate-200"
                                    placeholder="Ej. A, B, Torre"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-slate-600 uppercase">Nivel/Piso Inicial</Label>
                                <Input 
                                    type="number" 
                                    value={startLevel} 
                                    onChange={(e) => setStartLevel(parseInt(e.target.value) || 1)} 
                                    className="text-xs h-9 bg-white border-slate-200"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-slate-600 uppercase">Cantidad de Niveles</Label>
                                <Input 
                                    type="number" 
                                    value={numLevels} 
                                    onChange={(e) => setNumLevels(parseInt(e.target.value) || 1)} 
                                    className="text-xs h-9 bg-white border-slate-200"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-slate-600 uppercase">Unidades por Nivel</Label>
                                <Input 
                                    type="number" 
                                    value={unitsPerLevel} 
                                    onChange={(e) => setUnitsPerLevel(parseInt(e.target.value) || 1)} 
                                    className="text-xs h-9 bg-white border-slate-200"
                                />
                            </div>
                        </div>

                        <div className="flex items-center space-x-2 pt-1.5">
                            <Checkbox 
                                id="zeroPad" 
                                checked={zeroPad} 
                                onCheckedChange={(checked) => setZeroPad(!!checked)} 
                            />
                            <label htmlFor="zeroPad" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                                Rellenar unidad con cero (Ej. A101 vs A11)
                            </label>
                        </div>
                    </div>

                    {/* Distribución y Áreas */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <Label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                Áreas a crear por Apartamento
                            </Label>
                            <span className="text-[10px] font-extrabold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100">
                                {selectedAreas.length} seleccionadas
                            </span>
                        </div>

                        {/* Plantillas Rápidas */}
                        <div className="flex flex-wrap gap-1.5">
                            <Button 
                                type="button"
                                variant="outline" 
                                size="sm" 
                                className="text-[10px] h-7 font-bold text-slate-700 bg-slate-50 border-slate-200 hover:bg-slate-100 hover:text-slate-900"
                                onClick={() => setSelectedAreas(["Habitación Principal", "Habitación 2", "Sala", "Cocina", "Baño Principal"])}
                            >
                                Apto. Básico
                            </Button>
                            <Button 
                                type="button"
                                variant="outline" 
                                size="sm" 
                                className="text-[10px] h-7 font-bold text-slate-700 bg-slate-50 border-slate-200 hover:bg-slate-100 hover:text-slate-900"
                                onClick={() => setSelectedAreas(["Habitación Principal", "Habitación 2", "Habitación 3", "Sala", "Comedor", "Cocina", "Baño Principal", "Baño Común", "Balcón", "Área de Lavado"])}
                            >
                                Apto. Grande
                            </Button>
                            <Button 
                                type="button"
                                variant="outline" 
                                size="sm" 
                                className="text-[10px] h-7 font-bold text-slate-700 bg-slate-50 border-slate-200 hover:bg-slate-100 hover:text-slate-900"
                                onClick={() => setSelectedAreas(["Habitación Principal", "Habitación 2", "Habitación 3", "Habitación de Servicio", "Sala", "Comedor", "Cocina", "Baño Principal", "Baño Común", "Balcón", "Área de Lavado"])}
                            >
                                Apto. Completo + Servicio
                            </Button>
                            <Button 
                                type="button"
                                variant="outline" 
                                size="sm" 
                                className="text-[10px] h-7 font-bold text-red-600 bg-red-50 border-red-200 hover:bg-red-100 hover:text-red-700"
                                onClick={() => setSelectedAreas([])}
                            >
                                Limpiar todo
                            </Button>
                        </div>

                        {/* Listado de áreas predefinidas */}
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 p-3 bg-slate-50 rounded-xl border border-slate-100 max-h-[180px] overflow-y-auto">
                            {DEFAULT_AREAS_PRELOAD.map((area) => {
                                const isChecked = selectedAreas.includes(area);
                                return (
                                    <div key={area} className="flex items-center space-x-2">
                                        <Checkbox 
                                            id={`chk-${area}`} 
                                            checked={isChecked}
                                            onCheckedChange={(checked) => {
                                                if (checked) {
                                                    setSelectedAreas([...selectedAreas, area]);
                                                } else {
                                                    setSelectedAreas(selectedAreas.filter(a => a !== area));
                                                }
                                            }}
                                        />
                                        <label 
                                            htmlFor={`chk-${area}`} 
                                            className="text-xs font-semibold text-slate-700 cursor-pointer select-none hover:text-slate-900"
                                        >
                                            {area}
                                        </label>
                                    </div>
                                );
                            })}
                            
                            {/* Áreas personalizadas no predefinidas */}
                            {selectedAreas.filter(a => !DEFAULT_AREAS_PRELOAD.includes(a)).map((customArea) => (
                                <div key={customArea} className="flex items-center space-x-2">
                                    <Checkbox 
                                        id={`chk-${customArea}`} 
                                        checked={true}
                                        onCheckedChange={(checked) => {
                                            if (!checked) {
                                                setSelectedAreas(selectedAreas.filter(a => a !== customArea));
                                            }
                                        }}
                                    />
                                    <label 
                                        htmlFor={`chk-${customArea}`} 
                                        className="text-xs font-bold text-indigo-600 cursor-pointer select-none hover:text-indigo-800"
                                    >
                                        {customArea}
                                    </label>
                                </div>
                            ))}
                        </div>

                        {/* Agregar Área Personalizada */}
                        <div className="flex gap-2">
                            <Input 
                                placeholder="Escribe otra área (ej: Estudio, Balcón 2...)"
                                value={customAreaInput}
                                onChange={(e) => setCustomAreaInput(e.target.value)}
                                className="text-xs h-9 bg-white border-slate-200"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddCustomArea();
                                    }
                                }}
                            />
                            <Button 
                                type="button" 
                                size="sm" 
                                className="bg-slate-900 text-white hover:bg-slate-800 font-bold text-xs h-9 px-3 flex gap-1 shrink-0"
                                onClick={handleAddCustomArea}
                            >
                                <Plus className="h-4 w-4" /> Agregar
                            </Button>
                        </div>
                    </div>

                    {/* Vista Previa */}
                    <div className="bg-indigo-50/50 border border-indigo-100 p-3 rounded-xl space-y-2">
                        <p className="text-[10px] text-indigo-700 font-bold uppercase tracking-wider">
                            Vista Previa de Apartamentos a crear:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {Array.from({ length: Math.min(6, numLevels * unitsPerLevel) }).map((_, i) => {
                                const level = startLevel + Math.floor(i / unitsPerLevel);
                                const unit = (i % unitsPerLevel) + 1;
                                const unitStr = zeroPad ? unit.toString().padStart(2, '0') : unit.toString();
                                return (
                                    <span key={i} className="bg-white text-indigo-800 text-[10px] px-2 py-0.5 rounded border border-indigo-200 font-extrabold shadow-sm">
                                        {prefix}{level}{unitStr}
                                    </span>
                                );
                            })}
                            {numLevels * unitsPerLevel > 6 && (
                                <span className="text-[10px] text-slate-500 font-bold self-center">
                                    + {numLevels * unitsPerLevel - 6} más
                                </span>
                            )}
                        </div>
                        <p className="text-[10px] text-slate-500 font-semibold italic">
                            * Se crearán {numLevels * unitsPerLevel} apartamentos, cada uno con {selectedAreas.length} áreas.
                        </p>
                    </div>
                </div>

                <DialogFooter className="gap-2 border-t border-slate-100 pt-3">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-xs h-9 font-semibold border-slate-200"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancelar
                    </Button>
                    <Button 
                        size="sm" 
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-9 px-4"
                        onClick={handleGenerate}
                        disabled={selectedAreas.length === 0}
                    >
                        Generar {numLevels * unitsPerLevel} Zonas
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
