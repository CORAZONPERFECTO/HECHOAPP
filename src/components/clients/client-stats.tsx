
"use client";

import { Card } from "@/components/ui/card";
import { DollarSign, Ticket, AlertCircle, Clock } from "lucide-react";

interface ClientStatsProps {
    clientId: string;
}

export function ClientStats({ clientId }: ClientStatsProps) {
    // In a real implementation, we would fetch these stats from Firestore
    // For now, we mock them to show the UI structure
    const stats = {
        totalBilled: 145000,
        outstandingBalance: 25000,
        activeTickets: 2,
        lastInteraction: "Hace 2 días"
    };

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 glass-card border-none shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                <div className="flex justify-between items-start">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Facturado</p>
                    <div className="p-2 bg-green-50 rounded-lg">
                        <DollarSign className="h-4 w-4 text-green-600" />
                    </div>
                </div>
                <div className="mt-2">
                    <h3 className="text-2xl font-bold text-gray-900">RD$ {stats.totalBilled.toLocaleString()}</h3>
                    <p className="text-xs text-green-600">+12% vs año anterior</p>
                </div>
            </Card>

            <Card className="p-4 glass-card border-none shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                <div className="flex justify-between items-start">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Pendiente</p>
                    <div className="p-2 bg-red-50 rounded-lg">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                    </div>
                </div>
                <div className="mt-2">
                    <h3 className="text-2xl font-bold text-gray-900">RD$ {stats.outstandingBalance.toLocaleString()}</h3>
                    <p className="text-xs text-red-600">Vence en 5 días</p>
                </div>
            </Card>

            <Card className="p-4 glass-card border-none shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                <div className="flex justify-between items-start">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tickets Activos</p>
                    <div className="p-2 bg-blue-50 rounded-lg">
                        <Ticket className="h-4 w-4 text-blue-600" />
                    </div>
                </div>
                <div className="mt-2">
                    <h3 className="text-2xl font-bold text-gray-900">{stats.activeTickets}</h3>
                    <p className="text-xs text-blue-600">1 Alta Prioridad</p>
                </div>
            </Card>

            <Card className="p-4 glass-card border-none shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                <div className="flex justify-between items-start">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Últ. Actividad</p>
                    <div className="p-2 bg-orange-50 rounded-lg">
                        <Clock className="h-4 w-4 text-orange-600" />
                    </div>
                </div>
                <div className="mt-2">
                    <h3 className="text-lg font-bold text-gray-900">{stats.lastInteraction}</h3>
                    <p className="text-xs text-gray-500">Mantenimiento A/C</p>
                </div>
            </Card>
        </div>
    );
}
