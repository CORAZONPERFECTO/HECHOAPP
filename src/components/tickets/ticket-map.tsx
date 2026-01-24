"use client";

import { useEffect, useRef, useState } from "react";
// import mapboxgl from "mapbox-gl"; // Removed static import
import "mapbox-gl/dist/mapbox-gl.css";
import type { Map, Marker, MapboxOptions } from "mapbox-gl";
import { Ticket } from "@/types/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, ExternalLink, Copy, AlertCircle } from "lucide-react";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { isWebGLSupported, logMapError } from "@/lib/webgl-check";

// Set your Mapbox access token here
const MAPBOX_TOKEN = "pk.eyJ1IjoiaGVjaG9zcmwwMSIsImEiOiJjbWowcm5xZzgwMmcyM2ZxMnE2MzlsZ2V3In0.xHEncBdITQeKxGd0n3BsRg";

interface TicketMapProps {
    tickets: Ticket[];
    onTicketClick: (ticket: Ticket) => void;
}

function MapFallback({ reason, tickets }: { reason?: string, tickets: Ticket[] }) {
    const defaultCenter = { lat: 18.4861, lng: -69.9312 }; // Santo Domingo

    // Construct Google Maps URL. If 1 ticket, point to it. If multiple, search or center.
    const getGoogleMapsUrl = () => {
        if (tickets.length === 1) {
            // Trying to use ticket location if available or random/center
            // Note: In this demo we don't have real coords in ticket object usually, 
            // but we can search by address.
            const query = encodeURIComponent(tickets[0].locationName || "Santo Domingo");
            return `https://www.google.com/maps/search/?api=1&query=${query}`;
        }
        return `https://www.google.com/maps/@${defaultCenter.lat},${defaultCenter.lng},12z`;
    };

    const handleCopyCoords = () => {
        navigator.clipboard.writeText(`${defaultCenter.lat}, ${defaultCenter.lng}`);
        alert("Coordenadas centrales copiadas (Demo)");
    };

    return (
        <div className="w-full h-[600px] bg-slate-50 rounded-lg flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-slate-300">
            <div className="max-w-md space-y-6">
                <div className="flex justify-center">
                    <div className="bg-orange-100 p-4 rounded-full">
                        <AlertCircle className="h-10 w-10 text-orange-600" />
                    </div>
                </div>

                <div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">Mapa Interactivo no disponible</h3>
                    <p className="text-slate-600">
                        {reason || "Tu dispositivo no soporta la aceleración gráfica (WebGL) requerida."}
                    </p>
                </div>

                <div className="grid gap-3 w-full">
                    <Button variant="default" className="w-full" onClick={() => window.open(getGoogleMapsUrl(), '_blank')}>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Abrir ubicación en Google Maps
                    </Button>

                    <Button variant="outline" className="w-full" onClick={handleCopyCoords}>
                        <Copy className="mr-2 h-4 w-4" />
                        Copiar Coordenadas
                    </Button>
                </div>

                <p className="text-xs text-slate-400 mt-4">
                    Recomendación: Actualiza tus drivers de video o prueba en otro navegador (Chrome/Edge).
                </p>
                <p className="text-[10px] text-slate-300">v2.1 Fix</p>
            </div>
        </div>
    );
}

function TicketMapContent({ tickets, onTicketClick }: TicketMapProps) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<Map | null>(null);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [mapError, setMapError] = useState<string | null>(null);
    const mapboxLib = useRef<any>(null); // Keep any for dynamic import lib root



    useEffect(() => {
        const initMap = async () => {
            if (map.current) return;

            // 1. Validate WebGL Support manually
            const manualCheck = isWebGLSupported();
            if (!manualCheck) {
                setMapError("WebGL Check Failed (Manual Test)");
                return;
            }

            if (!mapContainer.current) return;

            try {
                // Dynamic Import to avoid SSR issues
                const mapboxgl = (await import("mapbox-gl")).default;
                mapboxLib.current = mapboxgl;

                if (!mapboxgl.supported()) {
                    setMapError("WebGL Check Failed (Mapbox Test)");
                    return;
                }

                mapboxgl.accessToken = MAPBOX_TOKEN;

                map.current = new mapboxgl.Map({
                    container: mapContainer.current,
                    style: "mapbox://styles/mapbox/streets-v12",
                    center: [-69.9312, 18.4861],
                    zoom: 11,
                    attributionControl: false,
                    failIfMajorPerformanceCaveat: true
                });

                map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

                map.current.on('error', (e: { error?: Error }) => {
                    const msg = e.error?.message || "Unknown Mapbox runtime error";
                    logMapError(e.error);
                    if (msg.includes("WebGL") || msg.includes("context")) {
                        setMapError(msg);
                    }
                });

                // Force a resize to ensure it fits the container
                setTimeout(() => {
                    map.current?.resize();
                }, 200);

            } catch (error: unknown) {
                const err = error as Error;
                logMapError(err);
                setMapError(err?.message || "Error init map (Dynamic)");
            }
        };

        if (!mapError) {
            initMap();
        }

        return () => {
            try {
                map.current?.remove();
            } catch (e) { console.warn(e); }
        };
    }, [mapError]);

    useEffect(() => {
        if (!map.current || mapError || !mapboxLib.current) return;

        const mapboxgl = mapboxLib.current;

        // Clean existing markers (if any custom logic used, typically manual DOM removal for custom markers)
        const markers = document.querySelectorAll(".custom-marker-node");
        markers.forEach((marker) => marker.remove());

        // Note: Mapbox GL JS markers are separate generic objects.
        // In this simple implementation, we might clear map layers if we were using layers.
        // But since we are using DOM markers, let's just clear the container? 
        // Actually, let's keep it simple: WE NEED TO REMOVE OLD MARKERS.
        // We didn't store references to them. In a real app we should.
        // For now, let's assume we can query them or just rebuild map if tickets change drastically.
        // BETTER: Store markers in a ref.
    }, [tickets, onTicketClick, mapError]);

    // We need a ref for markers to clear them properly
    const markersRef = useRef<Marker[]>([]);

    useEffect(() => {
        if (!map.current || mapError || !mapboxLib.current) return;
        const mapboxgl = mapboxLib.current;

        // Clear existing markers
        markersRef.current.forEach(marker => marker.remove());
        markersRef.current = [];

        tickets.forEach((ticket) => {
            const coordinates = getTicketCoordinates(ticket);
            if (!coordinates) return;

            const color = getPriorityColor(ticket.priority);
            const el = document.createElement("div");
            el.className = "custom-marker-node"; // Added class for identifying
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
            el.innerHTML = '<div style="font-size:14px">📍</div>';

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
                    </div>
                `);
            marker.setPopup(popup);

            markersRef.current.push(marker);
        });

    }, [tickets, onTicketClick, mapError]); // Re-run when tickets change

    if (mapError) {
        return <MapFallback reason={mapError} tickets={tickets} />;
    }

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

// Helpers
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

export function TicketMap(props: TicketMapProps) {
    return (
        <ErrorBoundary fallback={<MapFallback reason="Error crítico al cargar el módulo de mapa." tickets={props.tickets} />}>
            <TicketMapContent {...props} />
        </ErrorBoundary>
    );
}

