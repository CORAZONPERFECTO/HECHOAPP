"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, addDoc, getDocs, serverTimestamp, query, where, orderBy } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Client, User, TicketPriority, Ticket, TicketType, SurveyArea } from "@/types/schema";
import { Location } from "@/types/assets";
import { EquipmentPassport } from "@/types/equipment";
import { getEquipmentByLocation, generatePropertyCode, promoteSurveyAreasToEquipment } from "@/lib/equipment-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ArrowRight, ArrowLeft, ShieldCheck, Zap, Sparkles, MapPin, Building2, CheckSquare, Square, Wrench } from "lucide-react";

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
        equipmentIds: [],
    });

    // Estados para jerarquía Cliente -> Villa (locations) -> Equipos (equipment)
    const [clientLocations, setClientLocations] = useState<Location[]>([]);
    const [selectedLocationId, setSelectedLocationId] = useState<string>("");
    const [availableEquipments, setAvailableEquipments] = useState<EquipmentPassport[]>([]);
    const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<string[]>([]);
    const [equipmentScope, setEquipmentScope] = useState<'ALL' | 'CUSTOM'>('ALL');
    const [saveAsPermanentLocation, setSaveAsPermanentLocation] = useState(false);
    const [loadingEquipments, setLoadingEquipments] = useState(false);

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

    // Selecciona una Villa y carga sus equipos registrados
    const selectLocation = async (loc: Location) => {
        setSelectedLocationId(loc.id);
        setLoadingEquipments(true);

        const isRetainer = loc.isRetainer !== undefined ? loc.isRetainer : true;

        setFormData(prev => ({
            ...prev,
            locationId: loc.id,
            locationName: loc.nombre,
            locationArea: loc.locationArea || prev.locationArea || "",
            specificLocation: loc.specificLocation || loc.nombre,
            locationUrl: loc.locationUrl || prev.locationUrl || "",
            isRetainer,
            contractType: isRetainer ? 'IGUALA' : 'EVENTUAL',
        }));

        try {
            // Cargar equipos registrados en la colección 'equipment'
            const eqs = await getEquipmentByLocation(loc.id);

            let allAreas: SurveyArea[] = [];
            let eqIds: string[] = [];

            if (eqs.length > 0) {
                setAvailableEquipments(eqs);
                eqIds = eqs.map(e => e.id);
                setSelectedEquipmentIds(eqIds);
                setEquipmentScope('ALL');

                allAreas = eqs.map(e => ({
                    id: e.id,
                    name: e.areaName || e.name || "Área",
                    brand: e.specs.brand,
                    modelNumber: e.specs.model,
                    serialNumber: e.specs.serialNumber,
                    btuCapacity: String(e.specs.btu || ""),
                    refrigerant: e.specs.refrigerant,
                    voltage: e.specs.voltage || "220V",
                    equipmentType: e.specs.type,
                    platePhotoUrl: e.platePhotoUrl,
                    boardPhotoUrl: e.boardPhotoUrl,
                    notes: e.notes || "",
                    photos: []
                }));
            } else if (loc.equipmentCensus && loc.equipmentCensus.length > 0) {
                allAreas = loc.equipmentCensus.map(a => ({
                    ...a,
                    photos: []
                }));
                setAvailableEquipments([]);
            }

            setFormData(prev => ({
                ...prev,
                surveyAreas: allAreas,
                equipmentIds: eqIds
            }));
        } catch (err) {
            console.error("Error loading location equipment:", err);
        } finally {
            setLoadingEquipments(false);
        }
    };

    // Alternar selección de un equipo específico en modo personalizado
    const handleToggleEquipment = (eq: EquipmentPassport) => {
        let updated: string[];
        if (selectedEquipmentIds.includes(eq.id)) {
            updated = selectedEquipmentIds.filter(id => id !== eq.id);
        } else {
            updated = [...selectedEquipmentIds, eq.id];
        }
        setSelectedEquipmentIds(updated);

        const filteredAreas = availableEquipments
            .filter(e => updated.includes(e.id))
            .map(e => ({
                id: e.id,
                name: e.areaName || e.name || "Área",
                brand: e.specs.brand,
                modelNumber: e.specs.model,
                serialNumber: e.specs.serialNumber,
                btuCapacity: String(e.specs.btu || ""),
                refrigerant: e.specs.refrigerant,
                voltage: e.specs.voltage || "220V",
                equipmentType: e.specs.type,
                platePhotoUrl: e.platePhotoUrl,
                boardPhotoUrl: e.boardPhotoUrl,
                notes: e.notes || "",
                photos: []
            }));

        setFormData(prev => ({
            ...prev,
            surveyAreas: filteredAreas,
            equipmentIds: updated
        }));
    };

    const handleSelectAllEquipment = () => {
        setEquipmentScope('ALL');
        const eqIds = availableEquipments.map(e => e.id);
        setSelectedEquipmentIds(eqIds);
        const allAreas = availableEquipments.map(e => ({
            id: e.id,
            name: e.areaName || e.name || "Área",
            brand: e.specs.brand,
            modelNumber: e.specs.model,
            serialNumber: e.specs.serialNumber,
            btuCapacity: String(e.specs.btu || ""),
            refrigerant: e.specs.refrigerant,
            voltage: e.specs.voltage || "220V",
            equipmentType: e.specs.type,
            platePhotoUrl: e.platePhotoUrl,
            boardPhotoUrl: e.boardPhotoUrl,
            notes: e.notes || "",
            photos: []
        }));
        setFormData(prev => ({
            ...prev,
            surveyAreas: allAreas,
            equipmentIds: eqIds
        }));
    };

    // Fallback: Si el cliente no tiene locations registradas, consultar tickets previos
    const loadFromPreviousTickets = async (clientId: string) => {
        try {
            const ticketsQuery = query(collection(db, "tickets"), where("clientId", "==", clientId));
            const snapshot = await getDocs(ticketsQuery);
            
            if (!snapshot.empty) {
                const clientTickets = snapshot.docs.map(d => ({ 
                    ...d.data(), 
                    createdAt: d.data().createdAt?.toMillis ? d.data().createdAt.toMillis() : 0 
                })) as any[];
                clientTickets.sort((a, b) => b.createdAt - a.createdAt);
                
                const lastTicketWithLocation = clientTickets.find(t => t.locationArea || t.locationStreet || t.specificLocation || t.locationUrl);
                const lastTicketWithAreas = clientTickets.find(t => t.surveyAreas && Array.isArray(t.surveyAreas) && t.surveyAreas.length > 0);

                let clonedAreas: SurveyArea[] = [];
                let isRetainerDetected = false;

                if (lastTicketWithAreas && lastTicketWithAreas.surveyAreas) {
                    clonedAreas = lastTicketWithAreas.surveyAreas.map((area: SurveyArea) => ({
                        ...area,
                        id: area.id || `area-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                        photos: []
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

    const handleClientChange = async (client: Client) => {
        setFormData(prev => ({
            ...prev,
            clientId: client.id,
            clientName: client.nombreComercial,
            locationName: prev.locationName || client.nombreComercial,
        }));

        // 1. Consultar si el cliente ya tiene villas en la colección 'locations'
        try {
            const locQuery = query(
                collection(db, "locations"),
                where("clientId", "==", client.id)
            );
            const locSnap = await getDocs(locQuery);
            const locs = locSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Location[];
            setClientLocations(locs);

            if (locs.length > 0) {
                // Seleccionar automáticamente la primera villa
                await selectLocation(locs[0]);
                return;
            }
        } catch (locErr) {
            console.error("Error fetching client locations:", locErr);
        }

        // 2. Si no tiene locations registradas, consultar tickets previos
        await loadFromPreviousTickets(client.id);
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

            let finalLocationId = formData.locationId;

            // Si se marcó guardar como propiedad permanente y no existe aún en locations
            if (saveAsPermanentLocation && !finalLocationId && formData.clientId) {
                try {
                    const newLocRef = await addDoc(collection(db, "locations"), {
                        code: generatePropertyCode(),
                        clientId: formData.clientId,
                        clientName: formData.clientName || "",
                        nombre: formData.specificLocation || fullLocation || "Propiedad / Villa",
                        specificLocation: formData.specificLocation || "",
                        locationArea: formData.locationArea || "",
                        locationUrl: formData.locationUrl || "",
                        isRetainer: !!formData.isRetainer,
                        contractType: formData.isRetainer ? 'IGUALA' : 'EVENTUAL',
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp()
                    });
                    finalLocationId = newLocRef.id;
                } catch (locCreateErr) {
                    console.error("Error creating permanent location:", locCreateErr);
                }
            }

            const ticketData: any = {
                ...formData,
                locationId: finalLocationId || formData.locationId || null,
                equipmentIds: selectedEquipmentIds.length > 0 ? selectedEquipmentIds : (formData.equipmentIds || []),
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

            const docRef = await addDoc(collection(db, "tickets"), cleanedData);

            // Si hay ubicación permanente y áreas censadas, promover a equipos en background
            if (finalLocationId && cleanedData.surveyAreas && cleanedData.surveyAreas.length > 0) {
                promoteSurveyAreasToEquipment({ ...cleanedData, id: docRef.id }, finalLocationId).catch(e => {
                    console.warn("Background promotion of equipment:", e);
                });
            }

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
                                    value={formData.clientId}
                                />
                                {formData.clientName && <p className="text-sm text-green-600">Seleccionado: {formData.clientName}</p>}
                            </div>

                            {/* Selector de Propiedad / Villa del Cliente */}
                            {formData.clientId && (
                                <div className="space-y-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                            <Building2 className="w-4 h-4 text-blue-600" /> Propiedad / Villa del Cliente
                                        </Label>
                                        {clientLocations.length > 0 && (
                                            <span className="text-[11px] text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full font-medium">
                                                {clientLocations.length} {clientLocations.length === 1 ? 'villa registrada' : 'villas registradas'}
                                            </span>
                                        )}
                                    </div>

                                    {clientLocations.length > 0 ? (
                                        <div className="space-y-3">
                                            <Select
                                                value={selectedLocationId}
                                                onValueChange={(val) => {
                                                    if (val === "NEW") {
                                                        setSelectedLocationId("NEW");
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            locationId: undefined,
                                                            locationName: "",
                                                            specificLocation: "",
                                                            locationUrl: "",
                                                            surveyAreas: [],
                                                            equipmentIds: []
                                                        }));
                                                        setAvailableEquipments([]);
                                                        setSelectedEquipmentIds([]);
                                                    } else {
                                                        const found = clientLocations.find(l => l.id === val);
                                                        if (found) selectLocation(found);
                                                    }
                                                }}
                                            >
                                                <SelectTrigger className="bg-white">
                                                    <SelectValue placeholder="Seleccionar Villa / Ubicación..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {clientLocations.map(loc => (
                                                        <SelectItem key={loc.id} value={loc.id}>
                                                            {loc.nombre} {loc.locationArea ? `• ${loc.locationArea}` : ''} {loc.isRetainer ? '⭐ (Iguala)' : ''}
                                                        </SelectItem>
                                                    ))}
                                                    <SelectItem value="NEW" className="text-blue-600 font-medium">
                                                        + Registrar Nueva Propiedad / Eventual
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-slate-500">
                                            Este cliente no tiene villas registradas aún. Puedes ingresar los datos y guardarla permanentemente.
                                        </p>
                                    )}
                                </div>
                            )}

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

                            {/* Guardar como propiedad permanente si es una nueva villa */}
                            {(!selectedLocationId || selectedLocationId === "NEW") && formData.clientId && (
                                <div className="pt-1">
                                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                                        <input
                                            type="checkbox"
                                            checked={saveAsPermanentLocation}
                                            onChange={e => setSaveAsPermanentLocation(e.target.checked)}
                                            className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                                        />
                                        <span>Guardar esta ubicación como <strong>Villa / Propiedad permanente</strong> de este cliente</span>
                                    </label>
                                </div>
                            )}

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
                                            Hereda los equipos y pasaportes. El técnico sube evidencias por cada aire acondicionado.
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
                                            Visita puntual estándar. Evidencias generales sin asociar a inventario de activos.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Selector de Alcance de Equipos si hay equipos disponibles */}
                            {availableEquipments.length > 0 && formData.isRetainer && (
                                <div className="space-y-3 p-4 bg-blue-50/60 border border-blue-200 rounded-xl">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                                            <Wrench className="w-4 h-4 text-blue-600" /> Alcance de Equipos a Intervenir ({availableEquipments.length} registrados)
                                        </Label>
                                        <span className="text-[11px] font-bold text-blue-800 bg-blue-200/70 px-2 py-0.5 rounded-full">
                                            {selectedEquipmentIds.length} de {availableEquipments.length} incluidos
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={handleSelectAllEquipment}
                                            className={`p-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                                                equipmentScope === 'ALL'
                                                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                            }`}
                                        >
                                            <CheckSquare className="w-3.5 h-3.5" /> Toda la Villa (General)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setEquipmentScope('CUSTOM')}
                                            className={`p-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                                                equipmentScope === 'CUSTOM'
                                                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                            }`}
                                        >
                                            <Square className="w-3.5 h-3.5" /> Equipos Específicos (Avería)
                                        </button>
                                    </div>

                                    {/* Si es personalizado, mostrar tarjetas de selección rápida */}
                                    {equipmentScope === 'CUSTOM' && (
                                        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 pt-1">
                                            {availableEquipments.map(eq => {
                                                const isChecked = selectedEquipmentIds.includes(eq.id);
                                                return (
                                                    <div
                                                        key={eq.id}
                                                        onClick={() => handleToggleEquipment(eq)}
                                                        className={`p-2.5 rounded-lg border cursor-pointer flex items-center justify-between text-xs transition-all ${
                                                            isChecked
                                                                ? 'bg-white border-blue-500 shadow-xs'
                                                                : 'bg-slate-50/80 border-slate-200 opacity-60 hover:opacity-100'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <input
                                                                type="checkbox"
                                                                checked={isChecked}
                                                                onChange={() => {}}
                                                                className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                                                            />
                                                            <div className="truncate">
                                                                <span className="font-semibold text-slate-800 block truncate">{eq.areaName || eq.name}</span>
                                                                <span className="text-[11px] text-slate-500">
                                                                    {eq.specs.brand} {eq.specs.btu ? `• ${eq.specs.btu} BTU` : ''} {eq.code ? `• ${eq.code}` : ''}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        {eq.specs.refrigerant && (
                                                            <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 flex-shrink-0">
                                                                {eq.specs.refrigerant}
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Alerta de Áreas Heredadas si no hay pasaportes pero hay censo previo */}
                            {formData.isRetainer && availableEquipments.length === 0 && formData.surveyAreas && formData.surveyAreas.length > 0 && (
                                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900 shadow-sm">
                                    <div className="flex items-center gap-2 min-w-0 pr-2">
                                        <Sparkles className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                                        <span className="truncate">
                                            <strong>{formData.surveyAreas.length} {formData.surveyAreas.length === 1 ? 'área vinculada' : 'áreas vinculadas'}:</strong> {formData.surveyAreas.map(a => a.name).join(', ')}.
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
