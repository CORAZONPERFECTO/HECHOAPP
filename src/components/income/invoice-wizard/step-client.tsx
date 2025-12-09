
"use client";

import { Client } from "@/types/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Building2, Search } from "lucide-react";

interface StepClientProps {
    data: any;
    updateData: (key: string, value: any) => void;
    clients: Client[];
}

export function StepClient({ data, updateData, clients }: StepClientProps) {
    const handleClientChange = (clientId: string) => {
        const client = clients.find(c => c.id === clientId);
        if (client) {
            updateData("clientId", client.id);
            updateData("clientName", client.nombreComercial);
            updateData("clientRnc", client.rnc);
        }
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
            <div className="space-y-2">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                    <User className="h-5 w-5 text-blue-600" />
                    Seleccionar Cliente
                </h2>
                <p className="text-sm text-gray-500">¿A quién va dirigida esta factura?</p>
            </div>

            <div className="glass-card p-6 space-y-4">
                <div className="space-y-2">
                    <Label>Cliente</Label>
                    <Select value={data.clientId} onValueChange={handleClientChange}>
                        <SelectTrigger className="h-12 bg-white/50 backdrop-blur-sm">
                            <SelectValue placeholder="Buscar cliente..." />
                        </SelectTrigger>
                        <SelectContent>
                            {clients.map(client => (
                                <SelectItem key={client.id} value={client.id}>
                                    <div className="flex items-center gap-2">
                                        <Building2 className="h-4 w-4 text-gray-400" />
                                        <span>{client.nombreComercial}</span>
                                        {client.rnc && <span className="text-xs text-gray-400">({client.rnc})</span>}
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {data.clientName && (
                    <div className="p-4 bg-blue-50/50 rounded-lg border border-blue-100 flex gap-4 items-start">
                        <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold shrink-0">
                            {data.clientName.charAt(0)}
                        </div>
                        <div>
                            <p className="font-semibold text-gray-900">{data.clientName}</p>
                            <p className="text-sm text-gray-500">RNC: {data.clientRnc || "N/A"}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
