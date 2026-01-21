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

/**
 * Analytics Engine - Procesa tickets y genera insights
 */
export class TicketAnalyticsEngine {
    private tickets: Ticket[];

    constructor(tickets: Ticket[]) {
        this.tickets = tickets;
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
                const createdDate = t.createdAt.toDate();
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
                    const resolution = t.resolvedAt!.toMillis() - t.createdAt.toMillis();
                    return sum + (resolution / (1000 * 60 * 60)); // Convert to hours
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
            const service = ticket.serviceType;
            const current = serviceMap.get(service) || { count: 0, totalCost: 0 };
            serviceMap.set(service, {
                count: current.count + 1,
                totalCost: current.totalCost + (ticket.totalCost || 0)
            });
        });

        const total = this.tickets.length;

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
        }>();

        this.tickets.forEach(ticket => {
            if (!ticket.technicianId || !ticket.technicianName) return;

            const current = techMap.get(ticket.technicianId) || {
                name: ticket.technicianName,
                total: 0,
                completed: 0,
                resolutionTimes: [],
                reopened: 0,
                revenue: 0
            };

            current.total++;

            if (ticket.status === 'COMPLETED') {
                current.completed++;

                if (ticket.resolvedAt && ticket.createdAt) {
                    const resTime = (ticket.resolvedAt.toMillis() - ticket.createdAt.toMillis()) / (1000 * 60 * 60);
                    current.resolutionTimes.push(resTime);
                }
            }

            current.revenue += ticket.revenue || 0;

            techMap.set(ticket.technicianId, current);
        });

        return Array.from(techMap.entries()).map(([id, data]) => ({
            technicianId: id,
            technicianName: data.name,
            totalTickets: data.total,
            completedTickets: data.completed,
            avgResolutionTime: data.resolutionTimes.length > 0
                ? data.resolutionTimes.reduce((a, b) => a + b, 0) / data.resolutionTimes.length
                : 0,
            completionRate: data.total > 0 ? (data.completed / data.total) * 100 : 0,
            reopenRate: data.total > 0 ? (data.reopened / data.total) * 100 : 0,
            totalRevenue: data.revenue
        })).sort((a, b) => b.completionRate - a.completionRate);
    }

    /**
     * Analiza uso de materiales
     */
    analyzeMaterials(): MaterialAnalysis[] {
        // This would need material consumption data from tickets
        // For now, return aggregate cost data
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
                priorities: [],
                revenue: 0,
                issues: new Map()
            };

            current.count++;

            // Map priority to number for averaging
            const priorityValue = {
                'LOW': 1,
                'MEDIUM': 2,
                'HIGH': 3,
                'URGENT': 4
            }[ticket.priority] || 2;

            current.priorities.push(priorityValue);
            current.revenue += ticket.revenue || 0;

            // Track service types
            const issue = ticket.serviceType;
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
                    avgPriority: data.priorities.reduce((a, b) => a + b, 0) / data.priorities.length,
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
        const avgMonthlyTickets = trends.reduce((sum, t) => sum + t.total, 0) / trends.length;

        // Simple linear prediction
        const nextMonthTickets = Math.round(avgMonthlyTickets * 1.1); // Assume 10% growth

        // Analyze day patterns
        const dayMap = new Map<string, number>();
        this.tickets.forEach(ticket => {
            const day = format(ticket.createdAt.toDate(), 'EEEE');
            dayMap.set(day, (dayMap.get(day) || 0) + 1);
        });

        const peakDays = Array.from(dayMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 2)
            .map(([day]) => day);

        return {
            nextMonthTickets,
            suggestedMaterials: ['Capacitores', 'Gas Refrigerante', 'Contactores'], // Could be AI-driven
            peakDays
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
