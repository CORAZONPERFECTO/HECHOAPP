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

        const prompt = `Eres un asistente experto en facturas y recibos dominicanos. 
Analiza esta imagen de factura/recibo y extrae la siguiente información en JSON válido.

Responde SOLO con JSON, sin texto adicional, sin markdown, sin backticks. Formato exacto:
{
  "provider": "nombre del proveedor o tienda",
  "rnc": "RNC o cédula del proveedor si aparece, sino cadena vacía",
  "ncf": "número de comprobante fiscal si aparece (ej B0100000001), sino cadena vacía",
  "tax": número con el ITBIS/impuesto en pesos (0 si no aparece),
  "total": número con el total en pesos dominicanos,
  "items": [
    {
      "description": "descripción del producto o servicio",
      "quantity": número,
      "unitPrice": número,
      "total": número
    }
  ]
}

Si no puedes leer algún campo, usa valores vacíos o 0. No inventes datos.`;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
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

        // Parse JSON from response — strip any markdown fences
        let parsed: any = null;
        try {
            const cleaned = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
            parsed = JSON.parse(cleaned);
        } catch {
            // If parsing fails, return empty structure so user can fill manually
            parsed = {
                provider: "",
                rnc: "",
                ncf: "",
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
