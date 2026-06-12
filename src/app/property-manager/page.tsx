"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { RoleGuard } from "@/components/layout/role-guard";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs, doc, getDoc, orderBy, limit } from "firebase/firestore";
import { 
    Loader2, 
    Building2, 
    Wrench, 
    Search, 
    FileText, 
    Calendar, 
    CheckCircle2, 
    AlertCircle, 
    AlertTriangle, 
    Clock, 
    FileSpreadsheet,
    MapPin,
    ExternalLink
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AssetData {
    id: string;
    name: string;
    status: string;
    locationId: string;
    villaId: string;
    locationName: string;
    brand: string;
    model: string;
    btu: string;
    serialNumber: string;
    lastMaintenanceDate?: Date;
    lastMaintenanceType?: string;
    lastMaintenanceId?: string;
    lastMaintenanceSummary?: string;
    recommendation?: string;
    recommendationDate?: Date;
}

export default function PropertyManagerDashboard() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [villas, setVillas] = useState<any[]>([]);
    const [assets, setAssets] = useState<AssetData[]>([]);
    const [filteredAssets, setFilteredAssets] = useState<AssetData[]>([]);
    
    // Filters state
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedVilla, setSelectedVilla] = useState("ALL");
    const [selectedStatus, setSelectedStatus] = useState("ALL");

    // Stats
    const [stats, setStats] = useState({
        totalVillas: 0,
        totalAssets: 0,
        operationalCount: 0,
        pendingMaintenance: 0,
        withRecommendations: 0,
    });

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
            if (authUser) {
                try {
                    const userDoc = await getDoc(doc(db, "users", authUser.uid));
                    if (userDoc.exists()) {
                        setUser({ id: authUser.uid, ...userDoc.data() });
                    } else {
                        // Support for super-admin bypass
                        if (authUser.email?.toLowerCase() === 'lcaa27@gmail.com') {
                            setUser({ id: authUser.uid, rol: 'ADMIN', nombre: 'Super Admin' });
                        } else {
                            setUser(null);
                        }
                    }
                } catch (e) {
                    console.error("Error loading user profile:", e);
                }
            } else {
                setUser(null);
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!user) return;

        const loadDashboardData = async () => {
            setLoading(true);
            try {
                let assignedIds: string[] = [];

                if (user.rol === 'ADMIN' || user.rol === 'SUPERVISOR') {
                    // For admins/supervisors testing, fetch all locations to choose from
                    const locationsSnap = await getDocs(collection(db, "locations"));
                    assignedIds = locationsSnap.docs.map(d => d.id);
                } else if (user.assignedLocations && user.assignedLocations.length > 0) {
                    assignedIds = user.assignedLocations;
                }

                if (assignedIds.length === 0) {
                    setVillas([]);
                    setAssets([]);
                    setLoading(false);
                    return;
                }

                // 1. Fetch assigned locations/villas
                const villasList: any[] = [];
                // Firestore limit of 30 for 'in' query
                const chunkedIds = chunkArray(assignedIds, 30);
                for (const chunk of chunkedIds) {
                    const villasQuery = query(
                        collection(db, "locations"),
                        where("__name__", "in", chunk)
                    );
                    const villasSnap = await getDocs(villasQuery);
                    villasSnap.docs.forEach(docSnap => {
                        villasList.push({ id: docSnap.id, ...docSnap.data() });
                    });
                }
                setVillas(villasList);

                // 2. Fetch equipment for these locations
                const equipmentList: any[] = [];
                // Query by locationId
                for (const chunk of chunkedIds) {
                    const eqQueryLocation = query(
                        collection(db, "equipment"),
                        where("locationId", "in", chunk)
                    );
                    const eqSnapLoc = await getDocs(eqQueryLocation);
                    eqSnapLoc.docs.forEach(docSnap => {
                        equipmentList.push({ id: docSnap.id, ...docSnap.data() });
                    });

                    // Query by villaId (for newer schema support)
                    const eqQueryVilla = query(
                        collection(db, "equipment"),
                        where("villaId", "in", chunk)
                    );
                    const eqSnapVilla = await getDocs(eqQueryVilla);
                    eqSnapVilla.docs.forEach(docSnap => {
                        // Deduplicate if already fetched
                        if (!equipmentList.some(item => item.id === docSnap.id)) {
                            equipmentList.push({ id: docSnap.id, ...docSnap.data() });
                        }
                    });
                }

                // 3. For each equipment, load latest completed intervention
                const assetsData: AssetData[] = await Promise.all(
                    equipmentList.map(async (eq) => {
                        const villa = villasList.find(v => v.id === eq.locationId || v.id === eq.villaId);
                        
                        // Extract brand, model, btu from either old structure or new specs structure
                        const brand = eq.specs?.brand || eq.marca || "Genérica";
                        const model = eq.specs?.model || eq.modelo || "N/D";
                        const btu = eq.specs?.btu?.toString() || eq.capacidadBTU || "N/D";
                        const serialNumber = eq.specs?.serialNumber || eq.numeroSerie || "N/D";

                        // Get latest completed intervention
                        const interventionQuery = query(
                            collection(db, "interventions"),
                            where("assetId", "==", eq.id),
                            where("status", "==", "COMPLETED"),
                            orderBy("createdAt", "desc"),
                            limit(1)
                        );
                        
                        const interventionSnap = await getDocs(interventionQuery);
                        let lastMaintDate: Date | undefined;
                        let lastMaintType: string | undefined;
                        let lastMaintId: string | undefined;
                        let lastMaintSummary: string | undefined;
                        let recommendation: string | undefined;
                        let recommendationDate: Date | undefined;

                        if (!interventionSnap.empty) {
                            const latestInt = interventionSnap.docs[0].data();
                            lastMaintDate = latestInt.completedAt?.toDate() || latestInt.createdAt?.toDate();
                            lastMaintType = latestInt.type;
                            lastMaintId = interventionSnap.docs[0].id;
                            lastMaintSummary = latestInt.summary || latestInt.technicalReport;
                            
                            if (latestInt.recommendations && latestInt.recommendations.trim()) {
                                recommendation = latestInt.recommendations;
                                recommendationDate = latestInt.completedAt?.toDate() || latestInt.createdAt?.toDate();
                            }
                        }

                        return {
                            id: eq.id,
                            name: eq.name || eq.nombre || "Equipo Sin Nombre",
                            status: eq.status || (eq.activo ? "OPERATIONAL" : "OFFLINE"),
                            locationId: eq.locationId || "",
                            villaId: eq.villaId || "",
                            locationName: villa ? villa.nombre : "Villa Desconocida",
                            brand,
                            model,
                            btu,
                            serialNumber,
                            lastMaintenanceDate: lastMaintDate,
                            lastMaintenanceType: lastMaintType,
                            lastMaintenanceId: lastMaintId,
                            lastMaintenanceSummary: lastMaintSummary,
                            recommendation,
                            recommendationDate
                        };
                    })
                );

                setAssets(assetsData);

                // Compute stats
                const totalVillas = villasList.length;
                const totalAssets = assetsData.length;
                const operationalCount = assetsData.filter(a => a.status === 'OPERATIONAL').length;
                const withRecommendations = assetsData.filter(a => !!a.recommendation).length;
                
                // Count pending maintenance (e.g. assets without maintenance or status is warning/critical)
                const pendingMaintenance = assetsData.filter(a => !a.lastMaintenanceDate || a.status === 'WARNING' || a.status === 'CRITICAL').length;

                setStats({
                    totalVillas,
                    totalAssets,
                    operationalCount,
                    pendingMaintenance,
                    withRecommendations
                });

            } catch (error) {
                console.error("Error loading dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };

        loadDashboardData();
    }, [user]);

    // Apply filtering
    useEffect(() => {
        let result = [...assets];

        if (selectedVilla !== "ALL") {
            result = result.filter(a => a.locationId === selectedVilla || a.villaId === selectedVilla);
        }

        if (selectedStatus !== "ALL") {
            result = result.filter(a => a.status === selectedStatus);
        }

        if (searchQuery.trim()) {
            const queryLower = searchQuery.toLowerCase();
            result = result.filter(a => 
                a.name.toLowerCase().includes(queryLower) ||
                a.brand.toLowerCase().includes(queryLower) ||
                a.model.toLowerCase().includes(queryLower) ||
                a.serialNumber.toLowerCase().includes(queryLower) ||
                a.locationName.toLowerCase().includes(queryLower)
            );
        }

        setFilteredAssets(result);
    }, [assets, searchQuery, selectedVilla, selectedStatus]);

    // Helper to chunk arrays
    const chunkArray = (array: any[], size: number) => {
        const result = [];
        for (let i = 0; i < array.length; i += size) {
            result.push(array.slice(i, i + size));
        }
        return result;
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "OPERATIONAL":
                return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Operativo</Badge>;
            case "WARNING":
                return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Revisión Requerida</Badge>;
            case "CRITICAL":
                return <Badge className="bg-rose-100 text-rose-800 border-rose-200">Falla Crítica</Badge>;
            case "MAINTENANCE":
                return <Badge className="bg-blue-100 text-blue-800 border-blue-200">En Mantenimiento</Badge>;
            default:
                return <Badge className="bg-slate-100 text-slate-800 border-slate-200">Fuera de Servicio</Badge>;
        }
    };

    if (loading) {
        return (
            <AppLayout>
                <div className="flex flex-col items-center justify-center min-h-[60vh]">
                    <Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-4" />
                    <p className="text-gray-500 font-medium">Cargando panel de gestor de propiedades...</p>
                </div>
            </AppLayout>
        );
    }

    return (
        <RoleGuard allowedRoles={["PROPERTY_MANAGER", "ADMIN", "SUPERVISOR"]}>
            <AppLayout>
                <div className="max-w-7xl mx-auto space-y-8">
                    
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
                                <Building2 className="h-8 w-8 text-blue-600" />
                                Portal de Property Managers
                            </h1>
                            <p className="text-slate-500 mt-1">
                                Vista exclusiva para la supervisión de equipos y mantenimientos de tus villas asignadas.
                            </p>
                        </div>
                        {user && (
                            <div className="text-sm bg-slate-50 border rounded-lg p-3">
                                <span className="text-slate-500 block text-xs">Gestor:</span>
                                <span className="font-semibold text-slate-800">{user.nombre || user.email}</span>
                            </div>
                        )}
                    </div>

                    {villas.length === 0 ? (
                        <Card className="border-dashed py-12 text-center">
                            <CardContent className="space-y-4">
                                <MapPin className="h-12 w-12 text-slate-300 mx-auto" />
                                <h3 className="text-lg font-semibold text-slate-700">Sin villas asignadas</h3>
                                <p className="text-slate-500 max-w-md mx-auto">
                                    No tienes villas asociadas a tu perfil de gestor. Por favor, solicita al administrador del sistema que te asigne las villas correspondientes.
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <>
                            {/* Stats Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                                <Card className="bg-white shadow-sm border-slate-100 hover:shadow transition-shadow">
                                    <CardContent className="p-5 flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-slate-400 font-semibold uppercase">Villas Asignadas</p>
                                            <p className="text-2xl font-bold text-slate-800 mt-1">{stats.totalVillas}</p>
                                        </div>
                                        <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                                            <Building2 className="h-5 w-5" />
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="bg-white shadow-sm border-slate-100 hover:shadow transition-shadow">
                                    <CardContent className="p-5 flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-slate-400 font-semibold uppercase">Equipos Totales</p>
                                            <p className="text-2xl font-bold text-slate-800 mt-1">{stats.totalAssets}</p>
                                        </div>
                                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                                            <Wrench className="h-5 w-5" />
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="bg-white shadow-sm border-slate-100 hover:shadow transition-shadow">
                                    <CardContent className="p-5 flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-slate-400 font-semibold uppercase">Operativos</p>
                                            <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.operationalCount}</p>
                                        </div>
                                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                                            <CheckCircle2 className="h-5 w-5" />
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="bg-white shadow-sm border-slate-100 hover:shadow transition-shadow">
                                    <CardContent className="p-5 flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-slate-400 font-semibold uppercase">Revisión/Fallas</p>
                                            <p className="text-2xl font-bold text-rose-600 mt-1">{stats.pendingMaintenance}</p>
                                        </div>
                                        <div className="p-3 bg-rose-50 text-rose-600 rounded-lg">
                                            <AlertCircle className="h-5 w-5" />
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="bg-white shadow-sm border-slate-100 hover:shadow transition-shadow">
                                    <CardContent className="p-5 flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-slate-400 font-semibold uppercase">Recomendados</p>
                                            <p className="text-2xl font-bold text-amber-600 mt-1">{stats.withRecommendations}</p>
                                        </div>
                                        <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
                                            <AlertTriangle className="h-5 w-5" />
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Filters & Actions */}
                            <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm space-y-4">
                                <h3 className="font-semibold text-slate-800 text-sm">Filtros y Búsqueda</h3>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    
                                    {/* Search Input */}
                                    <div className="relative md:col-span-2">
                                        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                        <Input
                                            placeholder="Buscar equipo, marca, modelo o serie..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-9 bg-white"
                                        />
                                    </div>

                                    {/* Villa Filter */}
                                    <div>
                                        <select
                                            value={selectedVilla}
                                            onChange={(e) => setSelectedVilla(e.target.value)}
                                            className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="ALL">Todas las Villas</option>
                                            {villas.map(v => (
                                                <option key={v.id} value={v.id}>{v.nombre}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Status Filter */}
                                    <div>
                                        <select
                                            value={selectedStatus}
                                            onChange={(e) => setSelectedStatus(e.target.value)}
                                            className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="ALL">Todos los Estados</option>
                                            <option value="OPERATIONAL">Operativo</option>
                                            <option value="WARNING">Revisión Requerida</option>
                                            <option value="CRITICAL">Falla Crítica</option>
                                            <option value="MAINTENANCE">En Mantenimiento</option>
                                        </select>
                                    </div>

                                </div>
                            </div>

                            {/* Table of Assets */}
                            <Card className="border-slate-100 shadow-sm overflow-hidden bg-white">
                                <CardHeader className="border-b bg-slate-50/50 py-4 px-6 flex flex-row items-center justify-between">
                                    <CardTitle className="text-md font-bold text-slate-800">
                                        Equipos e Historial de Mantenimientos ({filteredAssets.length})
                                    </CardTitle>
                                </CardHeader>
                                
                                <div className="overflow-x-auto">
                                    {filteredAssets.length === 0 ? (
                                        <div className="text-center py-12 text-slate-400">
                                            No se encontraron equipos que coincidan con los filtros seleccionados.
                                        </div>
                                    ) : (
                                        <table className="w-full text-left border-collapse text-sm">
                                            <thead>
                                                <tr className="bg-slate-100/60 border-b border-slate-200 text-slate-600 font-semibold">
                                                    <th className="py-3.5 px-6">Villa / Ubicación</th>
                                                    <th className="py-3.5 px-4">Nombre Equipo</th>
                                                    <th className="py-3.5 px-4">Marca / Modelo / Serie</th>
                                                    <th className="py-3.5 px-4">Capacidad (BTU)</th>
                                                    <th className="py-3.5 px-4">Estado</th>
                                                    <th className="py-3.5 px-4">Último Mantenimiento</th>
                                                    <th className="py-3.5 px-6">Recomendación Técnica</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {filteredAssets.map((asset) => (
                                                    <tr key={asset.id} className="hover:bg-slate-50/70 transition-colors">
                                                        <td className="py-4 px-6 font-medium text-slate-800">
                                                            <div className="flex items-center gap-2">
                                                                <MapPin className="h-4 w-4 text-blue-500 shrink-0" />
                                                                {asset.locationName}
                                                            </div>
                                                        </td>
                                                        <td className="py-4 px-4 font-semibold text-slate-900">
                                                            {asset.name}
                                                        </td>
                                                        <td className="py-4 px-4 text-slate-500">
                                                            <span className="block font-medium text-slate-700">{asset.brand}</span>
                                                            <span className="block text-xs font-mono">{asset.model}</span>
                                                            <span className="block text-[11px] font-mono">S/N: {asset.serialNumber}</span>
                                                        </td>
                                                        <td className="py-4 px-4 font-mono text-slate-700 font-medium">
                                                            {Number(asset.btu) ? Number(asset.btu).toLocaleString() : asset.btu} BTU
                                                        </td>
                                                        <td className="py-4 px-4">
                                                            {getStatusBadge(asset.status)}
                                                        </td>
                                                        <td className="py-4 px-4">
                                                            {asset.lastMaintenanceDate ? (
                                                                <div className="space-y-1">
                                                                    <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1 w-max">
                                                                        <Calendar className="h-3 w-3 text-slate-400" />
                                                                        {format(asset.lastMaintenanceDate, "dd MMM yyyy", { locale: es })}
                                                                    </span>
                                                                    <p className="text-xs text-slate-500 line-clamp-1 max-w-[200px]" title={asset.lastMaintenanceSummary}>
                                                                        {asset.lastMaintenanceSummary}
                                                                    </p>
                                                                    {asset.lastMaintenanceId && (
                                                                        <Button
                                                                            variant="link"
                                                                            size="sm"
                                                                            onClick={() => window.open(`/hvac/print/intervention/${asset.lastMaintenanceId}`, '_blank')}
                                                                            className="h-auto p-0 text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1 font-semibold"
                                                                        >
                                                                            Ver Reporte PDF
                                                                            <ExternalLink className="h-3 w-3" />
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <span className="text-xs text-slate-400 italic flex items-center gap-1">
                                                                    <Clock className="h-3 w-3" /> Sin registro
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="py-4 px-6">
                                                            {asset.recommendation ? (
                                                                <div className="bg-amber-50/80 border border-amber-100 p-2.5 rounded-lg text-xs text-amber-800 max-w-[280px]">
                                                                    <p className="font-semibold mb-1 flex items-center gap-1">
                                                                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                                                                        Recomendado ({format(asset.recommendationDate!, "dd/MM/yy")}):
                                                                    </p>
                                                                    <p className="leading-normal">{asset.recommendation}</p>
                                                                </div>
                                                            ) : (
                                                                <span className="text-xs text-slate-400 italic">Ninguna registrada</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </Card>
                        </>
                    )}
                </div>
            </AppLayout>
        </RoleGuard>
    );
}
