"use client";

/**
 * StepClient — Selección de cliente
 * En modo quote: usa el fieldname ERPNext `party_name` (Link → Customer)
 * En modo invoice: usa `clientName` (campo local)
 */

import { Client } from "@/types/schema";
import { cn } from "@/lib/utils";
import { Building2, Search, AlertCircle, Tag } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";

interface StepClientProps {
    data: any;
    updateData: (key: string, value: any) => void;
    clients: Client[];
    mode?: "invoice" | "quote";
}

export function StepClient({ data, updateData, clients, mode = "invoice" }: StepClientProps) {
    const isQuote = mode === "quote";
    const [search, setSearch] = useState("");

    // En mode quote el campo clave es `party_name`; en invoice es `clientName`
    const selectedClientId = data.clientId || data.client_id || "";
    const selectedClientName = isQuote ? data.party_name : data.clientName;

    const filtered = clients.filter((c) => {
        const q = search.toLowerCase();
        return (
            c.nombreComercial?.toLowerCase().includes(q) ||
            c.personaContacto?.toLowerCase().includes(q) ||
            c.rnc?.toLowerCase().includes(q) ||
            c.emailContacto?.toLowerCase().includes(q)
        );
    });

    const handleSelect = (client: Client) => {
        if (isQuote) {
            // Campos ERP exactos
            updateData("party_name", client.nombreComercial || client.id);
            updateData("quotation_to", "Customer");
            updateData("clientId", client.id);
            updateData("clientRnc", client.rnc || "");
        } else {
            updateData("clientId", client.id);
            updateData("clientName", client.nombreComercial || "");
            updateData("clientRnc", client.rnc || "");
        }
    };

    const gradient = isQuote
        ? "from-blue-500 to-indigo-600"
        : "from-purple-500 to-fuchsia-600";
    const accent = isQuote ? "blue" : "purple";

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold text-gray-900">
                    {isQuote ? "Cliente de la Cotización" : "Cliente de la Factura"}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                    {isQuote
                        ? <>Selecciona el cliente. Se guardará como{" "}<code className="font-mono text-xs bg-gray-100 px-1 rounded">party_name</code>{" "}en ERPNext.</>
                        : "¿A quién va dirigida esta factura?"}
                </p>
            </div>

            {/* Cliente seleccionado */}
            {selectedClientId && selectedClientName && (
                <div className={cn(
                    "rounded-xl p-5 bg-gradient-to-r text-white shadow-lg",
                    `bg-gradient-to-r ${gradient}`
                )}>
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                            <Building2 className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <p className="text-lg font-bold truncate">{selectedClientName}</p>
                                {isQuote && (
                                    <span className="shrink-0 text-xs bg-white/20 px-2 py-0.5 rounded-full font-medium">
                                        Cotización
                                    </span>
                                )}
                            </div>
                            {data.clientRnc && (
                                <p className="text-sm text-white/80">
                                    RNC: {data.clientRnc}
                                </p>
                            )}
                            {isQuote && (
                                <p className="text-xs text-white/60 font-mono mt-1">
                                    party_name: "{selectedClientName}"
                                </p>
                            )}
                        </div>
                        <button
                            onClick={() => {
                                updateData("clientId", "");
                                updateData(isQuote ? "party_name" : "clientName", "");
                            }}
                            className="text-white/60 hover:text-white text-xs underline"
                        >
                            Cambiar
                        </button>
                    </div>
                </div>
            )}

            {/* Buscador */}
            {!selectedClientId && (
                <div className="space-y-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Buscar por nombre, RNC o email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                        {filtered.length === 0 ? (
                            <div className="text-center py-8 text-gray-400">
                                <Building2 className="h-10 w-10 mx-auto mb-2 opacity-30" />
                                <p className="text-sm">No se encontraron clientes</p>
                            </div>
                        ) : (
                            filtered.map((client) => (
                                <button
                                    key={client.id}
                                    onClick={() => handleSelect(client)}
                                    className={cn(
                                        "w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all hover:shadow-md",
                                        `hover:border-${accent}-300 hover:bg-${accent}-50`
                                    )}
                                >
                                    <div className={cn(
                                        "h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-bold bg-gradient-to-br shrink-0",
                                        gradient
                                    )}>
                                        {(client.nombreComercial || client.personaContacto || "?")[0]}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-gray-900 truncate">
                                            {client.nombreComercial}
                                        </p>
                                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                                            {client.rnc && (
                                                <span className="flex items-center gap-1">
                                                    <Tag className="h-3 w-3" />
                                                    RNC: {client.rnc}
                                                </span>
                                            )}
                                            {client.emailContacto && <span>{client.emailContacto}</span>}
                                        </div>
                                        {isQuote && (
                                            <p className="text-xs text-gray-300 font-mono mt-0.5">
                                                party_name: "{client.nombreComercial}"
                                            </p>
                                        )}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Warning si no hay cliente */}
            {!selectedClientId && (
                <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>
                        {isQuote
                            ? "Selecciona un cliente para que party_name sea válido en ERPNext."
                            : "Selecciona un cliente para continuar."}
                    </span>
                </div>
            )}
        </div>
    );
}
