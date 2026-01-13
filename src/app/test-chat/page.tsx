"use client";

import { QuoteChatModal } from "@/components/dashboard/quote-chat-modal";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function TestQuotePage() {
    const [open, setOpen] = useState(false);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100 p-4">
            <h1 className="text-2xl font-bold mb-4">Prueba de Cotizador IA</h1>
            <p className="mb-8 text-gray-500 max-w-md text-center">
                Esta página permite probar el modal de cotización de forma aislada.
            </p>

            <Button onClick={() => setOpen(true)} size="lg" className="bg-purple-600 hover:bg-purple-700">
                Abrir Cotizador
            </Button>

            <QuoteChatModal open={open} onOpenChange={setOpen} />
        </div>
    );
}
