import { Ticket } from "@/types/schema";
import { startOfMonth, endOfMonth, subMonths, format, eachMonthOfInterval } from "date-fns";

export interface TicketTrend {
    month: string;
    total: number;
    completed: number;
    cancelled: number;
    avgResolutionTime: number; // in hours
}

export interface ServiceTypeAnalysis {
    serviceType: string;
    count: number;
    percentage: number;
    avgCost: number;
}

export interface TechnicianMetrics {
    technicianId: string;
    technicianName: string;
    totalTickets: number;
    completedTickets: number;
    avgResolutionTime: number; // hours
    completionRate: number; // percentage
    reopenRate: number; // percentage
    avgRating?: number;
    totalRevenue: number;
    totalMaterialsCost: number;
    totalLaborCost: number;
    totalCosts: number;
    netProfit: number;
    netProfitMargin: number;
}

export interface MaterialAnalysis {
    category: string;
    totalCost: number;
    avgCostPerTicket: number;
    frequency: number;
}

export interface HotZone {
    location: string;
    ticketCount: number;
    avgPriority: number;
    totalRevenue: number;
    mostCommonIssue: string;
}

export interface AnalyticsData {
    trends: TicketTrend[];
    serviceTypes: ServiceTypeAnalysis[];
    technicians: TechnicianMetrics[];
    materials: MaterialAnalysis[];
    hotZones: HotZone[];
    predictions: {
        nextMonthTickets: number;
        suggestedMaterials: string[];
        peakDays: string[];
    };
}

function parseDate(val: any): Date | null {
    if (!val) return null;
    if (typeof val.toDate === "function") {
        try { return val.toDate(); } catch { return null; }
    }
    if (typeof val.toMillis === "function") {
        try { return new Date(val.toMillis()); } catch { return null; }
    }
    if (typeof val === "object" && typeof val.seconds === "number") {
        return new Date(val.seconds * 1000 + (val.nanoseconds || 0) / 1000000);
    }
    if (val instanceof Date) {
        return isNaN(val.getTime()) ? null : val;
    }
    if (typeof val === "string" || typeof val === "number") {
        const d = new Date(val);
        return isNaN(d.getTime()) ? null : d;
    }
    return null;
}

function getMillis(val: any): number {
    const d = parseDate(val);
    return d ? d.getTime() : 0;
}

/**
 * Analytics Engine - Procesa tickets y genera insights
 */
export class TicketAnalyticsEngine {
    private tickets: Ticket[];

    constructor(tickets: Ticket[]) {
        this.tickets = Array.isArray(tickets) ? tickets : [];
    }

    /**
     * Calcula tendencias mensuales de tickets
     */
    calculateTrends(monthsBack: number = 6): TicketTrend[] {
        const now = new Date();
        const months = eachMonthOfInterval({
            start: subMonths(now, monthsBack - 1),
            end: now
        });

        return months.map(monthStart => {
            const monthEnd = endOfMonth(monthStart);
            const monthTickets = this.tickets.filter(t => {
                const createdDate = parseDate(t.createdAt);
                if (!createdDate) return false;
                return createdDate >= monthStart && createdDate <= monthEnd;
            });

            const completed = monthTickets.filter(t => t.status === 'COMPLETED').length;
            const cancelled = monthTickets.filter(t => t.status === 'CANCELLED').length;

            // Calcular tiempo promedio de resolución
            const resolvedTickets = monthTickets.filter(t =>
                t.status === 'COMPLETED' && t.resolvedAt && t.createdAt
            );

            const avgResolutionTime = resolvedTickets.length > 0
                ? resolvedTickets.reduce((sum, t) => {
                    const createdMs = getMillis(t.createdAt);
                    const resolvedMs = getMillis(t.resolvedAt);
                    const resolution = resolvedMs - createdMs;
                    return sum + (resolution > 0 ? resolution / (1000 * 60 * 60) : 0);
                }, 0) / resolvedTickets.length
                : 0;

            return {
                month: format(monthStart, 'MMM yyyy'),
                total: monthTickets.length,
                completed,
                cancelled,
                avgResolutionTime
            };
        });
    }

    /**
     * Analiza tipos de servicio
     */
    analyzeServiceTypes(): ServiceTypeAnalysis[] {
        const serviceMap = new Map<string, { count: number; totalCost: number }>();

        this.tickets.forEach(ticket => {
            const service = ticket.serviceType || 'GENERAL';
            const current = serviceMap.get(service) || { count: 0, totalCost: 0 };
            serviceMap.set(service, {
                count: current.count + 1,
                totalCost: current.totalCost + (ticket.totalCost || 0)
            });
        });

        const total = Math.max(1, this.tickets.length);

        return Array.from(serviceMap.entries())
            .map(([serviceType, data]) => ({
                serviceType: serviceType.replace(/_/g, ' '),
                count: data.count,
                percentage: (data.count / total) * 100,
                avgCost: data.count > 0 ? data.totalCost / data.count : 0
            }))
            .sort((a, b) => b.count - a.count);
    }

    /**
     * Calcula métricas por técnico
     */
    analyzeTechnicians(): TechnicianMetrics[] {
        const techMap = new Map<string, {
            name: string;
            total: number;
            completed: number;
            resolutionTimes: number[];
            reopened: number;
            revenue: number;
            materialsCost: number;
            laborCost: number;
            totalCosts: number;
        }>();

        this.tickets.forEach(ticket => {
            if (!ticket.technicianId && !ticket.technicianName) return;
            const techId = ticket.technicianId || ticket.technicianName || 'desconocido';

            const current = techMap.get(techId) || {
                name: ticket.technicianName || 'Técnico',
                total: 0,
                completed: 0,
                resolutionTimes: [],
                reopened: 0,
                revenue: 0,
                materialsCost: 0,
                laborCost: 0,
                totalCosts: 0
            };

            current.total++;

            if (ticket.status === 'COMPLETED') {
                current.completed++;

                if (ticket.resolvedAt && ticket.createdAt) {
                    const createdMs = getMillis(ticket.createdAt);
                    const resolvedMs = getMillis(ticket.resolvedAt);
                    const resTime = (resolvedMs - createdMs) / (1000 * 60 * 60);
                    if (resTime > 0) {
                        current.resolutionTimes.push(resTime);
                    }
                }
            }

            current.revenue += ticket.revenue || 0;
            current.materialsCost += ticket.materialsCost || 0;
            current.laborCost += (ticket.laborHours || 0) * (ticket.laborRate || 0);
            current.totalCosts += ticket.totalCost || 0;

            techMap.set(techId, current);
        });

        return Array.from(techMap.entries()).map(([id, data]) => {
            const netProfit = data.revenue - data.totalCosts;
            const netProfitMargin = data.revenue > 0 ? (netProfit / data.revenue) * 100 : 0;

            return {
                technicianId: id,
                technicianName: data.name,
                totalTickets: data.total,
                completedTickets: data.completed,
                avgResolutionTime: data.resolutionTimes.length > 0
                    ? data.resolutionTimes.reduce((a, b) => a + b, 0) / data.resolutionTimes.length
                    : 0,
                completionRate: data.total > 0 ? (data.completed / data.total) * 100 : 0,
                reopenRate: data.total > 0 ? (data.reopened / data.total) * 100 : 0,
                totalRevenue: data.revenue,
                totalMaterialsCost: data.materialsCost,
                totalLaborCost: data.laborCost,
                totalCosts: data.totalCosts,
                netProfit,
                netProfitMargin
            };
        }).sort((a, b) => b.netProfit - a.netProfit);
    }

    /**
     * Analiza uso de materiales
     */
    analyzeMaterials(): MaterialAnalysis[] {
        const totalMaterialCost = this.tickets.reduce((sum, t) => sum + (t.materialsCost || 0), 0);
        const ticketsWithMaterials = this.tickets.filter(t => (t.materialsCost || 0) > 0).length;

        return [{
            category: 'Total Materiales',
            totalCost: totalMaterialCost,
            avgCostPerTicket: ticketsWithMaterials > 0 ? totalMaterialCost / ticketsWithMaterials : 0,
            frequency: ticketsWithMaterials
        }];
    }

    /**
     * Identifica zonas calientes (ubicaciones con más tickets)
     */
    analyzeHotZones(): HotZone[] {
        const zoneMap = new Map<string, {
            count: number;
            priorities: number[];
            revenue: number;
            issues: Map<string, number>;
        }>();

        this.tickets.forEach(ticket => {
            const location = ticket.locationArea || ticket.locationName || 'Sin especificar';
            const current = zoneMap.get(location) || {
                count: 0,
                priorities: [] as number[],
                revenue: 0,
                issues: new Map()
            };

            current.count++;

            const priorityValue = {
                'LOW': 1,
                'MEDIUM': 2,
                'HIGH': 3,
                'URGENT': 4
            }[ticket.priority as string] || 2;

            current.priorities.push(priorityValue);
            current.revenue += (ticket as any).revenue || 0;

            const issue = ticket.serviceType || 'GENERAL';
            current.issues.set(issue, (current.issues.get(issue) || 0) + 1);

            zoneMap.set(location, current);
        });

        return Array.from(zoneMap.entries())
            .map(([location, data]) => {
                const mostCommonIssue = Array.from(data.issues.entries())
                    .sort((a, b) => b[1] - a[1])[0];

                return {
                    location,
                    ticketCount: data.count,
                    avgPriority: data.priorities.length > 0
                        ? data.priorities.reduce((a, b) => a + b, 0) / data.priorities.length
                        : 2,
                    totalRevenue: data.revenue,
                    mostCommonIssue: mostCommonIssue ? mostCommonIssue[0].replace(/_/g, ' ') : 'N/A'
                };
            })
            .sort((a, b) => b.ticketCount - a.ticketCount)
            .slice(0, 10);
    }

    /**
     * Genera predicciones simples
     */
    generatePredictions(): AnalyticsData['predictions'] {
        const trends = this.calculateTrends(3);
        const avgMonthlyTickets = trends.length > 0
            ? trends.reduce((sum, t) => sum + t.total, 0) / trends.length
            : this.tickets.length;

        const nextMonthTickets = Math.max(1, Math.round((avgMonthlyTickets || this.tickets.length || 5) * 1.1));

        const dayMap = new Map<string, number>();
        this.tickets.forEach(ticket => {
            const d = parseDate(ticket.createdAt);
            if (d) {
                const day = format(d, 'EEEE');
                dayMap.set(day, (dayMap.get(day) || 0) + 1);
            }
        });

        const peakDays = Array.from(dayMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 2)
            .map(([day]) => day);

        return {
            nextMonthTickets,
            suggestedMaterials: ['Capacitores', 'Gas Refrigerante', 'Contactores', 'Filtros'],
            peakDays: peakDays.length > 0 ? peakDays : ['Lunes', 'Miércoles']
        };
    }

    /**
     * Genera análisis completo
     */
    generateFullAnalytics(): AnalyticsData {
        return {
            trends: this.calculateTrends(),
            serviceTypes: this.analyzeServiceTypes(),
            technicians: this.analyzeTechnicians(),
            materials: this.analyzeMaterials(),
            hotZones: this.analyzeHotZones(),
            predictions: this.generatePredictions()
        };
    }
}
