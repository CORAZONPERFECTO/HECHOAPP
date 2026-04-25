"use client";

import { useState, useEffect, use } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { AssetCard } from "@/components/hvac/asset-card";
import { InterventionTimeline } from "@/components/hvac/intervention-timeline";
import { InterventionForm } from "@/components/hvac/intervention-form";
import { QRCodeDialog } from "@/components/hvac/qr-code-dialog";
import { HVACAsset, Intervention } from "@/types/hvac";
import { format } from "date-fns";
import { ApprovalRequestForm } from "@/components/tickets/approval-request-form";
import { getAssetByQr, getAssetHistory, getLocationNode, addInterventionComment, getApprovalsByAsset } from "@/lib/hvac-service";
import { auth } from "@/lib/firebase"; // Using auth for current user context
import { onAuthStateChanged } from "firebase/auth";
import { Loader2, ArrowLeft, PlusCircle, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// We need to fetch asset by ID, not QR, for the page route. 
// Adding helper locally if not in service, but standard is getDoc.
async function getAssetById(id: string): Promise<HVACAsset | null> {
    try {
        const snap = await getDoc(doc(db, "equipment", id));
        return snap.exists() ? ({ id: snap.id, ...snap.data() } as HVACAsset) : null;
    } catch (e) {
        console.error(e);
        return null;
    }
}

export default function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
    // Unwrap params in Next.js 15+
    const { id } = use(params);
    const router = useRouter();

    const [user, setUser] = useState<any>(null);
    const [asset, setAsset] = useState<HVACAsset | null>(null);
    const [history, setHistory] = useState<Intervention[]>([]);
    const [lastDoc, setLastDoc] = useState<any>(null);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [approvals, setApprovals] = useState<any[]>([]); // New state
    const [locationName, setLocationName] = useState<string>("");

    const [loading, setLoading] = useState(true);
    const [isInterventionOpen, setIsInterventionOpen] = useState(false);
    const [isApprovalOpen, setIsApprovalOpen] = useState(false); // New state
    const [qrOpen, setQrOpen] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
            if (authUser) {
                // Fetch full user profile
                try {
                    const userDoc = await getDoc(doc(db, "users", authUser.uid));
                    if (userDoc.exists()) {
                        setUser({ uid: authUser.uid, ...userDoc.data() });
                    } else {
                        setUser(authUser); // Fallback
                    }
                } catch (e) {
                    console.error("Error fetching user", e);
                }
            } else {
                setUser(null);
            }
        });
        return () => unsubscribe();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const assetData = await getAssetById(id);
            if (assetData) {
                setAsset(assetData);

                // Load Location Name
                const loc = await getLocationNode(assetData.locationId);
                if (loc) setLocationName(loc.name);

                // Load History (Initial)
                const { items, lastDoc: last } = await getAssetHistory(id);
                setHistory(items);
                setLastDoc(last);
                setHasMore(items.length === 10);

                // Load Approvals
                const apps = await getApprovalsByAsset(id);
                setApprovals(apps);
            }
        } catch (error) {
            console.error("Error loading asset", error);
        } finally {
            setLoading(false);
        }
    };

    const handleLoadMore = async () => {
        if (!lastDoc || loadingMore) return;
        setLoadingMore(true);
        try {
            const { items, lastDoc: last } = await getAssetHistory(id, lastDoc);
            setHistory(prev => [...prev, ...items]);
            setLastDoc(last);
            setHasMore(items.length === 10);
        } catch (error) {
            console.error("Error loading more history", error);
        } finally {
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        if (id) loadData();
    }, [id]);

    if (loading) {
        return (
            <AppLayout>
                <div className="flex justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                </div>
            </AppLayout>
        );
    }

    if (!asset) {
        return (
            <AppLayout>
                <div className="text-center py-20">
                    <h2 className="text-xl font-bold text-gray-700">Equipo no encontrado</h2>
                    <Button variant="link" onClick={() => router.back()}>Volver</Button>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <div className="max-w-4xl mx-auto space-y-6">

                {/* Header / Nav */}
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{asset.name}</h1>
                        <p className="text-sm text-gray-500 flex items-center gap-2">
                            Ubicación: <span className="font-medium text-gray-700">{locationName || "Cargando..."}</span>
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Sidebar: Asset Card & Specs */}
                    <div className="md:col-span-1 space-y-4">
                        <AssetCard
                            asset={asset}
                            showActions={true}
                            onShowQr={() => setQrOpen(true)}
                            onNewIntervention={() => setIsInterventionOpen(true)}
                            onViewHistory={() => { }} // Already here
                        />

                        {/* Specs Panel */}
                        <div className="bg-white p-4 rounded-xl border space-y-3">
                            <h3 className="font-semibold text-sm text-gray-700">Especificaciones Técnicas</h3>
                            <div className="text-xs space-y-2 text-gray-600">
                                <div className="flex justify-between border-b pb-1">
                                    <span>Marca</span> <span className="font-mono">{asset.specs.brand}</span>
                                </div>
                                <div className="flex justify-between border-b pb-1">
                                    <span>Modelo</span> <span className="font-mono">{asset.specs.model}</span>
                                </div>
                                <div className="flex justify-between border-b pb-1">
                                    <span>Serie</span> <span className="font-mono">{asset.specs.serialNumber}</span>
                                </div>
                                <div className="flex justify-between border-b pb-1">
                                    <span>Refrigerante</span> <span>{asset.specs.refrigerant || "N/A"}</span>
                                </div>
                                <div className="flex justify-between border-b pb-1">
                                    <span>Voltaje</span> <span>{asset.specs.voltage || "N/A"}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Content: Timeline / RIT */}
                    <div className="md:col-span-2 space-y-4">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold text-gray-800">Historial de Intervenciones (RIT)</h2>
                            {user?.rol !== 'CLIENTE' && (
                                <Button size="sm" onClick={() => setIsInterventionOpen(true)} className="bg-blue-600">
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Nueva Intervención
                                </Button>
                            )}
                        </div>

                        <div className="bg-white p-6 rounded-xl border min-h-[400px]">
                            <InterventionTimeline
                                interventions={history}
                                currentUser={user}
                                onAddComment={async (interventionId, text) => {
                                    if (!user) return;
                                    await addInterventionComment(interventionId, text, {
                                        uid: user.uid,
                                        displayName: user.name || user.displayName || 'Usuario',
                                        role: user.rol || 'STAFF'
                                    });
                                    // Refresh history to show new comment
                                    loadData();
                                }}
                            />
                        </div>

                        {/* Load More Button */}
                        {hasMore && (
                            <div className="flex justify-center mt-4">
                                <Button
                                    variant="outline"
                                    onClick={handleLoadMore}
                                    disabled={loadingMore}
                                >
                                    {loadingMore ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Cargar más intervenciones
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Approvals Section */}
                    {user?.rol !== 'CLIENTE' && (
                        <div className="md:col-span-3 mt-8">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-semibold text-gray-800">Solicitudes y Cotizaciones</h2>
                                <Button size="sm" onClick={() => setIsApprovalOpen(true)} variant="outline">
                                    <ClipboardList className="mr-2 h-4 w-4" />
                                    Nueva Solicitud
                                </Button>
                            </div>

                            {approvals.length === 0 ? (
                                <div className="bg-slate-50 border border-dashed rounded-xl p-8 text-center text-gray-500">
                                    No hay solicitudes pendientes.
                                </div>
                            ) : (
                                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                                    {approvals.map((req: any) => (
                                        <Card key={req.id}>
                                            <CardHeader className="pb-2">
                                                <div className="flex justify-between">
                                                    <Badge variant={req.status === 'APPROVED' ? 'default' : req.status === 'REJECTED' ? 'destructive' : 'secondary'}>
                                                        {req.status}
                                                    </Badge>
                                                    <span className="text-xs text-gray-400">{req.createdAt?.toDate ? format(req.createdAt.toDate(), "dd/MM") : ""}</span>
                                                </div>
                                                <CardTitle className="text-sm font-medium mt-2">{req.title}</CardTitle>
                                            </CardHeader>
                                            <CardContent className="text-sm text-gray-600">
                                                <p className="line-clamp-2">{req.description}</p>
                                                {req.amount && (
                                                    <p className="font-bold mt-2 text-gray-900">RD$ {req.amount.toLocaleString()}</p>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Dialogs */}
                <QRCodeDialog
                    open={qrOpen}
                    onOpenChange={setQrOpen}
                    assetName={asset.name}
                    qrCode={asset.qrCode}
                />

                <Dialog open={isInterventionOpen} onOpenChange={setIsInterventionOpen}>
                    <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Registrar Intervención</DialogTitle>
                        </DialogHeader>
                        {user && (
                            <InterventionForm
                                assetId={asset.id}
                                clientId={asset.clientId}
                                locationId={asset.locationId}
                                technicianId={user.uid}
                                technicianName={user.displayName || user.email || "Técnico"}
                                onSuccess={() => {
                                    setIsInterventionOpen(false);
                                    loadData(); // Refresh history
                                }}
                                onCancel={() => setIsInterventionOpen(false)}
                            />
                        )}
                        {!user && <p className="text-red-500 text-center">Inicie sesión para continuar</p>}
                    </DialogContent>
                </Dialog>

            </div>
        </AppLayout>
    );
}
