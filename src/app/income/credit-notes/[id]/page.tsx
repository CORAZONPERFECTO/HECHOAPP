"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { CreditNote } from "@/types/schema";
import { CreditNoteForm } from "@/components/income/credit-note-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function CreditNoteDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [note, setNote] = useState<CreditNote | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNote = async () => {
            if (!id) return;
            try {
                const docRef = doc(db, "creditNotes", id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setNote({ id: docSnap.id, ...docSnap.data() } as CreditNote);
                } else {
                    console.log("No such document!");
                    router.push("/income/credit-notes");
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
                <Button variant="ghost" onClick={() => router.push("/income/credit-notes")} className="mb-4">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver
                </Button>

                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Editar Nota de Crédito {note.number}</h1>
                        <p className="text-gray-500">Detalles y edición</p>
                    </div>
                </div>

                <CreditNoteForm initialData={note} isEditing={true} />
            </div>
        </div>
    );
}
