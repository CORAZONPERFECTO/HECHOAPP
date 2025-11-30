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
import { collection, getDocs, addDoc, serverTimestamp, query, where } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { User } from "@/types/schema";

interface TechnicianSelectorProps {
    value?: string;
    onSelect: (techId: string, techName: string) => void;
}

export function TechnicianSelector({ value, onSelect }: TechnicianSelectorProps) {
    const [open, setOpen] = useState(false);
    const [technicians, setTechnicians] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);

    // New Technician Modal State
    const [showNewTechModal, setShowNewTechModal] = useState(false);
    const [newTechData, setNewTechData] = useState({
        nombre: "",
        email: "",
        telefono: "",
    });
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        const fetchTechnicians = async () => {
            setLoading(true);
            try {
                const q = query(collection(db, "users"), where("rol", "==", "TECNICO"));
                const snapshot = await getDocs(q);
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
                setTechnicians(data);
            } catch (error) {
                console.error("Error fetching technicians:", error);
            } finally {
                setLoading(false);
            }
        };

        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                fetchTechnicians();
            }
        });

        return () => unsubscribe();
    }, []);

    const handleCreateTechnician = async () => {
        setCreating(true);
        try {
            const docRef = await addDoc(collection(db, "users"), {
                ...newTechData,
                rol: 'TECNICO',
                activo: true,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            const newTech: User = {
                id: docRef.id,
                ...newTechData,
                rol: 'TECNICO',
                activo: true,
                createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
                updatedAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
            };

            setTechnicians(prev => [...prev, newTech]);
            onSelect(newTech.id, newTech.nombre);
            setShowNewTechModal(false);
            setOpen(false);
        } catch (error) {
            console.error("Error creating technician:", error);
        } finally {
            setCreating(false);
        }
    };

    const selectedTech = technicians.find(t => t.id === value);

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
                        {selectedTech ? selectedTech.nombre : "Seleccionar técnico..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0">
                    <Command>
                        <CommandInput placeholder="Buscar técnico..." />
                        <CommandList>
                            <CommandEmpty>No se encontraron técnicos.</CommandEmpty>
                            <CommandGroup>
                                {technicians.map((tech) => (
                                    <CommandItem
                                        key={tech.id}
                                        value={`${tech.nombre} ${tech.id}`}
                                        onSelect={() => {
                                            onSelect(tech.id, tech.nombre);
                                            setOpen(false);
                                        }}
                                        className="cursor-pointer"
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                value === tech.id ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        {tech.nombre}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                            <div className="p-2 border-t">
                                <Button
                                    variant="secondary"
                                    className="w-full justify-start text-blue-600"
                                    onClick={() => setShowNewTechModal(true)}
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Agregar nuevo técnico
                                </Button>
                            </div>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>

            <Dialog open={showNewTechModal} onOpenChange={setShowNewTechModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Nuevo Técnico Rápido</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Nombre Completo</Label>
                            <Input
                                value={newTechData.nombre}
                                onChange={e => setNewTechData(prev => ({ ...prev, nombre: e.target.value }))}
                                placeholder="Ej. Juan Pérez"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input
                                value={newTechData.email}
                                onChange={e => setNewTechData(prev => ({ ...prev, email: e.target.value }))}
                                placeholder="juan@ejemplo.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Teléfono</Label>
                            <Input
                                value={newTechData.telefono}
                                onChange={e => setNewTechData(prev => ({ ...prev, telefono: e.target.value }))}
                                placeholder="(809) 000-0000"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowNewTechModal(false)}>Cancelar</Button>
                        <Button onClick={handleCreateTechnician} disabled={creating || !newTechData.nombre}>
                            {creating ? "Guardando..." : "Guardar y Seleccionar"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
