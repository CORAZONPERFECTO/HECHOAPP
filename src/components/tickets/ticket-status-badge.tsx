import { Badge } from "@/components/ui/badge";
import { TicketStatus } from "@/types/schema";

interface TicketStatusBadgeProps {
    status: TicketStatus;
}

export function TicketStatusBadge({ status }: TicketStatusBadgeProps) {
    const styles: Record<TicketStatus, string> = {
        'PENDIENTE': "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
        'ASIGNADO': "bg-blue-100 text-blue-800 hover:bg-blue-200",
        'EN_RUTA': "bg-indigo-100 text-indigo-800 hover:bg-indigo-200",
        'EN_EJECUCION': "bg-purple-100 text-purple-800 hover:bg-purple-200",
        'ESPERANDO_REPUESTO': "bg-orange-100 text-orange-800 hover:bg-orange-200",
        'FINALIZADO': "bg-green-100 text-green-800 hover:bg-green-200",
        'CERRADO': "bg-gray-100 text-gray-800 hover:bg-gray-200",
        'CANCELADO': "bg-red-100 text-red-800 hover:bg-red-200",
    };

    const labels: Record<TicketStatus, string> = {
        'PENDIENTE': "Pendiente",
        'ASIGNADO': "Asignado",
        'EN_RUTA': "En Ruta",
        'EN_EJECUCION': "En Ejecución",
        'ESPERANDO_REPUESTO': "Esp. Repuesto",
        'FINALIZADO': "Finalizado",
        'CERRADO': "Cerrado",
        'CANCELADO': "Cancelado",
    };

    return (
        <Badge className={`${styles[status]} border-0`}>
            {labels[status]}
        </Badge>
    );
}
