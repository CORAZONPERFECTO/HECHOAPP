"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Client } from "@/types/schema";
import { ClientForm } from "@/components/clients/client-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LocationList } from "@/components/clients/location-list";

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
        return <div className="flex justify-center items-center min-h-screen">Cargando...</div>;
    }

    if (!client) return null;

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                <Button variant="ghost" onClick={() => router.push("/clients")} className="mb-4">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver a Clientes
                </Button>

                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{client.nombreComercial}</h1>
                        <p className="text-gray-500">Detalles y configuración del cliente</p>
                    </div>
                </div>

                <Tabs defaultValue="info" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
                        <TabsTrigger value="info">Información</TabsTrigger>
                        <TabsTrigger value="locations">Villas / Ubicaciones</TabsTrigger>
                    </TabsList>

                    <TabsContent value="info" className="mt-6">
                        <ClientForm initialData={client} isEditing={true} />
                    </TabsContent>

                    <TabsContent value="locations" className="mt-6">
                        <LocationList clientId={client.id} />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
