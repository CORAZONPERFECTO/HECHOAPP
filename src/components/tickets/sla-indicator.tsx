import { Ticket, TicketPriority } from "@/types/schema";
import { Clock, AlertTriangle, CheckCircle } from "lucide-react";

interface SLAIndicatorProps {
    ticket: Ticket;
}

export type SLAStatus = "ON_TIME" | "WARNING" | "OVERDUE";

// SLA thresholds in hours by priority
const SLA_THRESHOLDS = {
    URGENT: { response: 1, resolution: 4 },
    HIGH: { response: 4, resolution: 24 },
    MEDIUM: { response: 8, resolution: 48 },
    LOW: { response: 24, resolution: 72 },
};

export function calculateSLAStatus(ticket: Ticket): {
    responseStatus: SLAStatus;
    resolutionStatus: SLAStatus;
    responseHoursRemaining: number;
    resolutionHoursRemaining: number;
} {
    const now = Date.now();
    const createdAt = ticket.createdAt.seconds * 1000;
    const thresholds = SLA_THRESHOLDS[ticket.priority];

    // Calculate response SLA
    const responseDeadline = createdAt + thresholds.response * 60 * 60 * 1000;
    const responseHoursRemaining = (responseDeadline - now) / (60 * 60 * 1000);
    const hasResponded = !!ticket.firstResponseAt;

    let responseStatus: SLAStatus = "ON_TIME";
    if (hasResponded) {
        const respondedAt = ticket.firstResponseAt!.seconds * 1000;
        responseStatus = respondedAt <= responseDeadline ? "ON_TIME" : "OVERDUE";
    } else {
        if (responseHoursRemaining < 0) {
            responseStatus = "OVERDUE";
        } else if (responseHoursRemaining < thresholds.response * 0.25) {
            responseStatus = "WARNING";
        }
    }

    // Calculate resolution SLA
    const resolutionDeadline = createdAt + thresholds.resolution * 60 * 60 * 1000;
    const resolutionHoursRemaining = (resolutionDeadline - now) / (60 * 60 * 1000);
    const isResolved = ticket.status === "COMPLETED";

    let resolutionStatus: SLAStatus = "ON_TIME";
    if (isResolved) {
        const resolvedAt = ticket.resolvedAt?.seconds ? ticket.resolvedAt.seconds * 1000 : now;
        resolutionStatus = resolvedAt <= resolutionDeadline ? "ON_TIME" : "OVERDUE";
    } else {
        if (resolutionHoursRemaining < 0) {
            resolutionStatus = "OVERDUE";
        } else if (resolutionHoursRemaining < thresholds.resolution * 0.25) {
            resolutionStatus = "WARNING";
        }
    }

    return {
        responseStatus,
        resolutionStatus,
        responseHoursRemaining,
        resolutionHoursRemaining,
    };
}

export function SLAIndicator({ ticket }: SLAIndicatorProps) {
    const sla = calculateSLAStatus(ticket);

    const getStatusColor = (status: SLAStatus) => {
        switch (status) {
            case "ON_TIME":
                return "text-green-600 bg-green-100";
            case "WARNING":
                return "text-yellow-600 bg-yellow-100";
            case "OVERDUE":
                return "text-red-600 bg-red-100";
        }
    };

    const getStatusIcon = (status: SLAStatus) => {
        switch (status) {
            case "ON_TIME":
                return <CheckCircle className="h-4 w-4" />;
            case "WARNING":
                return <Clock className="h-4 w-4" />;
            case "OVERDUE":
                return <AlertTriangle className="h-4 w-4" />;
        }
    };

    const formatHours = (hours: number) => {
        if (hours < 0) return `${Math.abs(Math.round(hours))}h vencido`;
        if (hours < 1) return `${Math.round(hours * 60)}m restantes`;
        return `${Math.round(hours)}h restantes`;
    };

    return (
        <div className="flex items-center gap-2">
            {/* Response SLA */}
            <div
                className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                    sla.responseStatus
                )}`}
                title={`Respuesta: ${formatHours(sla.responseHoursRemaining)}`}
            >
                {getStatusIcon(sla.responseStatus)}
                <span className="hidden sm:inline">Respuesta</span>
            </div>

            {/* Resolution SLA */}
            <div
                className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                    sla.resolutionStatus
                )}`}
                title={`Resolución: ${formatHours(sla.resolutionHoursRemaining)}`}
            >
                {getStatusIcon(sla.resolutionStatus)}
                <span className="hidden sm:inline">Resolución</span>
            </div>
        </div>
    );
}
