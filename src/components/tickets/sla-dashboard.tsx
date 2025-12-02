"use client";

import { Ticket } from "@/types/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { calculateSLAStatus } from "./sla-indicator";
import { TrendingUp, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";

interface SLADashboardProps {
    tickets: Ticket[];
}

export function SLADashboard({ tickets }: SLADashboardProps) {
    // Calculate SLA metrics
    const metrics = tickets.reduce(
        (acc, ticket) => {
            const sla = calculateSLAStatus(ticket);

            // Response metrics
            if (ticket.firstResponseAt) {
                acc.totalResponded++;
                if (sla.responseStatus === "ON_TIME") {
                    acc.responseOnTime++;
                }
            }

            // Resolution metrics
            if (ticket.status === "COMPLETED") {
                acc.totalResolved++;
                if (sla.resolutionStatus === "ON_TIME") {
                    acc.resolutionOnTime++;
                }
            }

            // Count overdue
            if (sla.responseStatus === "OVERDUE" && !ticket.firstResponseAt) {
                acc.overdueResponse++;
            }
            if (sla.resolutionStatus === "OVERDUE" && ticket.status !== "COMPLETED") {
                acc.overdueResolution++;
            }

            return acc;
        },
        {
            totalResponded: 0,
            responseOnTime: 0,
            totalResolved: 0,
            resolutionOnTime: 0,
            overdueResponse: 0,
            overdueResolution: 0,
        }
    );

    const responseRate = metrics.totalResponded > 0
        ? Math.round((metrics.responseOnTime / metrics.totalResponded) * 100)
        : 0;

    const resolutionRate = metrics.totalResolved > 0
        ? Math.round((metrics.resolutionOnTime / metrics.totalResolved) * 100)
        : 0;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Respuesta a Tiempo</CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-green-600">{responseRate}%</div>
                    <p className="text-xs text-muted-foreground">
                        {metrics.responseOnTime} de {metrics.totalResponded} tickets
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Resolución a Tiempo</CardTitle>
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-blue-600">{resolutionRate}%</div>
                    <p className="text-xs text-muted-foreground">
                        {metrics.resolutionOnTime} de {metrics.totalResolved} tickets
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Respuestas Vencidas</CardTitle>
                    <Clock className="h-4 w-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-orange-600">{metrics.overdueResponse}</div>
                    <p className="text-xs text-muted-foreground">
                        Requieren atención inmediata
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Resoluciones Vencidas</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-red-600">{metrics.overdueResolution}</div>
                    <p className="text-xs text-muted-foreground">
                        Fuera de SLA
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
