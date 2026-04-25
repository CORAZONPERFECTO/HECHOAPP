"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Ticket, TicketPriority } from "@/types/schema";
import { calculateSLAStatus, SLAStatus } from "./sla-indicator";
import { Clock, AlertTriangle, CheckCircle2, TrendingUp, User, Calendar } from "lucide-react";
import { collection, query, where, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";

interface SLADashboardProps {
    className?: string;
}

interface SLAMetrics {
    atRiskCount: number;
    overdueCount: number;
    onTimeCount: number;
    averageResponseTime: number;
    averageResolutionTime: number;
    complianceRate: number;
}

interface TechnicianPerformance {
    technicianId: string;
    technicianName: string;
    activeTickets: number;
    averageResponseTime: number;
    slaComplianceRate: number;
    ticketsCompleted: number;
}

export function SLADashboard({ className }: SLADashboardProps) {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('week');

    useEffect(() => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const q = query(
            collection(db, "tickets"),
            where("createdAt", ">=", Timestamp.fromDate(thirtyDaysAgo))
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const loadedTickets = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Ticket));
            setTickets(loadedTickets);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const metrics = useMemo<SLAMetrics>(() => {
        let atRiskCount = 0;
        let overdueCount = 0;
        let onTimeCount = 0;
        let totalResponseTime = 0;
        let totalResolutionTime = 0;
        let responseCount = 0;
        let resolutionCount = 0;

        const activeTickets = tickets.filter(t =>
            t.status !== 'COMPLETED' && t.status !== 'CANCELLED'
        );

        activeTickets.forEach(ticket => {
            const sla = calculateSLAStatus(ticket);

            if (sla.resolutionStatus === 'OVERDUE' || sla.responseStatus === 'OVERDUE') {
                overdueCount++;
            } else if (sla.resolutionStatus === 'WARNING' || sla.responseStatus === 'WARNING') {
                atRiskCount++;
            } else {
                onTimeCount++;
            }

            if (ticket.firstResponseAt && ticket.createdAt) {
                const responseTime = (ticket.firstResponseAt.toMillis() - ticket.createdAt.toMillis()) / (1000 * 60 * 60);
                totalResponseTime += responseTime;
                responseCount++;
            }
        });

        const completedTickets = tickets.filter(t => t.status === 'COMPLETED' && t.resolvedAt);
        completedTickets.forEach(ticket => {
            if (ticket.resolvedAt && ticket.createdAt) {
                const resolutionTime = (ticket.resolvedAt.toMillis() - ticket.createdAt.toMillis()) / (1000 * 60 * 60);
                totalResolutionTime += resolutionTime;
                resolutionCount++;
            }
        });

        const averageResponseTime = responseCount > 0 ? totalResponseTime / responseCount : 0;
        const averageResolutionTime = resolutionCount > 0 ? totalResolutionTime / resolutionCount : 0;
        const complianceRate = activeTickets.length > 0
            ? ((onTimeCount / activeTickets.length) * 100)
            : 100;

        return {
            atRiskCount,
            overdueCount,
            onTimeCount,
            averageResponseTime,
            averageResolutionTime,
            complianceRate
        };
    }, [tickets]);

    const atRiskTickets = useMemo(() => {
        return tickets
            .filter(t => t.status !== 'COMPLETED' && t.status !== 'CANCELLED')
            .map(ticket => {
                const sla = calculateSLAStatus(ticket);
                let urgency = 0;
                if (sla.resolutionStatus === 'OVERDUE') urgency = 3;
                else if (sla.responseStatus === 'OVERDUE') urgency = 2;
                else if (sla.resolutionStatus === 'WARNING' || sla.responseStatus === 'WARNING') urgency = 1;
                return { ticket, sla, urgency };
            })
            .filter(item => item.urgency > 0)
            .sort((a, b) => b.urgency - a.urgency)
            .slice(0, 10);
    }, [tickets]);

    const technicianPerformance = useMemo<TechnicianPerformance[]>(() => {
        const techMap = new Map<string, {
            name: string;
            activeTickets: number;
            responseTimes: number[];
            completedTickets: number;
            onTimeTickets: number;
        }>();

        tickets.forEach(ticket => {
            if (!ticket.technicianId || !ticket.technicianName) return;

            if (!techMap.has(ticket.technicianId)) {
                techMap.set(ticket.technicianId, {
                    name: ticket.technicianName,
                    activeTickets: 0,
                    responseTimes: [],
                    completedTickets: 0,
                    onTimeTickets: 0
                });
            }

            const tech = techMap.get(ticket.technicianId)!;

            if (ticket.status !== 'COMPLETED' && ticket.status !== 'CANCELLED') {
                tech.activeTickets++;
            }

            if (ticket.status === 'COMPLETED') {
                tech.completedTickets++;
                const sla = calculateSLAStatus(ticket);
                if (sla.resolutionStatus === 'ON_TIME') {
                    tech.onTimeTickets++;
                }
            }

            if (ticket.firstResponseAt && ticket.createdAt) {
                const responseTime = (ticket.firstResponseAt.toMillis() - ticket.createdAt.toMillis()) / (1000 * 60 * 60);
                tech.responseTimes.push(responseTime);
            }
        });

        return Array.from(techMap.entries()).map(([id, data]) => ({
            technicianId: id,
            technicianName: data.name,
            activeTickets: data.activeTickets,
            averageResponseTime: data.responseTimes.length > 0
                ? data.responseTimes.reduce((a, b) => a + b, 0) / data.responseTimes.length
                : 0,
            slaComplianceRate: data.completedTickets > 0
                ? (data.onTimeTickets / data.completedTickets) * 100
                : 100,
            ticketsCompleted: data.completedTickets
        })).sort((a, b) => b.slaComplianceRate - a.slaComplianceRate);
    }, [tickets]);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Clock className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className={`space-y-6 ${className || ''}`}>
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Dashboard SLA</h2>
                    <p className="text-sm text-gray-500">Monitoreo de cumplimiento y rendimiento</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant={timeRange === 'today' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setTimeRange('today')}
                    >
                        Hoy
                    </Button>
                    <Button
                        variant={timeRange === 'week' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setTimeRange('week')}
                    >
                        Semana
                    </Button>
                    <Button
                        variant={timeRange === 'month' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setTimeRange('month')}
                    >
                        Mes
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-l-4 border-l-green-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4" />
                            Tasa de Cumplimiento
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-green-600">
                            {metrics.complianceRate.toFixed(1)}%
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            {metrics.onTimeCount} tickets a tiempo
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-yellow-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            En Riesgo
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-yellow-600">
                            {metrics.atRiskCount}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Próximos a vencer
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-red-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Vencidos
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-red-600">
                            {metrics.overdueCount}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Requieren atención inmediata
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-blue-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            Tiempo de Respuesta
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-blue-600">
                            {metrics.averageResponseTime.toFixed(1)}h
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Promedio de primera respuesta
                        </p>
                    </CardContent>
                </Card>
            </div>

            {atRiskTickets.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-yellow-600" />
                            Tickets Críticos ({atRiskTickets.length})
                        </CardTitle>
                        <CardDescription>
                            Tickets que requieren atención prioritaria
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {atRiskTickets.map(({ ticket, sla, urgency }) => {
                                const priorityColors: Record<TicketPriority, string> = {
                                    LOW: "bg-green-100 text-green-800",
                                    MEDIUM: "bg-yellow-100 text-yellow-800",
                                    HIGH: "bg-orange-100 text-orange-800",
                                    URGENT: "bg-red-100 text-red-800"
                                };

                                return (
                                    <Link
                                        key={ticket.id}
                                        href={`/tickets/${ticket.id}`}
                                        className="block p-4 border rounded-lg hover:bg-slate-50 transition-colors"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-semibold text-gray-900">
                                                        {ticket.ticketNumber || ticket.id.slice(0, 6)}
                                                    </span>
                                                    <Badge className={`text-xs ${priorityColors[ticket.priority]}`}>
                                                        {ticket.priority}
                                                    </Badge>
                                                    {urgency === 3 && (
                                                        <Badge variant="destructive" className="text-xs">
                                                            VENCIDO
                                                        </Badge>
                                                    )}
                                                    {urgency === 1 && (
                                                        <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-300">
                                                            EN RIESGO
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-700 font-medium">{ticket.clientName}</p>
                                                <p className="text-xs text-gray-500 line-clamp-1">{ticket.description}</p>
                                                <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                                                    <span className="flex items-center gap-1">
                                                        <User className="h-3 w-3" />
                                                        {ticket.technicianName || 'Sin asignar'}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="h-3 w-3" />
                                                        {ticket.createdAt?.toDate().toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {sla.resolutionHoursRemaining > 0
                                                        ? `${sla.resolutionHoursRemaining.toFixed(1)}h`
                                                        : 'Vencido'
                                                    }
                                                </div>
                                                <div className="text-xs text-gray-500">restantes</div>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}

            {technicianPerformance.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-blue-600" />
                            Performance por Técnico
                        </CardTitle>
                        <CardDescription>
                            Rendimiento y cumplimiento de SLA
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {technicianPerformance.map(tech => (
                                <div
                                    key={tech.technicianId}
                                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center justify-center h-10 w-10 rounded-full bg-blue-100 text-blue-600 font-semibold">
                                            {tech.technicianName.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">{tech.technicianName}</p>
                                            <p className="text-xs text-gray-500">
                                                {tech.activeTickets} activos · {tech.ticketsCompleted} completados
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6 text-sm">
                                        <div className="text-center">
                                            <div className="font-semibold text-blue-600">
                                                {tech.averageResponseTime.toFixed(1)}h
                                            </div>
                                            <div className="text-xs text-gray-500">Resp. Prom.</div>
                                        </div>
                                        <div className="text-center">
                                            <div className={`font-semibold ${tech.slaComplianceRate >= 90 ? 'text-green-600' :
                                                tech.slaComplianceRate >= 75 ? 'text-yellow-600' :
                                                    'text-red-600'
                                                }`}>
                                                {tech.slaComplianceRate.toFixed(0)}%
                                            </div>
                                            <div className="text-xs text-gray-500">SLA</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
