import { Badge } from "@/components/ui/badge";
import { InvoiceStatus, PaymentMethod, QuoteStatus } from "@/types/schema";

type StatusType = InvoiceStatus | QuoteStatus | 'UNKNOWN';

interface StatusBadgeProps {
    status: string;
    type?: 'invoice' | 'quote' | 'payment';
}

export function StatusBadge({ status, type = 'invoice' }: StatusBadgeProps) {
    const getStatusColor = (s: string) => {
        switch (s) {
            // Invoice Statuses
            case 'PAID':
            case 'ACCEPTED':
                return "bg-green-100 text-green-800 hover:bg-green-100";
            case 'PARTIALLY_PAID':
                return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
            case 'SENT':
                return "bg-blue-100 text-blue-800 hover:bg-blue-100";
            case 'DRAFT':
                return "bg-gray-100 text-gray-800 hover:bg-gray-100";
            case 'OVERDUE':
            case 'REJECTED':
            case 'CANCELLED':
            case 'EXPIRED':
                return "bg-red-100 text-red-800 hover:bg-red-100";
            default:
                return "bg-gray-100 text-gray-800 hover:bg-gray-100";
        }
    };

    const getStatusLabel = (s: string) => {
        switch (s) {
            case 'PAID': return 'Pagada';
            case 'PARTIALLY_PAID': return 'Parcial';
            case 'SENT': return 'Enviada';
            case 'DRAFT': return 'Borrador';
            case 'OVERDUE': return 'Vencida';
            case 'CANCELLED': return 'Cancelada';
            case 'ACCEPTED': return 'Aceptada';
            case 'REJECTED': return 'Rechazada';
            case 'EXPIRED': return 'Expirada';
            default: return s;
        }
    };

    return (
        <div className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${getStatusColor(status)}`}>
            {getStatusLabel(status)}
        </div>
    );
}
