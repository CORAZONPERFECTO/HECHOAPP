"use client";

import { useState } from "react";
import { InvoiceWizard } from "@/components/income/invoice-wizard/invoice-wizard";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Sparkles, Mic } from "lucide-react";
import { VoiceQuoteModal } from "@/components/income/quotes/voice-quote-modal";

export default function NewQuotePage() {
    const [voiceModalOpen, setVoiceModalOpen] = useState(false);

    return (
        <AppLayout>
            <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Nueva Cotización</h1>
                    <p className="text-gray-500">Genera una propuesta formal para el cliente.</p>
                </div>

                {/* Banner botón rápido de voz */}
                <Button
                    type="button"
                    onClick={() => setVoiceModalOpen(true)}
                    className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-lg font-bold gap-2 px-5 py-6 rounded-xl border border-indigo-300/30 self-start sm:self-auto"
                >
                    <div className="p-1.5 bg-white/20 rounded-lg">
                        <Mic className="h-5 w-5 text-white animate-pulse" />
                    </div>
                    <div className="text-left">
                        <div className="text-xs font-medium text-blue-100 flex items-center gap-1">
                            <Sparkles className="h-3 w-3 text-amber-300" /> Asistente IA Grok-Style
                        </div>
                        <div className="text-sm font-bold">Cotizar por Voz en 1 Clic</div>
                    </div>
                </Button>
            </div>

            <InvoiceWizard mode="quote" />

            <VoiceQuoteModal
                open={voiceModalOpen}
                onOpenChange={setVoiceModalOpen}
            />
        </AppLayout>
    );
}
