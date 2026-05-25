"use client";

import { Ticket } from "@/types/schema";
import { Button } from "@/components/ui/button";
import { Navigation, Phone, MessageCircle, MapPin } from "lucide-react";

interface FloatingActionButtonsProps {
    ticket: Ticket;
    clientPhone?: string;
}

export function FloatingActionButtons({ ticket, clientPhone }: FloatingActionButtonsProps) {
    const address = `${ticket.locationName}${ticket.specificLocation ? ", " + ticket.specificLocation : ""}`;
    const phone = clientPhone || "";

    const openWaze = () => {
        const wazeUrl = `https://waze.com/ul?q=${encodeURIComponent(address)}`;
        window.open(wazeUrl, "_blank");
    };

    const openGoogleMaps = () => {
        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
        window.open(mapsUrl, "_blank");
    };

    const callClient = () => {
        if (!phone) {
            alert("No hay número de teléfono registrado para este cliente.");
            return;
        }
        window.location.href = `tel:${phone}`;
    };

    const whatsappClient = () => {
        if (!phone) {
            alert("No hay número de teléfono registrado para este cliente.");
            return;
        }
        const cleanPhone = phone.replace(/[^\d]/g, "");
        const whatsappUrl = `https://wa.me/${cleanPhone}`;
        window.open(whatsappUrl, "_blank");
    };

    return (
        <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-50 print:hidden">
            {/* Waze */}
            <Button
                onClick={openWaze}
                size="lg"
                className="h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-700 shadow-2xl p-0"
                title="Abrir en Waze"
            >
                <Navigation className="h-6 w-6" />
            </Button>

            {/* Google Maps */}
            <Button
                onClick={openGoogleMaps}
                size="lg"
                className="h-14 w-14 rounded-full bg-green-600 hover:bg-green-700 shadow-2xl p-0"
                title="Abrir en Google Maps"
            >
                <MapPin className="h-6 w-6" />
            </Button>

            {/* Call */}
            <Button
                onClick={callClient}
                size="lg"
                className="h-14 w-14 rounded-full bg-orange-600 hover:bg-orange-700 shadow-2xl p-0"
                title="Llamar Cliente"
            >
                <Phone className="h-6 w-6" />
            </Button>

            {/* WhatsApp */}
            <Button
                onClick={whatsappClient}
                size="lg"
                className="h-14 w-14 rounded-full bg-emerald-600 hover:bg-emerald-700 shadow-2xl p-0"
                title="WhatsApp Cliente"
            >
                <MessageCircle className="h-6 w-6" />
            </Button>
        </div>
    );
}
