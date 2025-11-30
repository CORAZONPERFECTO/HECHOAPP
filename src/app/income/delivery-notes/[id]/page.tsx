"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DeliveryNote } from "@/types/schema";
import { DeliveryNoteForm } from "@/components/income/delivery-note-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function DeliveryNoteDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [note, setNote] = useState<DeliveryNote | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNote = async () => {
            if (!id) return;
            try {
                const docRef = doc(db, "deliveryNotes", id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setNote({ id: docSnap.id, ...docSnap.data() } as DeliveryNote);
                } else {
                    console.log("No such document!");
                    router.push("/income/delivery-notes");
                }
            } catch (error) {
                console.error("Error getting document:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchNote();
    }, [id, router]);

    if (loading) {
        return <div className="flex justify-center items-center min-h-screen">Cargando...</div>;
    }

    if (!note) return null;

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                <Button variant="ghost" onClick={() => router.push("/income/delivery-notes")} className="mb-4">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver
                </Button>

                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Editar Conduce {note.number}</h1>
                        <p className="text-gray-500">Detalles de entrega</p>
                    </div>
                </div>

                <DeliveryNoteForm initialData={note} isEditing={true} />
            </div>
        </div>
    );
}
