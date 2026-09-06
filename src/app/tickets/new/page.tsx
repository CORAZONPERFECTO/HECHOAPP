"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, addDoc, getDocs, serverTimestamp, query, where, orderBy } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Client, User, TicketPriority, Ticket, TicketType, SurveyArea } from "@/types/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ArrowRight, ArrowLeft, ShieldCheck, Zap, Sparkles, MapPin } from "lucide-react";

import { ClientSelector } from "@/components/shared/client-selector";
import { TechnicianSelector } from "@/components/shared/technician-selector";
import { generateNextTicketNumber } from "@/lib/tickets";
import { AITicketAssistant } from "@/components/tickets/ai-ticket-assistant";

const LOCATION_AREAS = [
    "CAP CANA",
    "PUNTA CANA RESORT",
    "VILLAGE",
    "VILLAGE WEST",
    "BAVARO",
    "OTROS"
];

export default function NewTicketPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);

    const [formData, setFormData] = useState<Partial<Ticket>>({
        status: 'OPEN',
        priority: 'MEDIUM',
        serviceType: 'MANTENIMIENTO' as any,
        isRetainer: true, // Predeterminado Villa con Iguala
        contractType: 'IGUALA',
        checklist: [],
        photos: [],
        surveyAreas: [],
        locationArea: "",
        specificLocation: "",
        locationUrl: "",
    });

    const handleAIParsed = (aiData: any) => {
        setFormData(prev => ({
            ...prev,
            description: aiData.description || prev.description,
            priority: aiData.priority || prev.priority,
            locationArea: aiData.locationArea || aiData.locationZone || prev.locationArea, // Map locationZone from AI
            specificLocation: aiData.specificLocation || 
                (aiData.locationStreet ? `Calle ${aiData.locationStreet} ` : '') + 
                (aiData.locationHouseNumber ? `No. ${aiData.locationHouseNumber}` : '') || prev.specificLocation,
            locationZone: aiData.locationZone || prev.locationZone,
            locationStreet: aiData.locationStreet || prev.locationStreet,
            locationHouseNumber: aiData.locationHouseNumber || prev.locationHouseNumber,
            locationUrl: aiData.locationUrl || prev.locationUrl,
        }));
        
        // Salto automático al paso 3 si la descripción es buena
        if (aiData.description) {
            setStep(3);
        }
    };

    useEffect(() => {
        const fetchTicketTypes = async () => {
            try {
                const q = query(collection(db, "ticketTypes"));
                const snapshot = await getDocs(q);
                const types = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as TicketType));
                setTicketTypes(types);
            } catch (error) {
                console.error("Error fetching ticket types:", error);
            }
        };

        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                fetchTicketTypes();
            }
        });

        return () => unsubscribe();
    }, []);

    const handleClientChange = async (client: Client) => {
        setFormData(prev => ({
            ...prev,
            clientId: client.id,
            clientName: client.nombreComercial,
            locationName: prev.locationName || client.nombreComercial,
        }));

        // Buscar tickets previos de este cliente para heredar ubicación, GPS y áreas de la villa
        try {
            const ticketsQuery = query(collection(db, "tickets"), where("clientId", "==", client.id));
            const snapshot = await getDocs(ticketsQuery);
            
            if (!snapshot.empty) {
                // Ordenar en memoria para obtener los más recientes
                const clientTickets = snapshot.docs.map(d => ({ 
                    ...d.data(), 
                    createdAt: d.data().createdAt?.toMillis ? d.data().createdAt.toMillis() : 0 
                })) as any[];
                clientTickets.sort((a, b) => b.createdAt - a.createdAt);
                
                // 1. Buscar último ticket con detalles de dirección física o GPS
                const lastTicketWithLocation = clientTickets.find(t => t.locationArea || t.locationStreet || t.specificLocation || t.locationUrl);

                // 2. Buscar último ticket que tenga áreas censadas de la villa
                const lastTicketWithAreas = clientTickets.find(t => t.surveyAreas && Array.isArray(t.surveyAreas) && t.surveyAreas.length > 0);

                let clonedAreas: SurveyArea[] = [];
                let isRetainerDetected = false;

                if (lastTicketWithAreas && lastTicketWithAreas.surveyAreas) {
                    clonedAreas = lastTicketWithAreas.surveyAreas.map((area: SurveyArea) => ({
                        id: `area-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                        name: area.name || "",
                        lengthMeters: area.lengthMeters || 0,
                        widthMeters: area.widthMeters || 0,
                        areaSquareMeters: area.areaSquareMeters || 0,
                        requiredBtu: area.requiredBtu || 0,
                        recommendedEquipment: area.recommendedEquipment || "",
                        voltage: area.voltage || "220V",
                        pipeDistanceMeters: area.pipeDistanceMeters || 0,
                        drainStatus: area.drainStatus || "",
                        notes: area.notes || "",
                        brand: area.brand || "",
                        modelNumber: area.modelNumber || "",
                        serialNumber: area.serialNumber || "",
                        refrigerant: area.refrigerant || "",
                        platePhotoUrl: area.platePhotoUrl || "",
                        boardPhotoUrl: area.boardPhotoUrl || "",
                        photos: [] // Se inicia limpio de fotos para la nueva visita
                    }));
                    isRetainerDetected = true;
                }

                if (lastTicketWithLocation?.isRetainer !== undefined) {
                    isRetainerDetected = lastTicketWithLocation.isRetainer;
                }

                setFormData(prev => ({
                    ...prev,
                    locationArea: prev.locationArea || lastTicketWithLocation?.locationArea || "",
                    specificLocation: prev.specificLocation || lastTicketWithLocation?.specificLocation || "",
                    locationStreet: prev.locationStreet || lastTicketWithLocation?.locationStreet || "",
                    locationHouseNumber: prev.locationHouseNumber || lastTicketWithLocation?.locationHouseNumber || "",
                    locationUrl: prev.locationUrl || lastTicketWithLocation?.locationUrl || "",
                    surveyAreas: clonedAreas.length > 0 ? clonedAreas : prev.surveyAreas,
                    isRetainer: isRetainerDetected ? true : prev.isRetainer,
                    contractType: isRetainerDetected ? 'IGUALA' : (prev.contractType || 'IGUALA'),
                }));
            }
        } catch (error) {
            console.error("Error fetching client's last ticket location and areas:", error);
        }
    };

    const [selectedTypeIds, setSelectedTypeIds] = useState<string[]>([]);

    useEffect(() => {
        if (formData.ticketTypeId && selectedTypeIds.length === 0) {
            setSelectedTypeIds([formData.ticketTypeId]);
        }
    }, []);

    const handleTypeToggle = (type: TicketType) => {
        setSelectedTypeIds(prev => {
            const isSelected = prev.includes(type.id);
            let newSelection;

            if (isSelected) {
                newSelection = prev.filter(id => id !== type.id);
            } else {
                newSelection = [...prev, type.id];
            }

            const selectedTypes = ticketTypes.filter(t => newSelection.includes(t.id));
            const primaryType = selectedTypes[0];

            const combinedChecklist = selectedTypes.flatMap((t, typeIndex) =>
                t.defaultChecklist.map((item, itemIndex) => ({
                    id: `chk-${Date.now()}-${typeIndex}-${itemIndex}`,
                    text: item.text,
                    checked: false
                }))
            );

            setFormData(prev => ({
                ...prev,
                ticketTypeId: primaryType?.id || '',
                serviceType: selectedTypes.map(t => t.name).join(' + ') as any,
                checklist: combinedChecklist
            }));

            return newSelection;
        });
    };

    const handleTechnicianChange = (techId: string, techName: string) => {
        setFormData(prev => ({
            ...prev,
            technicianId: techId,
            technicianName: techName,
            status: techId ? 'IN_PROGRESS' : 'OPEN'
        }));
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const ticketNumber = await generateNextTicketNumber();
            const fullLocation = `${formData.locationArea || ''} - ${formData.specificLocation || ''}`.trim().replace(/^- |- $/g, '');

            const ticketData: any = {
                ...formData,
                serviceType: formData.serviceType || "MANTENIMIENTO",
                number: ticketNumber,
                ticketNumber: ticketNumber,
                locationName: fullLocation || formData.locationName || "Ubicación no especificada",
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                createdBy: auth.currentUser?.uid || "SYSTEM",
            };

            if (auth.currentUser?.uid) {
                ticketData.creadoPorId = auth.currentUser.uid;
            }

            const cleanedData: any = {};
            Object.keys(ticketData).forEach(key => {
                const value = ticketData[key];
                if (value !== undefined && value !== null) {
                    cleanedData[key] = value;
                }
            });

            await addDoc(collection(db, "tickets"), cleanedData);
            router.push("/tickets");
        } catch (error) {
            console.error("Error creating ticket:", error);
            alert("Error al crear el ticket. Verifica tu conexión o permisos.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container max-w-2xl py-10">
            <h1 className="text-2xl font-bold mb-6">Nuevo Ticket de Servicio</h1>
            
            <AITicketAssistant onTicketParsed={handleAIParsed} />

            {/* Steps Indicator */}
            <div className="flex gap-4 mb-8">
                <div className={`h-2 flex-1 rounded-full ${step >= 1 ? 'bg-blue-600' : 'bg-gray-200'}`} />
                <div className={`h-2 flex-1 rounded-full ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`} />
                <div className={`h-2 flex-1 rounded-full ${step >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`} />
            </div>

            <div className="bg-white p-6 rounded-lg border shadow-sm">
                {step === 1 && (
                    <div className="space-y-6">
                        <h2 className="text-lg font-semibold">Paso 1: Cliente y Ubicación</h2>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Cliente</Label>
                                <ClientSelector
                                    onSelect={handleClientChange}
                                    value={formData.clientId} // Assuming ClientSelector takes value or defaultSelected
                                />
                                {formData.clientName && <p className="text-sm text-green-600">Seleccionado: {formData.clientName}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Área / Zona</Label>
                                    <Select
                                        value={formData.locationArea}
                                        onValueChange={(val) => setFormData(prev => ({ ...prev, locationArea: val }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {LOCATION_AREAS.map(area => (
                                                <SelectItem key={area} value={area}>{area}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Ubicación Específica</Label>
                                    <Input
                                        value={formData.specificLocation}
                                        onChange={e => setFormData(prev => ({ ...prev, specificLocation: e.target.value }))}
                                        placeholder="Ej: Villa 12, Apto 4B..."
                                    />
                                </div>
                            </div>

                            {/* Modalidad de Contrato / Servicio */}
                            <div className="space-y-2 pt-1">
                                <Label className="text-xs font-bold text-slate-700">Modalidad del Servicio / Contrato</Label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div
                                        onClick={() => setFormData(prev => ({ ...prev, isRetainer: true, contractType: 'IGUALA' }))}
                                        className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                                            formData.isRetainer
                                                ? 'border-blue-600 bg-blue-50/70 shadow-sm'
                                                : 'border-slate-200 hover:border-slate-300 bg-white'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <ShieldCheck className={`w-5 h-5 ${formData.isRetainer ? 'text-blue-600' : 'text-slate-400'}`} />
                                            <span className="text-xs font-bold text-slate-800">Villa con Iguala (Contrato)</span>
                                        </div>
                                        <p className="text-[11px] text-slate-500 mt-1 pl-7 leading-relaxed">
                                            Hereda las áreas y equipos. El técnico subirá fotos por cada aire para la bitácora histórica.
                                        </p>
                                    </div>

                                    <div
                                        onClick={() => setFormData(prev => ({ ...prev, isRetainer: false, contractType: 'EVENTUAL' }))}
                                        className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                                            !formData.isRetainer
                                                ? 'border-amber-500 bg-amber-50/70 shadow-sm'
                                                : 'border-slate-200 hover:border-slate-300 bg-white'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Zap className={`w-5 h-5 ${!formData.isRetainer ? 'text-amber-600' : 'text-slate-400'}`} />
                                            <span className="text-xs font-bold text-slate-800">Servicio Eventual (Sin Iguala)</span>
                                        </div>
                                        <p className="text-[11px] text-slate-500 mt-1 pl-7 leading-relaxed">
                                            Visita puntual estándar. Evidencias generales (Antes/Después) sin inventariar áreas continuas.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Alerta de Áreas Heredadas si es Villa con Iguala */}
                            {formData.isRetainer && formData.surveyAreas && formData.surveyAreas.length > 0 && (
                                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900 shadow-sm">
                                    <div className="flex items-center gap-2 min-w-0 pr-2">
                                        <Sparkles className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                                        <span className="truncate">
                                            <strong>{formData.surveyAreas.length} {formData.surveyAreas.length === 1 ? 'área heredada' : 'áreas heredadas'}:</strong> {formData.surveyAreas.map(a => a.name).join(', ')}.
                                        </span>
                                    </div>
                                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-200/70 px-2 py-0.5 rounded-full flex-shrink-0">
                                        Censo Activo
                                    </span>
                                </div>
                            )}

                            {/* Link de GPS / Google Maps */}
                            <div className="space-y-1.5 pt-1">
                                <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5 text-blue-600" /> Link de Ubicación GPS (Google Maps / Waze)
                                </Label>
                                <Input
                                    value={formData.locationUrl || ""}
                                    onChange={e => setFormData(prev => ({ ...prev, locationUrl: e.target.value }))}
                                    placeholder="Pega el link de Google Maps o WhatsApp de la villa..."
                                    className="text-xs font-mono"
                                />
                                <p className="text-[10px] text-slate-400">
                                    💡 El técnico podrá hacer clic en este enlace desde su app para navegar directo a la propiedad.
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button onClick={() => setStep(2)} disabled={!formData.clientId}>
                                Siguiente <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
                {step === 2 && (
                    <div className="space-y-6">
                        <h2 className="text-lg font-semibold">Paso 2: Selecciona los Servicios (Múltiple) ✅</h2>

                        <div className="grid grid-cols-2 gap-4">
                            {ticketTypes.map(type => {
                                const isSelected = selectedTypeIds.includes(type.id);
                                return (
                                    <button
                                        key={type.id}
                                        onClick={() => handleTypeToggle(type)}
                                        className={`p-4 rounded-lg border text-left transition-all ${isSelected
                                            ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600'
                                            : 'hover:border-gray-300 hover:bg-gray-50'
                                            }`}
                                        style={{ borderColor: isSelected ? type.color : '' }}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold transition-transform duration-200"
                                                style={{
                                                    backgroundColor: type.color || '#3b82f6',
                                                    transform: isSelected ? 'scale(1.1)' : 'scale(1)'
                                                }}
                                            >
                                                {isSelected ? '✓' : type.name.charAt(0)}
                                            </div>
                                            <div>
                                                <span className="font-medium block">{type.name}</span>
                                                <span className="text-xs text-gray-500">{type.description}</span>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {ticketTypes.length === 0 && (
                            <div className="text-center p-8 border-2 border-dashed rounded-lg text-gray-500">
                                No hay tipos de ticket configurados. Ve a Ajustes para crear uno.
                            </div>
                        )}

                        <div className="flex justify-between pt-4">
                            <Button variant="outline" onClick={() => setStep(1)}>
                                <ArrowLeft className="mr-2 h-4 w-4" /> Anterior
                            </Button>
                            <Button onClick={() => setStep(3)} disabled={selectedTypeIds.length === 0}>
                                Siguiente <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )
                }

                {
                    step === 3 && (
                        <div className="space-y-6">
                            <h2 className="text-lg font-semibold">Paso 3: Detalles y Asignación</h2>

                            <div className="space-y-2">
                                <Label>Descripción Inicial</Label>
                                <Textarea
                                    value={formData.description}
                                    onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Describe el problema o requerimiento..."
                                    className="h-32"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>Prioridad</Label>
                                    <Select
                                        value={formData.priority}
                                        onValueChange={(val: TicketPriority) => setFormData(prev => ({ ...prev, priority: val }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="LOW">Baja</SelectItem>
                                            <SelectItem value="MEDIUM">Media</SelectItem>
                                            <SelectItem value="HIGH">Alta</SelectItem>
                                            <SelectItem value="URGENT">Crítica</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Asignar Técnico (Opcional)</Label>
                                    <TechnicianSelector
                                        value={formData.technicianId}
                                        onSelect={handleTechnicianChange}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-between pt-4">
                                <Button variant="outline" onClick={() => setStep(2)}>
                                    <ArrowLeft className="mr-2 h-4 w-4" /> Anterior
                                </Button>
                                <Button onClick={handleSubmit} disabled={loading || !formData.description}>
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Crear Ticket
                                </Button>
                            </div>
                        </div>
                    )
                }
            </div >
        </div>
    );
}
