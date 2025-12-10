"use client";

import { QuoteTimelineEvent } from "@/types/schema";
import { Card } from "@/components/ui/card";
import { CheckCircle, Clock, FileCheck, XCircle, Send, Eye } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface QuoteTimelineProps {
    timeline: QuoteTimelineEvent[];
}

const STATUS_CONFIG = {
    'DRAFT': { icon: Clock, color: 'text-gray-500', bg: 'bg-gray-100', label: 'Borrador' },
    'SENT': { icon: Send, color: 'text-blue-500', bg: 'bg-blue-100', label: 'Enviada' },
    'OPENED': { icon: Eye, color: 'text-purple-500', bg: 'bg-purple-100', label: 'Vista' },
    'ACCEPTED': { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-100', label: 'Aceptada' },
    'REJECTED': { icon: XCircle, color: 'text-red-500', bg: 'bg-red-100', label: 'Rechazada' },
    'CONVERTED': { icon: FileCheck, color: 'text-emerald-500', bg: 'bg-emerald-100', label: 'Facturada' },
    'EXPIRED': { icon: Clock, color: 'text-orange-500', bg: 'bg-orange-100', label: 'Vencida' },
};

export function QuoteTimeline({ timeline }: QuoteTimelineProps) {
    if (!timeline || timeline.length === 0) {
        return (
            <Card className="p-6 text-center text-gray-500">
                <p>No hay eventos registrados en el historial.</p>
            </Card>
        );
    }

    // Sort timeline by timestamp (most recent first)
    const sortedTimeline = [...timeline].sort((a, b) => {
        const timeA = a.timestamp?.seconds || 0;
        const timeB = b.timestamp?.seconds || 0;
        return timeB - timeA;
    });

    return (
        <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-purple-600" />
                Historial de Cambios
            </h3>
            <div className="space-y-4">
                {sortedTimeline.map((event, index) => {
                    const config = STATUS_CONFIG[event.status] || STATUS_CONFIG['DRAFT'];
                    const Icon = config.icon;
                    const eventDate = event.timestamp?.seconds
                        ? new Date(event.timestamp.seconds * 1000)
                        : new Date();

                    return (
                        <div key={index} className="flex gap-4 relative">
                            {/* Vertical Line */}
                            {index < sortedTimeline.length - 1 && (
                                <div className="absolute left-5 top-10 bottom-0 w-0.5 bg-gray-200" />
                            )}

                            {/* Icon */}
                            <div className={`flex-shrink-0 h-10 w-10 rounded-full ${config.bg} flex items-center justify-center z-10`}>
                                <Icon className={`h-5 w-5 ${config.color}`} />
                            </div>

                            {/* Content */}
                            <div className="flex-1 pt-1">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="font-medium text-gray-900">{config.label}</p>
                                        <p className="text-sm text-gray-600">{event.note || 'Sin descripción'}</p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            Por: {event.userName || 'Sistema'}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-500">
                                            {format(eventDate, "dd MMM yyyy", { locale: es })}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            {format(eventDate, "HH:mm", { locale: es })}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </Card>
    );
}
