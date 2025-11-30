"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { User } from "@/types/schema";
import { TechnicianForm } from "@/components/technicians/technician-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

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
                    console.log("No such document!");
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
        return <div className="flex justify-center items-center min-h-screen">Cargando...</div>;
    }

    if (!technician) return null;

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                <Button variant="ghost" onClick={() => router.push("/technicians")} className="mb-4">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver
                </Button>

                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Editar Técnico</h1>
                        <p className="text-gray-500">Gestionar perfil de {technician.nombre}</p>
                    </div>
                </div>

                <TechnicianForm initialData={technician} isEditing={true} />
            </div>
        </div>
    );
}
