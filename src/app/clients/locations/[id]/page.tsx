"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Location } from "@/types/schema";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Image as ImageIcon, Wrench } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EvidenceGallery } from "@/components/locations/evidence-gallery";

export default function LocationDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [location, setLocation] = useState<Location | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLocation = async () => {
            if (!id) return;
            try {
                const docRef = doc(db, "locations", id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setLocation({ id: docSnap.id, ...docSnap.data() } as Location);
                } else {
                    console.log("No such document!");
                    router.back();
                }
            } catch (error) {
                console.error("Error getting document:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchLocation();
    }, [id, router]);

    if (loading) {
        return <div className="flex justify-center items-center min-h-screen">Cargando...</div>;
    }

    if (!location) return null;

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-5xl mx-auto space-y-6">
                <Button variant="ghost" onClick={() => router.back()} className="mb-4">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver
                </Button>

                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white rounded-lg shadow-sm border">
                        <MapPin className="h-8 w-8 text-blue-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{location.nombre}</h1>
                        <p className="text-gray-500">Detalles de la ubicación</p>
                    </div>
                </div>

                <Tabs defaultValue="evidences" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
                        <TabsTrigger value="evidences">
                            <ImageIcon className="mr-2 h-4 w-4" />
                            Evidencias
                        </TabsTrigger>
                        <TabsTrigger value="equipment">
                            <Wrench className="mr-2 h-4 w-4" />
                            Equipos
                        </TabsTrigger>
                        <TabsTrigger value="info">Información</TabsTrigger>
                    </TabsList>

                    <TabsContent value="evidences" className="mt-6">
                        <div className="bg-white p-6 rounded-lg shadow border min-h-[400px]">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Galería de Evidencias</h3>
                            <p className="text-gray-500 mb-6">Fotos y archivos adjuntos de todos los tickets en esta ubicación.</p>
                            <EvidenceGallery locationId={location.id} />
                        </div>
                    </TabsContent>

                    <TabsContent value="equipment" className="mt-6">
                        <div className="bg-white p-6 rounded-lg shadow border text-center py-12">
                            <Wrench className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900">Equipos Instalados</h3>
                            <p className="text-gray-500">Listado de aires acondicionados y equipos en esta villa.</p>
                            <Button variant="outline" className="mt-4" disabled>Próximamente</Button>
                        </div>
                    </TabsContent>

                    <TabsContent value="info" className="mt-6">
                        <div className="bg-white p-6 rounded-lg shadow border">
                            <h3 className="font-medium text-gray-900">Detalles</h3>
                            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-gray-500 block">Nombre</span>
                                    <span className="font-medium">{location.nombre}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500 block">ID</span>
                                    <span className="font-mono text-xs">{location.id}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500 block">Dirección</span>
                                    <span className="font-medium">{location.direccion || "No registrada"}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500 block">Descripción</span>
                                    <span className="font-medium">{location.descripcion || "Sin descripción"}</span>
                                </div>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
