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

export default function NewTicketPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);

    const [formData, setFormData] = useState<Partial<Ticket>>({
        status: 'PENDIENTE',
        priority: 'MEDIA',
        checklist: [],
        photos: [],
        materials: [],
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

    const handleClientChange = (clientId: string, clientName: string) => {
        setFormData(prev => ({
            ...prev,
            clientId,
            clientName,
            locationId: "", // Reset location if client changes
        }));
    };

    const handleTypeChange = (type: TicketType) => {
        setFormData(prev => ({
            ...prev,
            ticketTypeId: type.id,
            serviceType: type.key as any, // Fallback for enum
            checklist: type.defaultChecklist.map((label, index) => ({
                id: `chk-${Date.now()}-${index}`,
                label,
                checked: false,
                required: true
            }))
        }));
    };

    const handleTechnicianChange = (techId: string, techName: string) => {
        setFormData(prev => ({
            ...prev,
            technicianId: techId,
            technicianName: techName,
            status: 'ASIGNADO'
        }));
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const ticketData = {
                ...formData,
                number: `TCK-${Date.now().toString().slice(-6)}`, // Simple ID generation
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                createdBy: "SYSTEM", // Should be current user ID
            };

            await addDoc(collection(db, "tickets"), ticketData);
            router.push("/tickets");
        } catch (error) {
            console.error("Error creating ticket:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-3xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">Nuevo Ticket de Servicio</h1>
                    <div className="flex items-center gap-2 mt-2">
                        <div className={`h-2 flex-1 rounded-full ${step >= 1 ? 'bg-blue-600' : 'bg-gray-200'}`} />
                        <div className={`h-2 flex-1 rounded-full ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`} />
                        <div className={`h-2 flex-1 rounded-full ${step >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`} />
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border p-8">
                    {step === 1 && (
                        <div className="space-y-6">
                            <h2 className="text-lg font-semibold">Paso 1: Cliente y Ubicación</h2>

                            <div className="space-y-2">
                                <Label>Cliente</Label>
                                <ClientSelector
                                    value={formData.clientId}
                                    onSelect={handleClientChange}
                                />
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
                            <h2 className="text-lg font-semibold">Paso 2: Tipo de Servicio</h2>

                            <div className="grid grid-cols-2 gap-4">
                                {ticketTypes.map(type => (
                                    <button
                                        key={type.id}
                                        onClick={() => handleTypeChange(type)}
                                        className={`p-4 rounded-lg border text-left transition-all ${formData.ticketTypeId === type.id
                                            ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600'
                                            : 'hover:border-gray-300 hover:bg-gray-50'
                                            }`}
                                        style={{ borderColor: formData.ticketTypeId === type.id ? type.color : '' }}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                                style={{ backgroundColor: type.color || '#3b82f6' }}
                                            >
                                                {type.name.charAt(0)}
                                            </div>
                                            <div>
                                                <span className="font-medium block">{type.name}</span>
                                                <span className="text-xs text-gray-500">{type.description}</span>
                                            </div>
                                        </div>
                                    </button>
                                ))}
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
                                <Button onClick={() => setStep(3)} disabled={!formData.ticketTypeId}>
                                    Siguiente <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
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
                                            <SelectItem value="BAJA">Baja</SelectItem>
                                            <SelectItem value="MEDIA">Media</SelectItem>
                                            <SelectItem value="ALTA">Alta</SelectItem>
                                            <SelectItem value="CRITICA">Crítica</SelectItem>
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
                    )}
                </div>
            </div>
        </div>
    );
}
