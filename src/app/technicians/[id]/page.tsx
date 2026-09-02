"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { User } from "@/types/schema";
import { TechnicianForm } from "@/components/technicians/technician-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";

export default function TechnicianDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [technician, setTechnician] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTechnician = async () => {
            if (!id) return;
            try {
                const docRef = doc(db, "users", id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setTechnician({ id: docSnap.id, ...docSnap.data() } as User);
                } else {
                    router.push("/technicians");
                }
            } catch (error) {
                console.error("Error getting document:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchTechnician();
    }, [id, router]);

    if (loading) {
        return (
            <AppLayout>
                <div className="flex justify-center items-center min-h-[50vh]">
                    <div className="animate-pulse flex flex-col items-center">
                        <div className="h-12 w-12 bg-gray-200 rounded-full mb-4"></div>
                        <div className="h-4 w-48 bg-gray-200 rounded"></div>
                    </div>
                </div>
            </AppLayout>
        );
    }

    if (!technician) return null;

    return (
        <AppLayout>
            <div className="max-w-4xl mx-auto space-y-6">
                <Button variant="ghost" onClick={() => router.push("/technicians")} className="mb-2">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver a Usuarios y Técnicos
                </Button>

                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Editar Perfil de Usuario</h1>
                        <p className="text-gray-500">Gestionar accesos y credenciales de {technician.nombre}</p>
                    </div>
                </div>

                <TechnicianForm initialData={technician} isEditing={true} />
            </div>
        </AppLayout>
    );
}
