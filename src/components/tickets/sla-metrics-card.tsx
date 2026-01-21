"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Ticket } from "@/types/schema";
import { calculateSLAStatus } from "./sla-indicator";
import { Clock, AlertTriangle, CheckCircle2, TrendingUp } from "lucide-react";
import Link from "next/link";

interface SLAMetricsCardProps {
    tickets: Ticket[];
    className?: string;
}

export function SLAMetricsCard({ tickets, className }: SLAMetricsCardProps) {
    const activeTickets = tickets.filter(t =>
        t.status !== 'COMPLETED' && t.status !== 'CANCELLED'
    );

    let atRiskCount = 0;
    let overdueCount = 0;
    let onTimeCount = 0;
    let totalResponseTime = 0;
    let responseCount = 0;

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

    const averageResponseTime = responseCount > 0 ? totalResponseTime / responseCount : 0;
    const complianceRate = activeTickets.length > 0
        ? ((onTimeCount / activeTickets.length) * 100)
        : 100;

    return (
        <Link href="/tickets?view=sla" className={`block ${className || ''}`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-blue-500">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            <Clock className="h-4 w-4 text-blue-600" />
                            SLA Performance
                        </h3>
                        <span className={`text-2xl font-bold ${complianceRate >= 90 ? 'text-green-600' :
                                complianceRate >= 75 ? 'text-yellow-600' :
                                    'text-red-600'
                            }`}>
                            {complianceRate.toFixed(0)}%
                        </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="p-2 bg-green-50 rounded">
                            <div className="text-sm font-semibold text-green-700">{onTimeCount}</div>
                            <div className="text-[10px] text-green-600 flex items-center justify-center gap-0.5">
                                <CheckCircle2 className="h-3 w-3" />
                                A tiempo
                            </div>
                        </div>
                        <div className="p-2 bg-yellow-50 rounded">
                            <div className="text-sm font-semibold text-yellow-700">{atRiskCount}</div>
                            <div className="text-[10px] text-yellow-600 flex items-center justify-center gap-0.5">
                                <AlertTriangle className="h-3 w-3" />
                                En riesgo
                            </div>
                        </div>
                        <div className="p-2 bg-red-50 rounded">
                            <div className="text-sm font-semibold text-red-700">{overdueCount}</div>
                            <div className="text-[10px] text-red-600 flex items-center justify-center gap-0.5">
                                <Clock className="h-3 w-3" />
                                Vencidos
                            </div>
                        </div>
                    </div>

                    <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs">
                        <span className="text-gray-500 flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            Resp. Promedio
                        </span>
                        <span className="font-semibold text-blue-600">
                            {averageResponseTime.toFixed(1)}h
                        </span>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}
