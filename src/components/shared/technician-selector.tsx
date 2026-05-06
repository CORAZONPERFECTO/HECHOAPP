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
import { collection, getDocs, addDoc, serverTimestamp, query, where, Timestamp } from "firebase/firestore";
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
    const [search, setSearch] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    const [showNewTechModal, setShowNewTechModal] = useState(false);
    const [newTechData, setNewTechData] = useState({ nombre: "", email: "", telefono: "" });
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
            if (user) fetchTechnicians();
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        if (open) {
            document.addEventListener("mousedown", handleClickOutside);
            setTimeout(() => searchRef.current?.focus(), 50);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [open]);

    const filteredTechnicians = useMemo(() => {
        if (!search.trim()) return technicians;
        const q = search.toLowerCase();
        return technicians.filter(t => t.nombre?.toLowerCase().includes(q));
    }, [technicians, search]);

    const selectedTech = technicians.find(t => t.id === value);

    const handleSelect = (tech: User) => {
        onSelect(tech.id, tech.nombre);
        setOpen(false);
        setSearch("");
    };

    const handleCreateTechnician = async () => {
        setCreating(true);
        try {
            const docRef = await addDoc(collection(db, "users"), {
                ...newTechData,
                rol: "TECNICO",
                activo: true,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            const newTech: User = {
                id: docRef.id,
                ...newTechData,
                rol: "TECNICO",
                activo: true,
                createdAt: Timestamp.fromMillis(Date.now()),
                updatedAt: Timestamp.fromMillis(Date.now()),
            };

            setTechnicians(prev => [...prev, newTech]);
            onSelect(newTech.id, newTech.nombre);
            setShowNewTechModal(false);
            setOpen(false);
            setSearch("");
        } catch (error) {
            console.error("Error creating technician:", error);
        } finally {
            setCreating(false);
        }
    };

    return (
        <>
            <div ref={containerRef} className="relative w-full">
                <button
                    type="button"
                    className={cn(
                        "flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
                        "hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    )}
                    onClick={() => setOpen(prev => !prev)}
                >
                    <span className={cn("truncate", !selectedTech && "text-muted-foreground")}>
                        {selectedTech ? selectedTech.nombre : "Seleccionar técnico..."}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </button>

                {open && (
                    <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 rounded-md border bg-popover shadow-lg">
                        <div className="flex items-center border-b px-3 py-2">
                            <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                            <input
                                ref={searchRef}
                                type="text"
                                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                                placeholder="Buscar técnico..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                            {search && (
                                <button onClick={() => setSearch("")} className="ml-1 text-muted-foreground hover:text-foreground">
                                    <X className="h-3 w-3" />
                                </button>
                            )}
                        </div>

                        <div className="max-h-[240px] overflow-y-auto">
                            {loading ? (
                                <p className="py-6 text-center text-sm text-muted-foreground">Cargando...</p>
                            ) : filteredTechnicians.length === 0 ? (
                                <p className="py-6 text-center text-sm text-muted-foreground">No se encontraron técnicos.</p>
                            ) : (
                                filteredTechnicians.map(tech => (
                                    <button
                                        key={tech.id}
                                        type="button"
                                        className={cn(
                                            "flex w-full items-center px-3 py-2 text-sm text-left",
                                            "hover:bg-accent hover:text-accent-foreground",
                                            value === tech.id && "bg-accent text-accent-foreground"
                                        )}
                                        onClick={() => handleSelect(tech)}
                                    >
                                        <Check className={cn(
                                            "mr-2 h-4 w-4 shrink-0",
                                            value === tech.id ? "opacity-100" : "opacity-0"
                                        )} />
                                        <span className="truncate">{tech.nombre}</span>
                                    </button>
                                ))
                            )}
                        </div>

                        <div className="border-t p-2">
                            <button
                                type="button"
                                className="flex w-full items-center rounded-sm px-3 py-2 text-sm text-blue-600 hover:bg-accent"
                                onClick={() => {
                                    setOpen(false);
                                    setShowNewTechModal(true);
                                }}
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Agregar nuevo técnico
                            </button>
                        </div>
                    </div>
                )}
            </div>

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
