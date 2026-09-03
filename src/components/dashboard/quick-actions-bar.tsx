"use client";

import { Button } from "@/components/ui/button";
import { Plus, Sparkles, FileSpreadsheet, MapPin, Receipt, Wrench, FilePlus, Users } from "lucide-react";
import { useRouter } from "next/navigation";

interface QuickActionsBarProps {
    onOpenQuoteAI: () => void;
}

export function QuickActionsBar({ onOpenQuoteAI }: QuickActionsBarProps) {
    const router = useRouter();

    return (
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 pl-1">
                    Acciones Rápidas:
                </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <Button
                    size="sm"
                    onClick={() => router.push("/tickets")}
                    className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-9 font-semibold shadow-sm rounded-xl"
                >
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Nuevo Ticket
                </Button>

                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push("/income/quotes/new")}
                    className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 text-xs h-9 font-semibold rounded-xl"
                >
                    <FilePlus className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                    Crear Cotización
                </Button>

                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push("/income/invoices/new")}
                    className="border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 text-xs h-9 font-semibold rounded-xl"
                >
                    <Receipt className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                    Emitir Factura
                </Button>

                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push("/admin/tracking")}
                    className="border-slate-200 text-slate-700 hover:bg-slate-100 text-xs h-9 font-semibold rounded-xl"
                >
                    <MapPin className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
                    Radar Flotilla
                </Button>

                <Button
                    size="sm"
                    onClick={onOpenQuoteAI}
                    className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white text-xs h-9 font-semibold shadow-sm rounded-xl"
                >
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                    Cotizador IA
                </Button>
            </div>
        </div>
    );
}
