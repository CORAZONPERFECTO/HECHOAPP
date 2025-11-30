"use client";

import { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Client } from "@/types/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Users, Building2, Home, Hotel } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ClientsPage() {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const router = useRouter();

    useEffect(() => {
        const q = query(collection(db, "clients"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const clientsData = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Client[];
            setClients(clientsData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const filteredClients = clients.filter((client) =>
        client.nombreComercial.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.personaContacto.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.rnc?.includes(searchTerm)
    );

    const getClientIcon = (type: string) => {
        switch (type) {
            case "HOTEL": return <Hotel className="h-5 w-5 text-blue-500" />;
            case "EMPRESA": return <Building2 className="h-5 w-5 text-purple-500" />;
            case "RESIDENCIAL": return <Home className="h-5 w-5 text-green-500" />;
            default: return <Users className="h-5 w-5 text-gray-500" />;
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
                        <p className="text-gray-500">Gestiona tu cartera de clientes y sus propiedades</p>
                    </div>
                    <Link href="/clients/new">
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Nuevo Cliente
                        </Button>
                    </Link>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Buscar por nombre, contacto o RNC..."
                        className="pl-10 bg-white"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* List */}
                {loading ? (
                    <div className="text-center py-12 text-gray-500">Cargando clientes...</div>
                ) : filteredClients.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg border border-dashed">
                        <Users className="mx-auto h-12 w-12 text-gray-300" />
                        <h3 className="mt-2 text-sm font-semibold text-gray-900">No hay clientes</h3>
                        <p className="mt-1 text-sm text-gray-500">Comienza creando tu primer cliente.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredClients.map((client) => (
                            <div
                                key={client.id}
                                onClick={() => router.push(`/clients/${client.id}`)}
                                className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-all cursor-pointer group"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-blue-50 transition-colors">
                                        {getClientIcon(client.tipoCliente)}
                                    </div>
                                    <span className="text-xs font-medium px-2 py-1 bg-gray-100 rounded-full text-gray-600">
                                        {client.tipoCliente}
                                    </span>
                                </div>

                                <h3 className="font-semibold text-gray-900 mb-1">{client.nombreComercial}</h3>
                                <p className="text-sm text-gray-500 mb-4 truncate">{client.personaContacto}</p>

                                <div className="space-y-2 text-sm text-gray-600 pt-4 border-t">
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-400">📞</span> {client.telefonoContacto}
                                    </div>
                                    {client.emailContacto && (
                                        <div className="flex items-center gap-2 truncate">
                                            <span className="text-gray-400">✉️</span> {client.emailContacto}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
