"use client";

import React, { useState } from "react";
import { Ticket, DismantledPart } from "@/types/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Save, Plus, X, Upload } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface TicketDismantlingTabProps {
    ticket: Ticket;
    setTicket: React.Dispatch<React.SetStateAction<Ticket | null>>;
    onSave: () => Promise<void>;
    currentUserId: string;
    currentUserName: string;
}

export function TicketDismantlingTab({ ticket, setTicket, onSave, currentUserId, currentUserName }: TicketDismantlingTabProps) {
    const { toast } = useToast();
    const [isAdding, setIsAdding] = useState(false);
    
    // New Part State
    const [referenceNumber, setReferenceNumber] = useState("");
    const [referencePhoto, setReferencePhoto] = useState<string>("");
    const [frontPhoto, setFrontPhoto] = useState<string>("");
    const [backPhoto, setBackPhoto] = useState<string>("");
    const [platePhoto, setPlatePhoto] = useState<string>("");
    const [wiringPhotos, setWiringPhotos] = useState<string[]>([]);

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) setter(event.target.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleMultipleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            files.forEach(file => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    if (event.target?.result) {
                        setWiringPhotos(prev => [...prev, event.target!.result as string]);
                    }
                };
                reader.readAsDataURL(file);
            });
        }
    };

    const handleSavePart = async () => {
        if (!referenceNumber) {
            toast({ title: "Faltan datos", description: "El Número de Referencia es obligatorio.", variant: "destructive" });
            return;
        }
        if (!referencePhoto || !platePhoto) {
            toast({ title: "Faltan fotos", description: "Debe incluir foto de la referencia y placa del equipo.", variant: "destructive" });
            return;
        }

        const newPart: DismantledPart = {
            id: Date.now().toString(),
            referenceNumber,
            referencePhotoUrl: referencePhoto,
            frontPhotoUrl: frontPhoto,
            backPhotoUrl: backPhoto,
            platePhotoUrl: platePhoto,
            wiringPhotos: wiringPhotos,
            dismantledAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as any,
            dismantledBy: currentUserId,
            dismantledByName: currentUserName
        };

        setTicket(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                status: 'WAITING_PARTS',
                dismantledParts: [...(prev.dismantledParts || []), newPart]
            };
        });

        // Add timeline event
        try {
            await addDoc(collection(db, "ticketEvents"), {
                ticketId: ticket.id,
                userId: currentUserId,
                userName: currentUserName,
                type: 'COMMENT',
                description: `Pieza extraída (Ref: ${referenceNumber}). El ticket ha sido puesto en Pausa (Esperando Piezas).`,
                timestamp: serverTimestamp(),
                mediaUrl: frontPhoto || referencePhoto
            });
        } catch (error) {
            console.error("Error logging event:", error);
        }

        // Reset form
        setReferenceNumber("");
        setReferencePhoto("");
        setFrontPhoto("");
        setBackPhoto("");
        setPlatePhoto("");
        setWiringPhotos([]);
        setIsAdding(false);

        // Force a save to DB
        setTimeout(() => {
            onSave();
            toast({ title: "Pieza guardada", description: "Se ha registrado el desmontaje y el ticket está en pausa." });
        }, 500);
    };

    return (
        <div className="space-y-6">
            {!isAdding && (
                <div className="flex justify-between items-center bg-white p-4 rounded-xl border shadow-sm">
                    <div>
                        <h3 className="font-bold text-gray-900">Piezas en Taller</h3>
                        <p className="text-sm text-gray-500">{(ticket.dismantledParts || []).length} registradas</p>
                    </div>
                    <Button onClick={() => setIsAdding(true)} className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="h-4 w-4 mr-2" /> Extraer Pieza
                    </Button>
                </div>
            )}

            {isAdding && (
                <Card className="border-blue-200 shadow-md">
                    <CardHeader className="bg-blue-50 border-b pb-4">
                        <div className="flex justify-between items-start">
                            <CardTitle className="text-lg text-blue-900">Registro de Desmontaje</CardTitle>
                            <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        <p className="text-sm text-blue-700">Documente la pieza que será enviada al taller para reparación o muestra.</p>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                        {/* 1. Datos de la pieza */}
                        <div className="space-y-3">
                            <Label className="text-base font-bold">1. Identificación de la Pieza</Label>
                            <Input 
                                placeholder="Escriba el Número de Referencia o N° de Parte *"
                                value={referenceNumber}
                                onChange={(e) => setReferenceNumber(e.target.value)}
                                className="border-gray-300"
                            />
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs text-gray-500">Foto Referencia *</Label>
                                    <div className="relative h-24 border-2 border-dashed rounded-lg bg-gray-50 flex items-center justify-center overflow-hidden">
                                        {referencePhoto ? (
                                            <img src={referencePhoto} alt="Ref" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="text-center">
                                                <Camera className="h-6 w-6 text-gray-400 mx-auto" />
                                            </div>
                                        )}
                                        <input type="file" accept="image/*" capture="environment" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => handleFile(e, setReferencePhoto)} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs text-gray-500">Foto Frontal</Label>
                                    <div className="relative h-24 border-2 border-dashed rounded-lg bg-gray-50 flex items-center justify-center overflow-hidden">
                                        {frontPhoto ? <img src={frontPhoto} alt="Front" className="w-full h-full object-cover" /> : <Camera className="h-6 w-6 text-gray-400 mx-auto" />}
                                        <input type="file" accept="image/*" capture="environment" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => handleFile(e, setFrontPhoto)} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs text-gray-500">Foto Trasera</Label>
                                    <div className="relative h-24 border-2 border-dashed rounded-lg bg-gray-50 flex items-center justify-center overflow-hidden">
                                        {backPhoto ? <img src={backPhoto} alt="Back" className="w-full h-full object-cover" /> : <Camera className="h-6 w-6 text-gray-400 mx-auto" />}
                                        <input type="file" accept="image/*" capture="environment" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => handleFile(e, setBackPhoto)} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. Diagrama de Cableado */}
                        <div className="space-y-3 pt-4 border-t">
                            <Label className="text-base font-bold">2. Diagrama Visual (Cableado)</Label>
                            <p className="text-xs text-gray-500">Tome fotos claras de los alambres, colores y la conexión original antes de desconectar nada.</p>
                            
                            <div className="grid grid-cols-3 gap-2">
                                {wiringPhotos.map((url, i) => (
                                    <div key={i} className="relative h-20 rounded-lg overflow-hidden border">
                                        <img src={url} alt={`Wiring ${i}`} className="w-full h-full object-cover" />
                                        <button onClick={() => setWiringPhotos(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1">
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                ))}
                                <div className="relative h-20 border-2 border-dashed rounded-lg bg-gray-50 flex items-center justify-center">
                                    <Camera className="h-6 w-6 text-gray-400" />
                                    <input type="file" accept="image/*" multiple className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleMultipleFiles} />
                                </div>
                            </div>
                        </div>

                        {/* 3. Identificación del Equipo */}
                        <div className="space-y-3 pt-4 border-t">
                            <Label className="text-base font-bold">3. Identificación del Equipo</Label>
                            <p className="text-xs text-gray-500">Placa o etiqueta del equipo (Evaporador/Condensador) con el Modelo y Serie.</p>
                            
                            <div className="relative h-32 border-2 border-dashed rounded-lg bg-gray-50 flex items-center justify-center overflow-hidden w-full">
                                {platePhoto ? (
                                    <img src={platePhoto} alt="Plate" className="w-full h-full object-contain" />
                                ) : (
                                    <div className="flex flex-col items-center">
                                        <Camera className="h-8 w-8 text-gray-400 mb-2" />
                                        <span className="text-sm font-medium text-gray-500">Etiqueta de Modelo/Serie *</span>
                                    </div>
                                )}
                                <input type="file" accept="image/*" capture="environment" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => handleFile(e, setPlatePhoto)} />
                            </div>
                        </div>

                        <div className="pt-4">
                            <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={handleSavePart}>
                                <Save className="h-4 w-4 mr-2" />
                                Guardar Desmontaje y Pausar Ticket
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* List of existing parts */}
            <div className="space-y-4">
                {(ticket.dismantledParts || []).map((part) => (
                    <Card key={part.id} className="overflow-hidden">
                        <div className="bg-gray-100 px-4 py-2 flex justify-between items-center border-b">
                            <span className="font-bold text-gray-800">Ref: {part.referenceNumber}</span>
                            <span className="text-xs text-gray-500">
                                Por {part.dismantledByName}
                            </span>
                        </div>
                        <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                            {part.referencePhotoUrl && (
                                <div>
                                    <span className="text-xs text-gray-500 block mb-1">Referencia</span>
                                    <img src={part.referencePhotoUrl} alt="Ref" className="w-full h-24 object-cover rounded" />
                                </div>
                            )}
                            {part.platePhotoUrl && (
                                <div>
                                    <span className="text-xs text-gray-500 block mb-1">Placa Equipo</span>
                                    <img src={part.platePhotoUrl} alt="Plate" className="w-full h-24 object-cover rounded" />
                                </div>
                            )}
                            {part.frontPhotoUrl && (
                                <div>
                                    <span className="text-xs text-gray-500 block mb-1">Frontal</span>
                                    <img src={part.frontPhotoUrl} alt="Front" className="w-full h-24 object-cover rounded" />
                                </div>
                            )}
                            {part.wiringPhotos && part.wiringPhotos.length > 0 && (
                                <div>
                                    <span className="text-xs text-gray-500 block mb-1">Cableado ({part.wiringPhotos.length})</span>
                                    <img src={part.wiringPhotos[0]} alt="Wiring" className="w-full h-24 object-cover rounded" />
                                </div>
                            )}
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
