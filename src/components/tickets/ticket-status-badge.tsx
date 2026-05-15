import { Badge } from "@/components/ui/badge";
import { Ticket, TicketStatus } from "@/types/schema";
import { AlertTriangle } from "lucide-react";

interface TicketStatusBadgeProps {
    status: TicketStatus;
    ticket?: Ticket;
}

export function TicketStatusBadge({ status, ticket }: TicketStatusBadgeProps) {
    const styles: Record<TicketStatus, string> = {
        'OPEN': "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
        'IN_PROGRESS': "bg-blue-100 text-blue-800 hover:bg-blue-200",
        'WAITING_CLIENT': "bg-orange-100 text-orange-800 hover:bg-orange-200",
        'WAITING_PARTS': "bg-purple-100 text-purple-800 hover:bg-purple-200",
        'COMPLETED': "bg-green-100 text-green-800 hover:bg-green-200",
        'CANCELLED': "bg-red-100 text-red-800 hover:bg-red-200",
    };

    const labels: Record<TicketStatus, string> = {
        'OPEN': "Pendiente",
        'IN_PROGRESS': "En Progreso",
        'WAITING_CLIENT': "Esp. Cliente",
        'WAITING_PARTS': "Esp. Repuestos",
        'COMPLETED': "Completado",
        'CANCELLED': "Cancelado",
    };

    // Lógica para detectar piezas estancadas (+3 días en taller)
    let hasStagnantPart = false;
    if (ticket && status === 'WAITING_PARTS' && ticket.dismantledParts && ticket.dismantledParts.length > 0) {
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

        hasStagnantPart = ticket.dismantledParts.some(part => {
            if (!part.dismantledAt) return false;
            const partDate = typeof (part.dismantledAt as any).toDate === 'function' 
                ? (part.dismantledAt as any).toDate() 
                : new Date((part.dismantledAt as any).seconds * 1000);
            return partDate < threeDaysAgo;
        });
    }

    return (
        <div className="flex items-center gap-2">
            <Badge className={`${styles[status]} border-0`}>
                {labels[status]}
            </Badge>
            {hasStagnantPart && (
                <div 
                    className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full border border-red-200 animate-pulse"
                    title="Alerta: Pieza en taller por más de 3 días"
                >
                    <AlertTriangle className="w-3 h-3" />
                    +3 Días en Taller
                </div>
            )}
        </div>
    );
}
