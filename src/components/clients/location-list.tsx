"use client";

import { useEffect, useState } from "react";
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Location } from "@/types/schema";
import { Button } from "@/components/ui/button";
import { Plus, MapPin, ChevronRight, Home } from "lucide-react";
import { useRouter } from "next/navigation";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LocationListProps {
    clientId: string;
}

export function LocationList({ clientId }: LocationListProps) {
    const [locations, setLocations] = useState<Location[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [newLocationName, setNewLocationName] = useState("");
    const [creating, setCreating] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const q = query(
            collection(db, "locations"),
            where("clientId", "==", clientId),
            orderBy("createdAt", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const locs = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Location[];
            setLocations(locs);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [clientId]);

    const handleCreateLocation = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newLocationName.trim()) return;

        setCreating(true);
        try {
            await addDoc(collection(db, "locations"), {
                clientId,
                nombre: newLocationName,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
            setNewLocationName("");
            setIsDialogOpen(false);
        } catch (error) {
            console.error("Error creating location:", error);
        } finally {
            setCreating(false);
        }
    };

    if (loading) return <div className="text-center py-4">Cargando ubicaciones...</div>;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Villas / Ubicaciones ({locations.length})</h3>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm">
                            <Plus className="mr-2 h-4 w-4" />
                            Nueva Villa
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Agregar Nueva Villa</DialogTitle>
                            <DialogDescription>
                                Crea una nueva ubicación para este cliente. Podrás agregar más detalles después.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreateLocation} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nombre de la Villa / Ubicación</Label>
                                <Input
                                    id="name"
                                    value={newLocationName}
                                    onChange={(e) => setNewLocationName(e.target.value)}
                                    placeholder="Ej. Villa Las Palmas #45"
                                    required
                                />
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={creating}>
                                    {creating ? "Creando..." : "Crear Ubicación"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {locations.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed">
                    <Home className="mx-auto h-10 w-10 text-gray-300" />
                    <p className="mt-2 text-sm text-gray-500">No hay ubicaciones registradas.</p>
                </div>
            ) : (
                <div className="grid gap-3">
                    {locations.map((location) => (
                        <div
                            key={location.id}
                            onClick={() => router.push(`/clients/locations/${location.id}`)}
                            className="flex items-center justify-between p-4 bg-white border rounded-lg hover:shadow-md transition-all cursor-pointer group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-full">
                                    <MapPin className="h-5 w-5" />
                                </div>
                                <div>
                                    <h4 className="font-medium text-gray-900">{location.nombre}</h4>
                                    <p className="text-xs text-gray-500">ID: {location.id.slice(0, 8)}...</p>
                                </div>
                            </div>
                            <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-gray-500" />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
