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
                    <h2 className="text-xl font-bold text-slate-900">Dashboard SLA</h2>
                    <p className="text-xs text-slate-500">Monitoreo de cumplimiento y rendimiento de tiempos de respuesta</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant={timeRange === 'today' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setTimeRange('today')}
                        className="text-xs h-8"
                    >
                        Hoy
                    </Button>
                    <Button
                        variant={timeRange === 'week' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setTimeRange('week')}
                        className="text-xs h-8"
                    >
                        Semana
                    </Button>
                    <Button
                        variant={timeRange === 'month' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setTimeRange('month')}
                        className="text-xs h-8"
                    >
                        Mes
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                            <span>Tasa de Cumplimiento</span>
                            <div className="p-1 bg-emerald-50 text-emerald-700 rounded">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                            </div>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-700">
                            {metrics.complianceRate.toFixed(1)}%
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                            {metrics.onTimeCount} tickets a tiempo
                        </p>
                    </CardContent>
                </Card>

                <Card className="border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                            <span>En Riesgo</span>
                            <div className="p-1 bg-amber-50 text-amber-700 rounded">
                                <AlertTriangle className="h-3.5 w-3.5" />
                            </div>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-700">
                            {metrics.atRiskCount}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                            Próximos a vencer
                        </p>
                    </CardContent>
                </Card>

                <Card className="border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                            <span>Vencidos</span>
                            <div className="p-1 bg-rose-50 text-rose-700 rounded">
                                <Clock className="h-3.5 w-3.5" />
                            </div>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-rose-700">
                            {metrics.overdueCount}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                            Atención inmediata requerida
                        </p>
                    </CardContent>
                </Card>

                <Card className="border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                            <span>Tiempo Respuesta</span>
                            <div className="p-1 bg-blue-50 text-blue-900 rounded">
                                <TrendingUp className="h-3.5 w-3.5" />
                            </div>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-900">
                            {metrics.averageResponseTime.toFixed(1)}h
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                            Promedio primera respuesta
                        </p>
                    </CardContent>
                </Card>
            </div>

            {atRiskTickets.length > 0 && (
                <Card className="border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-sm font-bold text-slate-900">
                            <AlertTriangle className="h-4.5 w-4.5 text-amber-700" />
                            Tickets Críticos ({atRiskTickets.length})
                        </CardTitle>
                        <CardDescription className="text-xs text-slate-500">
                            Tickets con riesgo de incumplimiento de acuerdo de servicio (SLA)
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="space-y-2">
                            {atRiskTickets.map(({ ticket, sla, urgency }) => {
                                const priorityColors: Record<TicketPriority, string> = {
                                    LOW: "bg-slate-100 text-slate-700 border-slate-200",
                                    MEDIUM: "bg-amber-50 text-amber-800 border-amber-200",
                                    HIGH: "bg-orange-50 text-orange-800 border-orange-200",
                                    URGENT: "bg-rose-50 text-rose-800 border-rose-200"
                                };

                                return (
                                    <Link
                                        key={ticket.id}
                                        href={`/tickets/${ticket.id}`}
                                        className="block p-3 border border-slate-100 rounded hover:bg-slate-50/50 transition-colors"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                    <span className="font-semibold text-xs text-slate-900">
                                                        {ticket.ticketNumber || ticket.id.slice(0, 6)}
                                                    </span>
                                                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${priorityColors[ticket.priority]}`}>
                                                        {ticket.priority}
                                                    </Badge>
                                                    {urgency === 3 && (
                                                        <Badge variant="destructive" className="text-[10px] bg-rose-600 px-1.5 py-0">
                                                            VENCIDO
                                                        </Badge>
                                                    )}
                                                    {urgency === 1 && (
                                                        <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-300 px-1.5 py-0">
                                                            EN RIESGO
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-700 font-medium truncate">{ticket.clientName}</p>
                                                <p className="text-[11px] text-slate-400 truncate">{ticket.description}</p>
                                                <div className="flex items-center gap-4 mt-1.5 text-[10px] text-slate-400">
                                                    <span className="flex items-center gap-1">
                                                        <User className="h-3 w-3 text-slate-500" />
                                                        {ticket.technicianName || 'Sin asignar'}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="h-3 w-3 text-slate-500" />
                                                        {ticket.createdAt?.toDate().toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-right flex-shrink-0 pl-2">
                                                <div className="text-xs font-bold text-slate-900">
                                                    {sla.resolutionHoursRemaining > 0
                                                        ? `${sla.resolutionHoursRemaining.toFixed(1)}h`
                                                        : 'Vencido'
                                                    }
                                                </div>
                                                <div className="text-[10px] text-slate-400">restantes</div>
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
                <Card className="border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-sm font-bold text-slate-900">
                            <TrendingUp className="h-4.5 w-4.5 text-blue-900" />
                            Rendimiento por Técnico
                        </CardTitle>
                        <CardDescription className="text-xs text-slate-500">
                            Cumplimiento de acuerdos de nivel de servicio (SLA) por operador
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {technicianPerformance.map(tech => (
                                <div
                                    key={tech.technicianId}
                                    className="flex items-center justify-between p-3 border border-slate-100 rounded hover:bg-slate-50/50 transition-colors"
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-50 text-blue-900 text-xs font-bold flex-shrink-0">
                                            {tech.technicianName.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-semibold text-slate-900 truncate">{tech.technicianName}</p>
                                            <p className="text-[10px] text-slate-400">
                                                {tech.activeTickets} act. · {tech.ticketsCompleted} comp.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs flex-shrink-0">
                                        <div className="text-right">
                                            <div className="font-bold text-blue-900">
                                                {tech.averageResponseTime.toFixed(1)}h
                                            </div>
                                            <div className="text-[10px] text-slate-400">Resp. Prom.</div>
                                        </div>
                                        <div className="text-right">
                                            <div className={`font-bold ${tech.slaComplianceRate >= 90 ? 'text-emerald-700' :
                                                tech.slaComplianceRate >= 75 ? 'text-amber-700' :
                                                    'text-rose-700'
                                                }`}>
                                                {tech.slaComplianceRate.toFixed(0)}%
                                            </div>
                                            <div className="text-[10px] text-slate-400">SLA</div>
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
