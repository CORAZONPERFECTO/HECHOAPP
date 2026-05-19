"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { TicketTrend, ServiceTypeAnalysis } from "@/lib/analytics-engine";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface AnalyticsChartsProps {
    trends: TicketTrend[];
    serviceTypes: ServiceTypeAnalysis[];
}

const COLORS = ['#1e3a8a', '#1d4ed8', '#0284c7', '#475569', '#0f766e', '#64748b', '#94a3b8', '#38bdf8'];

export function AnalyticsCharts({ trends, serviceTypes }: AnalyticsChartsProps) {
    return (
        <div className="space-y-6">
            {/* Trends Chart */}
            <Card className="border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                <CardHeader>
                    <CardTitle className="text-sm font-bold text-slate-900">Tendencia de Tickets (Últimos 6 Meses)</CardTitle>
                    <CardDescription className="text-xs text-slate-500">Evolución mensual de creación y cierre de tickets</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={trends}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis
                                dataKey="month"
                                stroke="#94a3b8"
                                style={{ fontSize: 11 }}
                            />
                            <YAxis
                                stroke="#94a3b8"
                                style={{ fontSize: 11 }}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#fff',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '0.375rem',
                                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
                                    fontSize: 12
                                }}
                            />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            <Line
                                type="monotone"
                                dataKey="total"
                                stroke="#1e3a8a"
                                strokeWidth={2}
                                name="Total Tickets"
                                dot={{ fill: '#1e3a8a', r: 4 }}
                                activeDot={{ r: 6 }}
                            />
                            <Line
                                type="monotone"
                                dataKey="completed"
                                stroke="#0f766e"
                                strokeWidth={2}
                                name="Completados"
                                dot={{ fill: '#0f766e', r: 4 }}
                                activeDot={{ r: 6 }}
                            />
                            <Line
                                type="monotone"
                                dataKey="cancelled"
                                stroke="#be123c"
                                strokeWidth={2}
                                name="Cancelados"
                                dot={{ fill: '#be123c', r: 4 }}
                                activeDot={{ r: 6 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Service Types Distribution */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                    <CardHeader>
                        <CardTitle className="text-sm font-bold text-slate-900">Distribución por Tipo de Servicio</CardTitle>
                        <CardDescription className="text-xs text-slate-500">Proporción de tickets por categoría</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={serviceTypes.slice(0, 8) as any}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={(props: any) => `${props.serviceType.substring(0, 10)}: ${props.percentage.toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="count"
                                    style={{ fontSize: 10, fontWeight: 500 }}
                                >
                                    {serviceTypes.slice(0, 8).map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#fff',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '0.375rem',
                                        fontSize: 12
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                    <CardHeader>
                        <CardTitle className="text-sm font-bold text-slate-900">Costo Promedio por Tipo</CardTitle>
                        <CardDescription className="text-xs text-slate-500">Análisis de rentabilidad por servicio</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={serviceTypes.slice(0, 8)}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="serviceType"
                                    stroke="#94a3b8"
                                    style={{ fontSize: 9 }}
                                    angle={-45}
                                    textAnchor="end"
                                    height={80}
                                />
                                <YAxis
                                    stroke="#94a3b8"
                                    style={{ fontSize: 11 }}
                                />
                                <Tooltip
                                    formatter={(value: any) => `$${Number(value || 0).toFixed(2)}`}
                                    contentStyle={{
                                        backgroundColor: '#fff',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '0.375rem',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                                        fontSize: 12
                                    }}
                                />
                                <Bar
                                    dataKey="avgCost"
                                    fill="#1e3a8a"
                                    radius={[4, 4, 0, 0]}
                                    name="Costo Promedio"
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Resolution Time Trend */}
            <Card className="border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                <CardHeader>
                    <CardTitle className="text-sm font-bold text-slate-900">Tiempo de Resolución Promedio</CardTitle>
                    <CardDescription className="text-xs text-slate-500">Eficiencia de resolución de tickets en horas</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={trends}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis
                                dataKey="month"
                                stroke="#94a3b8"
                                style={{ fontSize: 11 }}
                            />
                            <YAxis
                                stroke="#94a3b8"
                                style={{ fontSize: 11 }}
                                label={{ value: 'Horas', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#94a3b8' } }}
                            />
                            <Tooltip
                                formatter={(value: any) => `${Number(value || 0).toFixed(1)}h`}
                                contentStyle={{
                                    backgroundColor: '#fff',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '0.375rem',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                                    fontSize: 12
                                }}
                            />
                            <Bar
                                dataKey="avgResolutionTime"
                                fill="#475569"
                                radius={[4, 4, 0, 0]}
                                name="Tiempo Promedio"
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
}
