"use client";

import { useState, useEffect } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { collection, getDocs, addDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Client } from "@/types/schema";

interface ClientSelectorProps {
    value?: string;
    onSelect: (clientId: string, clientName: string) => void;
}

export function ClientSelector({ value, onSelect }: ClientSelectorProps) {
    const [open, setOpen] = useState(false);
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(false);

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

        // Wait for auth to initialize
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                fetchClients();
            }
        });

        return () => unsubscribe();
    }, []);

    const handleCreateClient = async () => {
        setCreating(true);
        try {
            const docRef = await addDoc(collection(db, "clients"), {
                ...newClientData,
                tipoCliente: 'EMPRESA', // Default
                personaContacto: newClientData.nombreComercial, // Default
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            const newClient: Client = {
                id: docRef.id,
                ...newClientData,
                tipoCliente: 'EMPRESA',
                personaContacto: newClientData.nombreComercial,
                createdAt: Timestamp.fromMillis(Date.now()),
                updatedAt: Timestamp.fromMillis(Date.now()),
            };

            setClients(prev => [...prev, newClient]);
            onSelect(newClient.id, newClient.nombreComercial);
            setShowNewClientModal(false);
            setOpen(false);
        } catch (error) {
            console.error("Error creating client:", error);
        } finally {
            setCreating(false);
        }
    };

    const selectedClient = clients.find(c => c.id === value);

    return (
        <>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between"
                    >
                        {selectedClient ? selectedClient.nombreComercial : "Seleccionar cliente..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0">
                    <Command>
                        <CommandInput placeholder="Buscar cliente..." />
                        <CommandList>
                            <CommandEmpty>No se encontraron clientes.</CommandEmpty>
                            <CommandGroup>
                                {clients.map((client) => (
                                    <CommandItem
                                        key={client.id}
                                        value={`${client.nombreComercial} ${client.id}`} // Ensure unique value for search
                                        onSelect={() => {
                                            onSelect(client.id, client.nombreComercial);
                                            setOpen(false);
                                        }}
                                        className="cursor-pointer" // Force cursor pointer
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                value === client.id ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        {client.nombreComercial}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                            <div className="p-2 border-t">
                                <Button
                                    variant="secondary"
                                    className="w-full justify-start text-blue-600"
                                    onClick={() => setShowNewClientModal(true)}
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Agregar nuevo cliente
                                </Button>
                            </div>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>

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
