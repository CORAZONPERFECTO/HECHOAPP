import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
        }

        // Convert to base64
        const arrayBuffer = await file.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        const mimeType = file.type || "image/jpeg";

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ success: false, error: "GEMINI_API_KEY not configured" }, { status: 500 });
        }

        const prompt = `Eres un asistente experto en facturas y recibos dominicanos (incluyendo Facturación Electrónica e-CF).
Analiza esta imagen de factura/recibo y extrae la información en JSON válido.
Responde SOLO con JSON, sin texto adicional, sin markdown, sin backticks. Formato exacto:
{
  "provider": "nombre o razón social del emisor (proveedor)",
  "rnc": "RNC o cédula del emisor (proveedor), cadena vacía si no aparece",
  "buyerRnc": "RNC o cédula del comprador (HECHO SRL, ej. 1-31-24604-5 o similar), cadena vacía si no aparece",
  "buyerName": "nombre o razón social del comprador (ej. HECHO SRL), cadena vacía si no aparece",
  "ncf": "número de comprobante fiscal tradicional (ej. B0100000001) si no es electrónico, sino cadena vacía",
  "eNcf": "número de comprobante fiscal electrónico (e-NCF, ej. E3100000001) si aparece, sino cadena vacía",
  "status": "estado de la factura electrónica si aparece (ej. ACEPTADA, RECHAZADA, PENDIENTE, VÁLIDA), sino 'ACEPTADA'",
  "date": "fecha de emisión de la factura en formato YYYY-MM-DD si aparece, sino cadena vacía",
  "tax": 0,
  "total": 0,
  "items": [
    {
      "description": "descripción del producto o servicio",
      "quantity": 1,
      "unitPrice": 0,
      "total": 0
    }
  ]
}
Si no puedes leer algún campo, usa valores vacíos o 0. No inventes datos.`;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: prompt },
                            {
                                inlineData: {
                                    mimeType,
                                    data: base64
                                }
                            }
                        ]
                    }],
                    generationConfig: {
                        temperature: 0.1,
                        maxOutputTokens: 1024,
                        responseMimeType: "application/json",
                    }
                })
            }
        );

        if (!response.ok) {
            const errText = await response.text();
            console.error("Gemini error:", errText);
            return NextResponse.json({ success: false, error: `Gemini API error: ${response.status}` }, { status: 500 });
        }

        const geminiData = await response.json();
        const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";

        // Parse JSON from response — strip any markdown fences, extract outermost braces
        let parsed: any = null;
        try {
            const cleaned = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
            const firstBrace = cleaned.indexOf('{');
            const lastBrace = cleaned.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1) {
                const jsonContent = cleaned.substring(firstBrace, lastBrace + 1);
                parsed = JSON.parse(jsonContent);
            } else {
                parsed = JSON.parse(cleaned);
            }
        } catch (parseError: any) {
            console.error("JSON parsing of Gemini response failed in API route:", parseError);
            console.error("Raw response text was:", rawText);
            // If parsing fails, return empty structure so user can fill manually
            parsed = {
                provider: "",
                rnc: "",
                buyerRnc: "",
                buyerName: "",
                ncf: "",
                eNcf: "",
                status: "ACEPTADA",
                date: "",
                tax: 0,
                total: 0,
                items: [{ description: "Item de compra", quantity: 1, unitPrice: 0, total: 0 }]
            };
        }

        return NextResponse.json({ success: true, data: parsed });

    } catch (error: any) {
        console.error("analyze-receipt error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
