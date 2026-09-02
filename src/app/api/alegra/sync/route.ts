import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { getAlegraConfig, createAlegraInvoiceFromQuote, createAlegraEstimateFromQuote } from "@/lib/alegra-service";
import { Quote } from "@/types/finance";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    try {
        const { quoteId, action = "invoice", customEmail, customToken } = await req.json();

        if (!quoteId) {
            return NextResponse.json({ success: false, error: "Se requiere quoteId." }, { status: 400 });
        }

        // 1. Fetch Quote from Firestore
        const quoteRef = doc(db, "quotes", quoteId);
        const quoteSnap = await getDoc(quoteRef);

        if (!quoteSnap.exists()) {
            return NextResponse.json({ success: false, error: "Cotización no encontrada en Firestore." }, { status: 404 });
        }

        const quoteData = { id: quoteSnap.id, ...quoteSnap.data() } as Quote;

        // 2. Obtain Alegra Credentials
        let config = await getAlegraConfig();
        if (customEmail && customToken) {
            config = { email: customEmail, token: customToken };
        }

        if (!config || !config.email || !config.token) {
            return NextResponse.json({
                success: false,
                error: "Credenciales de Alegra no configuradas. Por favor agrega ALEGRA_EMAIL y ALEGRA_TOKEN en las variables de entorno o configuración.",
                requiresConfig: true
            }, { status: 400 });
        }

        // 3. Process with Alegra API
        let result: any;
        if (action === "estimate") {
            result = await createAlegraEstimateFromQuote(config, quoteData);
            await updateDoc(quoteRef, {
                alegraEstimateId: result.id,
                alegraEstimateNumber: result.numberTemplate?.fullNumber || `COT-${result.id}`,
                alegraEstimateUrl: result.url,
                alegraSyncedAt: serverTimestamp(),
            });
        } else {
            result = await createAlegraInvoiceFromQuote(config, quoteData);
            await updateDoc(quoteRef, {
                alegraInvoiceId: result.id,
                alegraInvoiceNumber: result.numberTemplate?.fullNumber || `FAC-${result.id}`,
                alegraInvoiceUrl: result.url,
                alegraSyncedAt: serverTimestamp(),
                status: "CONVERTED",
            });
        }

        return NextResponse.json({
            success: true,
            message: action === "estimate" ? "Cotización sincronizada en Alegra" : "Factura creada exitosamente en Alegra",
            data: result
        });

    } catch (error: any) {
        console.error("Error en /api/alegra/sync:", error);
        return NextResponse.json({
            success: false,
            error: error.message || "Error al conectar con la API de Alegra"
        }, { status: 500 });
    }
}
