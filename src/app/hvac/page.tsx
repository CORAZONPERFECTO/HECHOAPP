"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { HierarchyBrowser } from "@/components/hvac/hierarchy-browser";
import { AssetCard } from "@/components/hvac/asset-card";
import { AssetForm } from "@/components/hvac/asset-form";
import { QRCodeDialog } from "@/components/hvac/qr-code-dialog";
import { LocationNode, HVACAsset, HierarchyType } from "@/types/hvac";
import { getLocationChildren, getAssetsByLocation, createAsset } from "@/lib/hvac-service";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { UserRole } from "@/types/users";

export default function HVACPortalPage() {
    const router = useRouter();
    const { toast } = useToast();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [user, setUser] = useState<any>(null);
    const [path, setPath] = useState<LocationNode[]>([]);
    const [currentNodes, setCurrentNodes] = useState<LocationNode[]>([]);
    const [assets, setAssets] = useState<HVACAsset[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'HIERARCHY' | 'ASSETS'>('HIERARCHY');

    // Creation State
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [qrAsset, setQrAsset] = useState<HVACAsset | null>(null);

    // Search State
    const [searchQuery, setSearchQuery] = useState("");

    // Filtering Logic
    const filteredNodes = currentNodes.filter(node =>
        node.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredAssets = assets.filter(asset =>
        asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.specs?.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.specs?.model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.specs?.serialNumber?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Initial Load (Root Nodes)
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
            if (authUser) {
                // Fetch full user profile to get Role and ClientId
                try {
                    const userDoc = await getDoc(doc(db, "users", authUser.uid));
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        const fullUser = { uid: authUser.uid, ...userData };
                        setUser(fullUser);

                        // Determine Client Context
                        // If Client, strictly use their ID.
                        // If Staff, use a specific client (DEMO for now) or selector.
                        let targetClient = 'DEMO_CLIENT';
                        if (userData.rol === 'CLIENTE' && userData.clientId) {
                            targetClient = userData.clientId;
                        }

                        // Load Root Level
                        loadLevel(null, targetClient);
                    } else {
                        // User exists in Auth but not DB?
                        console.error("User profile not found");
                        setLoading(false);
                    }
                } catch (error) {
                    console.error("Error fetching user profile", error);
                    setLoading(false);
                }
            } else {
                setLoading(false);
                router.push("/login");
            }
        });
        return () => unsubscribe();
    }, []);

    const loadLevel = async (parentId: string | null, clientId: string) => {
        setLoading(true);
        try {
            const nodes = await getLocationChildren(parentId, clientId);
            setCurrentNodes(nodes);
            setViewMode('HIERARCHY');
            setAssets([]);
        } catch (error) {
            console.error("Error loading hierarchy:", error);
            toast({ title: "Error", description: "Error al cargar ubicaciones", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const loadAssets = async (areaId: string) => {
        setLoading(true);
        try {
            const items = await getAssetsByLocation(areaId);
            setAssets(items);
            setViewMode('ASSETS');
        } catch (error) {
            console.error("Error loading assets:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateAsset = async (data: any) => {
        if (!path.length || path[path.length - 1].type !== 'AREA') return;

        const currentArea = path[path.length - 1];
        setIsSubmitting(true);
        try {
            await createAsset({
                ...data,
                clientId: currentArea.clientId,
                locationId: currentArea.id,
                villaId: path.find(p => p.type === 'VILLA')?.id || currentArea.id, // Fallback
                qrCode: crypto.randomUUID().slice(0, 8).toUpperCase() // Simple auto-gen
            });
            setIsCreateOpen(false);
            await loadAssets(currentArea.id); // Reload
            toast({ title: "Éxito", description: "Equipo registrado exitosamente" });
        } catch (error) {
            console.error("Error creating asset", error);
            toast({ title: "Error", description: "Error al crear equipo", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleNavigate = async (node: LocationNode) => {
        // Update Path
        setPath(prev => [...prev, node]);

        // Logic: If 'AREA', load Assets. Else, load Children.
        // We can check type or just try to load children and if empty/leaf, load assets.
        // Better to use Type logic from design: Project -> Villa -> Area
        if (node.type === 'AREA') {
            await loadAssets(node.id);
        } else {
            await loadLevel(node.id, node.clientId);
        }
    };

    const handleBack = async () => {
        if (path.length === 0) return;

        const newPath = [...path];
        newPath.pop(); // Remove current
        setPath(newPath);

        const parent = newPath.length > 0 ? newPath[newPath.length - 1] : null;
        // Reload parent level
        // In a real app we might cache this to avoid re-fetching
        // Use proper client ID based on user role from state
        const targetClient = user?.rol === 'CLIENTE' ? user.clientId : 'DEMO_CLIENT';
        await loadLevel(parent ? parent.id : null, targetClient);
    };

    return (
        <AppLayout>
            <div className="flex flex-col gap-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                        Portal de Activos HVAC
                    </h1>
                    <p className="text-gray-500 text-sm mb-4">
                        Gestión centralizada de equipos e historial de intervenciones.
                    </p>

                    {/* Tenant Context Banner */}
                    {user && (
                        <div className={`p-3 rounded-lg border text-sm flex items-center gap-2 ${user.rol === 'CLIENTE' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-100 border-slate-200 text-slate-700'}`}>
                            <span className="font-bold">{user.rol === 'CLIENTE' ? 'VISTA DE CLIENTE' : 'VISTA ADMINISTRATIVA'}</span>
                            <span className="mx-2">•</span>
                            <span>
                                {user.rol === 'CLIENTE'
                                    ? `Mostrando activos de: ${user.clientId || 'Cliente Desconocido'}`
                                    : 'Acceso total a todos los clientes (Modo Staff)'}
                            </span>
                        </div>
                    )}
                </div>

                {loading && (
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    </div>
                )}

                {/* Search Bar */}
                {!loading && (
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar activos, áreas o equipos..."
                            className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 pl-10 text-sm ring-offset-background placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                )}

                {/* Content */}
                {!loading && viewMode === 'HIERARCHY' && (
                    <HierarchyBrowser
                        path={path}
                        currentNodes={filteredNodes}
                        onNavigate={handleNavigate}
                        onBack={handleBack}
                    />
                )}

                {!loading && viewMode === 'ASSETS' && (
                    <div className="space-y-4">
                        {/* Breadcrumb Navigation within Asset View */}
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={handleBack}>
                                    <span className="mr-2">←</span> Volver
                                </Button>
                                <span className="text-sm font-medium text-gray-700 ml-2">
                                    Equipos en: {path[path.length - 1]?.name}
                                </span>
                            </div>
                            {user?.rol !== 'CLIENTE' && (
                                <Button onClick={() => setIsCreateOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
                                    + Registrar Equipo
                                </Button>
                            )}
                        </div>

                        {assets.length === 0 ? (
                            <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed">
                                <p className="text-gray-500">No hay equipos registrados en esta área.</p>
                                {user?.rol !== 'CLIENTE' && (
                                    <Button className="mt-4" onClick={() => setIsCreateOpen(true)} variant="outline">+ Registrar Equipo</Button>
                                )}
                            </div>
                        ) : filteredAssets.length === 0 ? (
                            <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed">
                                <p className="text-gray-500">No se encontraron equipos con "{searchQuery}"</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredAssets.map(asset => (
                                    <AssetCard
                                        key={asset.id}
                                        asset={asset}
                                        onViewHistory={() => router.push(`/hvac/asset/${asset.id}`)}
                                        onNewIntervention={() => alert("Utilice la vista de detalle para registrar intervenciones")}
                                        onShowQr={() => setQrAsset(asset)}
                                        showActions={true} // Both Clients and Staff can view details
                                    />
                                ))}
                            </div>
                        )}

                        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                            <DialogContent className="sm:max-w-[600px]">
                                <DialogHeader>
                                    <DialogTitle>Registrar Nuevo Equipo</DialogTitle>
                                </DialogHeader>
                                <AssetForm
                                    onSubmit={handleCreateAsset}
                                    isSubmitting={isSubmitting}
                                />
                            </DialogContent>
                        </Dialog>

                        {qrAsset && (
                            <QRCodeDialog
                                open={!!qrAsset}
                                onOpenChange={(open) => !open && setQrAsset(null)}
                                assetName={qrAsset.name}
                                qrCode={qrAsset.qrCode}
                            />
                        )}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
