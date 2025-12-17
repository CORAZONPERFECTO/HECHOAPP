"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, addDoc, getDocs, serverTimestamp, query, where, orderBy } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Client, User, TicketPriority, Ticket, TicketType } from "@/types/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ArrowRight, ArrowLeft } from "lucide-react";

import { ClientSelector } from "@/components/shared/client-selector";
import { TechnicianSelector } from "@/components/shared/technician-selector";
import { generateNextTicketNumber } from "@/lib/tickets";

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
        checklist: [],
        photos: [],
        locationArea: "",
        specificLocation: "",
    });

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

    const handleClientChange = (client: Client) => {
        setFormData(prev => ({
            ...prev,
            clientId: client.id,
            clientName: client.nombreComercial,
            // Keep location fields if manually entered, or reset if desired. 
            // For now, we keep them as they are independent of client selection in this new flow.
        }));
    };

    // State for multi-select
    const [selectedTypeIds, setSelectedTypeIds] = useState<string[]>([]);

    useEffect(() => {
        // Sync single selection back to array if came from draft (optional, but good for consistency)
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

            // Sync with formData for backward compatibility and saving
            // We'll use the FIRST selected type as the primary 'ticketTypeId' 
            // and join ALL names for 'serviceType'
            const selectedTypes = ticketTypes.filter(t => newSelection.includes(t.id));
            const primaryType = selectedTypes[0];

            // Merge checklists from all selected types
            const combinedChecklist = selectedTypes.flatMap((t, typeIndex) =>
                t.defaultChecklist.map((item, itemIndex) => ({
                    id: `chk-${Date.now()}-${typeIndex}-${itemIndex}`,
                    text: item.text,
                    checked: false
                }))
            );

            setFormData(prev => ({
                ...prev,
                ticketTypeId: primaryType?.id || '', // Primary ID for reference
                serviceType: selectedTypes.map(t => t.name).join(' + ') as any, // "Installation + Repair"
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
            status: 'IN_PROGRESS'
        }));
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const ticketNumber = await generateNextTicketNumber();

            // Construct full location name for display
            const fullLocation = `${formData.locationArea || ''} - ${formData.specificLocation || ''}`.trim().replace(/^- |- $/g, '');

            const ticketData: any = {
                ...formData,
                number: ticketNumber,
                ticketNumber: ticketNumber,
                locationName: fullLocation || formData.locationName || "Ubicación no especificada",
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                createdBy: auth.currentUser?.uid || "SYSTEM",
            };

            // Only add creadoPorId if user is authenticated
            if (auth.currentUser?.uid) {
                ticketData.creadoPorId = auth.currentUser.uid;
            }

            // Remove any undefined or null fields
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
