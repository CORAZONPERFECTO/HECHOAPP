"use client";

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { User } from "@/types/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, Clock, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

export default function TrackingPage() {
    const [technicians, setTechnicians] = useState<User[]>([]);

    useEffect(() => {
        // Query to get all technicians
        const q = query(collection(db, "users"), where("rol", "==", "TECNICO"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
            setTechnicians(data);
        });
        return () => unsubscribe();
    }, []);

    const openInMaps = (lat: number, lng: number) => {
        window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <MapPin className="text-blue-600" />
                        Ubicación de Técnicos
                    </h1>
                    <p className="text-gray-500">
                        Monitorea la última ubicación reportada por el equipo en campo.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {technicians.map(tech => {
                    const loc = tech.lastLocation;
                    const timestamp = loc?.timestamp?.toDate();
                    const isOnline = timestamp && (new Date().getTime() - timestamp.getTime() < 1800000); // 30 mins
                    
                    return (
                        <Card key={tech.id} className={`overflow-hidden transition-all ${isOnline ? "border-green-200 shadow-sm" : ""}`}>
                            <CardHeader className={`pb-3 ${isOnline ? 'bg-green-50/50' : 'bg-gray-50/50'}`}>
                                <CardTitle className="text-base flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                                        <span>{tech.nombre || "Técnico"}</span>
                                    </div>
                                    <span className="text-xs font-normal text-gray-500 bg-white px-2 py-1 rounded-full border shadow-sm">
                                        {isOnline ? "En Línea" : "Desconectado"}
                                    </span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4">
                                {loc && timestamp ? (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3 text-sm text-gray-600">
                                            <Clock className="w-4 h-4 text-blue-500" />
                                            <span>Actualizado: <span className="font-medium">{formatDistanceToNow(timestamp, { locale: es, addSuffix: true })}</span></span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm text-gray-600">
                                            <Navigation className="w-4 h-4 text-blue-500" />
                                            <span>Precisión del GPS: <span className="font-medium">{Math.round(loc.accuracy || 0)}m</span></span>
                                        </div>
                                        <Button 
                                            variant="outline" 
                                            className="w-full mt-4 bg-white hover:bg-gray-50 border-gray-200 shadow-sm transition-colors group"
                                            onClick={() => openInMaps(loc.lat, loc.lng)}
                                        >
                                            <Search className="w-4 h-4 mr-2 text-blue-500 group-hover:text-blue-600" />
                                            Ver en Google Maps
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="text-sm text-gray-500 flex flex-col items-center justify-center py-6 text-center h-[130px] border-2 border-dashed rounded-lg bg-gray-50">
                                        <MapPin className="w-8 h-8 text-gray-300 mb-2" />
                                        <p>No hay datos de ubicación.</p>
                                        <p className="text-xs mt-1 text-gray-400">El técnico debe abrir la app y otorgar permisos.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}

                {technicians.length === 0 && (
                    <div className="col-span-full py-12 text-center text-gray-500">
                        No hay técnicos registrados en el sistema.
                    </div>
                )}
            </div>
        </div>
    );
}
