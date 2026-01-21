"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { Ticket } from "@/types/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TicketAnalyticsEngine, AnalyticsData } from "@/lib/analytics-engine";
import { AnalyticsCharts } from "@/components/tickets/analytics-charts";
import { TechnicianPerformance } from "@/components/tickets/technician-performance";
import { ArrowLeft, Download, TrendingUp, MapPin, Package, Sparkles, Loader2 } from "lucide-react";

export default function TicketAnalyticsPage() {
    const router = useRouter();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

    // Load tickets
    // Load tickets - Protected Route Pattern
    useEffect(() => {
        let unsubscribeTickets: () => void;

        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (!user) {
                setLoading(false);
                router.push("/login");
                return;
            }

            // User is authenticated, fetch data
            const q = query(
                collection(db, "tickets"),
                orderBy("createdAt", "desc"),
                limit(500)
            );

            unsubscribeTickets = onSnapshot(q, (snapshot) => {
                const loadedTickets = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as Ticket));

                setTickets(loadedTickets);

                // Generate analytics
                const engine = new TicketAnalyticsEngine(loadedTickets);
                const data = engine.generateFullAnalytics();
                setAnalytics(data);

                setLoading(false);
            }, (error) => {
                console.error("Error fetching tickets:", error);
                setLoading(false);
            });
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeTickets) unsubscribeTickets();
        };
    }, [router]);

    const handleExport = () => {
        // TODO: Implement Excel export
        alert("Exportación a Excel en desarrollo");
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-50">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!analytics) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-50">
                <div className="text-center">
                    <p className="text-gray-500 mb-4">No se pudieron cargar los datos analíticos</p>
                    <Button onClick={() => router.push("/tickets")}>Volver a Tickets</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-[1600px] mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" onClick={() => router.push("/tickets")}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Volver
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                                <TrendingUp className="h-8 w-8 text-blue-600" />
                                Analítica Avanzada
                            </h1>
                            <p className="text-gray-500">Insights y tendencias del sistema de tickets</p>
                        </div>
                    </div>
                    <Button onClick={handleExport} variant="outline" className="gap-2">
                        <Download className="h-4 w-4" />
                        Exportar a Excel
                    </Button>
                </div>

                {/* Key Metrics Summary */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-center">
                                <div className="text-4xl font-bold text-blue-600">{tickets.length}</div>
                                <div className="text-sm text-gray-500 mt-1">Total Tickets</div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-center">
                                <div className="text-4xl font-bold text-green-600">
                                    {analytics.trends[analytics.trends.length - 1]?.avgResolutionTime.toFixed(1) || '0'}h
                                </div>
                                <div className="text-sm text-gray-500 mt-1">Tiempo Resolución Actual</div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-center">
                                <div className="text-4xl font-bold text-purple-600">
                                    {analytics.technicians.length}
                                </div>
                                <div className="text-sm text-gray-500 mt-1">Técnicos Activos</div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-yellow-500">
                        <CardContent className="pt-6">
                            <div className="text-center">
                                <div className="text-4xl font-bold text-yellow-600">
                                    {analytics.predictions.nextMonthTickets}
                                </div>
                                <div className="text-sm text-gray-500 mt-1 flex items-center justify-center gap-1">
                                    <Sparkles className="h-3 w-3" />
                                    Predicción Próximo Mes
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Analytics Tabs */}
                <Tabs defaultValue="trends" className="w-full">
                    <TabsList className="grid w-full max-w-3xl grid-cols-4 mb-6">
                        <TabsTrigger value="trends">Tendencias</TabsTrigger>
                        <TabsTrigger value="technicians">Técnicos</TabsTrigger>
                        <TabsTrigger value="zones">Zonas</TabsTrigger>
                        <TabsTrigger value="predictions">Predicciones</TabsTrigger>
                    </TabsList>

                    <TabsContent value="trends" className="space-y-6">
                        <AnalyticsCharts
                            trends={analytics.trends}
                            serviceTypes={analytics.serviceTypes}
                        />
                    </TabsContent>

                    <TabsContent value="technicians" className="space-y-6">
                        <TechnicianPerformance technicians={analytics.technicians} />
                    </TabsContent>

                    <TabsContent value="zones" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <MapPin className="h-5 w-5 text-red-600" />
                                    Zonas Calientes
                                </CardTitle>
                                <CardDescription>
                                    Ubicaciones con mayor demanda de servicio
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {analytics.hotZones.map((zone, index) => (
                                        <div
                                            key={zone.location}
                                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-red-100 text-red-600 font-bold">
                                                    {index + 1}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-gray-900">{zone.location}</div>
                                                    <div className="text-sm text-gray-500">
                                                        {zone.mostCommonIssue}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-2xl font-bold text-blue-600">{zone.ticketCount}</div>
                                                <div className="text-xs text-gray-500">tickets</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Materials Analysis */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Package className="h-5 w-5 text-orange-600" />
                                    Análisis de Materiales
                                </CardTitle>
                                <CardDescription>
                                    Consumo y costos de materiales
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {analytics.materials.map((material) => (
                                        <div
                                            key={material.category}
                                            className="flex items-center justify-between p-4 border rounded-lg"
                                        >
                                            <div>
                                                <div className="font-semibold text-gray-900">{material.category}</div>
                                                <div className="text-sm text-gray-500">
                                                    {material.frequency} tickets con materiales
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xl font-bold text-emerald-600">
                                                    ${material.totalCost.toLocaleString()}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    ${material.avgCostPerTicket.toFixed(2)} promedio
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="predictions" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Sparkles className="h-5 w-5 text-yellow-600" />
                                    Predicciones e Insights
                                </CardTitle>
                                <CardDescription>
                                    Análisis predictivo basado en tendencias históricas
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
                                    <h3 className="font-semibold text-blue-900 mb-2">
                                        📊 Volumen Esperado
                                    </h3>
                                    <p className="text-blue-700">
                                        Se esperan aproximadamente <span className="font-bold text-2xl">{analytics.predictions.nextMonthTickets}</span> tickets
                                        el próximo mes basado en tendencias recientes.
                                    </p>
                                </div>

                                <div className="p-6 bg-purple-50 border border-purple-200 rounded-lg">
                                    <h3 className="font-semibold text-purple-900 mb-2">
                                        📦 Materiales Sugeridos
                                    </h3>
                                    <p className="text-purple-700 mb-3">
                                        Asegúrate de tener inventario de estos items de alta rotación:
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {analytics.predictions.suggestedMaterials.map(material => (
                                            <span
                                                key={material}
                                                className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium"
                                            >
                                                {material}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
                                    <h3 className="font-semibold text-green-900 mb-2">
                                        📅 Días Pico
                                    </h3>
                                    <p className="text-green-700 mb-3">
                                        Los días con mayor demanda histórica son:
                                    </p>
                                    <div className="flex gap-2">
                                        {analytics.predictions.peakDays.map(day => (
                                            <span
                                                key={day}
                                                className="px-4 py-2 bg-green-100 text-green-800 rounded-lg font-semibold"
                                            >
                                                {day}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
