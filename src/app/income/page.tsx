"use client";

import { AppCard } from "@/components/ui/app-card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Repeat, CreditCard, FileCheck, Receipt, Truck, FileInput } from "lucide-react";
import { useRouter } from "next/navigation";

export default function IncomePage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => router.push("/")}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Volver
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Módulo de Ingresos</h1>
                        <p className="text-gray-500">Gestión de facturación, cobros y cotizaciones</p>
                    </div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    <AppCard
                        icon={FileText}
                        label="Facturas de Venta"
                        href="/income/invoices"
                        color="text-blue-600"
                    />
                    <AppCard
                        icon={Repeat}
                        label="Facturas Recurrentes"
                        href="/income/recurring"
                        color="text-purple-600"
                    />
                    <AppCard
                        icon={CreditCard}
                        label="Pagos Recibidos"
                        href="/income/payments"
                        color="text-green-600"
                    />
                    <AppCard
                        icon={FileCheck}
                        label="Cotizaciones"
                        href="/income/quotes"
                        color="text-orange-600"
                    />
                    <AppCard
                        icon={FileInput}
                        label="Notas de Crédito"
                        href="/income/credit-notes"
                        color="text-red-600"
                    />
                    <AppCard
                        icon={Truck}
                        label="Conduces"
                        href="/income/delivery-notes"
                        color="text-indigo-600"
                    />
                    <AppCard
                        icon={Receipt}
                        label="Recibos de Pago"
                        href="/income/receipts"
                        color="text-teal-600"
                    />
                </div>
            </div>
        </div>
    );
}
