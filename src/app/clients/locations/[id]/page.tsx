"use client";

import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { VillaBitacora } from "@/components/locations/villa-bitacora";

export default function LocationDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    if (!id) return null;

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8">
            <div className="max-w-6xl mx-auto space-y-4">
                <Button variant="ghost" onClick={() => router.back()} className="mb-2 text-slate-600 hover:text-slate-900">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver a Ubicaciones
                </Button>

                <VillaBitacora locationId={id} isAdmin={true} />
            </div>
        </div>
    );
}

