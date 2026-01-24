"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { TicketTrend, ServiceTypeAnalysis } from "@/lib/analytics-engine";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface AnalyticsChartsProps {
    trends: TicketTrend[];
    serviceTypes: ServiceTypeAnalysis[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export function AnalyticsCharts({ trends, serviceTypes }: AnalyticsChartsProps) {
    return (
        <div className="space-y-6">
            {/* Trends Chart */}
            <Card>
                <CardHeader>
                    <CardTitle>Tendencia de Tickets (Últimos 6 Meses)</CardTitle>
                    <CardDescription>Evolución mensual de creación y cierre de tickets</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={trends}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis
                                dataKey="month"
                                stroke="#6b7280"
                                style={{ fontSize: 12 }}
                            />
                            <YAxis
                                stroke="#6b7280"
                                style={{ fontSize: 12 }}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#fff',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '0.5rem'
                                }}
                            />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="total"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                name="Total Tickets"
                                dot={{ fill: '#3b82f6', r: 4 }}
                            />
                            <Line
                                type="monotone"
                                dataKey="completed"
                                stroke="#10b981"
                                strokeWidth={2}
                                name="Completados"
                                dot={{ fill: '#10b981', r: 4 }}
                            />
                            <Line
                                type="monotone"
                                dataKey="cancelled"
                                stroke="#ef4444"
                                strokeWidth={2}
                                name="Cancelados"
                                dot={{ fill: '#ef4444', r: 4 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Service Types Distribution */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Distribución por Tipo de Servicio</CardTitle>
                        <CardDescription>Proporción de tickets por categoría</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={serviceTypes.slice(0, 8)}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ serviceType, percentage }: any) => `${serviceType.substring(0, 12)}: ${percentage.toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="count"
                                >
                                    {serviceTypes.slice(0, 8).map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Costo Promedio por Tipo</CardTitle>
                        <CardDescription>Análisis de rentabilidad por servicio</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={serviceTypes.slice(0, 8)}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis
                                    dataKey="serviceType"
                                    stroke="#6b7280"
                                    style={{ fontSize: 10 }}
                                    angle={-45}
                                    textAnchor="end"
                                    height={80}
                                />
                                <YAxis
                                    stroke="#6b7280"
                                    style={{ fontSize: 12 }}
                                />
                                <Tooltip
                                    formatter={(value: any) => `$${Number(value).toFixed(2)}`}
                                    contentStyle={{
                                        backgroundColor: '#fff',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '0.5rem'
                                    }}
                                />
                                <Bar
                                    dataKey="avgCost"
                                    fill="#3b82f6"
                                    radius={[8, 8, 0, 0]}
                                    name="Costo Promedio"
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Resolution Time Trend */}
            <Card>
                <CardHeader>
                    <CardTitle>Tiempo de Resolución Promedio</CardTitle>
                    <CardDescription>Eficiencia de resolución de tickets en horas</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={trends}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis
                                dataKey="month"
                                stroke="#6b7280"
                                style={{ fontSize: 12 }}
                            />
                            <YAxis
                                stroke="#6b7280"
                                style={{ fontSize: 12 }}
                                label={{ value: 'Horas', angle: -90, position: 'insideLeft' }}
                            />
                            <Tooltip
                                formatter={(value: any) => `${Number(value).toFixed(1)}h`}
                                contentStyle={{
                                    backgroundColor: '#fff',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '0.5rem'
                                }}
                            />
                            <Bar
                                dataKey="avgResolutionTime"
                                fill="#8b5cf6"
                                radius={[8, 8, 0, 0]}
                                name="Tiempo Promedio"
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
}
