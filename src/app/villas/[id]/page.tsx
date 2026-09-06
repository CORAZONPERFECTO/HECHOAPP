"use client";

import { useParams } from "next/navigation";
import { VillaBitacora } from "@/components/locations/villa-bitacora";
import { ShieldCheck } from "lucide-react";

export default function PublicVillaCarePassPage() {
    const params = useParams();
    const id = params.id as string;

    if (!id) return null;

    return (
        <div className="min-h-screen bg-slate-100/80 selection:bg-emerald-500/20">
            {/* Top Minimal Branding Bar for Villa Owner */}
            <header className="bg-slate-900 border-b border-slate-800 text-white py-3.5 px-4 sticky top-0 z-40 backdrop-blur-md shadow-xs">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="font-black text-sm tracking-wider uppercase text-white">Villa Care Pass</span>
                            <span className="text-[11px] text-slate-400 block -mt-0.5">Bitácora Digital de Mantenimiento</span>
                        </div>
                    </div>
                    <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-slate-800 text-emerald-400 border border-slate-700">
                        Portal Propietario
                    </span>
                </div>
            </header>

            {/* Main Content */}
            <main className="p-4 md:p-8">
                <VillaBitacora locationId={id} isAdmin={false} />
            </main>

            <footer className="py-6 text-center text-xs text-slate-400 border-t border-slate-200">
                <p>Gestión y Cuidado de Climatización Residencial &bull; Nexus / HechoApp</p>
            </footer>
        </div>
    );
}
