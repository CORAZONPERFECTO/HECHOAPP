"use client";

import { useState, useMemo } from "react";
import { Ticket } from "@/types/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    MapPin, ExternalLink, MessageCircle, Share2, Copy,
    Calendar, Clock, User, AlertCircle, CheckCircle2,
    Phone, Navigation, ChevronDown, ChevronUp
} from "lucide-react";
import { format, isSameDay, isToday, isTomorrow, isThisWeek, isPast } from "date-fns";
import { es } from "date-fns/locale";

interface TicketMapProps {
    tickets: Ticket[];
    onTicketClick: (ticket: Ticket) => void;
}

const PRIORITY_CONFIG = {
    URGENT: { label: "Urgente", color: "bg-red-100 text-red-700 border-red-200", dot: "bg-red-500", emoji: "🔴" },
    HIGH:   { label: "Alta",    color: "bg-orange-100 text-orange-700 border-orange-200", dot: "bg-orange-500", emoji: "🟠" },
    MEDIUM: { label: "Media",   color: "bg-yellow-100 text-yellow-700 border-yellow-200", dot: "bg-yellow-500", emoji: "🟡" },
    LOW:    { label: "Baja",    color: "bg-green-100 text-green-700 border-green-200", dot: "bg-green-500", emoji: "🟢" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    OPEN:           { label: "Abierto",       color: "bg-blue-100 text-blue-700" },
    IN_PROGRESS:    { label: "En Progreso",   color: "bg-purple-100 text-purple-700" },
    WAITING_CLIENT: { label: "Esp. Cliente",  color: "bg-amber-100 text-amber-700" },
    WAITING_PARTS:  { label: "Esp. Piezas",   color: "bg-orange-100 text-orange-700" },
    COMPLETED:      { label: "Completado",    color: "bg-green-100 text-green-700" },
    CANCELLED:      { label: "Cancelado",     color: "bg-gray-100 text-gray-600" },
};

function getMapsUrl(ticket: Ticket): string {
    if (ticket.locationUrl && ticket.locationUrl.startsWith("http")) {
        return ticket.locationUrl;
    }
    const q = encodeURIComponent(`${ticket.locationName} ${ticket.clientName}`);
    return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

function getTicketAppUrl(ticket: Ticket): string {
    if (typeof window !== "undefined") {
        return `${window.location.origin}/technician/tickets/${ticket.id}`;
    }
    return `/technician/tickets/${ticket.id}`;
}

function buildWhatsAppMessage(ticket: Ticket): string {
    const ticketUrl = getTicketAppUrl(ticket);
    const mapsUrl = getMapsUrl(ticket);
    const priority = PRIORITY_CONFIG[ticket.priority as keyof typeof PRIORITY_CONFIG];
    const scheduled = ticket.scheduledStart
        ? format(ticket.scheduledStart.toDate(), "dd/MM/yyyy HH:mm", { locale: es })
        : "Sin programar";

    return [
        `🔧 *TICKET #${ticket.ticketNumber || ticket.id.slice(0, 6)}*`,
        `👤 Cliente: ${ticket.clientName}`,
        `📍 Ubicación: ${ticket.locationName}`,
        `🗺️ Mapa: ${mapsUrl}`,
        `📋 Servicio: ${ticket.serviceType.replace(/_/g, " ")}`,
        `⚡ Prioridad: ${priority?.emoji || ""} ${priority?.label || ticket.priority}`,
        `🗓️ Programado: ${scheduled}`,
        ``,
        `📱 *Abre tu ticket aquí:*`,
        ticketUrl,
    ].join("\n");
}

// Single ticket card in the operations list
function TicketOpsCard({ ticket, onTicketClick }: { ticket: Ticket; onTicketClick: (t: Ticket) => void }) {
    const [expanded, setExpanded] = useState(false);
    const [copied, setCopied] = useState(false);

    const priority = PRIORITY_CONFIG[ticket.priority as keyof typeof PRIORITY_CONFIG];
    const status = STATUS_CONFIG[ticket.status] || { label: ticket.status, color: "bg-gray-100 text-gray-600" };
    const mapsUrl = getMapsUrl(ticket);
    const ticketUrl = getTicketAppUrl(ticket);
    const whatsappMsg = buildWhatsAppMessage(ticket);
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappMsg)}`;

    const handleCopyLink = () => {
        navigator.clipboard.writeText(ticketUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const hasLocationUrl = ticket.locationUrl && ticket.locationUrl.startsWith("http");

    return (
        <Card className={`border-l-4 transition-all ${
            ticket.priority === "URGENT" ? "border-l-red-500" :
            ticket.priority === "HIGH" ? "border-l-orange-500" :
            ticket.priority === "MEDIUM" ? "border-l-yellow-400" : "border-l-green-500"
        } hover:shadow-md`}>
            <CardContent className="p-4">
                {/* Header row */}
                <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                        <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border ${priority?.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${priority?.dot}`} />
                            {priority?.label}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>
                            {status.label}
                        </span>
                    </div>
                    <span className="text-xs font-mono text-gray-400 shrink-0">
                        #{ticket.ticketNumber || ticket.id.slice(0, 6)}
                    </span>
                </div>

                {/* Client + Location */}
                <div className="space-y-1 mb-3">
                    <div className="flex items-center gap-2">
                        <User className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                        <span className="font-semibold text-gray-900 text-sm truncate">{ticket.clientName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                        <span className="text-xs text-gray-600 truncate">{ticket.locationName}</span>
                        {hasLocationUrl && (
                            <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full shrink-0">
                                📍 GPS
                            </span>
                        )}
                    </div>
                    {ticket.technicianName && (
                        <div className="flex items-center gap-2">
                            <User className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                            <span className="text-xs text-purple-600 font-medium">{ticket.technicianName}</span>
                        </div>
                    )}
                    {ticket.scheduledStart && (
                        <div className="flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                            <span className="text-xs text-gray-500">
                                {format(ticket.scheduledStart.toDate(), "HH:mm", { locale: es })} h
                            </span>
                        </div>
                    )}
                </div>

                {/* Action Buttons — always visible */}
                <div className="grid grid-cols-2 gap-2">
                    {/* Open in Maps */}
                    <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50">
                            <Navigation className="h-3.5 w-3.5" />
                            {hasLocationUrl ? "Ubicación" : "Ver Mapa"}
                        </Button>
                    </a>

                    {/* WhatsApp Send */}
                    <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-1.5 border-green-200 text-green-700 hover:bg-green-50">
                            <MessageCircle className="h-3.5 w-3.5" />
                            WhatsApp
                        </Button>
                    </a>

                    {/* Copy Tech Link */}
                    <Button
                        variant="outline" size="sm"
                        className="w-full h-8 text-xs gap-1.5 border-purple-200 text-purple-700 hover:bg-purple-50"
                        onClick={handleCopyLink}
                    >
                        {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        {copied ? "¡Copiado!" : "Link Técnico"}
                    </Button>

                    {/* Open Ticket */}
                    <Button
                        size="sm"
                        className="w-full h-8 text-xs gap-1.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700"
                        onClick={() => onTicketClick(ticket)}
                    >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Abrir Ticket
                    </Button>
                </div>

                {/* Expandable description */}
                {ticket.description && (
                    <div className="mt-2 border-t pt-2">
                        <button
                            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 w-full"
                            onClick={() => setExpanded(!expanded)}
                        >
                            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            {expanded ? "Ocultar descripción" : "Ver descripción"}
                        </button>
                        {expanded && (
                            <p className="text-xs text-gray-600 mt-1 bg-slate-50 p-2 rounded">
                                {ticket.description}
                            </p>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// Group tickets by day
function groupByDay(tickets: Ticket[]): Record<string, Ticket[]> {
    const groups: Record<string, Ticket[]> = {};

    tickets.forEach(ticket => {
        const date = ticket.scheduledStart?.toDate();
        const key = date
            ? format(date, "yyyy-MM-dd")
            : "__unscheduled__";
        if (!groups[key]) groups[key] = [];
        groups[key].push(ticket);
    });

    return groups;
}

function getDayLabel(dateKey: string): { label: string; sublabel: string; color: string } {
    if (dateKey === "__unscheduled__") {
        return { label: "Sin Programar", sublabel: "Pendientes de fecha", color: "text-gray-500" };
    }

    const date = new Date(dateKey + "T00:00:00");

    if (isToday(date)) return { label: "HOY", sublabel: format(date, "EEEE d 'de' MMMM", { locale: es }), color: "text-blue-700" };
    if (isTomorrow(date)) return { label: "MAÑANA", sublabel: format(date, "EEEE d 'de' MMMM", { locale: es }), color: "text-purple-700" };
    if (isPast(date)) return { label: "VENCIDO", sublabel: format(date, "EEEE d 'de' MMMM", { locale: es }), color: "text-red-600" };
    if (isThisWeek(date, { weekStartsOn: 1 })) return { label: format(date, "EEEE", { locale: es }).toUpperCase(), sublabel: format(date, "d 'de' MMMM", { locale: es }), color: "text-emerald-700" };

    return {
        label: format(date, "EEEE d", { locale: es }).toUpperCase(),
        sublabel: format(date, "MMMM yyyy", { locale: es }),
        color: "text-gray-700"
    };
}

export function TicketMap({ tickets, onTicketClick }: TicketMapProps) {
    const groups = useMemo(() => groupByDay(tickets), [tickets]);

    // Sort keys: scheduled dates ASC, unscheduled last
    const sortedKeys = useMemo(() => {
        return Object.keys(groups).sort((a, b) => {
            if (a === "__unscheduled__") return 1;
            if (b === "__unscheduled__") return -1;
            return a.localeCompare(b);
        });
    }, [groups]);

    const totalWithLocation = tickets.filter(t => t.locationUrl?.startsWith("http")).length;
    const totalUrgent = tickets.filter(t => t.priority === "URGENT").length;

    return (
        <div className="space-y-4">
            {/* Summary bar */}
            <div className="flex flex-wrap items-center gap-3 p-3 bg-white border rounded-xl shadow-sm">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4 text-blue-500" />
                    <span><strong>{tickets.length}</strong> ticket{tickets.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="w-px h-4 bg-gray-200" />
                <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4 text-green-500" />
                    <span><strong>{totalWithLocation}</strong> con GPS/Maps</span>
                </div>
                {totalUrgent > 0 && (
                    <>
                        <div className="w-px h-4 bg-gray-200" />
                        <div className="flex items-center gap-2 text-sm text-red-600 font-semibold">
                            <AlertCircle className="h-4 w-4" />
                            <span>{totalUrgent} URGENTE{totalUrgent !== 1 ? "S" : ""}</span>
                        </div>
                    </>
                )}
                <div className="ml-auto">
                    <span className="text-xs text-gray-400">
                        🟢 WhatsApp: abre WhatsApp Web o la app · 🔗 Link Técnico: envía al celular
                    </span>
                </div>
            </div>

            {tickets.length === 0 && (
                <div className="text-center py-16 text-gray-400">
                    <MapPin className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-lg font-medium">No hay tickets en este filtro</p>
                    <p className="text-sm">Cambia el filtro de fechas para ver más tickets.</p>
                </div>
            )}

            {/* Day groups */}
            {sortedKeys.map(dateKey => {
                const dayTickets = groups[dateKey];
                const { label, sublabel, color } = getDayLabel(dateKey);
                const isOverdue = !["__unscheduled__"].includes(dateKey) && isPast(new Date(dateKey + "T23:59:59"));

                return (
                    <div key={dateKey} className="space-y-3">
                        {/* Day header */}
                        <div className={`flex items-center gap-3 px-1 py-2 border-b ${isOverdue ? "border-red-200" : "border-gray-200"}`}>
                            <div className={`text-sm font-bold tracking-wide ${color}`}>{label}</div>
                            <div className="text-xs text-gray-400">{sublabel}</div>
                            <div className="ml-auto">
                                <Badge variant="outline" className={`text-xs ${isOverdue ? "border-red-200 text-red-600" : "border-gray-200 text-gray-500"}`}>
                                    {dayTickets.length} ticket{dayTickets.length !== 1 ? "s" : ""}
                                </Badge>
                            </div>
                        </div>

                        {/* Ticket cards grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                            {dayTickets.map(ticket => (
                                <TicketOpsCard
                                    key={ticket.id}
                                    ticket={ticket}
                                    onTicketClick={onTicketClick}
                                />
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
