import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

export interface WhatsAppPayload {
    toPhone: string;
    clientName: string;
    ticketNumber: string;
    status: "EN_CAMINO" | "ARRIVED" | "COMPLETED";
    technicianName: string;
    details?: string;
}

/**
 * WhatsApp Business / Meta Graph API Conductor
 */
export async function sendWhatsAppNotification(payload: WhatsAppPayload): Promise<boolean> {
    try {
        const cleanPhone = payload.toPhone.replace(/[^\d]/g, "");
        if (!cleanPhone) {
            console.warn("No phone number provided for WhatsApp notification.");
            return false;
        }

        // Construct message based on state
        let messageText = "";
        if (payload.status === "EN_CAMINO") {
            messageText = `Estimado(a) ${payload.clientName}, su técnico asignado ${payload.technicianName} va en camino a su ubicación para atender el reporte #${payload.ticketNumber}.`;
        } else if (payload.status === "ARRIVED") {
            messageText = `Estimado(a) ${payload.clientName}, su técnico ${payload.technicianName} ha llegado a su ubicación para iniciar el servicio del reporte #${payload.ticketNumber}.`;
        } else if (payload.status === "COMPLETED") {
            messageText = `Estimado(a) ${payload.clientName}, el servicio del reporte #${payload.ticketNumber} ha sido completado por el técnico ${payload.technicianName}. ¡Gracias por confiar en HECHO SRL!`;
        }

        // Add optional details (like Google Maps coordinates or timeline notes)
        if (payload.details) {
            messageText += `\n\nDetalles adicionales: ${payload.details}`;
        }

        console.log(`[WhatsApp API Call Simulator] Sending to ${cleanPhone}: "${messageText}"`);

        // Check if Meta/Facebook Cloud API credentials exist in environment
        const accessToken = process.env.NEXT_PUBLIC_WHATSAPP_ACCESS_TOKEN || null;
        const phoneNumberId = process.env.NEXT_PUBLIC_WHATSAPP_PHONE_NUMBER_ID || null;

        let apiSent = false;
        if (accessToken && phoneNumberId) {
            try {
                const response = await fetch(
                    `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
                    {
                        method: "POST",
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            messaging_product: "whatsapp",
                            to: cleanPhone,
                            type: "text",
                            text: { body: messageText },
                        }),
                    }
                );
                const data = await response.json();
                if (response.ok && data.messages) {
                    apiSent = true;
                    console.log("WhatsApp Cloud API response:", data);
                } else {
                    console.error("WhatsApp Cloud API error response:", data);
                }
            } catch (err) {
                console.error("Failed to connect to Meta Graph API:", err);
            }
        }

        // Audit Logging: Write to Firestore collection `whatsapp_logs` for tracking and client verification
        await addDoc(collection(db, "whatsapp_logs"), {
            toPhone: cleanPhone,
            clientName: payload.clientName,
            ticketNumber: payload.ticketNumber,
            message: messageText,
            status: payload.status,
            technicianName: payload.technicianName,
            deliveryStatus: apiSent ? "SENT" : "SIMULATED",
            createdAt: serverTimestamp(),
        });

        // Also add a timeline comment to the ticket events for documentation
        // Note: The ticket ID could be used to write a ticket event, but since this helper doesn't have it directly, we assume the caller handles the ticket timeline, or we can optionally pass it.
        
        return true;
    } catch (error) {
        console.error("Error running WhatsApp notification service:", error);
        return false;
    }
}
