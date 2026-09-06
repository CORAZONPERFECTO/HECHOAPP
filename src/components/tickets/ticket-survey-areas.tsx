"use client";

import { useState } from "react";
import { Ticket, SurveyArea, TicketPhoto, SurveyBudget } from "@/types/tickets";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
    Plus, 
    Trash2, 
    Camera, 
    Upload, 
    Calculator, 
    Zap, 
    Building2, 
    Ruler, 
    DollarSign, 
    Sparkles, 
    Image as ImageIcon,
    ChevronDown,
    ChevronUp,
    CheckCircle2,
    FileText,
    Layers,
    Maximize2
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface TicketSurveyAreasProps {
    ticket: Ticket;
    onChange: (updatedTicket: Ticket) => void;
    onPhotoUpload?: (file: File) => Promise<string>;
}

const COMMON_AREA_SUGGESTIONS = [
    "Habitación Master",
    "Habitación 2",
    "Habitación 3",
    "Sala / Comedor",
    "Cocina",
    "Terraza / Balcón",
    "Techo / Condensadores",
    "Cuarto de Máquinas",
    "Tablero Eléctrico / Acometida"
];

function suggestBtuCapacity(areaM2: number): { btu: number; text: string } {
    if (areaM2 <= 0) return { btu: 12000, text: "12,000 BTU (1 Ton)" };
    const rawBtu = areaM2 * 650;
    if (rawBtu <= 12000) return { btu: 12000, text: "12,000 BTU (1 Ton)" };
    if (rawBtu <= 18000) return { btu: 18000, text: "18,000 BTU (1.5 Ton)" };
    if (rawBtu <= 24000) return { btu: 24000, text: "24,000 BTU (2 Ton)" };
    if (rawBtu <= 36000) return { btu: 36000, text: "36,000 BTU (3 Ton)" };
    if (rawBtu <= 48000) return { btu: 48000, text: "48,000 BTU (4 Ton)" };
    return { btu: 60000, text: "60,000 BTU (5 Ton o multizona)" };
}

export function TicketSurveyAreas({ ticket, onChange, onPhotoUpload }: TicketSurveyAreasProps) {
    const areas: SurveyArea[] = ticket.surveyAreas || [];
    const [expandedAreaId, setExpandedAreaId] = useState<string | null>(areas[0]?.id || null);
    const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
    const [newAreaName, setNewAreaName] = useState("");
    const [isBudgetOpen, setIsBudgetOpen] = useState(false);

    const updateAreas = (newAreas: SurveyArea[]) => {
        // También consolidamos las fotos de todas las áreas en ticket.photos para compatibilidad global
        const allPhotos: TicketPhoto[] = [];
        newAreas.forEach(a => {
            if (a.photos && a.photos.length > 0) {
                allPhotos.push(...a.photos);
            }
        });

        onChange({
            ...ticket,
            surveyAreas: newAreas,
            photos: allPhotos.length > 0 ? allPhotos : ticket.photos
        });
    };

    const handleAddArea = (nameToAdd?: string) => {
        const name = nameToAdd || newAreaName.trim() || `Área #${areas.length + 1}`;
        const newArea: SurveyArea = {
            id: `area-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            name,
            lengthMeters: 5,
            widthMeters: 4,
            areaSquareMeters: 20,
            requiredBtu: 18000,
            recommendedEquipment: "Split Inverter 18,000 BTU 220V",
            voltage: "220V",
            pipeDistanceMeters: 10,
            notes: "",
            photos: []
        };

        const updated = [...areas, newArea];
        updateAreas(updated);
        setExpandedAreaId(newArea.id);
        setNewAreaName("");
    };

    const handleDeleteArea = (id: string) => {
        const updated = areas.filter(a => a.id !== id);
        updateAreas(updated);
        if (expandedAreaId === id) {
            setExpandedAreaId(updated[0]?.id || null);
        }
    };

    const handleAreaChange = (id: string, updates: Partial<SurveyArea>) => {
        const updated = areas.map(a => {
            if (a.id !== id) return a;
            const merged = { ...a, ...updates };

            // Recalcular m2 y BTU si cambian largo o ancho
            if (updates.lengthMeters !== undefined || updates.widthMeters !== undefined) {
                const len = updates.lengthMeters !== undefined ? Number(updates.lengthMeters) : Number(a.lengthMeters || 0);
                const wid = updates.widthMeters !== undefined ? Number(updates.widthMeters) : Number(a.widthMeters || 0);
                const m2 = Math.round((len * wid) * 10) / 10;
                merged.areaSquareMeters = m2;
                const rec = suggestBtuCapacity(m2);
                merged.requiredBtu = rec.btu;
                if (!updates.recommendedEquipment) {
                    merged.recommendedEquipment = `Split Inverter ${rec.text} ${merged.voltage || '220V'}`;
                }
            }

            return merged;
        });
        updateAreas(updated);
    };

    const handleAddPhotoToArea = async (areaId: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const area = areas.find(a => a.id === areaId);
        if (!area) return;

        const newPhotosList = [...(area.photos || [])];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            let url = "";

            if (onPhotoUpload) {
                try {
                    url = await onPhotoUpload(file);
                } catch (err) {
                    console.warn("Custom onPhotoUpload failed, falling back to direct HD upload:", err);
                }
            }

            if (!url) {
                try {
                    const { storage, auth } = await import("@/lib/firebase");
                    const { ref, uploadBytes, getDownloadURL } = await import("firebase/storage");
                    const { compressImage } = await import("@/lib/image-utils");

                    const compressedBlob = await compressImage(file, 2048, 0.92);
                    const user = auth.currentUser;
                    const uid = user?.uid || "admin";
                    const cleanName = file.name.replace(/\s+/g, '_');
                    const filename = `surveys/${uid}/${Date.now()}_${cleanName}`;
                    const storageRef = ref(storage, filename);

                    await uploadBytes(storageRef, compressedBlob, {
                        contentType: 'image/jpeg',
                        customMetadata: { ticketId: ticket.id, areaId: area.id, areaName: area.name }
                    });

                    url = await getDownloadURL(storageRef);
                } catch (err) {
                    console.warn("Direct Storage upload failed, falling back to high-res data URL:", err);
                    url = await new Promise<string>((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result as string);
                        reader.readAsDataURL(file);
                    });
                }
            }

            newPhotosList.push({
                url,
                type: "SURVEY",
                area: area.name,
                areaId: area.id,
                description: `Evidencia en ${area.name}`,
                size: "medium"
            });
        }

        handleAreaChange(areaId, { photos: newPhotosList });
    };

    const handleRemovePhotoFromArea = (areaId: string, photoIndex: number) => {
        const area = areas.find(a => a.id === areaId);
        if (!area) return;
        const photos = [...(area.photos || [])];
        photos.splice(photoIndex, 1);
        handleAreaChange(areaId, { photos });
    };

    const handlePhotoDescriptionChange = (areaId: string, photoIndex: number, desc: string) => {
        const area = areas.find(a => a.id === areaId);
        if (!area) return;
        const photos = [...(area.photos || [])];
        photos[photoIndex] = { ...photos[photoIndex], description: desc };
        handleAreaChange(areaId, { photos });
    };

    // Resumen de Carga Térmica Total
    const totalM2 = areas.reduce((acc, a) => acc + (a.areaSquareMeters || 0), 0);
    const totalBtu = areas.reduce((acc, a) => acc + (a.requiredBtu || 0), 0);
    const totalPhotos = areas.reduce((acc, a) => acc + (a.photos?.length || 0), 0);

    return (
        <div className="space-y-6">
            {/* Header del Levantamiento */}
            <div className="p-4 md:p-6 bg-gradient-to-r from-blue-950 via-indigo-900 to-slate-900 text-white rounded-3xl shadow-xl space-y-3">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 bg-blue-500/30 text-blue-300 text-[10px] font-black rounded-full uppercase tracking-wider border border-blue-400/30">
                                Modo Levantamiento & Inspección
                            </span>
                            <Badge variant="outline" className="text-emerald-400 border-emerald-400/40 text-[10px]">
                                {areas.length} {areas.length === 1 ? "Área" : "Áreas"}
                            </Badge>
                        </div>
                        <h2 className="text-xl md:text-2xl font-black tracking-tight mt-1">Levantamiento Técnico por Áreas</h2>
                        <p className="text-xs text-slate-300">
                            Registra medidas, cálculo de carga térmica (BTU), equipos sugeridos y fotos por ambiente.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            onClick={() => handleAddArea()}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold gap-1.5 rounded-2xl h-10 shadow-lg"
                        >
                            <Plus className="w-4 h-4" /> Agregar Ambiente
                        </Button>
                    </div>
                </div>

                {/* KPI Bar de Carga Térmica */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10 text-center text-xs">
                    <div className="bg-white/10 p-2.5 rounded-2xl">
                        <span className="text-[10px] text-slate-300 block">Área Total Medida</span>
                        <span className="text-sm md:text-base font-black text-white">{totalM2.toFixed(1)} m²</span>
                    </div>
                    <div className="bg-white/10 p-2.5 rounded-2xl">
                        <span className="text-[10px] text-slate-300 block">Carga Térmica Total</span>
                        <span className="text-sm md:text-base font-black text-amber-300">{(totalBtu / 1000).toFixed(0)}k BTU ({ (totalBtu / 12000).toFixed(1) } TR)</span>
                    </div>
                    <div className="bg-white/10 p-2.5 rounded-2xl">
                        <span className="text-[10px] text-slate-300 block">Fotos de Evidencia</span>
                        <span className="text-sm md:text-base font-black text-emerald-300">{totalPhotos} fotos</span>
                    </div>
                </div>
            </div>

            {/* Chips de Sugerencias Rápidas */}
            <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" /> Sugerencias Rápidas de Ambientes:
                </span>
                <div className="flex flex-wrap gap-1.5">
                    {COMMON_AREA_SUGGESTIONS.map((sug) => {
                        const exists = areas.some(a => a.name.toLowerCase() === sug.toLowerCase());
                        return (
                            <button
                                key={sug}
                                type="button"
                                onClick={() => handleAddArea(sug)}
                                disabled={exists}
                                className={`px-3 py-1 rounded-xl text-xs font-medium transition-all ${
                                    exists 
                                    ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed" 
                                    : "bg-white text-slate-700 border border-slate-300 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700 shadow-sm"
                                }`}
                            >
                                + {sug}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Lista de Áreas / Ambientes */}
            <div className="space-y-4">
                {areas.length === 0 ? (
                    <Card className="border-dashed border-2 border-slate-300 rounded-3xl p-8 text-center space-y-3">
                        <Building2 className="w-10 h-10 text-slate-400 mx-auto" />
                        <div className="space-y-1">
                            <h3 className="font-bold text-slate-800 text-sm">No has agregado áreas a este levantamiento</h3>
                            <p className="text-xs text-slate-500 max-w-md mx-auto">
                                Agrega las habitaciones, salas o áreas técnicas donde se instalarán o inspeccionarán equipos.
                            </p>
                        </div>
                        <Button 
                            type="button" 
                            onClick={() => handleAddArea("Sala / Comedor")} 
                            className="bg-blue-600 text-white text-xs font-bold rounded-2xl"
                        >
                            <Plus className="w-4 h-4 mr-1" /> Comenzar con Sala / Comedor
                        </Button>
                    </Card>
                ) : (
                    areas.map((area, idx) => {
                        const isExpanded = expandedAreaId === area.id;
                        const areaPhotos = area.photos || [];

                        return (
                            <Card key={area.id} className="rounded-3xl border-slate-200 shadow-sm overflow-hidden transition-all">
                                {/* Header del Área */}
                                <div 
                                    onClick={() => setExpandedAreaId(isExpanded ? null : area.id)}
                                    className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${
                                        isExpanded ? "bg-slate-900 text-white" : "bg-slate-50 hover:bg-slate-100 text-slate-800"
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-2xl flex items-center justify-center font-black text-xs ${
                                            isExpanded ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-700"
                                        }`}>
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <h4 className="font-black text-sm tracking-tight">{area.name}</h4>
                                            <span className={`text-[11px] font-mono ${isExpanded ? "text-slate-300" : "text-slate-500"}`}>
                                                {area.areaSquareMeters || 0} m² • {area.requiredBtu?.toLocaleString() || 12000} BTU • {areaPhotos.length} fotos
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteArea(area.id);
                                            }}
                                            className="h-8 w-8 p-0 text-rose-500 hover:bg-rose-500/20 hover:text-rose-400 rounded-xl"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                        <div className="p-1">
                                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                        </div>
                                    </div>
                                </div>

                                {/* Contenido Expandido del Área */}
                                {isExpanded && (
                                    <CardContent className="p-5 space-y-6 bg-white">
                                        {/* 1. Datos y Dimensiones */}
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between border-b pb-1.5">
                                                <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                                                    <Ruler className="w-4 h-4 text-blue-600" /> Dimensiones & Carga Térmica
                                                </span>
                                                <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 text-[10px]">
                                                    Recomendado: {suggestBtuCapacity(area.areaSquareMeters || 0).text}
                                                </Badge>
                                            </div>

                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                <div>
                                                    <Label className="text-[11px] font-bold">Largo (m)</Label>
                                                    <Input
                                                        type="number"
                                                        step="0.1"
                                                        className="h-9 text-xs font-mono"
                                                        value={area.lengthMeters || ""}
                                                        onChange={(e) => handleAreaChange(area.id, { lengthMeters: Number(e.target.value) })}
                                                    />
                                                </div>
                                                <div>
                                                    <Label className="text-[11px] font-bold">Ancho (m)</Label>
                                                    <Input
                                                        type="number"
                                                        step="0.1"
                                                        className="h-9 text-xs font-mono"
                                                        value={area.widthMeters || ""}
                                                        onChange={(e) => handleAreaChange(area.id, { widthMeters: Number(e.target.value) })}
                                                    />
                                                </div>
                                                <div>
                                                    <Label className="text-[11px] font-bold">Área Calculada</Label>
                                                    <div className="h-9 px-3 flex items-center bg-slate-100 rounded-xl text-xs font-mono font-bold text-slate-800">
                                                        {area.areaSquareMeters || 0} m²
                                                    </div>
                                                </div>
                                                <div>
                                                    <Label className="text-[11px] font-bold">BTU Sugeridos</Label>
                                                    <div className="h-9 px-3 flex items-center bg-amber-50 border border-amber-200 rounded-xl text-xs font-mono font-bold text-amber-900">
                                                        {area.requiredBtu?.toLocaleString() || 12000} BTU
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Equipamiento Recomendado */}
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                                                <div>
                                                    <Label className="text-[11px] font-bold">Equipo Recomendado</Label>
                                                    <Input
                                                        className="h-9 text-xs"
                                                        placeholder="Ej: Split Inverter 18k BTU"
                                                        value={area.recommendedEquipment || ""}
                                                        onChange={(e) => handleAreaChange(area.id, { recommendedEquipment: e.target.value })}
                                                    />
                                                </div>
                                                <div>
                                                    <Label className="text-[11px] font-bold">Voltaje</Label>
                                                    <select
                                                        className="w-full h-9 border rounded-xl px-2 text-xs bg-white"
                                                        value={area.voltage || "220V"}
                                                        onChange={(e) => handleAreaChange(area.id, { voltage: e.target.value })}
                                                    >
                                                        <option value="220V">220V Monofásico</option>
                                                        <option value="110V">110V Monofásico</option>
                                                        <option value="208/230V 3Ph">208/230V Trifásico</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <Label className="text-[11px] font-bold">Distancia Tubería (m)</Label>
                                                    <Input
                                                        type="number"
                                                        className="h-9 text-xs font-mono"
                                                        placeholder="Metros lineales"
                                                        value={area.pipeDistanceMeters || ""}
                                                        onChange={(e) => handleAreaChange(area.id, { pipeDistanceMeters: Number(e.target.value) })}
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <Label className="text-[11px] font-bold">Notas & Observaciones Técnicas</Label>
                                                <Input
                                                    className="h-9 text-xs"
                                                    placeholder="Ej: Drenaje existente en pared sur, pase de tubería despejado..."
                                                    value={area.notes || ""}
                                                    onChange={(e) => handleAreaChange(area.id, { notes: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        {/* 2. Galería de Evidencias Fotográficas del Área */}
                                        <div className="space-y-3 pt-2">
                                            <div className="flex items-center justify-between border-b pb-1.5">
                                                <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                                                    <Camera className="w-4 h-4 text-emerald-600" /> Evidencias Fotográficas ({area.name})
                                                </span>
                                                <label>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        multiple
                                                        className="hidden"
                                                        onChange={(e) => handleAddPhotoToArea(area.id, e)}
                                                    />
                                                    <Button type="button" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl h-8 gap-1" asChild>
                                                        <span>
                                                            <Upload className="w-3.5 h-3.5" /> Subir Fotos
                                                        </span>
                                                    </Button>
                                                </label>
                                            </div>

                                            {areaPhotos.length === 0 ? (
                                                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center text-xs text-slate-500">
                                                    No hay fotos en esta área. Sube fotos de la pared, techo, tablero o equipo actual.
                                                </div>
                                            ) : (
                                                /* Grid Proporcional de 2 o 3 Columnas */
                                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                                    {areaPhotos.map((photo, pIdx) => (
                                                        <div key={pIdx} className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden flex flex-col group shadow-sm">
                                                            <div className="relative aspect-video bg-black/5 overflow-hidden flex items-center justify-center">
                                                                <img
                                                                    src={photo.url}
                                                                    alt={photo.description || area.name}
                                                                    className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                                                                    onClick={() => setPreviewPhoto(photo.url)}
                                                                />
                                                                <Button
                                                                    type="button"
                                                                    size="icon"
                                                                    variant="destructive"
                                                                    onClick={() => handleRemovePhotoFromArea(area.id, pIdx)}
                                                                    className="absolute top-2 right-2 h-7 w-7 rounded-full shadow-md opacity-90 hover:opacity-100"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </Button>
                                                            </div>
                                                            <div className="p-2 space-y-1">
                                                                <Input
                                                                    className="h-7 text-[11px] bg-white"
                                                                    placeholder="Pie de foto / Detalle..."
                                                                    value={photo.description || ""}
                                                                    onChange={(e) => handlePhotoDescriptionChange(area.id, pIdx, e.target.value)}
                                                                />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                )}
                            </Card>
                        );
                    })
                )}
            </div>

            {/* Modal para ver foto ampliada */}
            <Dialog open={!!previewPhoto} onOpenChange={() => setPreviewPhoto(null)}>
                <DialogContent className="sm:max-w-3xl p-0 bg-black/95 border-0 overflow-hidden">
                    <DialogHeader className="p-3 bg-black/60 text-white absolute top-0 w-full z-10">
                        <DialogTitle className="text-xs">Foto de Levantamiento</DialogTitle>
                    </DialogHeader>
                    {previewPhoto && (
                        <div className="p-4 pt-14 flex items-center justify-center min-h-[400px]">
                            <img src={previewPhoto} alt="Preview" className="max-w-full max-h-[80vh] object-contain rounded-lg" />
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
