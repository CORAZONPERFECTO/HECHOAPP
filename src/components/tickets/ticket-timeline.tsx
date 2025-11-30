"use client";

import { TicketEvent } from "@/types/schema";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Circle, CheckCircle2, Clock, User, AlertCircle } from "lucide-react";

interface TicketTimelineProps {
    events: TicketEvent[];
}

export function TicketTimeline({ events }: TicketTimelineProps) {
    if (!events || events.length === 0) {
        return <div className="text-sm text-gray-500 italic">No hay eventos registrados.</div>;
    }

    // Sort events by date descending
    const sortedEvents = [...events].sort((a, b) =>
        b.timestamp.seconds - a.timestamp.seconds
    );

    const getIcon = (type: string) => {
        switch (type) {
            case 'CREACION': return <Circle className="h-4 w-4 text-blue-500" />;
            case 'CAMBIO_ESTADO': return <Clock className="h-4 w-4 text-orange-500" />;
            case 'FINALIZACION': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
            case 'ASIGNACION': return <User className="h-4 w-4 text-purple-500" />;
            default: return <AlertCircle className="h-4 w-4 text-gray-400" />;
        }
    };

    return (
        <div className="space-y-4">
            {sortedEvents.map((event, index) => (
                <div key={event.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                        <div className="mt-1">{getIcon(event.type)}</div>
                        {index < sortedEvents.length - 1 && (
                            <div className="w-px h-full bg-gray-200 my-1" />
                        )}
                    </div>
                    <div className="flex-1 pb-4">
                        <p className="text-sm font-medium text-gray-900">{event.description}</p>
                        <div className="flex justify-between items-center mt-1">
                            <span className="text-xs text-gray-500">
                                {event.userName || 'Sistema'}
                            </span>
                            <span className="text-xs text-gray-400">
                                {format(new Date(event.timestamp.seconds * 1000), "d MMM yyyy, HH:mm", { locale: es })}
                            </span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
