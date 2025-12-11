"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Ticket } from "@/types/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation } from "lucide-react";

// Set your Mapbox access token here
// User will need to add this to their .env.local file
const MAPBOX_TOKEN = "pk.eyJ1IjoiaGVjaG9zcmwwMSIsImEiOiJjbWowcm5xZzgwMmcyM2ZxMnE2MzlsZ2V3In0.xHEncBdITQeKxGd0n3BsRg";

interface TicketMapProps {
    tickets: Ticket[];
    onTicketClick: (ticket: Ticket) => void;
}

export function TicketMap({ tickets, onTicketClick }: TicketMapProps) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

    useEffect(() => {
        if (!mapContainer.current || map.current) return;

        // Check if token is available
        if (!MAPBOX_TOKEN) {
            console.error("Mapbox token not found. Please add NEXT_PUBLIC_MAPBOX_TOKEN to your .env.local file");
            return;
        }

        mapboxgl.accessToken = MAPBOX_TOKEN;

        // Initialize map centered on Dominican Republic
        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: "mapbox://styles/mapbox/streets-v12",
            center: [-69.9312, 18.4861], // Santo Domingo coordinates
            zoom: 10,
        });

        map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

        return () => {
            map.current?.remove();
        };
    }, []);

    useEffect(() => {
        if (!map.current) return;

        // Remove existing markers
        const markers = document.querySelectorAll(".mapboxgl-marker");
        markers.forEach((marker) => marker.remove());

        // Add markers for each ticket with coordinates
        tickets.forEach((ticket) => {
            // For now, we'll use random coordinates near Santo Domingo
            // In production, you'd geocode the address or store coordinates
            const coordinates = getTicketCoordinates(ticket);

            if (!coordinates) return;

            const color = getPriorityColor(ticket.priority);

            // Create custom marker
            const el = document.createElement("div");
            el.className = "custom-marker";
            el.style.backgroundColor = color;
            el.style.width = "30px";
            el.style.height = "30px";
            el.style.borderRadius = "50%";
            el.style.border = "3px solid white";
            el.style.boxShadow = "0 2px 4px rgba(0,0,0,0.3)";
            el.style.cursor = "pointer";
            el.style.display = "flex";
            el.style.alignItems = "center";
            el.style.justifyContent = "center";

            const icon = document.createElement("div");
            icon.innerHTML = "📍";
            icon.style.fontSize = "14px";
            el.appendChild(icon);

            // Add marker to map
            const marker = new mapboxgl.Marker(el)
                .setLngLat(coordinates)
                .addTo(map.current!);

            // Add click event
            el.addEventListener("click", () => {
                setSelectedTicket(ticket);
                onTicketClick(ticket);
            });

            // Add popup on hover
            const popup = new mapboxgl.Popup({ offset: 25, closeButton: false })
                .setHTML(`
                    <div style="padding: 8px;">
                        <strong>${ticket.ticketNumber || ticket.id.slice(0, 6)}</strong><br/>
                        <span style="font-size: 12px;">${ticket.clientName}</span><br/>
                        <span style="font-size: 11px; color: #666;">${ticket.locationName}</span>
                    </div>
                `);

            marker.setPopup(popup);
        });
    }, [tickets, onTicketClick]);

    // Helper function to get coordinates for a ticket
    // In production, this would geocode the address or use stored coordinates
    const getTicketCoordinates = (ticket: Ticket): [number, number] | null => {
        // For demo purposes, generate random coordinates around Santo Domingo
        // In production, you'd use actual geocoded addresses
        const baseLat = 18.4861;
        const baseLng = -69.9312;
        const randomLat = baseLat + (Math.random() - 0.5) * 0.1;
        const randomLng = baseLng + (Math.random() - 0.5) * 0.1;
        return [randomLng, randomLat];
    };

    const getPriorityColor = (priority: string): string => {
        switch (priority) {
            case "URGENT":
                return "#dc2626";
            case "HIGH":
                return "#f97316";
            case "MEDIUM":
                return "#eab308";
            case "LOW":
                return "#22c55e";
            default:
                return "#3b82f6";
        }
    };

    if (!MAPBOX_TOKEN) {
        return (
            <Card>
                <CardContent className="p-8 text-center">
                    <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-semibold mb-2">Configuración de Mapa Requerida</h3>
                    <p className="text-sm text-gray-600 mb-4">
                        Para usar el mapa, necesitas agregar tu token de Mapbox.
                    </p>
                    <div className="bg-slate-100 p-4 rounded-lg text-left text-xs font-mono">
                        <p className="mb-2">1. Obtén un token gratuito en: <a href="https://mapbox.com" target="_blank" className="text-blue-600 underline">mapbox.com</a></p>
                        <p>2. Agrega a tu archivo .env.local:</p>
                        <code className="block mt-2 bg-white p-2 rounded">
                            NEXT_PUBLIC_MAPBOX_TOKEN=tu_token_aqui
                        </code>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="relative">
            <div ref={mapContainer} className="w-full h-[700px] rounded-lg shadow-lg" />

            {/* Legend */}
            <Card className="absolute top-4 left-4 z-10">
                <CardContent className="p-4">
                    <h4 className="font-semibold text-sm mb-2">Prioridad</h4>
                    <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-600"></div>
                            <span>Urgente</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                            <span>Alta</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                            <span>Media</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            <span>Baja</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
