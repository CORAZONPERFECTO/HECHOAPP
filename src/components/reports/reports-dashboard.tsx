"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const data = [
    { name: 'Ene', tickets: 40, ventas: 2400 },
    { name: 'Feb', tickets: 30, ventas: 1398 },
    { name: 'Mar', tickets: 20, ventas: 9800 },
    { name: 'Abr', tickets: 27, ventas: 3908 },
    { name: 'May', tickets: 18, ventas: 4800 },
    { name: 'Jun', tickets: 23, ventas: 3800 },
    { name: 'jul', tickets: 34, ventas: 4300 },
];

export function ReportsDashboard() {
    return (
        <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
                <TabsTrigger value="overview">General</TabsTrigger>
                <TabsTrigger value="tickets">Tickets</TabsTrigger>
                <TabsTrigger value="sales">Ventas</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Tickets Totales</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">1,234</div>
                            <p className="text-xs text-muted-foreground">+20.1% respecto al mes pasado</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Ingresos</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">$45,231.89</div>
                            <p className="text-xs text-muted-foreground">+15% respecto al mes pasado</p>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                    <Card className="col-span-4">
                        <CardHeader>
                            <CardTitle>Resumen Anual</CardTitle>
                        </CardHeader>
                        <CardContent className="pl-2">
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={data}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                                        <Tooltip />
                                        <Bar dataKey="ventas" fill="#adfa1d" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="col-span-3">
                        <CardHeader>
                            <CardTitle>Flujo de Tickets</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={data}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                        <Tooltip />
                                        <Line type="monotone" dataKey="tickets" stroke="#8884d8" strokeWidth={2} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </TabsContent>

            <TabsContent value="tickets">
                <Card>
                    <CardHeader><CardTitle>Detalle de Tickets</CardTitle></CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">Próximamente: Tablas detalladas y filtros avanzados.</p>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="sales">
                <Card>
                    <CardHeader><CardTitle>Detalle de Ventas</CardTitle></CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">Próximamente: Desglose por cliente y técnico.</p>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    );
}
