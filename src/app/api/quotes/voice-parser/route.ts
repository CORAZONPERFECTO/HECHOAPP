import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";
export const maxDuration = 30;

// Helper: Fallback parser in case AI quota or rate limits spike
function fallbackRuleBasedParser(transcript: string, currencyPreference: string = "DOP") {
    const text = transcript || "";
    
    // Extract client name if pattern like "para Hotel Viva Maya:" or "para Juan Perez"
    let clientName = "Cliente General";
    const clientMatch = text.match(/para\s+([A-Za-z0-9\sÁÉÍÓÚáéíóúñÑ]+?)(?::|,|\.|y\s|\d)/i);
    if (clientMatch && clientMatch[1]) {
        clientName = clientMatch[1].trim();
    }

    // Split items by " y " or "," or ";"
    const items: Array<{ description: string; qty: number; rate: number; amount: number; uom: string }> = [];
    
    // Find price patterns like "4,500" or "4500" or "3800 pesos"
    const sentences = text.split(/(?:,|\sy\s|\.\s)/i);
    for (const s of sentences) {
        const trimmed = s.trim();
        if (!trimmed) continue;
        
        const priceMatch = trimmed.match(/(\d{1,3}(?:,\d{3})*|\d+)(?:\s*(?:pesos|dop|rd\$|\$|usd))?/i);
        const rate = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '')) : 2500;
        
        // Clean description
        let desc = trimmed
            .replace(/para\s+([A-Za-z0-9\sÁÉÍÓÚáéíóúñÑ]+?):/i, '')
            .replace(/(\d{1,3}(?:,\d{3})*|\d+)(?:\s*(?:pesos|dop|rd\$|\$|usd))?/ig, '')
            .replace(/^(y|e|\:|\-)\s*/i, '')
            .trim();
        
        if (desc.length > 3 && rate > 0) {
            items.push({
                description: desc.charAt(0).toUpperCase() + desc.slice(1),
                qty: 1,
                rate: rate,
                amount: rate,
                uom: "Servicio"
            });
        }
    }

    if (items.length === 0) {
        items.push({
            description: text.slice(0, 80) || "Servicio técnico y mantenimiento especializado",
            qty: 1,
            rate: 3500,
            amount: 3500,
            uom: "Servicio"
        });
    }

    const net_total = items.reduce((sum, item) => sum + item.amount, 0);
    const total_taxes_and_charges = Math.round(net_total * 0.18 * 100) / 100;
    const grand_total = net_total + total_taxes_and_charges;

    return {
        clientName,
        clientRnc: "",
        currency: currencyPreference || "DOP",
        items,
        net_total,
        total_taxes_and_charges,
        grand_total,
        terms: "Validez de la oferta: 15 días. Forma de pago: 100% al confirmar. Garantía de 30 días en mano de obra.",
        notes: "Servicios ejecutados por técnicos especializados de HECHO SRL."
    };
}

export async function POST(req: NextRequest) {
    try {
        const { transcript, image, currencyPreference } = await req.json();

        if (!transcript && !image) {
            return NextResponse.json({ success: false, error: "Se requiere un texto dictado o una imagen." }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            // If no API key configured, use fallback parser
            const fallbackResult = fallbackRuleBasedParser(transcript, currencyPreference);
            return NextResponse.json({ success: true, data: fallbackResult, isFallback: true });
        }

        const genAI = new GoogleGenerativeAI(apiKey);

        const prompt = `Eres un asistente experto de ventas y cotizaciones para HECHO SRL, una prestigiosa empresa de ingeniería de climatización (HVAC), refrigeración y proyectos de mantenimiento en República Dominicana.
Tu tarea es analizar el dictado por voz o la instrucción en lenguaje natural del usuario (y/o la imagen adjunta de un equipo) y generar una PROPUESTA / COTIZACIÓN FORMAL ESTRUCTURADA en formato JSON.

INSTRUCCIONES CLAVE DE COTIZACIÓN EN REPÚBLICA DOMINICANA:
1. **Cliente / Prospecto**:
   - Si se menciona un cliente, condominio, hotel, villa o persona (ej. "Hotel Viva Maya", "Condominio Las Olas", "Villa 42", "Juan Perez"), extrae su nombre en "clientName".
   - Si no se menciona cliente explícito, usa "Cliente General" o una cadena vacía.

2. **Moneda**:
   - Predeterminada: "DOP" (Pesos Dominicanos), a menos que el usuario mencione explícitamente "dólares" o "USD", en cuyo caso usa "USD".

3. **Desglose de Ítems (Productos y Servicios)**:
   - Extrae cada item con descripción técnica clara y profesional (ej: "Mantenimiento preventivo de aire acondicionado Split 18,000 BTU", "Suministro e instalación de Capacitor de arranque 45uF", "Recarga de gas refrigerante R-410A").
   - Identifica cantidad ("qty"), precio unitario ("rate") y calcula el subtotal de la línea ("amount" = qty * rate).
   - "uom": Unidad de medida (ej: "Unidad", "Servicio", "Global", "Libra", "Pie", "Metro").
   - Si el usuario no especificó precios para algún ítem, estima un precio realista en el mercado de República Dominicana (ej. Mantenimiento Split: 2,500 - 3,500 DOP; Capacitor: 1,800 - 2,500 DOP; Gas R410: 3,500 - 5,000 DOP; Tarjeta universal: 4,500 - 8,000 DOP; Instalación nueva: 5,000 - 9,000 DOP).

4. **Impuestos (ITBIS) y Totales**:
   - "net_total": Suma de todos los (qty * rate) sin impuestos.
   - "total_taxes_and_charges": ITBIS del 18% sobre los servicios/repuestos gravados (net_total * 0.18).
   - "grand_total": net_total + total_taxes_and_charges.

5. **Términos Comerciales y Notas**:
   - "terms": Plazos y condiciones (ej: "Validez de la oferta: 15 días. Forma de pago: 100% al confirmar. Garantía de 30 días en mano de obra.").
   - "notes": Observaciones técnicas pertinentes, alcance del trabajo o recomendaciones preventivas.

6. **Formato de Respuesta**:
   - Responde ÚNICAMENTE con el objeto JSON estructurado que siga este esquema exacto, sin formato markdown:

{
  "clientName": "Nombre del cliente o proyecto",
  "clientRnc": "",
  "currency": "DOP",
  "items": [
    {
      "description": "Descripción profesional del servicio o material",
      "qty": 1,
      "rate": 2500,
      "amount": 2500,
      "uom": "Servicio"
    }
  ],
  "net_total": 2500,
  "total_taxes_and_charges": 450,
  "grand_total": 2950,
  "terms": "Validez de la oferta: 15 días. Forma de pago: 100% al confirmar. Garantía de 30 días en mano de obra.",
  "notes": "Incluye mano de obra calificada, revisión de presiones y termometría."
}`;

        const parts: any[] = [{ text: prompt }];

        if (transcript) {
            parts.push({ text: `DICTADO / SOLICITUD DEL USUARIO:\n"${transcript}"` });
        }

        if (currencyPreference) {
            parts.push({ text: `PREFERENCIA DE MONEDA: ${currencyPreference}` });
        }

        if (image) {
            const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
            parts.push({
                inlineData: {
                    mimeType: "image/jpeg",
                    data: base64Data
                }
            });
        }

        // List of currently supported active models for Gemini API
        const CANDIDATE_MODELS = [
            "gemini-3.5-flash-lite",
            "gemini-flash-lite-latest",
            "gemini-3-flash-preview",
            "gemini-2.5-flash",
            "gemini-3.6-flash",
            "gemini-3.5-flash",
            "gemini-flash-latest"
        ];
        
        let responseText = "";
        let lastError: any = null;

        for (const modelName of CANDIDATE_MODELS) {
            try {
                console.log(`[Voice Quote Parser] Intentando con modelo: ${modelName}`);
                const model = genAI.getGenerativeModel({
                    model: modelName,
                    generationConfig: {
                        temperature: 0.2,
                        maxOutputTokens: 2048,
                        responseMimeType: "application/json"
                    }
                });

                const result = await model.generateContent({ contents: [{ role: "user", parts }] });
                responseText = result.response.text();
                if (responseText) {
                    console.log(`[Voice Quote Parser] Éxito con modelo ${modelName}`);
                    break;
                }
            } catch (modelErr: any) {
                console.warn(`[Voice Quote Parser] Falló modelo ${modelName}:`, modelErr.message);
                lastError = modelErr;
                // Wait 400ms before falling back to the next model
                await new Promise((resolve) => setTimeout(resolve, 400));
            }
        }

        if (!responseText) {
            console.warn("[Voice Quote Parser] Modelos remotos no disponibles. Usando motor estructurador de respaldo.");
            const fallbackData = fallbackRuleBasedParser(transcript, currencyPreference);
            return NextResponse.json({
                success: true,
                data: fallbackData,
                isFallback: true
            });
        }

        // Clean any markdown formatting if present
        let cleanJson = responseText.trim();
        if (cleanJson.startsWith("```json")) {
            cleanJson = cleanJson.replace(/^```json\s*/, "").replace(/\s*```$/, "");
        } else if (cleanJson.startsWith("```")) {
            cleanJson = cleanJson.replace(/^```\s*/, "").replace(/\s*```$/, "");
        }

        const parsedData = JSON.parse(cleanJson);

        // Sanitize numbers and calculate totals to guarantee consistency
        let netTotal = 0;
        const sanitizedItems = (parsedData.items || []).map((item: any) => {
            const qty = Number(item.qty) || 1;
            const rate = Number(item.rate) || 0;
            const amount = Number(item.amount) || qty * rate;
            netTotal += amount;
            return {
                description: String(item.description || "Servicio Técnico").trim(),
                qty,
                rate,
                amount,
                uom: String(item.uom || "Servicio").trim()
            };
        });

        const taxTotal = Math.round(netTotal * 0.18 * 100) / 100;
        const grandTotal = netTotal + taxTotal;

        const structuredQuote = {
            clientName: parsedData.clientName || "Cliente General",
            clientRnc: parsedData.clientRnc || "",
            currency: parsedData.currency || currencyPreference || "DOP",
            items: sanitizedItems,
            net_total: netTotal,
            total_taxes_and_charges: taxTotal,
            grand_total: grandTotal,
            terms: parsedData.terms || "Validez de la oferta: 15 días. Forma de pago: 100% al confirmar. Garantía de 30 días en mano de obra.",
            notes: parsedData.notes || "Servicios ejecutados por técnicos especializados con garantía de calidad."
        };

        return NextResponse.json({
            success: true,
            data: structuredQuote
        });

    } catch (error: any) {
        console.error("[Voice Quote Parser] Error general:", error);
        return NextResponse.json({
            success: false,
            error: error.message || "Error al procesar la cotización por voz."
        }, { status: 500 });
    }
}
