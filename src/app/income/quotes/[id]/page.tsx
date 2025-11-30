"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Quote } from "@/types/schema";
import { QuoteForm } from "@/components/income/quote-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function QuoteDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [quote, setQuote] = useState<Quote | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchQuote = async () => {
            if (!id) return;
            try {
                const docRef = doc(db, "quotes", id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setQuote({ id: docSnap.id, ...docSnap.data() } as Quote);
                } else {
                    console.log("No such document!");
                    router.push("/income/quotes");
                }
            } catch (error) {
                console.error("Error getting document:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchQuote();
    }, [id, router]);

    if (loading) {
        return <div className="flex justify-center items-center min-h-screen">Cargando...</div>;
    }

    if (!quote) return null;

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                <Button variant="ghost" onClick={() => router.push("/income/quotes")} className="mb-4">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver a Cotizaciones
                </Button>

                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Editar Cotización {quote.number}</h1>
                        <p className="text-gray-500">Detalles y edición de presupuesto</p>
                    </div>
                </div>

                <QuoteForm initialData={quote} isEditing={true} />
            </div>
        </div>
    );
}
