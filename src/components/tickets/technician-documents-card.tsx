"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { PersonnelResource, Ticket } from "@/types/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Share2, Download, Eye, Loader2, Copy, Check, ExternalLink, HelpCircle } from "lucide-react";
import Image from "next/image";

interface TechnicianDocumentsCardProps {
    technicianId: string;
    ticket: Ticket;
}

export function TechnicianDocumentsCard({ technicianId, ticket }: TechnicianDocumentsCardProps) {
    const [personnel, setPersonnel] = useState<PersonnelResource | null>(null);
    const [vehicleInfo, setVehicleInfo] = useState<{ brand?: string; model?: string; plate?: string } | null>(null);
    const [loading, setLoading] = useState(true);
    
    // Share Modal States
    const [isShareOpen, setIsShareOpen] = useState(false);
    const [lugar, setLugar] = useState("");
    const [dias, setDias] = useState("");
    const [copied, setCopied] = useState(false);
    
    // View Document Modal States
    const [viewDocUrl, setViewDocUrl] = useState<string | null>(null);
    const [viewDocTitle, setViewDocTitle] = useState("");

    useEffect(() => {
        if (!technicianId) {
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            setLoading(true);
            try {
                // 1. Fetch Personnel Resource linked to this technician userId
                const pQuery = query(collection(db, "personnel"), where("userId", "==", technicianId));
                const pSnap = await getDocs(pQuery);
                
                let foundPersonnel: PersonnelResource | null = null;
                if (!pSnap.empty) {
                    const docData = pSnap.docs[0];
                    foundPersonnel = { id: docData.id, ...docData.data() } as PersonnelResource;
                    setPersonnel(foundPersonnel);
                } else {
                    setPersonnel(null);
                }

                // 2. Fetch User to get vehicle assignments
                const userDoc = await getDoc(doc(db, "users", technicianId));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    if (userData.vehicle) {
                        setVehicleInfo(userData.vehicle);
                    } else {
                        setVehicleInfo(null);
                    }
                } else {
                    setVehicleInfo(null);
                }

                // 3. Initialize Share Fields
                setLugar(`${ticket.clientName} - ${ticket.locationName}`);
                
                let dateStr = "";
                if (ticket.scheduledStart) {
                    const date = ticket.scheduledStart.toDate ? ticket.scheduledStart.toDate() : new Date(ticket.scheduledStart.seconds * 1000);
                    dateStr = date.toLocaleDateString('es-DO', { year: 'numeric', month: '2-digit', day: '2-digit' });
                } else {
                    dateStr = new Date().toLocaleDateString('es-DO', { year: 'numeric', month: '2-digit', day: '2-digit' });
                }
                setDias(dateStr);

            } catch (err) {
                console.error("Error fetching technician details:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [technicianId, ticket]);

    if (loading) {
        return (
            <Card>
                <CardContent className="py-8 flex justify-center items-center">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600 mr-2" />
                    <span className="text-sm text-gray-500">Cargando credenciales del técnico...</span>
                </CardContent>
            </Card>
        );
    }

    if (!personnel) {
        return (
            <Card className="border-gray-200">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base text-gray-700 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-gray-400" />
                        Credenciales del Técnico
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-gray-500 italic">
                        No hay un expediente de personal enlazado a la cuenta de este técnico para descargar documentos.
                    </p>
                </CardContent>
            </Card>
        );
    }

    // Access request message text construction
    const buildMessageText = () => {
        let text = `*Lugar:* ${lugar || "____________________________"}\n`;
        text += `*Días / Horario:* ${dias || "_______________________"}\n\n`;
        text += `Solicitamos el acceso de este personal para revisar, reparar o instalar aires.\n\n`;
        text += `*Datos del Técnico:*\n`;
        text += `- *Nombre:* ${personnel.fullName}\n`;
        text += `- *Cédula:* ${personnel.cedula}\n`;
        if (personnel.licenseNumber) {
            text += `- *Licencia:* ${personnel.licenseNumber}\n`;
        }
        if (vehicleInfo && vehicleInfo.plate) {
            text += `- *Vehículo:* ${vehicleInfo.brand || ""} ${vehicleInfo.model || ""} (Placa: ${vehicleInfo.plate})\n`;
        }
        return text;
    };

    const messageText = buildMessageText();

    const handleCopy = () => {
        navigator.clipboard.writeText(messageText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleWhatsApp = () => {
        const url = `https://wa.me/?text=${encodeURIComponent(messageText)}`;
        window.open(url, '_blank');
    };

    const handleEmail = () => {
        const subject = `Solicitud de Acceso - ${personnel.fullName}`;
        const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(messageText)}`;
        window.location.href = mailto;
    };

    const downloadDocument = (url: string, title: string) => {
        // Simple download handler using a temporary anchor link
        const link = document.createElement('a');
        link.href = url;
        link.download = `${title.replace(/\s+/g, '_')}_${personnel.fullName.replace(/\s+/g, '_')}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <Card className="border-indigo-100 bg-indigo-50/20">
            <CardHeader className="pb-3 flex flex-row justify-between items-center space-y-0">
                <div>
                    <CardTitle className="text-base text-indigo-950 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-indigo-600" />
                        Documentación del Técnico
                    </CardTitle>
                    <CardDescription className="text-xs text-indigo-800/80">
                        Visualiza credenciales para control de acceso y comparte datos con clientes.
                    </CardDescription>
                </div>
                <Button
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5"
                    onClick={() => setIsShareOpen(true)}
                >
                    <Share2 className="h-3.5 w-3.5" />
                    <span>Compartir Acceso</span>
                </Button>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Documents Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Cédula */}
                    {personnel.cedulaUrl ? (
                        <div className="bg-white p-3 rounded-lg border border-indigo-100 shadow-sm flex flex-col justify-between gap-3">
                            <div className="space-y-1">
                                <span className="text-xs font-semibold text-slate-500 uppercase">Cédula</span>
                                <p className="text-sm font-bold text-slate-800 truncate">{personnel.cedula}</p>
                            </div>
                            <div className="flex gap-1.5">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="flex-1 text-xs h-8"
                                    onClick={() => {
                                        setViewDocUrl(personnel.cedulaUrl!);
                                        setViewDocTitle("Foto de Cédula");
                                    }}
                                >
                                    <Eye className="h-3.5 w-3.5 mr-1" />
                                    Mostrar
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-xs h-8 text-indigo-600 hover:bg-indigo-50"
                                    onClick={() => downloadDocument(personnel.cedulaUrl!, "Cedula")}
                                >
                                    <Download className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white/40 p-3 rounded-lg border border-dashed border-slate-200 flex flex-col justify-center items-center text-center py-5">
                            <span className="text-xs text-slate-400 font-semibold">Cédula</span>
                            <span className="text-[10px] text-slate-400 italic mt-1">No cargada</span>
                        </div>
                    )}

                    {/* Licencia */}
                    {personnel.licenseUrl ? (
                        <div className="bg-white p-3 rounded-lg border border-indigo-100 shadow-sm flex flex-col justify-between gap-3">
                            <div className="space-y-1">
                                <span className="text-xs font-semibold text-slate-500 uppercase">Licencia</span>
                                <p className="text-sm font-bold text-slate-800 truncate">
                                    {personnel.licenseNumber || "Cargada"}
                                </p>
                            </div>
                            <div className="flex gap-1.5">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="flex-1 text-xs h-8"
                                    onClick={() => {
                                        setViewDocUrl(personnel.licenseUrl!);
                                        setViewDocTitle("Licencia de Conducir");
                                    }}
                                >
                                    <Eye className="h-3.5 w-3.5 mr-1" />
                                    Mostrar
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-xs h-8 text-indigo-600 hover:bg-indigo-50"
                                    onClick={() => downloadDocument(personnel.licenseUrl!, "Licencia")}
                                >
                                    <Download className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white/40 p-3 rounded-lg border border-dashed border-slate-200 flex flex-col justify-center items-center text-center py-5">
                            <span className="text-xs text-slate-400 font-semibold">Licencia</span>
                            <span className="text-[10px] text-slate-400 italic mt-1">No cargada</span>
                        </div>
                    )}

                    {/* Carnet de Zona */}
                    {personnel.carnetUrl ? (
                        <div className="bg-white p-3 rounded-lg border border-indigo-100 shadow-sm flex flex-col justify-between gap-3">
                            <div className="space-y-1">
                                <span className="text-xs font-semibold text-slate-500 uppercase">Carnet de Zona</span>
                                <p className="text-sm font-bold text-slate-800 truncate">Válido</p>
                            </div>
                            <div className="flex gap-1.5">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="flex-1 text-xs h-8"
                                    onClick={() => {
                                        setViewDocUrl(personnel.carnetUrl!);
                                        setViewDocTitle("Carnet de Acceso Zona");
                                    }}
                                >
                                    <Eye className="h-3.5 w-3.5 mr-1" />
                                    Mostrar
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-xs h-8 text-indigo-600 hover:bg-indigo-50"
                                    onClick={() => downloadDocument(personnel.carnetUrl!, "Carnet")}
                                >
                                    <Download className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white/40 p-3 rounded-lg border border-dashed border-slate-200 flex flex-col justify-center items-center text-center py-5">
                            <span className="text-xs text-slate-400 font-semibold">Carnet de Zona</span>
                            <span className="text-[10px] text-slate-400 italic mt-1">No cargado</span>
                        </div>
                    )}
                </div>

                {/* Additional Documents List */}
                {personnel.documents && personnel.documents.length > 0 && (
                    <div className="pt-2">
                        <span className="text-xs font-semibold text-indigo-900 block mb-2">Otros Documentos Extra:</span>
                        <div className="flex flex-wrap gap-2">
                            {personnel.documents.map((docUrl, idx) => (
                                <div key={idx} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-indigo-100 shadow-xs text-xs">
                                    <span className="font-medium text-slate-700">Doc #{idx + 1}</span>
                                    <button 
                                        type="button" 
                                        onClick={() => {
                                            setViewDocUrl(docUrl);
                                            setViewDocTitle(`Documento Extra #${idx + 1}`);
                                        }}
                                        className="text-indigo-600 hover:text-indigo-800 ml-1 font-semibold"
                                    >
                                        Ver
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => downloadDocument(docUrl, `Extra_Doc_${idx + 1}`)}
                                        className="text-gray-500 hover:text-gray-700 font-semibold"
                                    >
                                        ↓
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>

            {/* 📋 PREVIEW & SHARE DIALOG */}
            <Dialog open={isShareOpen} onOpenChange={setIsShareOpen}>
                <DialogContent className="sm:max-w-md bg-white p-6 rounded-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-slate-900">Solicitud de Acceso</DialogTitle>
                        <DialogDescription className="text-sm text-slate-500">
                            Completa los campos de lugar y fechas para redactar el mensaje de autorización del personal técnico.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-3">
                        <div className="space-y-1">
                            <Label htmlFor="lugar" className="text-xs font-bold text-slate-700">Lugar de Trabajo</Label>
                            <Input
                                id="lugar"
                                value={lugar}
                                onChange={(e) => setLugar(e.target.value)}
                                placeholder="Ej: Villa Cap Cana #12"
                                className="h-10 text-sm bg-slate-50"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="dias" className="text-xs font-bold text-slate-700">Días / Horarios Autorizados</Label>
                            <Input
                                id="dias"
                                value={dias}
                                onChange={(e) => setDias(e.target.value)}
                                placeholder="Ej: Lunes 15 y Martes 16 de Junio"
                                className="h-10 text-sm bg-slate-50"
                            />
                        </div>
                        
                        {/* Live Text Preview Box */}
                        <div className="space-y-1">
                            <span className="text-xs font-bold text-slate-700">Vista Previa del Mensaje:</span>
                            <div className="bg-slate-900 text-slate-100 p-4 rounded-lg text-xs font-mono whitespace-pre-wrap leading-relaxed shadow-inner max-h-[200px] overflow-y-auto">
                                {messageText}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 pt-2 border-t">
                        <div className="grid grid-cols-2 gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleWhatsApp}
                                className="border-green-600 text-green-700 hover:bg-green-50 h-11 text-xs font-semibold"
                            >
                                WhatsApp
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleEmail}
                                className="border-blue-600 text-blue-700 hover:bg-blue-50 h-11 text-xs font-semibold"
                            >
                                Correo
                            </Button>
                        </div>
                        <Button
                            type="button"
                            onClick={handleCopy}
                            className={`w-full h-11 text-xs font-bold text-white flex items-center justify-center gap-1.5 ${copied ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-800 hover:bg-slate-950'}`}
                        >
                            {copied ? (
                                <>
                                    <Check className="h-4 w-4" />
                                    ¡Copiado al Portapapeles!
                                </>
                            ) : (
                                <>
                                    <Copy className="h-4 w-4" />
                                    Copiar Mensaje Redactado
                                </>
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* 🔍 VIEW FULLSCREEN DOCUMENT DIALOG */}
            <Dialog open={viewDocUrl !== null} onOpenChange={(open) => !open && setViewDocUrl(null)}>
                <DialogContent className="sm:max-w-2xl bg-black/95 text-white border-0 p-4 flex flex-col items-center justify-center min-h-[50vh]">
                    <DialogHeader className="w-full pb-2 border-b border-white/10 flex flex-row items-center justify-between">
                        <DialogTitle className="text-sm font-semibold">{viewDocTitle}</DialogTitle>
                    </DialogHeader>
                    {viewDocUrl && (
                        <div className="relative w-full aspect-[4/3] max-h-[75vh] flex items-center justify-center overflow-hidden bg-slate-900 rounded-lg mt-4">
                            {viewDocUrl.startsWith('data:image/') || viewDocUrl.startsWith('http') ? (
                                <img
                                    src={viewDocUrl}
                                    alt={viewDocTitle}
                                    className="max-w-full max-h-full object-contain"
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400">
                                    <HelpCircle className="h-12 w-12 text-slate-500 mb-2" />
                                    <p className="text-sm font-semibold">Este documento no es una imagen visualizable.</p>
                                    <Button
                                        variant="link"
                                        className="text-indigo-400 font-bold mt-2"
                                        onClick={() => downloadDocument(viewDocUrl, viewDocTitle)}
                                    >
                                        Descargar para ver →
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </Card>
    );
}
