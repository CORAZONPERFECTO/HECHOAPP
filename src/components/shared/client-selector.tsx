"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Check, ChevronsUpDown, Plus, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { collection, getDocs, addDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Client } from "@/types/schema";

interface ClientSelectorProps {
    value?: string;
    onSelect: (client: Client) => void;
}

export function ClientSelector({ value, onSelect }: ClientSelectorProps) {
    const [open, setOpen] = useState(false);
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    // New Client Modal State
    const [showNewClientModal, setShowNewClientModal] = useState(false);
    const [newClientData, setNewClientData] = useState({
        nombreComercial: "",
        telefonoContacto: "",
        emailContacto: "",
        rnc: "",
    });
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        const fetchClients = async () => {
            setLoading(true);
            try {
                const snapshot = await getDocs(collection(db, "clients"));
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client));
                setClients(data);
            } catch (error) {
                console.error("Error fetching clients:", error);
            } finally {
                setLoading(false);
            }
        };

        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) fetchClients();
        });
        return () => unsubscribe();
    }, []);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        if (open) {
            document.addEventListener("mousedown", handleClickOutside);
            // Focus search when opened
            setTimeout(() => searchRef.current?.focus(), 50);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [open]);

    const filteredClients = useMemo(() => {
        if (!search.trim()) return clients;
        const q = search.toLowerCase();
        return clients.filter(c => c.nombreComercial?.toLowerCase().includes(q));
    }, [clients, search]);

    const selectedClient = clients.find(c => c.id === value);

    const handleSelect = (client: Client) => {
        onSelect(client);
        setOpen(false);
        setSearch("");
    };

    const handleCreateClient = async () => {
        setCreating(true);
        try {
            const docRef = await addDoc(collection(db, "clients"), {
                ...newClientData,
                tipoCliente: "EMPRESA",
                personaContacto: newClientData.nombreComercial,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            const newClient: Client = {
                id: docRef.id,
                ...newClientData,
                tipoCliente: "EMPRESA",
                personaContacto: newClientData.nombreComercial,
                createdAt: Timestamp.fromMillis(Date.now()),
                updatedAt: Timestamp.fromMillis(Date.now()),
            };

            setClients(prev => [...prev, newClient]);
            onSelect(newClient);
            setShowNewClientModal(false);
            setOpen(false);
            setSearch("");
        } catch (error) {
            console.error("Error creating client:", error);
        } finally {
            setCreating(false);
        }
    };

    return (
        <>
            <div ref={containerRef} className="relative w-full">
                {/* Trigger Button */}
                <button
                    type="button"
                    className={cn(
                        "flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
                        "hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                        "disabled:cursor-not-allowed disabled:opacity-50"
                    )}
                    onClick={() => setOpen(prev => !prev)}
                >
                    <span className={cn("truncate", !selectedClient && "text-muted-foreground")}>
                        {selectedClient ? selectedClient.nombreComercial : "Seleccionar cliente..."}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </button>

                {/* Dropdown Panel */}
                {open && (
                    <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 rounded-md border bg-popover shadow-lg">
                        {/* Search Box */}
                        <div className="flex items-center border-b px-3 py-2">
                            <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                            <input
                                ref={searchRef}
                                type="text"
                                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                                placeholder="Buscar cliente..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                            {search && (
                                <button onClick={() => setSearch("")} className="ml-1 text-muted-foreground hover:text-foreground">
                                    <X className="h-3 w-3" />
                                </button>
                            )}
                        </div>

                        {/* List */}
                        <div className="max-h-[240px] overflow-y-auto">
                            {loading ? (
                                <p className="py-6 text-center text-sm text-muted-foreground">Cargando...</p>
                            ) : filteredClients.length === 0 ? (
                                <p className="py-6 text-center text-sm text-muted-foreground">No se encontraron clientes.</p>
                            ) : (
                                filteredClients.map(client => (
                                    <button
                                        key={client.id}
                                        type="button"
                                        className={cn(
                                            "flex w-full items-center px-3 py-2 text-sm text-left",
                                            "hover:bg-accent hover:text-accent-foreground",
                                            value === client.id && "bg-accent text-accent-foreground"
                                        )}
                                        onClick={() => handleSelect(client)}
                                    >
                                        <Check className={cn(
                                            "mr-2 h-4 w-4 shrink-0",
                                            value === client.id ? "opacity-100" : "opacity-0"
                                        )} />
                                        <span className="truncate">{client.nombreComercial}</span>
                                    </button>
                                ))
                            )}
                        </div>

                        {/* Add Client Footer */}
                        <div className="border-t p-2">
                            <button
                                type="button"
                                className="flex w-full items-center rounded-sm px-3 py-2 text-sm text-blue-600 hover:bg-accent"
                                onClick={() => {
                                    setOpen(false);
                                    setShowNewClientModal(true);
                                }}
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Agregar nuevo cliente
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* New Client Dialog */}
            <Dialog open={showNewClientModal} onOpenChange={setShowNewClientModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Nuevo Cliente Rápido</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Nombre Comercial</Label>
                            <Input
                                value={newClientData.nombreComercial}
                                onChange={e => setNewClientData(prev => ({ ...prev, nombreComercial: e.target.value }))}
                                placeholder="Ej. Empresa ABC"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Teléfono</Label>
                            <Input
                                value={newClientData.telefonoContacto}
                                onChange={e => setNewClientData(prev => ({ ...prev, telefonoContacto: e.target.value }))}
                                placeholder="(809) 000-0000"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>RNC / Cédula</Label>
                            <Input
                                value={newClientData.rnc}
                                onChange={e => setNewClientData(prev => ({ ...prev, rnc: e.target.value }))}
                                placeholder="001-0000000-0"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowNewClientModal(false)}>Cancelar</Button>
                        <Button onClick={handleCreateClient} disabled={creating || !newClientData.nombreComercial}>
                            {creating ? "Guardando..." : "Guardar y Seleccionar"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
