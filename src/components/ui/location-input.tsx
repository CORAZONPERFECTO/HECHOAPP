"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Link2, Loader2, Navigation, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface LocationInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    label?: string;
    className?: string;
    /** If true, shows the "Use my GPS" button (for client-facing forms) */
    showGpsButton?: boolean;
    /** If true, shows a "Open in Maps" link when value is present */
    showOpenLink?: boolean;
    disabled?: boolean;
}

/**
 * Parses any Google Maps / WhatsApp location URL and extracts coordinates or a clean link.
 * Supports formats:
 *  - https://maps.google.com/?q=18.47,-69.93
 *  - https://www.google.com/maps/place/.../@18.47,-69.93,...
 *  - https://maps.app.goo.gl/xxxx  (short links — kept as-is)
 *  - https://www.google.com/maps?q=18.47,-69.93
 */
function extractMapsUrl(input: string): string {
    const trimmed = input.trim();
    if (!trimmed) return "";

    // Already a valid URL — return as is
    if (trimmed.startsWith("http")) return trimmed;

    // Coordinates pasted directly: "18.47,-69.93"
    const coordMatch = trimmed.match(/^(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)$/);
    if (coordMatch) {
        return `https://www.google.com/maps?q=${coordMatch[1]},${coordMatch[2]}`;
    }

    return trimmed; // Free text address
}

/** Extracts Google Maps URL from WhatsApp shared location messages */
function extractFromWhatsApp(text: string): string {
    const urlMatch = text.match(/https?:\/\/[^\s]+/);
    return urlMatch ? urlMatch[0] : text;
}

export function LocationInput({
    value,
    onChange,
    placeholder = "Pega la dirección, link de WhatsApp o Google Maps...",
    label = "Ubicación",
    className,
    showGpsButton = false,
    showOpenLink = true,
    disabled = false,
}: LocationInputProps) {
    const [gpsLoading, setGpsLoading] = useState(false);
    const [gpsError, setGpsError] = useState("");

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        const pasted = e.clipboardData.getData("text");
        // Extract URL if it's a WhatsApp message block (e.g., "Mi ubicación: https://maps....")
        const extracted = extractFromWhatsApp(pasted);
        if (extracted !== pasted) {
            e.preventDefault();
            onChange(extracted);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        // Auto-extract if user types/pastes a full block of text containing a URL
        if (val.includes("http")) {
            const extracted = extractFromWhatsApp(val);
            onChange(extracted);
        } else {
            onChange(val);
        }
    };

    const handleGetGps = () => {
        if (!navigator.geolocation) {
            setGpsError("Tu dispositivo no soporta GPS.");
            return;
        }
        setGpsLoading(true);
        setGpsError("");

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                const mapsUrl = `https://www.google.com/maps?q=${latitude.toFixed(6)},${longitude.toFixed(6)}`;

                // Try to get a human-readable address
                try {
                    const res = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
                    );
                    const data = await res.json();
                    const addr = data.display_name?.split(",").slice(0, 3).join(",") || mapsUrl;
                    onChange(`${addr} — ${mapsUrl}`);
                } catch {
                    onChange(mapsUrl);
                }
                setGpsLoading(false);
            },
            (err) => {
                setGpsLoading(false);
                if (err.code === 1) setGpsError("Permiso de ubicación denegado. Actívalo en tu navegador.");
                else setGpsError("No se pudo obtener la ubicación. Intenta de nuevo.");
            },
            { timeout: 10000, enableHighAccuracy: true }
        );
    };

    // Build the open-in-maps URL
    const mapsLink = value?.startsWith("http")
        ? value
        : value
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value)}`
        : null;

    return (
        <div className={cn("space-y-2", className)}>
            {label && (
                <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-blue-500" />
                        {label}
                    </label>
                    {showOpenLink && mapsLink && (
                        <a
                            href={mapsLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                        >
                            <ExternalLink className="h-3 w-3" />
                            Abrir en Maps
                        </a>
                    )}
                </div>
            )}

            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <Input
                        value={value}
                        onChange={handleChange}
                        onPaste={handlePaste}
                        placeholder={placeholder}
                        className="pl-9 text-sm"
                        disabled={disabled}
                    />
                </div>

                {showGpsButton && !disabled && (
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={handleGetGps}
                        disabled={gpsLoading}
                        title="Usar mi ubicación actual (GPS)"
                        className="shrink-0 border-blue-300 text-blue-600 hover:bg-blue-50"
                    >
                        {gpsLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Navigation className="h-4 w-4" />
                        )}
                    </Button>
                )}
            </div>

            {/* GPS error message */}
            {gpsError && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {gpsError}
                </p>
            )}

            {/* Preview: show if it's a URL */}
            {value && value.startsWith("http") && (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-md px-3 py-1.5">
                    <MapPin className="h-3.5 w-3.5 text-green-600 shrink-0" />
                    <span className="text-xs text-green-700 truncate">Link de Maps detectado ✅</span>
                    <a
                        href={value}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-auto text-xs text-blue-600 hover:underline whitespace-nowrap"
                    >
                        Verificar →
                    </a>
                </div>
            )}
        </div>
    );
}
