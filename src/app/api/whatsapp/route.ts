import { NextResponse } from "next/server";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase"; 

export async function POST(req: Request) {
    try {
        const payload = await req.json();
        
        if (!payload || !payload.toPhone || !payload.clientName || !payload.ticketNumber || !payload.status || !payload.technicianName) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const cleanPhone = payload.toPhone.replace(/[^\d]/g, "");
        if (!cleanPhone) {
            return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
        }

        let messageText = "";
        if (payload.status === "EN_CAMINO") {
            messageText = `Estimado(a) ${payload.clientName}, su técnico asignado ${payload.technicianName} va en camino a su ubicación para atender el reporte #${payload.ticketNumber}.`;
        } else if (payload.status === "ARRIVED") {
            messageText = `Estimado(a) ${payload.clientName}, su técnico ${payload.technicianName} ha llegado a su ubicación para iniciar el servicio del reporte #${payload.ticketNumber}.`;
        } else if (payload.status === "COMPLETED") {
            messageText = `Estimado(a) ${payload.clientName}, el servicio del reporte #${payload.ticketNumber} ha sido completado por el técnico ${payload.technicianName}. ¡Gracias por confiar en HECHO SRL!`;
        }

        if (payload.details) {
            messageText += `\n\nDetalles adicionales: ${payload.details}`;
        }

        // Use NON-public environment variables
        const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || process.env.NEXT_PUBLIC_WHATSAPP_ACCESS_TOKEN;
        const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.NEXT_PUBLIC_WHATSAPP_PHONE_NUMBER_ID;

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
                } else {
                    console.error("WhatsApp Cloud API error response:", data);
                }
            } catch (err) {
                console.error("Failed to connect to Meta Graph API:", err);
            }
        }

        // Audit Logging in Firestore
        try {
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
        } catch (dbErr) {
            console.error("Error writing to whatsapp_logs:", dbErr);
        }

        return NextResponse.json({ success: true, apiSent });
    } catch (error: any) {
        console.error("WhatsApp API Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
