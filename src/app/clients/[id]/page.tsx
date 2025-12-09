"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Client } from "@/types/schema";
import { ClientForm } from "@/components/clients/client-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building2, MapPin, Receipt, Ticket, CreditCard, Info } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LocationList } from "@/components/clients/location-list";
import { AppLayout } from "@/components/layout/app-layout";
import { ClientHeader } from "@/components/clients/client-header";
import { ClientStats } from "@/components/clients/client-stats";

export default function ClientDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [client, setClient] = useState<Client | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchClient = async () => {
            if (!id) return;
            try {
                const docRef = doc(db, "clients", id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setClient({ id: docSnap.id, ...docSnap.data() } as Client);
                } else {
                    console.log("No such document!");
                    router.push("/clients");
                }
            } catch (error) {
                console.error("Error getting document:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchClient();
    }, [id, router]);

    if (loading) {
        return (
            <AppLayout>
                <div className="flex justify-center items-center h-[50vh]">
                    <div className="animate-pulse flex flex-col items-center">
                        <div className="h-12 w-12 bg-gray-200 rounded-full mb-4"></div>
                        <div className="h-4 w-48 bg-gray-200 rounded"></div>
                    </div>
                </div>
            </AppLayout>
        );
    }

    if (!client) return null;

    return (
        <AppLayout>
            <div className="space-y-6 animate-in fade-in duration-500">
                {/* Navigation Back */}
                <Button variant="ghost" onClick={() => router.push("/clients")} className="text-gray-500 hover:text-gray-900">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver a Lista de Clientes
                </Button>

                {/* Header 360 */}
                <ClientHeader client={client} />

                {/* KPI Stats */}
                <ClientStats clientId={client.id} />

                {/* Main Content Tabs */}
                <Tabs defaultValue="invoices" className="w-full">
                    <TabsList className="bg-white/50 backdrop-blur border p-1 rounded-xl w-full md:w-auto overflow-x-auto justify-start h-auto">
                        <TabsTrigger value="invoices" className="gap-2 data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700 rounded-lg py-2.5">
                            <Receipt className="h-4 w-4" /> Facturas
                        </TabsTrigger>
                        <TabsTrigger value="tickets" className="gap-2 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 rounded-lg py-2.5">
                            <Ticket className="h-4 w-4" /> Tickets
                        </TabsTrigger>
                        <TabsTrigger value="payments" className="gap-2 data-[state=active]:bg-green-100 data-[state=active]:text-green-700 rounded-lg py-2.5">
                            <CreditCard className="h-4 w-4" /> Pagos
                        </TabsTrigger>
                        <TabsTrigger value="info" className="gap-2 rounded-lg py-2.5">
                            <Info className="h-4 w-4" /> Información
                        </TabsTrigger>
                        <TabsTrigger value="locations" className="gap-2 rounded-lg py-2.5">
                            <MapPin className="h-4 w-4" /> Ubicaciones
                        </TabsTrigger>
                    </TabsList>

                    <div className="mt-6">
                        <TabsContent value="invoices">
                            <div className="glass-card p-8 text-center text-gray-500 border-dashed border-2 bg-white/50">
                                <Receipt className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                                <p>Historial de facturas en desarrollo...</p>
                                <Button variant="link" className="mt-2 text-purple-600">Crear primera factura</Button>
                            </div>
                        </TabsContent>

                        <TabsContent value="tickets">
                            <div className="glass-card p-8 text-center text-gray-500 border-dashed border-2 bg-white/50">
                                <Ticket className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                                <p>Historial de servicio técnico en desarrollo...</p>
                            </div>
                        </TabsContent>

                        <TabsContent value="payments">
                            <div className="glass-card p-8 text-center text-gray-500 border-dashed border-2 bg-white/50">
                                <CreditCard className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                                <p>Historial de pagos recibidos en desarrollo...</p>
                            </div>
                        </TabsContent>

                        <TabsContent value="info">
                            <div className="glass-card p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-semibold">Datos Generales</h3>
                                </div>
                                <ClientForm initialData={client} isEditing={true} />
                            </div>
                        </TabsContent>

                        <TabsContent value="locations">
                            <LocationList clientId={client.id} />
                        </TabsContent>
                    </div>
                </Tabs>
            </div>
        </AppLayout>
    );
}
