"use client";

import { useEffect, useState } from "react";
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Location, Ticket } from "@/types/schema";
import { Button } from "@/components/ui/button";
import { Plus, MapPin, ChevronRight, Home, Shield, Sparkles, ExternalLink, Share2, BookOpen } from "lucide-react";
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
    const [newLocationAddress, setNewLocationAddress] = useState("");
    const [newLocationUrl, setNewLocationUrl] = useState("");
    const [newIsRetainer, setNewIsRetainer] = useState(true);
    const [creating, setCreating] = useState(false);
    const [discoveredVillas, setDiscoveredVillas] = useState<string[]>([]);
    const [importingDiscovered, setImportingDiscovered] = useState(false);
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

    // Buscar nombres de villas en tickets históricos que no estén en la colección locations
    useEffect(() => {
        if (!clientId) return;
        const scanTicketsForVillas = async () => {
            try {
                const tQ = query(
                    collection(db, "tickets"),
                    where("clientId", "==", clientId)
                );
                const tSnap = await getDocs(tQ);
                const foundNames = new Set<string>();

                tSnap.docs.forEach((d) => {
                    const data = d.data() as Ticket;
                    const loc = data.locationName || data.specificLocation || "";
                    if (loc && loc !== "Ubicación no especificada" && !loc.startsWith("http")) {
                        foundNames.add(loc.trim());
                    }
                });

                // Filtrar las que ya existen en locations
                const existingNames = new Set(locations.map((l) => l.nombre.toLowerCase().trim()));
                const unlinked = Array.from(foundNames).filter(
                    (name) => !existingNames.has(name.toLowerCase())
                );
                setDiscoveredVillas(unlinked);
            } catch (e) {
                console.error("Error scanning tickets for villas:", e);
            }
        };

        scanTicketsForVillas();
    }, [clientId, locations]);

    const handleCreateLocation = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newLocationName.trim()) return;

        setCreating(true);
        try {
            await addDoc(collection(db, "locations"), {
                clientId,
                nombre: newLocationName.trim(),
                direccion: newLocationAddress.trim() || "",
                locationUrl: newLocationUrl.trim() || "",
                isRetainer: newIsRetainer,
                contractType: newIsRetainer ? "IGUALA" : "EVENTUAL",
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
            setNewLocationName("");
            setNewLocationAddress("");
            setNewLocationUrl("");
            setIsDialogOpen(false);
        } catch (error) {
            console.error("Error creating location:", error);
            alert("Error al crear ubicación.");
        } finally {
            setCreating(false);
        }
    };

    const handleAutoImportDiscovered = async (villaName: string) => {
        setImportingDiscovered(true);
        try {
            await addDoc(collection(db, "locations"), {
                clientId,
                nombre: villaName,
                isRetainer: true,
                contractType: "IGUALA",
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
            setDiscoveredVillas((prev) => prev.filter((n) => n !== villaName));
        } catch (e) {
            console.error("Error auto-importing villa:", e);
        } finally {
            setImportingDiscovered(false);
        }
    };

    if (loading) return <div className="text-center py-4 text-slate-500">Cargando ubicaciones...</div>;

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-blue-600" />
                        Villas & Ubicaciones ({locations.length})
                    </h3>
                    <p className="text-xs text-slate-500">
                        Propiedades y villas del cliente con su Bitácora Digital y censo de equipos.
                    </p>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white gap-1.5">
                            <Plus className="h-4 w-4" />
                            Nueva Villa
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Registrar Nueva Villa</DialogTitle>
                            <DialogDescription>
                                Agrega una villa o ubicación para este cliente con su modalidad de contrato.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreateLocation} className="space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="name">Nombre de la Villa / Propiedad *</Label>
                                <Input
                                    id="name"
                                    value={newLocationName}
                                    onChange={(e) => setNewLocationName(e.target.value)}
                                    placeholder="Ej. Villa Las Palmas #45 o Hacienda 12"
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="address">Dirección o Sector</Label>
                                <Input
                                    id="address"
                                    value={newLocationAddress}
                                    onChange={(e) => setNewLocationAddress(e.target.value)}
                                    placeholder="Ej. Punta Cana Resort & Club"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="gps" className="flex items-center gap-1">
                                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                                    Enlace GPS (Google Maps / Waze)
                                </Label>
                                <Input
                                    id="gps"
                                    type="url"
                                    value={newLocationUrl}
                                    onChange={(e) => setNewLocationUrl(e.target.value)}
                                    placeholder="https://maps.app.goo.gl/... o https://waze.com/ul/..."
                                />
                            </div>

                            {/* Selector de Modalidad Iguala */}
                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="retainer" className="font-semibold text-xs text-slate-800 flex items-center gap-1.5 cursor-pointer">
                                        <Shield className="w-4 h-4 text-emerald-600" />
                                        ¿Es una Villa con Iguala (Mantenimiento Periódico)?
                                    </Label>
                                    <input
                                        id="retainer"
                                        type="checkbox"
                                        checked={newIsRetainer}
                                        onChange={(e) => setNewIsRetainer(e.target.checked)}
                                        className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                                    />
                                </div>
                                <p className="text-[11px] text-slate-500">
                                    Las villas con iguala activan la Bitácora Digital, censo de tarjetas y retención histórica de 3 años.
                                </p>
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={creating} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                                    {creating ? "Creando..." : "Crear Villa"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Banner de Auto-Descubrimiento de Villas desde Tickets Históricos */}
            {discoveredVillas.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2 text-blue-900 font-semibold text-xs">
                        <Sparkles className="w-4 h-4 text-blue-600" />
                        Villas detectadas en tickets históricos pendientes de ficha ({discoveredVillas.length}):
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {discoveredVillas.map((vName) => (
                            <Button
                                key={vName}
                                onClick={() => handleAutoImportDiscovered(vName)}
                                disabled={importingDiscovered}
                                size="sm"
                                variant="outline"
                                className="text-xs bg-white text-blue-700 border-blue-200 hover:bg-blue-100 gap-1.5"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                Crear ficha para "{vName}"
                            </Button>
                        ))}
                    </div>
                </div>
            )}

            {locations.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-slate-200 space-y-2">
                    <Home className="mx-auto h-10 w-10 text-slate-300" />
                    <p className="text-sm font-medium text-slate-600">No hay villas registradas para este cliente.</p>
                    <p className="text-xs text-slate-400">Registra una nueva villa para acceder a su Bitácora Digital y ficha técnica.</p>
                </div>
            ) : (
                <div className="grid gap-3">
                    {locations.map((location) => {
                        const isRetainer = location.isRetainer || location.contractType === "IGUALA";

                        return (
                            <div
                                key={location.id}
                                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:shadow-md transition-all gap-3 group"
                            >
                                <div
                                    onClick={() => router.push(`/clients/locations/${location.id}`)}
                                    className="flex items-start gap-3 cursor-pointer flex-1"
                                >
                                    <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl mt-0.5">
                                        <Home className="h-5 w-5" />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h4 className="font-bold text-slate-900 text-sm group-hover:text-emerald-700 transition-colors">
                                                {location.nombre}
                                            </h4>
                                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${isRetainer
                                                ? "bg-emerald-100 text-emerald-800"
                                                : "bg-slate-100 text-slate-700"
                                                }`}>
                                                <Shield className="w-3 h-3" />
                                                {isRetainer ? "Villa con Iguala" : "Eventual"}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500">
                                            {location.direccion || "Sin dirección física"} &bull; ID: {location.id.slice(0, 8)}
                                        </p>
                                    </div>
                                </div>

                                {/* Botones de Acción */}
                                <div className="flex items-center gap-2 self-end sm:self-center">
                                    {location.locationUrl && (
                                        <a
                                            href={location.locationUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-slate-100 transition-colors"
                                            title="Ver GPS en Google Maps / Waze"
                                        >
                                            <MapPin className="w-4 h-4 text-emerald-600" />
                                        </a>
                                    )}

                                    <Button
                                        onClick={() => router.push(`/clients/locations/${location.id}`)}
                                        size="sm"
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
                                    >
                                        <BookOpen className="w-3.5 h-3.5" />
                                        Bitácora Digital
                                    </Button>

                                    <Button
                                        onClick={() => {
                                            const shareUrl = `${window.location.origin}/villas/${location.id}`;
                                            const msg = `*Bitácora Digital de la Villa*\nVilla: *${location.nombre}*\nAcceso web: ${shareUrl}`;
                                            window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, "_blank");
                                        }}
                                        size="sm"
                                        variant="outline"
                                        className="text-xs border-slate-200 text-slate-700 hover:bg-slate-50 gap-1"
                                        title="Compartir Villa Care Pass por WhatsApp"
                                    >
                                        <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

