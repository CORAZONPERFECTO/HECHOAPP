"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TechnicianMetrics } from "@/lib/analytics-engine";
import { Trophy, TrendingUp, DollarSign, Clock, CheckCircle2, Target } from "lucide-react";

interface TechnicianPerformanceProps {
    technicians: TechnicianMetrics[];
}

export function TechnicianPerformance({ technicians }: TechnicianPerformanceProps) {
    const topPerformer = technicians[0];

    return (
        <div className="space-y-6">
            {/* Top Performer Highlight */}
            {topPerformer && (
                <Card className="border-l-4 border-l-yellow-500 bg-gradient-to-r from-yellow-50 to-white">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <Trophy className="h-8 w-8 text-yellow-500" />
                            <div>
                                <CardTitle className="text-xl">🏆 Técnico del Mes</CardTitle>
                                <CardDescription className="text-lg font-semibold text-gray-900">
                                    {topPerformer.technicianName}
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center">
                                <div className="text-3xl font-bold text-green-600">
                                    {topPerformer.completionRate.toFixed(0)}%
                                </div>
                                <div className="text-xs text-gray-500 mt-1">Tasa de Cierre</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-blue-600">
                                    {topPerformer.avgResolutionTime.toFixed(1)}h
                                </div>
                                <div className="text-xs text-gray-500 mt-1">Tiempo Promedio</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-purple-600">
                                    {topPerformer.completedTickets}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">Tickets Completados</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-emerald-600">
                                    ${topPerformer.totalRevenue.toLocaleString()}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">Ingresos Generados</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* All Technicians Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-blue-600" />
                        Ranking de Técnicos
                    </CardTitle>
                    <CardDescription>
                        Métricas de performance y productividad por técnico
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b">
                                <tr>
                                    <th className="text-left p-3 text-sm font-semibold text-gray-700">#</th>
                                    <th className="text-left p-3 text-sm font-semibold text-gray-700">Técnico</th>
                                    <th className="text-center p-3 text-sm font-semibold text-gray-700">
                                        <div className="flex items-center justify-center gap-1">
                                            <CheckCircle2 className="h-4 w-4" />
                                            Tasa Cierre
                                        </div>
                                    </th>
                                    <th className="text-center p-3 text-sm font-semibold text-gray-700">
                                        <div className="flex items-center justify-center gap-1">
                                            <Clock className="h-4 w-4" />
                                            Tiempo Prom.
                                        </div>
                                    </th>
                                    <th className="text-center p-3 text-sm font-semibold text-gray-700">
                                        <div className="flex items-center justify-center gap-1">
                                            <Target className="h-4 w-4" />
                                            Completados
                                        </div>
                                    </th>
                                    <th className="text-center p-3 text-sm font-semibold text-gray-700">
                                        <div className="flex items-center justify-center gap-1">
                                            <DollarSign className="h-4 w-4" />
                                            Ingresos
                                        </div>
                                    </th>
                                    <th className="text-center p-3 text-sm font-semibold text-gray-700">Performance</th>
                                </tr>
                            </thead>
                            <tbody>
                                {technicians.map((tech, index) => {
                                    const performanceColor =
                                        tech.completionRate >= 90 ? 'bg-green-100 text-green-800 border-green-300' :
                                            tech.completionRate >= 75 ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                                                'bg-red-100 text-red-800 border-red-300';

                                    const performanceLabel =
                                        tech.completionRate >= 90 ? 'Excelente' :
                                            tech.completionRate >= 75 ? 'Bueno' :
                                                'Requiere Atención';

                                    return (
                                        <tr
                                            key={tech.technicianId}
                                            className="border-b hover:bg-slate-50 transition-colors"
                                        >
                                            <td className="p-3">
                                                <div className="flex items-center justify-center">
                                                    {index === 0 && <Trophy className="h-5 w-5 text-yellow-500" />}
                                                    {index === 1 && <Trophy className="h-5 w-5 text-gray-400" />}
                                                    {index === 2 && <Trophy className="h-5 w-5 text-amber-700" />}
                                                    {index >= 3 && <span className="text-gray-500 font-medium">{index + 1}</span>}
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-blue-100 text-blue-600 font-semibold">
                                                        {tech.technicianName.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-gray-900">{tech.technicianName}</div>
                                                        <div className="text-xs text-gray-500">
                                                            {tech.totalTickets} tickets totales
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-3 text-center">
                                                <span className={`text-lg font-bold ${tech.completionRate >= 90 ? 'text-green-600' :
                                                        tech.completionRate >= 75 ? 'text-yellow-600' :
                                                            'text-red-600'
                                                    }`}>
                                                    {tech.completionRate.toFixed(0)}%
                                                </span>
                                            </td>
                                            <td className="p-3 text-center">
                                                <span className="text-sm font-medium text-blue-600">
                                                    {tech.avgResolutionTime.toFixed(1)}h
                                                </span>
                                            </td>
                                            <td className="p-3 text-center">
                                                <span className="text-sm font-semibold text-purple-600">
                                                    {tech.completedTickets}
                                                </span>
                                            </td>
                                            <td className="p-3 text-center">
                                                <span className="text-sm font-medium text-emerald-600">
                                                    ${tech.totalRevenue.toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="p-3 text-center">
                                                <Badge className={`${performanceColor} border`}>
                                                    {performanceLabel}
                                                </Badge>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {technicians.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                            No hay datos de técnicos disponibles
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
