"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { 
    CheckCircle2, 
    Circle, 
    Camera, 
    Wrench, 
    Sparkles, 
    ChevronDown, 
    ChevronUp, 
    Upload, 
    Loader2, 
    Gauge, 
    FileText, 
    ExternalLink, 
    AlertCircle,
    Building2,
    ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Ticket, TicketPhoto } from "@/types/tickets";
import { EquipmentPassport } from "@/types/equipment";
import { getEquipmentByLocation, getEquipmentByCodeOrQr } from "@/lib/equipment-service";
import { EquipmentQrScannerModal } from "@/components/equipment/equipment-qr-scanner-modal";
import { doc, updateDoc, serverTimestamp, addDoc, collection } from "firebase/firestore";
import { db, storage, auth } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

interface EquipmentServiceChecklistProps {
    ticket: Ticket;
    onTicketUpdated: (updatedTicket: Ticket) => void;
}

interface EquipmentItemState {
    equipment: EquipmentPassport;
    completed: boolean;
    psiLow?: string;
    amp?: string;
    tempDelta?: string;
    notes?: string;
    tasks: {
        filters: boolean;
        evaporatorCoil: boolean;
        drainage: boolean;
        condenserCoil: boolean;
    };
}

export function EquipmentServiceChecklist({ ticket, onTicketUpdated }: EquipmentServiceChecklistProps) {
    const [equipments, setEquipments] = useState<EquipmentPassport[]>([]);
    const [itemsState, setItemsState] = useState<Record<string, EquipmentItemState>>({});
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [qrScannerOpen, setQrScannerOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [uploadingStage, setUploadingStage] = useState<{ eqId: string; stage: 'BEFORE' | 'DURING' | 'AFTER' } | null>(null);
    const [savingEqId, setSavingEqId] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const currentTargetRef = useRef<{ eqId: string; stage: 'BEFORE' | 'DURING' | 'AFTER' } | null>(null);

    // Estado para escaneo de manómetros / pinzas amperimétricas con IA
    const [scanningGaugeEqId, setScanningGaugeEqId] = useState<string | null>(null);
    const [gaugeDiagnosis, setGaugeDiagnosis] = useState<Record<string, { note: string; status: string; confidence?: string }>>({});
    const gaugeInputRef = useRef<HTMLInputElement | null>(null);
    const currentGaugeTargetRef = useRef<string | null>(null);

    // Cargar equipos de la ubicación o desde surveyAreas del ticket
    useEffect(() => {
        const fetchEquipments = async () => {
            setLoading(true);
            try {
                let list: EquipmentPassport[] = [];

                if (ticket.locationId) {
                    list = await getEquipmentByLocation(ticket.locationId);
                }

                // Si hay equipmentIds seleccionados en el ticket, filtrar la lista
                if (ticket.equipmentIds && ticket.equipmentIds.length > 0 && list.length > 0) {
                    list = list.filter(eq => ticket.equipmentIds?.includes(eq.id) || ticket.equipmentIds?.includes(eq.code));
                }

                // Si aún no hay equipos en la colección pero el ticket tiene surveyAreas, creamos objetos temporales
                if (list.length === 0 && ticket.surveyAreas && ticket.surveyAreas.length > 0) {
                    list = ticket.surveyAreas.map((area, idx) => ({
                        id: area.id || `temp-area-${idx}`,
                        code: `EQ-${(area.id || String(idx + 1)).slice(0, 5).toUpperCase()}`,
                        qrToken: `TOKEN-${idx + 1}`,
                        clientId: ticket.clientId || "",
                        locationId: ticket.locationId || "",
                        locationName: ticket.locationName,
                        areaName: area.name,
                        specs: {
                            brand: area.brand || "Genérica",
                            model: area.modelNumber || "",
                            serialNumber: area.serialNumber || "",
                            btu: area.btuCapacity || 18000,
                            refrigerant: area.refrigerant || "R410A",
                            voltage: "220V"
                        },
                        status: "OPERATIONAL",
                        platePhotoUrl: area.platePhotoUrl,
                        boardPhotoUrl: area.boardPhotoUrl,
                        createdAt: null,
                        updatedAt: null
                    }));
                }

                setEquipments(list);

                // Inicializar estados de cada equipo
                const initialMap: Record<string, EquipmentItemState> = {};
                list.forEach((eq, idx) => {
                    const eqPhotos = (ticket.photos || []).filter(p => p.equipmentId === eq.id || p.areaId === eq.id);
                    const hasAfter = eqPhotos.some(p => p.type === 'AFTER');

                    initialMap[eq.id] = {
                        equipment: eq,
                        completed: hasAfter || false,
                        tasks: {
                            filters: true,
                            evaporatorCoil: true,
                            drainage: true,
                            condenserCoil: true
                        }
                    };
                });
                setItemsState(initialMap);

                if (list.length > 0) {
                    setExpandedId(list[0].id);
                }
            } catch (err) {
                console.error("Error loading equipments for checklist:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchEquipments();
    }, [ticket.locationId, ticket.id]);

    const handleQrScanned = async (scannedCode: string) => {
        // 1. Buscar en la lista local por código o id
        const clean = scannedCode.trim().toLowerCase();
        let found = equipments.find(e => 
            e.code.toLowerCase() === clean || 
            e.id.toLowerCase() === clean || 
            (e.qrToken && e.qrToken.toLowerCase() === clean)
        );

        // 2. Si no está en la lista local, intentar resolver con la base de datos
        if (!found) {
            const dbEq = await getEquipmentByCodeOrQr(scannedCode);
            if (dbEq) {
                found = dbEq;
                setEquipments(prev => [dbEq, ...prev]);
                setItemsState(prev => ({
                    ...prev,
                    [dbEq.id]: {
                        equipment: dbEq,
                        completed: false,
                        tasks: { filters: true, evaporatorCoil: true, drainage: true, condenserCoil: true }
                    }
                }));
            }
        }

        if (found) {
            setExpandedId(found.id);
            // Scroll suave hacia el equipo
            const element = document.getElementById(`eq-card-${found.id}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        } else {
            alert(`Equipo no encontrado con código: ${scannedCode}`);
        }
    };

    const triggerUpload = (eqId: string, stage: 'BEFORE' | 'DURING' | 'AFTER') => {
        currentTargetRef.current = { eqId, stage };
        setUploadingStage({ eqId, stage });
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !currentTargetRef.current) return;

        const { eqId, stage } = currentTargetRef.current;
        setUploadingStage({ eqId, stage });

        try {
            const user = auth.currentUser;
            const uid = user?.uid || "tech";
            const filename = `tickets/${ticket.id}/equipments/${eqId}_${stage}_${Date.now()}.jpg`;
            const storageRef = ref(storage, filename);

            await uploadBytes(storageRef, file, { contentType: file.type });
            const downloadUrl = await getDownloadURL(storageRef);

            const eq = equipments.find(item => item.id === eqId);

            const newPhoto: TicketPhoto = {
                url: downloadUrl,
                type: stage,
                areaId: eqId,
                equipmentId: eqId,
                area: eq?.areaName || eq?.name,
                description: `Evidencia ${stage} - ${eq?.areaName || eq?.name}`,
                timestamp: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }
            };

            const updatedPhotos = [...(ticket.photos || []), newPhoto];

            // Actualizar ticket en Firestore
            if (ticket.id) {
                await updateDoc(doc(db, "tickets", ticket.id), {
                    photos: updatedPhotos,
                    updatedAt: serverTimestamp()
                });
            }

            onTicketUpdated({
                ...ticket,
                photos: updatedPhotos
            });

        } catch (error) {
            console.error("Error uploading equipment photo:", error);
            alert("Error al subir la fotografía de evidencia.");
        } finally {
            setUploadingStage(null);
            currentTargetRef.current = null;
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    // Disparar escaneo de manómetro / pinza con cámara e IA
    const triggerGaugeScan = (eqId: string) => {
        currentGaugeTargetRef.current = eqId;
        if (gaugeInputRef.current) {
            gaugeInputRef.current.value = "";
            gaugeInputRef.current.click();
        }
    };

    const handleGaugeFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        const eqId = currentGaugeTargetRef.current;
        if (!file || !eqId) return;

        setScanningGaugeEqId(eqId);
        try {
            const eq = equipments.find(item => item.id === eqId);

            // 1. Convertir imagen a base64 para Gemini Multimodal
            const reader = new FileReader();
            const base64Promise = new Promise<string>((resolve, reject) => {
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
            });
            reader.readAsDataURL(file);
            const base64String = await base64Promise;

            // 2. Enviar a /api/gemini para extracción de lecturas
            const apiRes = await fetch("/api/gemini", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    task: "extract-gauge-readings",
                    image: base64String,
                    context: {
                        refrigerant: eq?.specs?.refrigerant || "R410A",
                        btu: eq?.specs?.btu || 18000,
                        brand: eq?.specs?.brand || "Genérica"
                    }
                })
            });

            const data = await apiRes.json();
            if (data.output) {
                const { psiLow, amp, tempDelta, diagnosis, status, confidence } = data.output;

                setItemsState(prev => {
                    const current = prev[eqId] || { completed: false, tasks: { filters: false, evaporatorCoil: false, drainage: false, condenserCoil: false } };
                    return {
                        ...prev,
                        [eqId]: {
                            ...current,
                            psiLow: (psiLow !== null && psiLow !== undefined && psiLow !== "") ? String(psiLow) : current.psiLow,
                            amp: (amp !== null && amp !== undefined && amp !== "") ? String(amp) : current.amp,
                            tempDelta: (tempDelta !== null && tempDelta !== undefined && tempDelta !== "") ? String(tempDelta) : current.tempDelta
                        }
                    };
                });

                if (diagnosis) {
                    setGaugeDiagnosis(prev => ({
                        ...prev,
                        [eqId]: { note: diagnosis, status: status || "NORMAL", confidence }
                    }));
                }
            }

            // 3. Guardar la foto del manómetro en Storage como evidencia técnica de la orden
            const filename = `tickets/${ticket.id}/equipments/${eqId}_GAUGE_${Date.now()}.jpg`;
            const storageRef = ref(storage, filename);
            await uploadBytes(storageRef, file, { contentType: file.type });
            const downloadUrl = await getDownloadURL(storageRef);

            const newPhoto: TicketPhoto = {
                url: downloadUrl,
                type: "DURING",
                areaId: eqId,
                equipmentId: eqId,
                area: eq?.areaName || eq?.name,
                description: `Lectura de Manómetros / Instrumentos - ${eq?.code}`,
                timestamp: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }
            };

            const updatedPhotos = [...(ticket.photos || []), newPhoto];
            if (ticket.id) {
                await updateDoc(doc(db, "tickets", ticket.id), {
                    photos: updatedPhotos,
                    updatedAt: serverTimestamp()
                });
            }

            onTicketUpdated({
                ...ticket,
                photos: updatedPhotos
            });

        } catch (err) {
            console.error("Error scanning gauge with AI:", err);
            alert("No se pudo procesar la imagen del manómetro. Puedes ingresar los valores manualmente.");
        } finally {
            setScanningGaugeEqId(null);
            currentGaugeTargetRef.current = null;
            if (gaugeInputRef.current) gaugeInputRef.current.value = "";
        }
    };

    const handleSaveEquipmentIntervention = async (eqId: string) => {
        setSavingEqId(eqId);
        try {
            const state = itemsState[eqId];
            if (!state) return;

            const eq = state.equipment;
            const eqPhotos = (ticket.photos || []).filter(p => p.equipmentId === eqId || p.areaId === eqId);

            // 1. Guardar o registrar la intervención en la colección 'interventions'
            const interventionData = {
                equipmentId: eq.id,
                equipmentCode: eq.code,
                ticketId: ticket.id,
                locationId: ticket.locationId || "",
                locationName: ticket.locationName || "",
                areaName: eq.areaName || eq.name,
                date: serverTimestamp(),
                technicianId: ticket.technicianId || auth.currentUser?.uid || "tech",
                technicianName: ticket.technicianName || "Técnico HECHO",
                serviceType: (ticket.serviceType as any) || "PREVENTIVO",
                workDone: `Mantenimiento de unidad en ${eq.areaName}. Filtros lavados, serpentín y turbina desinfectados, drenaje probado.`,
                diagnosis: state.notes || "Equipo operando con normalidad tras servicio.",
                measurements: {
                    psiLow: state.psiLow ? parseFloat(state.psiLow) : undefined,
                    amp: state.amp ? parseFloat(state.amp) : undefined,
                    tempDelta: state.tempDelta ? parseFloat(state.tempDelta) : undefined,
                },
                photos: eqPhotos.map(p => ({
                    url: p.url,
                    stage: p.type as any,
                    caption: p.description
                })),
                createdAt: serverTimestamp()
            };

            await addDoc(collection(db, "interventions"), interventionData);

            // 2. Marcar localmente como completado
            setItemsState(prev => ({
                ...prev,
                [eqId]: {
                    ...prev[eqId],
                    completed: true
                }
            }));

            // Si hay un siguiente equipo pendiente, auto-expandirlo
            const nextPending = equipments.find(e => e.id !== eqId && !itemsState[e.id]?.completed);
            if (nextPending) {
                setExpandedId(nextPending.id);
            }

        } catch (error) {
            console.error("Error saving equipment intervention:", error);
            alert("Error al registrar la intervención del equipo.");
        } finally {
            setSavingEqId(null);
        }
    };

    if (loading) {
        return (
            <div className="py-8 text-center space-y-2">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto" />
                <p className="text-xs text-slate-500">Cargando inventario de equipos de la Villa...</p>
            </div>
        );
    }

    if (equipments.length === 0) {
        return (
            <Card className="border-slate-200">
                <CardContent className="py-8 text-center space-y-3">
                    <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
                    <h3 className="text-sm font-bold text-slate-700">Sin equipos asignados</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        Este ticket no tiene equipos precargados. Puedes escanear el QR físico de un aire para asociarlo a este ticket ahora.
                    </p>
                    <Button onClick={() => setQrScannerOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-xs">
                        <Camera className="w-3.5 h-3.5 mr-1.5" /> Escanear QR del Equipo
                    </Button>
                </CardContent>
            </Card>
        );
    }

    const completedCount = Object.values(itemsState).filter(s => s.completed).length;
    const progressPercent = Math.round((completedCount / equipments.length) * 100);

    return (
        <div className="space-y-4">
            {/* Input invisible para fotos de la cámara */}
            <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileChange}
            />

            {/* Input invisible para escanear manómetros con IA */}
            <input
                type="file"
                ref={gaugeInputRef}
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleGaugeFileChange}
            />

            {/* Barra Superior de Progreso & Botón de Escáner QR */}
            <Card className="bg-white border-blue-200 shadow-xs">
                <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                                Mantenimiento de Equipos
                            </span>
                            <h3 className="text-sm font-bold text-slate-800">
                                {completedCount} de {equipments.length} aires completados ({progressPercent}%)
                            </h3>
                        </div>

                        <Button
                            size="sm"
                            onClick={() => setQrScannerOpen(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-xs font-bold shadow-sm h-8"
                        >
                            <Camera className="w-3.5 h-3.5 mr-1.5" />
                            Escanear QR
                        </Button>
                    </div>

                    <Progress value={progressPercent} className="h-2 bg-slate-100" />
                </CardContent>
            </Card>

            {/* Lista de Equipos a Intervenir */}
            <div className="space-y-3">
                {equipments.map((eq, index) => {
                    const state = itemsState[eq.id] || { completed: false };
                    const isExpanded = expandedId === eq.id;
                    const eqPhotos = (ticket.photos || []).filter(p => p.equipmentId === eq.id || p.areaId === eq.id);
                    const beforePhotos = eqPhotos.filter(p => p.type === 'BEFORE');
                    const duringPhotos = eqPhotos.filter(p => p.type === 'DURING');
                    const afterPhotos = eqPhotos.filter(p => p.type === 'AFTER');

                    return (
                        <Card
                            key={eq.id}
                            id={`eq-card-${eq.id}`}
                            className={`border transition-all shadow-xs ${
                                state.completed
                                    ? 'border-emerald-200 bg-emerald-50/20'
                                    : isExpanded
                                    ? 'border-blue-400 ring-1 ring-blue-400 bg-white'
                                    : 'border-slate-200 bg-white hover:border-slate-300'
                            }`}
                        >
                            {/* Cabecera del Equipo (Clic para colapsar/expandir) */}
                            <div
                                onClick={() => setExpandedId(isExpanded ? null : eq.id)}
                                className="p-3.5 flex items-center justify-between cursor-pointer select-none"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="flex-shrink-0">
                                        {state.completed ? (
                                            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                                        ) : (
                                            <Circle className="w-6 h-6 text-slate-300" />
                                        )}
                                    </div>
                                    <div className="min-w-0 truncate">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-[10px] font-bold bg-slate-900 text-white px-1.5 py-0.2 rounded">
                                                {eq.code}
                                            </span>
                                            <span className="font-bold text-sm text-slate-900 truncate">
                                                {eq.areaName || eq.name}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                            {eq.specs.brand} {eq.specs.btu ? `• ${eq.specs.btu} BTU` : ''} {eq.specs.refrigerant ? `• ${eq.specs.refrigerant}` : ''}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <span className="text-[11px] font-semibold text-slate-600 hidden sm:inline-block">
                                        {eqPhotos.length} {eqPhotos.length === 1 ? 'foto' : 'fotos'}
                                    </span>
                                    {isExpanded ? (
                                        <ChevronUp className="w-4 h-4 text-slate-400" />
                                    ) : (
                                        <ChevronDown className="w-4 h-4 text-slate-400" />
                                    )}
                                </div>
                            </div>

                            {/* Contenido Expandido: Captura Rápida de Evidencias & Parámetros */}
                            {isExpanded && (
                                <CardContent className="p-4 pt-1 border-t space-y-4 text-xs bg-slate-50/40">
                                    {/* 1. Captura Rápida de Fotos: ANTES / DURANTE / DESPUÉS */}
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                                            <span>Evidencias Fotográficas ({eqPhotos.length})</span>
                                            <span className="text-[10px] text-slate-400 font-normal">Toca para capturar con cámara</span>
                                        </Label>

                                        <div className="grid grid-cols-3 gap-2">
                                            {/* Botón ANTES */}
                                            <div className="space-y-1 text-center">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => triggerUpload(eq.id, 'BEFORE')}
                                                    disabled={uploadingStage?.eqId === eq.id}
                                                    className={`w-full h-16 flex flex-col items-center justify-center p-1 rounded-xl border-dashed ${
                                                        beforePhotos.length > 0 ? 'border-blue-500 bg-blue-50/50 text-blue-900' : 'bg-white'
                                                    }`}
                                                >
                                                    {uploadingStage?.eqId === eq.id && uploadingStage?.stage === 'BEFORE' ? (
                                                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                                                    ) : (
                                                        <>
                                                            <Camera className="w-4 h-4 mb-1 text-blue-600" />
                                                            <span className="font-bold text-[10px]">ANTES</span>
                                                            <span className="text-[9px] text-slate-400">
                                                                {beforePhotos.length > 0 ? `(${beforePhotos.length})` : 'Subir'}
                                                            </span>
                                                        </>
                                                    )}
                                                </Button>
                                            </div>

                                            {/* Botón DURANTE */}
                                            <div className="space-y-1 text-center">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => triggerUpload(eq.id, 'DURING')}
                                                    disabled={uploadingStage?.eqId === eq.id}
                                                    className={`w-full h-16 flex flex-col items-center justify-center p-1 rounded-xl border-dashed ${
                                                        duringPhotos.length > 0 ? 'border-blue-500 bg-blue-50/50 text-blue-900' : 'bg-white'
                                                    }`}
                                                >
                                                    {uploadingStage?.eqId === eq.id && uploadingStage?.stage === 'DURING' ? (
                                                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                                                    ) : (
                                                        <>
                                                            <Wrench className="w-4 h-4 mb-1 text-amber-600" />
                                                            <span className="font-bold text-[10px]">DURANTE</span>
                                                            <span className="text-[9px] text-slate-400">
                                                                {duringPhotos.length > 0 ? `(${duringPhotos.length})` : 'Subir'}
                                                            </span>
                                                        </>
                                                    )}
                                                </Button>
                                            </div>

                                            {/* Botón DESPUÉS */}
                                            <div className="space-y-1 text-center">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => triggerUpload(eq.id, 'AFTER')}
                                                    disabled={uploadingStage?.eqId === eq.id}
                                                    className={`w-full h-16 flex flex-col items-center justify-center p-1 rounded-xl border-dashed ${
                                                        afterPhotos.length > 0 ? 'border-emerald-500 bg-emerald-50/50 text-emerald-900' : 'bg-white'
                                                    }`}
                                                >
                                                    {uploadingStage?.eqId === eq.id && uploadingStage?.stage === 'AFTER' ? (
                                                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                                                    ) : (
                                                        <>
                                                            <Sparkles className="w-4 h-4 mb-1 text-emerald-600" />
                                                            <span className="font-bold text-[10px]">DESPUÉS</span>
                                                            <span className="text-[9px] text-slate-400">
                                                                {afterPhotos.length > 0 ? `(${afterPhotos.length})` : 'Subir'}
                                                            </span>
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Miniaturas de fotos tomadas para este equipo */}
                                        {eqPhotos.length > 0 && (
                                            <div className="flex gap-2 overflow-x-auto py-1 pt-2">
                                                {eqPhotos.map((p, pIdx) => (
                                                    <div key={pIdx} className="relative flex-shrink-0">
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img
                                                            src={p.url}
                                                            alt="Evidencia"
                                                            className="w-16 h-16 object-cover rounded-lg border shadow-2xs"
                                                            onClick={() => window.open(p.url, "_blank")}
                                                        />
                                                        <span className="absolute bottom-0 inset-x-0 bg-black/70 text-white text-[8px] font-bold text-center py-0.5 rounded-b-lg uppercase">
                                                            {p.type}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* 2. Mediciones Técnicas de Manómetros / Pinza */}
                                    <div className="space-y-2 pt-1">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                                <Gauge className="w-3.5 h-3.5 text-blue-600" /> Parámetros de Operación
                                            </Label>

                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => triggerGaugeScan(eq.id)}
                                                disabled={scanningGaugeEqId === eq.id}
                                                className="h-7 px-2.5 text-[11px] font-semibold gap-1.5 border-blue-200 text-blue-700 bg-blue-50/70 hover:bg-blue-100 transition-all active:scale-95 shadow-2xs"
                                            >
                                                {scanningGaugeEqId === eq.id ? (
                                                    <>
                                                        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                                                        <span>Leyendo Manómetro...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Sparkles className="w-3 h-3 text-blue-600" />
                                                        <span>Escanear con IA</span>
                                                    </>
                                                )}
                                            </Button>
                                        </div>

                                        <div className="grid grid-cols-3 gap-2">
                                            <div>
                                                <span className="text-[10px] text-slate-500 block">PSI Baja</span>
                                                <Input
                                                    placeholder="Ej: 120"
                                                    value={state.psiLow || ""}
                                                    onChange={e => setItemsState(prev => ({
                                                        ...prev,
                                                        [eq.id]: { ...prev[eq.id], psiLow: e.target.value }
                                                    }))}
                                                    className="h-8 text-xs font-mono bg-white"
                                                />
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-slate-500 block">Consumo (A)</span>
                                                <Input
                                                    placeholder="Ej: 4.8"
                                                    value={state.amp || ""}
                                                    onChange={e => setItemsState(prev => ({
                                                        ...prev,
                                                        [eq.id]: { ...prev[eq.id], amp: e.target.value }
                                                    }))}
                                                    className="h-8 text-xs font-mono bg-white"
                                                />
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-slate-500 block">Salto ΔT (°C)</span>
                                                <Input
                                                    placeholder="Ej: 12"
                                                    value={state.tempDelta || ""}
                                                    onChange={e => setItemsState(prev => ({
                                                        ...prev,
                                                        [eq.id]: { ...prev[eq.id], tempDelta: e.target.value }
                                                    }))}
                                                    className="h-8 text-xs font-mono bg-white"
                                                />
                                            </div>
                                        </div>

                                        {/* Banner de Diagnóstico IA si se escaneó */}
                                        {gaugeDiagnosis[eq.id] && (
                                            <div className={`p-2.5 rounded-lg border text-[11px] flex items-start gap-2 animate-in fade-in duration-200 ${
                                                gaugeDiagnosis[eq.id].status === 'NORMAL'
                                                    ? 'bg-emerald-50/90 border-emerald-200 text-emerald-900'
                                                    : gaugeDiagnosis[eq.id].status === 'LOW_PRESSURE'
                                                    ? 'bg-amber-50/90 border-amber-200 text-amber-900'
                                                    : 'bg-blue-50/90 border-blue-200 text-blue-900'
                                            }`}>
                                                <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
                                                <div className="space-y-0.5">
                                                    <span className="font-bold">Diagnóstico IA ({eq.specs.refrigerant || "R410A"}): </span>
                                                    <span>{gaugeDiagnosis[eq.id].note}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* 3. Acciones Finales: Guardar y Enlace a Pasaporte */}
                                    <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-between items-center border-t">
                                        <Link
                                            href={`/equipment/${eq.id}`}
                                            target="_blank"
                                            className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1"
                                        >
                                            Ver Pasaporte Digital <ExternalLink className="w-3 h-3" />
                                        </Link>

                                        <Button
                                            size="sm"
                                            onClick={() => handleSaveEquipmentIntervention(eq.id)}
                                            disabled={savingEqId === eq.id}
                                            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8"
                                        >
                                            {savingEqId === eq.id ? (
                                                <>
                                                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                                    Guardando...
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                                                    Marcar Equipo como Completado
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </CardContent>
                            )}
                        </Card>
                    );
                })}
            </div>

            {/* Modal de Escaneo QR con Cámara */}
            <EquipmentQrScannerModal
                open={qrScannerOpen}
                onOpenChange={setQrScannerOpen}
                onScan={handleQrScanned}
            />
        </div>
    );
}
