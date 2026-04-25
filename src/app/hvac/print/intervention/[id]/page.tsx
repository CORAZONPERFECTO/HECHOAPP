"use client";

import { useEffect, useState, use } from "react";
import { Intervention, HVACAsset } from "@/types/hvac";
import { getInterventionById, getAssetByQr } from "@/lib/hvac-service"; // We need getAssetById actually
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Loader2, Printer, MapPin, Calendar, User, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

// Helper since it's not exported from service yet
async function getAssetById(id: string): Promise<HVACAsset | null> {
    try {
        const snap = await getDoc(doc(db, "equipment", id));
        return snap.exists() ? ({ id: snap.id, ...snap.data() } as HVACAsset) : null;
    } catch (e) {
        console.error(e);
        return null;
    }
}

export default function InterventionPrintPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [intervention, setIntervention] = useState<Intervention | null>(null);
    const [asset, setAsset] = useState<HVACAsset | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            const data = await getInterventionById(id);
            if (data) {
                setIntervention(data);
                const assetData = await getAssetById(data.assetId);
                setAsset(assetData);
            }
            setLoading(false);
        };
        load();
    }, [id]);

    if (loading) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin h-8 w-8 text-gray-400" /></div>;
    }

    if (!intervention) {
        return <div className="p-8 text-center text-red-500">Reporte no encontrado</div>;
    }

    return (
        <div className="bg-white min-h-screen text-black p-8 max-w-[210mm] mx-auto print:p-0 print:max-w-none">
            {/* Print Action (Hidden when printing) */}
            <div className="mb-8 flex justify-end print:hidden">
                <Button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700">
                    <Printer className="mr-2 h-4 w-4" />
                    Imprimir / Guardar PDF
                </Button>
            </div>

            {/* HEADER */}
            <header className="border-b-2 border-primary pb-6 mb-6 flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-primary">HECHOAPP</h1>
                    <p className="text-sm text-gray-500 mt-1">Reporte Técnico de Intervención</p>
                </div>
                <div className="text-right text-sm">
                    <p className="font-mono font-bold text-gray-900">RIT-{intervention.id.slice(0, 8).toUpperCase()}</p>
                    <p className="text-gray-500">{format(intervention.createdAt.toDate(), "dd 'de' MMMM, yyyy", { locale: es })}</p>
                </div>
            </header>

            {/* INFO GRID */}
            <div className="grid grid-cols-2 gap-8 mb-8">
                {/* Asset Info */}
                <div className="space-y-3">
                    <h3 className="font-bold text-gray-900 uppercase text-xs tracking-wider border-b pb-1">Información del Equipo</h3>
                    {asset ? (
                        <div className="text-sm space-y-1">
                            <p className="font-semibold text-lg">{asset.name}</p>
                            <div className="text-gray-600 grid grid-cols-2 gap-x-4">
                                <span>Marca:</span> <span className="font-mono text-black">{asset.specs.brand}</span>
                                <span>Modelo:</span> <span className="font-mono text-black">{asset.specs.model}</span>
                                <span>Serie:</span> <span className="font-mono text-black">{asset.specs.serialNumber}</span>
                                <span>Tipo:</span> <span className="text-black">{asset.specs.type}</span>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500 italic">Información de equipo no disponible</p>
                    )}
                </div>

                {/* Intervention Meta */}
                <div className="space-y-3">
                    <h3 className="font-bold text-gray-900 uppercase text-xs tracking-wider border-b pb-1">Detalles del Servicio</h3>
                    <div className="text-sm space-y-2">
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-600">Técnico:</span>
                            <span className="font-medium">{intervention.technicianName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-600">Tipo:</span>
                            <span className="font-medium px-2 py-0.5 rounded-full bg-slate-100 border text-xs">{intervention.type}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-600">Estado Final:</span>
                            <span className="font-medium">{intervention.status}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* REPORT BODY */}
            <div className="mb-8">
                <h3 className="font-bold text-gray-900 uppercase text-xs tracking-wider border-b pb-1 mb-3">Diagnóstico y Reporte</h3>
                <div className="bg-slate-50 p-4 rounded border text-sm leading-relaxed whitespace-pre-wrap text-gray-800">
                    {intervention.technicalReport}
                </div>
            </div>

            {intervention.recommendations && (
                <div className="mb-8">
                    <h3 className="font-bold text-gray-900 uppercase text-xs tracking-wider border-b pb-1 mb-3">Recomendaciones</h3>
                    <div className="p-4 border border-blue-100 bg-blue-50/50 rounded text-sm text-blue-900">
                        {intervention.recommendations}
                    </div>
                </div>
            )}

            {/* PHOTOS */}
            {intervention.photos && intervention.photos.length > 0 && (
                <div className="mb-8 break-inside-avoid">
                    <h3 className="font-bold text-gray-900 uppercase text-xs tracking-wider border-b pb-1 mb-4">Evidencia Fotográfica</h3>
                    <div className="grid grid-cols-3 gap-4">
                        {intervention.photos.map((photo, i) => (
                            <div key={i} className="space-y-1 break-inside-avoid">
                                <div className="aspect-square bg-gray-100 rounded overflow-hidden border">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={photo.url} alt={photo.caption || `Foto ${i}`} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex justify-between items-center text-[10px] text-gray-500 font-mono">
                                    <span className="uppercase font-bold">{photo.stage || "GENERAL"}</span>
                                    <span>{format(photo.timestamp.toDate(), "HH:mm")}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* SIGNATURES */}
            <div className="mt-16 grid grid-cols-2 gap-16 break-inside-avoid">
                <div className="text-center">
                    <div className="border-b border-gray-300 h-16"></div>
                    <p className="mt-2 text-xs font-bold text-gray-900 uppercase">{intervention.technicianName}</p>
                    <p className="text-[10px] text-gray-500">Firma del Técnico</p>
                </div>
                <div className="text-center">
                    <div className="border-b border-gray-300 h-16"></div>
                    <p className="mt-2 text-xs font-bold text-gray-900 uppercase">Recibido Conforme</p>
                    <p className="text-[10px] text-gray-500">Firma del Cliente / Supervisor</p>
                </div>
            </div>

            {/* FOOTER */}
            <div className="mt-12 pt-6 border-t text-center text-[10px] text-gray-400">
                <p>Generado automáticamente por HECHOAPP el {format(new Date(), "dd/MM/yyyy HH:mm")}</p>
                <p>ID de Documento: {intervention.id}</p>
            </div>
        </div>
    );
}
