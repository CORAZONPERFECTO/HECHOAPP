import { Quote } from "@/types/schema";
import { Card } from "@/components/ui/card";
import { DollarSign, FileCheck, FileX, TrendingUp } from "lucide-react";

interface QuoteStatsProps {
    quotes: Quote[];
}

export function QuoteStats({ quotes }: QuoteStatsProps) {
    const totalQuotes = quotes.length;
    // ERPNext states: Draft | Open | Expired | Ordered | Cancelled
    const orderedQuotes = quotes.filter(q => q.status === 'Ordered' || q.status === ('CONVERTED' as any));
    const expiredQuotes = quotes.filter(q => q.status === 'Expired');

    // Calculate Conversion Rate
    const conversionRate = totalQuotes > 0
        ? Math.round((orderedQuotes.length / totalQuotes) * 100)
        : 0;

    // Use grand_total (ERP fieldname) with fallback to 0
    const totalAmountDOP = quotes
        .filter(q => q.currency === 'DOP' || !q.currency)
        .reduce((sum, q) => sum + (q.grand_total ?? 0), 0);

    const orderedAmountDOP = orderedQuotes
        .filter(q => q.currency === 'DOP' || !q.currency)
        .reduce((sum, q) => sum + (q.grand_total ?? 0), 0);

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-4 bg-white/50 backdrop-blur border-blue-100 dark:bg-slate-900/50">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
                        <TrendingUp className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Tasa de Conversión</p>
                        <h3 className="text-2xl font-bold text-gray-900">{conversionRate}%</h3>
                        <p className="text-xs text-green-600">
                            {orderedQuotes.length} de {totalQuotes} convertidas
                        </p>
                    </div>
                </div>
            </Card>

            <Card className="p-4 bg-white/50 backdrop-blur border-green-100 dark:bg-slate-900/50">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-100 text-green-600 rounded-full">
                        <DollarSign className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Monto Ganado (DOP)</p>
                        <h3 className="text-2xl font-bold text-gray-900">
                            RD$ {(orderedAmountDOP / 1000).toFixed(1)}k
                        </h3>
                        <p className="text-xs text-gray-400">
                            En cotizaciones aceptadas
                        </p>
                    </div>
                </div>
            </Card>

            <Card className="p-4 bg-white/50 backdrop-blur border-purple-100 dark:bg-slate-900/50">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-100 text-purple-600 rounded-full">
                        <FileCheck className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Total Cotizado (DOP)</p>
                        <h3 className="text-2xl font-bold text-gray-900">
                            RD$ {(totalAmountDOP / 1000).toFixed(1)}k
                        </h3>
                        <p className="text-xs text-gray-400">
                            Volumen total generado
                        </p>
                    </div>
                </div>
            </Card>

            <Card className="p-4 bg-white/50 backdrop-blur border-red-100 dark:bg-slate-900/50">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-red-100 text-red-600 rounded-full">
                        <FileX className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Vencidas / Expiradas</p>
                        <h3 className="text-2xl font-bold text-gray-900">
                            {expiredQuotes.length}
                        </h3>
                        <p className="text-xs text-red-400">
                            {expiredQuotes.length > 0 ? 'Requieren atención' : 'Sin vencidas'}
                        </p>
                    </div>
                </div>
            </Card>
        </div>
    );
}
