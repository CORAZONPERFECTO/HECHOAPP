
"use client";

import { Client } from "@/types/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, MapPin, Phone, Mail, FileText, Wrench } from "lucide-react";
import Link from "next/link";

interface ClientHeaderProps {
    client: Client;
}

export function ClientHeader({ client }: ClientHeaderProps) {
    return (
        <div className="glass-card p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-4">
                <div className="h-16 w-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-blue-500/20">
                    {client.nombreComercial.charAt(0).toUpperCase()}
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold text-gray-900">{client.nombreComercial}</h1>
                        <Badge variant="outline" className="text-blue-600 bg-blue-50 border-blue-200">
                            {client.tipoCliente}
                        </Badge>
                    </div>
                    <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
                        {client.rnc && (
                            <span className="flex items-center gap-1">
                                <FileText className="h-3 w-3" /> {client.rnc}
                            </span>
                        )}
                        <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {client.telefonoContacto}
                        </span>
                        {client.emailContacto && (
                            <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" /> {client.emailContacto}
                            </span>
                        )}
                        <span className="flex items-center gap-1 text-gray-400">
                            <MapPin className="h-3 w-3" /> {client.direccion || "Sin dirección"}
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex gap-3 w-full md:w-auto">
                <Button variant="outline" className="flex-1 md:flex-none gap-2">
                    <Edit className="h-4 w-4" /> Editar
                </Button>
                <Button asChild className="flex-1 md:flex-none gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md hover:shadow-lg">
                    <Link href={`/income/invoices/new?clientId=${client.id}`}>
                        <FileText className="h-4 w-4" /> Nueva Factura
                    </Link>
                </Button>
                <Button asChild variant="secondary" className="flex-1 md:flex-none gap-2">
                    <Link href={`/tickets/new?clientId=${client.id}`}>
                        <Wrench className="h-4 w-4" /> Nuevo Ticket
                    </Link>
                </Button>
            </div>
        </div>
    );
}
