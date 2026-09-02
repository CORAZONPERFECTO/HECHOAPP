import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
    try {
        const { transcript, image, currencyPreference } = await req.json();

        if (!transcript && !image) {
            return NextResponse.json({ success: false, error: "Se requiere un texto dictado o una imagen." }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ success: false, error: "GEMINI_API_KEY no está configurada en las variables de entorno." }, { status: 500 });
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
   - "terms": Plazos y condiciones (ej: "Validez de la oferta: 15 días. Forma de pago: 50% anticipo al aprobar y 50% contra entrega. Garantía de 30 días en mano de obra.").
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
  "terms": "Oferta válida por 15 días. 50% de anticipo y 50% contra entrega.",
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

        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 2048,
                responseMimeType: "application/json"
            }
        });

        const result = await model.generateContent({ contents: [{ role: "user", parts }] });
        const responseText = result.response.text();

        let parsedData: any = null;
        try {
            const cleaned = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
            parsedData = JSON.parse(cleaned);
        } catch (parseErr) {
            console.error("Error parseando respuesta de Gemini en voice-quote:", parseErr, responseText);
            const firstBrace = responseText.indexOf("{");
            const lastBrace = responseText.lastIndexOf("}");
            if (firstBrace !== -1 && lastBrace !== -1) {
                parsedData = JSON.parse(responseText.substring(firstBrace, lastBrace + 1));
            } else {
                throw new Error("La IA no devolvió un JSON estructurado válido.");
            }
        }

        // Normalizar y asegurar cálculos matemáticos consistentes
        if (parsedData && Array.isArray(parsedData.items)) {
            let calculatedNet = 0;
            parsedData.items = parsedData.items.map((item: any) => {
                const qty = Number(item.qty) || 1;
                const rate = Number(item.rate) || 0;
                const amount = Number((qty * rate).toFixed(2));
                calculatedNet += amount;
                return {
                    description: item.description || "Servicio técnico",
                    qty,
                    rate,
                    amount,
                    uom: item.uom || "Unidad"
                };
            });

            parsedData.net_total = Number(calculatedNet.toFixed(2));
            parsedData.total_taxes_and_charges = Number((calculatedNet * 0.18).toFixed(2));
            parsedData.grand_total = Number((parsedData.net_total + parsedData.total_taxes_and_charges).toFixed(2));
            parsedData.currency = parsedData.currency || "DOP";
            parsedData.clientName = parsedData.clientName || "Cliente General";
            parsedData.terms = parsedData.terms || "Oferta válida por 15 días. 50% de anticipo y 50% contra entrega.";
            parsedData.notes = parsedData.notes || "Servicio garantizado por HECHO SRL.";
        }

        return NextResponse.json({ success: true, data: parsedData });

    } catch (error: any) {
        console.error("Error en endpoint /api/quotes/voice-parser:", error);
        return NextResponse.json({ success: false, error: error.message || "Error al procesar la cotización por voz." }, { status: 500 });
    }
}
