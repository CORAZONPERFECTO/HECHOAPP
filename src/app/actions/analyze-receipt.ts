"use server";

/**
 * Server Action: Analyze Receipt Image via Gemini API (direct, no Vertex AI)
 * Replaces the broken Vertex AI implementation.
 */
export async function analyzeReceiptAction(formData: FormData): Promise<{
    success: boolean;
    data?: {
        provider?: string;
        rnc?: string;
        ncf?: string;
        tax?: number;
        total?: number;
        items?: Array<{
            description: string;
            quantity: number;
            unitPrice: number;
            total: number;
        }>;
    };
    error?: string;
}> {
    try {
        const file = formData.get("file") as File | null;
        if (!file) {
            return { success: false, error: "No se proporcionó ningún archivo" };
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return { success: false, error: "GEMINI_API_KEY no configurada en el servidor" };
        }

        // Convert file to base64
        const arrayBuffer = await file.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        const mimeType = file.type || "image/jpeg";

        const prompt = `Eres un asistente experto en facturas y recibos dominicanos.
Analiza esta imagen de factura/recibo y extrae la información. 
Responde SOLO con JSON válido, sin markdown, sin backticks, sin texto extra:
{
  "provider": "nombre del proveedor o tienda",
  "rnc": "RNC o cédula si aparece, cadena vacía si no",
  "ncf": "número de comprobante fiscal (ej B0100000001), cadena vacía si no aparece",
  "tax": 0,
  "total": 0,
  "items": [
    {
      "description": "descripción del producto",
      "quantity": 1,
      "unitPrice": 0,
      "total": 0
    }
  ]
}
Si no puedes leer algo con claridad, usa string vacío o 0. No inventes datos.`;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            {
                                inlineData: {
                                    mimeType,
                                    data: base64
                                }
                            },
                            { text: prompt }
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
            console.error("Gemini API error:", errText);
            return { success: false, error: `Error Gemini API: ${response.status}` };
        }

        const geminiData = await response.json();
        const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";

        // Parse JSON — strip markdown fences if present
        let parsed: any = null;
        try {
            const cleaned = rawText
                .replace(/```json\n?/gi, "")
                .replace(/```\n?/g, "")
                .trim();
            parsed = JSON.parse(cleaned);
        } catch {
            // JSON parse failed — return blank form so user fills manually
            parsed = {
                provider: "",
                rnc: "",
                ncf: "",
                tax: 0,
                total: 0,
                items: [{ description: "Item de compra", quantity: 1, unitPrice: 0, total: 0 }]
            };
        }

        return { success: true, data: parsed };

    } catch (error: any) {
        console.error("analyzeReceiptAction error:", error);
        return { success: false, error: error.message || "Error analizando la imagen" };
    }
}
