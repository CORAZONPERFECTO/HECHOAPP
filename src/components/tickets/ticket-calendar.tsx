"use client";

import { useState, useMemo } from "react";
import { Calendar, dateFnsLocalizer, View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { es } from "date-fns/locale";
import { Ticket } from "@/types/schema";
import "react-big-calendar/lib/css/react-big-calendar.css";

const locales = {
    es: es,
};

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
});

interface TicketCalendarProps {
    tickets: Ticket[];
    onTicketClick: (ticket: Ticket) => void;
}

interface CalendarEvent {
    id: string;
    title: string;
    start: Date;
    end: Date;
    resource: Ticket;
}

export function TicketCalendar({ tickets, onTicketClick }: TicketCalendarProps) {
    const [view, setView] = useState<View>("month");
    const [date, setDate] = useState(new Date());

    const events: CalendarEvent[] = useMemo(() => {
        return tickets.map((ticket) => {
            const startDate = new Date(ticket.createdAt.seconds * 1000);
            return {
                id: ticket.id,
                title: `${ticket.ticketNumber || ticket.id.slice(0, 6)} - ${ticket.clientName}`,
                start: startDate,
                end: startDate,
                resource: ticket,
            };
        });
    }, [tickets]);

    const eventStyleGetter = (event: CalendarEvent) => {
        const ticket = event.resource;
        let backgroundColor = "#3174ad";

        // Color by priority
        switch (ticket.priority) {
            case "URGENT":
                backgroundColor = "#dc2626";
                break;
            case "HIGH":
                backgroundColor = "#f97316";
                break;
            case "MEDIUM":
                backgroundColor = "#eab308";
                break;
            case "LOW":
                backgroundColor = "#22c55e";
                break;
        }

        return {
            style: {
                backgroundColor,
                borderRadius: "4px",
                opacity: 0.9,
                color: "white",
                border: "0px",
                display: "block",
                fontSize: "12px",
                padding: "2px 4px",
            },
        };
    };

    return (
        <div className="bg-white p-4 rounded-lg shadow h-[700px]">
            <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: "100%" }}
                onSelectEvent={(event) => onTicketClick(event.resource)}
                eventPropGetter={eventStyleGetter}
                view={view}
                onView={setView}
                date={date}
                onNavigate={setDate}
                messages={{
                    next: "Siguiente",
                    previous: "Anterior",
                    today: "Hoy",
                    month: "Mes",
                    week: "Semana",
                    day: "Día",
                    agenda: "Agenda",
                    date: "Fecha",
                    time: "Hora",
                    event: "Ticket",
                    noEventsInRange: "No hay tickets en este rango de fechas.",
                }}
                culture="es"
            />
        </div>
    );
}
