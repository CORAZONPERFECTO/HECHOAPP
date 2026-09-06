"use client";

import { useState, useEffect, useRef } from "react";
import { Ticket, SurveyArea, TicketPhoto, SurveyBudget } from "@/types/tickets";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
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
    Maximize2,
    Loader2
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
    if (!areaM2 || areaM2 <= 0) return { btu: 0, text: "Sin cálculo (ingrese medidas o elija BTU)" };
    const rawBtu = areaM2 * 650;
    if (rawBtu <= 12000) return { btu: 12000, text: "12,000 BTU (1 Ton)" };
    if (rawBtu <= 18000) return { btu: 18000, text: "18,000 BTU (1.5 Ton)" };
    if (rawBtu <= 24000) return { btu: 24000, text: "24,000 BTU (2 Ton)" };
    if (rawBtu <= 36000) return { btu: 36000, text: "36,000 BTU (3 Ton)" };
    if (rawBtu <= 48000) return { btu: 48000, text: "48,000 BTU (4 Ton)" };
    return { btu: 60000, text: "60,000 BTU (5 Ton o multizona)" };
}

export function TicketSurveyAreas({ ticket, onChange, onPhotoUpload }: TicketSurveyAreasProps) {
    const [localAreas, setLocalAreas] = useState<SurveyArea[]>(ticket.surveyAreas || []);
    const areasRef = useRef<SurveyArea[]>(localAreas);
    areasRef.current = localAreas;
    const areas = localAreas;

    const [expandedAreaId, setExpandedAreaId] = useState<string | null>(localAreas[0]?.id || null);
    const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
    const [newAreaName, setNewAreaName] = useState("");
    const [isBudgetOpen, setIsBudgetOpen] = useState(false);
    const [uploadingAreaId, setUploadingAreaId] = useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = useState<string>("");

    // Sync from prop when not actively uploading photos
    useEffect(() => {
        if (!uploadingAreaId && ticket.surveyAreas) {
            setLocalAreas(ticket.surveyAreas);
        }
    }, [ticket.surveyAreas, uploadingAreaId]);

    const updateAreas = async (newAreas: SurveyArea[]) => {
        // Immediate local state update to prevent UI flickers
        setLocalAreas(newAreas);
        areasRef.current = newAreas;

        // Consolidate survey photos from all areas
        const allSurveyPhotos: TicketPhoto[] = [];
        newAreas.forEach(a => {
            if (a.photos && a.photos.length > 0) {
                allSurveyPhotos.push(...a.photos);
            }
        });

        // Preserve non-survey photos (e.g. BEFORE/DURING/AFTER)
        const nonSurveyPhotos = (ticket.photos || []).filter(
            p => p.type !== 'SURVEY' && !allSurveyPhotos.some(sp => sp.url === p.url)
        );
        const mergedPhotos = [...allSurveyPhotos, ...nonSurveyPhotos];

        const updatedTicket: Ticket = {
            ...ticket,
            surveyAreas: newAreas,
            photos: mergedPhotos
        };

        onChange(updatedTicket);

        // Immediately persist to Firestore
        if (ticket.id) {
            try {
                await setDoc(doc(db, "tickets", ticket.id), {
                    surveyAreas: newAreas,
                    photos: mergedPhotos,
                    updatedAt: serverTimestamp()
                }, { merge: true });
            } catch (err) {
                console.warn("Auto-syncing survey areas to Firestore:", err);
            }
        }
    };

    const handleAddArea = (nameToAdd?: string) => {
        const current = areasRef.current;
        const name = nameToAdd || newAreaName.trim() || `Área #${current.length + 1}`;
        const isTechnical = /techo|condensador|tablero|acometida|eléctrico|maquin/i.test(name);
        const newArea: SurveyArea = {
            id: `area-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            name,
            lengthMeters: 0,
            widthMeters: 0,
            areaSquareMeters: 0,
            requiredBtu: 0,
            recommendedEquipment: isTechnical ? "Soportes / Ubicación técnica" : "",
            voltage: "220V",
            pipeDistanceMeters: 0,
            notes: "",
            photos: []
        };

        const updated = [...current, newArea];
        updateAreas(updated);
        setExpandedAreaId(newArea.id);
        setNewAreaName("");
    };

    const handleDeleteArea = (id: string) => {
        const current = areasRef.current;
        const updated = current.filter(a => a.id !== id);
        updateAreas(updated);
        if (expandedAreaId === id) {
            setExpandedAreaId(updated[0]?.id || null);
        }
    };

    const handleAreaChange = (id: string, updates: Partial<SurveyArea>) => {
        const current = areasRef.current;
        const updated = current.map(a => {
            if (a.id !== id) return a;
            const merged = { ...a, ...updates };

            // Recalculate m2 and BTU if dimensions change
            if (updates.lengthMeters !== undefined || updates.widthMeters !== undefined) {
                const len = updates.lengthMeters !== undefined ? Number(updates.lengthMeters) : Number(a.lengthMeters || 0);
                const wid = updates.widthMeters !== undefined ? Number(updates.widthMeters) : Number(a.widthMeters || 0);
                const m2 = Math.round((len * wid) * 10) / 10;
                merged.areaSquareMeters = m2;
                if (m2 > 0) {
                    const rec = suggestBtuCapacity(m2);
                    if (rec.btu > 0 && (!a.requiredBtu || a.requiredBtu === 0)) {
                        merged.requiredBtu = rec.btu;
                        if (!a.recommendedEquipment) {
                            merged.recommendedEquipment = `Split Inverter ${rec.text} ${merged.voltage || '220V'}`;
                        }
                    }
                }
            }

            // If requiredBtu changed manually and recommendedEquipment is empty or standard default, update it
            if (updates.requiredBtu !== undefined) {
                const btu = updates.requiredBtu;
                if (btu > 0) {
                    if (!merged.recommendedEquipment || merged.recommendedEquipment.startsWith('Split Inverter')) {
                        merged.recommendedEquipment = `Split Inverter ${btu.toLocaleString()} BTU ${merged.voltage || '220V'}`;
                    }
                }
            }

            // If area name changed, update photo descriptions accordingly
            if (updates.name && merged.photos) {
                merged.photos = merged.photos.map(p => ({
                    ...p,
                    area: updates.name,
                    description: p.description && p.description.startsWith('Evidencia en ') ? `Evidencia en ${updates.name}` : p.description
                }));
            }

            return merged;
        });
        updateAreas(updated);
    };

    const handleAddPhotoToArea = async (areaId: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const currentAreas = areasRef.current;
        const area = currentAreas.find(a => a.id === areaId);
        if (!area) return;

        setUploadingAreaId(areaId);
        setUploadProgress(`Preparando ${files.length} ${files.length === 1 ? 'foto' : 'fotos'}...`);

        try {
            const { storage, auth } = await import("@/lib/firebase");
            const { ref, uploadBytes, getDownloadURL } = await import("firebase/storage");
            const { compressImage } = await import("@/lib/image-utils");

            const user = auth.currentUser;
            const uid = user?.uid || "admin";

            // Always read the latest version of the area
            const freshArea = areasRef.current.find(a => a.id === areaId) || area;
            const newPhotosList = [...(freshArea.photos || [])];

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                setUploadProgress(`Subiendo ${i + 1}/${files.length}...`);
                let url = "";

                if (onPhotoUpload) {
                    try {
                        url = await onPhotoUpload(file);
                    } catch (err) {
                        console.warn("Custom onPhotoUpload failed, falling back to direct Storage upload:", err);
                    }
                }

                if (!url) {
                    // Compress to crisp 2K HD (max 2048px, quality 0.92)
                    const compressedBlob = await compressImage(file, 2048, 0.92);
                    const cleanName = file.name.replace(/\s+/g, '_');
                    const filename = `tickets/${ticket.id || 'general'}/surveys/${Date.now()}_${cleanName}`;
                    const storageRef = ref(storage, filename);

                    await uploadBytes(storageRef, compressedBlob, {
                        contentType: 'image/jpeg',
                        customMetadata: { 
                            ticketId: ticket.id || '', 
                            areaId: freshArea.id, 
                            areaName: freshArea.name 
                        }
                    });

                    url = await getDownloadURL(storageRef);
                }

                if (!url || url.startsWith('blob:') || url.startsWith('data:')) {
                    throw new Error("No se pudo obtener una URL de almacenamiento permanente válida.");
                }

                newPhotosList.push({
                    url,
                    type: "SURVEY",
                    area: freshArea.name,
                    areaId: freshArea.id,
                    description: `Evidencia en ${freshArea.name}`,
                    size: "medium"
                });
            }

            // Merge into latest areas from ref and persist
            const updated = areasRef.current.map(a => {
                if (a.id !== areaId) return a;
                return { ...a, photos: newPhotosList };
            });

            await updateAreas(updated);
        } catch (err: any) {
            console.error("Error uploading survey photos to Firebase Storage:", err);
            alert(`Error al subir las imágenes: ${err?.message || 'Verifica tu conexión a internet.'}`);
        } finally {
            setUploadingAreaId(null);
            setUploadProgress("");
            e.target.value = "";
        }
    };

    const handleRemovePhotoFromArea = (areaId: string, photoIndex: number) => {
        const targetArea = areasRef.current.find(a => a.id === areaId);
        if (!targetArea) return;
        const photos = [...(targetArea.photos || [])];
        photos.splice(photoIndex, 1);
        handleAreaChange(areaId, { photos });
    };

    const handlePhotoDescriptionChange = (areaId: string, photoIndex: number, desc: string) => {
        const targetArea = areasRef.current.find(a => a.id === areaId);
        if (!targetArea) return;
        const photos = [...(targetArea.photos || [])];
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
                                    <div className="flex items-center gap-3 flex-1 min-w-0 mr-2">
                                        <div className={`w-8 h-8 rounded-2xl flex-shrink-0 flex items-center justify-center font-black text-xs ${
                                            isExpanded ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-700"
                                        }`}>
                                            {idx + 1}
                                        </div>
                                        <div className="flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                                            <Input
                                                value={area.name}
                                                onChange={(e) => handleAreaChange(area.id, { name: e.target.value })}
                                                className={`h-8 text-xs font-black rounded-xl max-w-[220px] sm:max-w-xs transition-colors ${
                                                    isExpanded 
                                                    ? "bg-slate-800 text-white border-slate-700 focus:bg-slate-900" 
                                                    : "bg-white text-slate-900 border-slate-300"
                                                }`}
                                                placeholder="Nombre del Área / Ambiente"
                                            />
                                        </div>
                                        <span className={`text-[11px] font-mono hidden md:inline flex-shrink-0 ${isExpanded ? "text-slate-300" : "text-slate-500"}`}>
                                            {(area.areaSquareMeters && area.areaSquareMeters > 0) ? `${area.areaSquareMeters} m² • ` : ''}
                                            {area.requiredBtu && area.requiredBtu > 0 ? `${area.requiredBtu.toLocaleString()} BTU • ` : ''}
                                            {areaPhotos.length} {areaPhotos.length === 1 ? 'foto' : 'fotos'}
                                        </span>
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
                                                    {suggestBtuCapacity(area.areaSquareMeters || 0).text}
                                                </Badge>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-1">
                                                <div>
                                                    <Label className="text-[11px] font-bold text-slate-700">Nombre del Ambiente / Área</Label>
                                                    <Input
                                                        className="h-9 text-xs font-bold bg-slate-50 border-slate-300"
                                                        placeholder="Ej: Habitación Master, Sala / Comedor..."
                                                        value={area.name}
                                                        onChange={(e) => handleAreaChange(area.id, { name: e.target.value })}
                                                    />
                                                </div>
                                                <div>
                                                    <Label className="text-[11px] font-bold text-slate-700">Cálculo de Carga Térmica Sugerida</Label>
                                                    <div className="h-9 px-3 flex items-center bg-indigo-50 border border-indigo-200 rounded-xl text-xs font-bold text-indigo-900">
                                                        {suggestBtuCapacity(area.areaSquareMeters || 0).text}
                                                    </div>
                                                </div>
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
                                                        {area.areaSquareMeters && area.areaSquareMeters > 0 ? `${area.areaSquareMeters} m²` : "Sin medir"}
                                                    </div>
                                                </div>
                                                <div>
                                                    <Label className="text-[11px] font-bold text-amber-900">Capacidad / BTU</Label>
                                                    <select
                                                        className="w-full h-9 border rounded-xl px-2 text-xs bg-amber-50/70 border-amber-300 font-mono font-bold text-amber-950 focus:bg-white transition-colors"
                                                        value={area.requiredBtu || 0}
                                                        onChange={(e) => {
                                                            const btuVal = Number(e.target.value);
                                                            handleAreaChange(area.id, {
                                                                requiredBtu: btuVal,
                                                                recommendedEquipment: btuVal > 0 
                                                                    ? `Split Inverter ${btuVal.toLocaleString()} BTU ${area.voltage || '220V'}`
                                                                    : (area.recommendedEquipment || "")
                                                            });
                                                        }}
                                                    >
                                                        <option value={0}>Sin definir / No aplica (Área técnica)</option>
                                                        <option value={9000}>9,000 BTU (0.75 Ton)</option>
                                                        <option value={12000}>12,000 BTU (1.0 Ton)</option>
                                                        <option value={18000}>18,000 BTU (1.5 Ton)</option>
                                                        <option value={24000}>24,000 BTU (2.0 Ton)</option>
                                                        <option value={36000}>36,000 BTU (3.0 Ton)</option>
                                                        <option value={48000}>48,000 BTU (4.0 Ton)</option>
                                                        <option value={60000}>60,000 BTU (5.0 Ton)</option>
                                                    </select>
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
                                            <div className="flex items-center justify-between border-b pb-1.5 flex-wrap gap-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                                                        <Camera className="w-4 h-4 text-emerald-600" /> Evidencias Fotográficas ({area.name})
                                                    </span>
                                                    {uploadingAreaId === area.id && (
                                                        <span className="text-[11px] text-blue-600 font-bold flex items-center gap-1 animate-pulse">
                                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                            {uploadProgress}
                                                        </span>
                                                    )}
                                                </div>
                                                <label>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        multiple
                                                        disabled={uploadingAreaId === area.id}
                                                        className="hidden"
                                                        onChange={(e) => handleAddPhotoToArea(area.id, e)}
                                                    />
                                                    <Button 
                                                        type="button" 
                                                        size="sm" 
                                                        disabled={uploadingAreaId === area.id}
                                                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl h-8 gap-1 disabled:opacity-50" 
                                                        asChild
                                                    >
                                                        <span>
                                                            {uploadingAreaId === area.id ? (
                                                                <>
                                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Subiendo...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Upload className="w-3.5 h-3.5" /> Subir Fotos
                                                                </>
                                                            )}
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
