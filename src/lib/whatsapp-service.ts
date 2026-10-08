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
 * This now acts as a secure client wrapper that delegates to the server API route
 * to protect the access tokens.
 */
export async function sendWhatsAppNotification(payload: WhatsAppPayload): Promise<boolean> {
    try {
        const response = await fetch("/api/whatsapp", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            console.error("Failed to send WhatsApp notification via API:", await response.text());
            return false;
        }

        const data = await response.json();
        return data.success === true;
    } catch (error) {
        console.error("Error running WhatsApp notification service:", error);
        return false;
    }
}
