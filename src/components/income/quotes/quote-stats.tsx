import { Quote } from "@/types/schema";
import { Card } from "@/components/ui/card";
import { DollarSign, FileCheck, FileX, TrendingUp } from "lucide-react";

interface QuoteStatsProps {
    quotes: Quote[];
}

export function QuoteStats({ quotes }: QuoteStatsProps) {
    const totalQuotes = quotes.length;
    const acceptedQuotes = quotes.filter(q => q.status === 'ACCEPTED' || q.status === 'CONVERTED');
    const rejectedQuotes = quotes.filter(q => q.status === 'REJECTED');

    // Calculate Conversion Rate
    const conversionRate = totalQuotes > 0
        ? Math.round((acceptedQuotes.length / totalQuotes) * 100)
        : 0;

    // Calculate Amounts (simplified for demo, assuming mixed currencies needs normalization in future)
    // For now, let's just sum everything as nominal value to avoid complex currency rate logic issues without a service
    // Or better, filter to RD only or separate. Let's separate DOP total for now.
    const totalAmountDOP = quotes
        .filter(q => q.currency === 'DOP' || !q.currency)
        .reduce((sum, q) => sum + (q.total || 0), 0);

    const acceptedAmountDOP = acceptedQuotes
        .filter(q => q.currency === 'DOP' || !q.currency)
        .reduce((sum, q) => sum + (q.total || 0), 0);

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
                            {acceptedQuotes.length} de {totalQuotes} aceptadas
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
                            RD$ {(acceptedAmountDOP / 1000).toFixed(1)}k
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
                        <p className="text-sm text-gray-500 font-medium">Rechazadas</p>
                        <h3 className="text-2xl font-bold text-gray-900">
                            {rejectedQuotes.length}
                        </h3>
                        <p className="text-xs text-red-400">
                            {rejectedQuotes.length > 0 ? 'Requieren atención' : 'Sin rechazos'}
                        </p>
                    </div>
                </div>
            </Card>
        </div>
    );
}
