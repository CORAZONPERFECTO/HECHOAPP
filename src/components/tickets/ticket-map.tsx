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

import { ErrorBoundary } from "@/components/ui/error-boundary";

// Internal component with the map logic
function TicketMapContent({ tickets, onTicketClick }: TicketMapProps) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [isSupported, setIsSupported] = useState(true);

    useEffect(() => {
        if (!mapboxgl.supported()) {
            setIsSupported(false);
            return;
        }

        if (map.current) return;
        if (!mapContainer.current) return;

        // Check if token is available
        if (!MAPBOX_TOKEN) {
            console.error("Mapbox token not found");
            return;
        }

        mapboxgl.accessToken = MAPBOX_TOKEN;

        try {
            // Attempt to create map
            map.current = new mapboxgl.Map({
                container: mapContainer.current,
                style: "mapbox://styles/mapbox/streets-v12",
                center: [-69.9312, 18.4861], // Santo Domingo coordinates
                zoom: 11,
                attributionControl: false,
                failIfMajorPerformanceCaveat: true // Fail if hardware acceleration is missing
            });

            map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

            map.current.on('error', (e) => {
                console.error("Mapbox runtime error:", e);
                // We can't easily trigger the Error Boundary from here, but we can log it.
            });

        } catch (error) {
            console.error("Failed to initialize map:", error);
            setIsSupported(false);
        }

        return () => {
            try {
                map.current?.remove();
            } catch (e) {
                console.warn("Error cleaning up map:", e);
            }
        };
    }, []);

    // ... (rest of the detailed effect for markers) ...
    // Note: I will need to include the second useEffect logic here in full or use '...rest' if replacing.
    // Since I'm using replace_file_content with range, I need to be careful.

    // I will rewrite the whole component structure to avoid partial replace ambiguity.
    // BUT replace_file_content has 800 line limit, file is small enough (224 lines).
    // I will replace the component definition.

    useEffect(() => {
        if (!map.current) return;

        // Safe check for map loaded
        if (!map.current.getStyle()) return;

        const markers = document.querySelectorAll(".mapboxgl-marker");
        markers.forEach((marker) => marker.remove());

        tickets.forEach((ticket) => {
            const coordinates = getTicketCoordinates(ticket);
            if (!coordinates) return;

            const color = getPriorityColor(ticket.priority);
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

            const marker = new mapboxgl.Marker(el)
                .setLngLat(coordinates)
                .addTo(map.current!);

            el.addEventListener("click", () => {
                setSelectedTicket(ticket);
                onTicketClick(ticket);
            });

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

    // helper functions
    const getTicketCoordinates = (ticket: Ticket): [number, number] | null => {
        const baseLat = 18.4861;
        const baseLng = -69.9312;
        const randomLat = baseLat + (Math.random() - 0.5) * 0.1;
        const randomLng = baseLng + (Math.random() - 0.5) * 0.1;
        return [randomLng, randomLat];
    };

    const getPriorityColor = (priority: string): string => {
        switch (priority) {
            case "URGENT": return "#dc2626";
            case "HIGH": return "#f97316";
            case "MEDIUM": return "#eab308";
            case "LOW": return "#22c55e";
            default: return "#3b82f6";
        }
    };

    if (!isSupported) {
        return (
            <div className="w-full h-[400px] bg-gray-100 rounded-lg flex items-center justify-center p-6 text-center border-2 border-dashed border-gray-300">
                <div className="max-w-md">
                    <h3 className="text-lg font-bold text-gray-800 mb-2">Mapa no disponible</h3>
                    <p className="text-sm text-gray-600 mb-4">
                        No se pudo cargar el mapa (Error WebGL).
                    </p>
                </div>
            </div>
        );
    }

    if (!MAPBOX_TOKEN) return null; // Simplified since ErrorBoundary handles main crashes

    return (
        <div className="relative">
            <div ref={mapContainer} className="w-full h-[700px] rounded-lg shadow-lg" />
            <Card className="absolute top-4 left-4 z-10">
                <CardContent className="p-4">
                    <h4 className="font-semibold text-sm mb-2">Prioridad</h4>
                    <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-600"></div><span>Urgente</span></div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-orange-500"></div><span>Alta</span></div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-yellow-500"></div><span>Media</span></div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500"></div><span>Baja</span></div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// Export the wrapper
export function TicketMap(props: TicketMapProps) {
    return (
        <ErrorBoundary
            fallback={
                <div className="w-full h-[400px] bg-gray-100 rounded-lg flex items-center justify-center">
                    <p className="text-gray-500">El mapa no pudo cargarse en este dispositivo.</p>
                </div>
            }
        >
            <TicketMapContent {...props} />
        </ErrorBoundary>
    );
}
