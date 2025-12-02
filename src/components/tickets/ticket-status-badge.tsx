import { Badge } from "@/components/ui/badge";
import { TicketStatus } from "@/types/schema";

interface TicketStatusBadgeProps {
    status: TicketStatus;
}

export function TicketStatusBadge({ status }: TicketStatusBadgeProps) {
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

    return (
        <Badge className={`${styles[status]} border-0`}>
            {labels[status]}
        </Badge>
    );
}
