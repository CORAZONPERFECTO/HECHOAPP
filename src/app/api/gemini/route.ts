import { NextRequest, NextResponse } from "next/server";
import { getGeminiModel } from "@/lib/vertex-client";

export async function POST(req: NextRequest) {
    try {
        const { prompt, context, task } = await req.json();

        if (!prompt && !context) {
            return NextResponse.json({ error: "Missing prompt or content to process" }, { status: 400 });
        }

        const model = await getGeminiModel();

        // Construct a system-like instruction based on the task
        // Vertex AI API (Gemini) takes parts
        let systemInstruction = "Eres un asistente de IA experto en redacción técnica para técnicos de refrigeración y mantenimiento. ";

        if (task === 'refine') {
            systemInstruction += "Tu tarea es tomar el texto proporcionado (que puede ser dictado por voz, desordenado o informal) y reescribirlo de manera profesional, clara y técnica. Corrige ortografía, gramática y mejora la estructura. Mantén el significado original intacto. NO agregues información inventada. Devuelve SOLO el texto corregido.";
        } else if (task === 'summarize') {
            systemInstruction += "Tu tarea es resumir el siguiente contenido en puntos clave técnicos.";
        } else if (task === 'generate-report') {
            systemInstruction += `Tu tarea es generar un informe técnico completo y estructurado en formato JSON basado en los datos de un ticket de servicio.
            El JSON debe tener la siguiente estructura de 'secciones' (sections array).
            Tipos de secciones permitidos:
            - TitleSection: { id: string, type: 'h2', content: string }
            - TextSection: { id: string, type: 'text', content: string }
            - ListSection: { id: string, type: 'list', items: string[] }
            - RecommendationSection: { id: string, type: 'text', content: string } (Usa type 'text' pero enfocado en recomendación)

            Estructura esperada del JSON de respuesta:
            {
              "sections": [
                 { "type": "h2", "content": "Título de Sección" },
                 { "type": "text", "content": "Contenido detallado..." }
              ]
            }

            Reglas:
            1. Analiza la descripción, diagnóstico, solución y notas del ticket.
            2. Genera un lenguaje técnico, profesional y pulido.
            3. Crea secciones lógicas: "Antecedentes / Falla Reportada", "Diagnóstico Técnico", "Trabajo Realizado", "Recomendaciones".
            4. Si falta información, infiérela del contexto OBVIO o sé breve, pero NO inventes datos críticos como mediciones no dadas.
            5. DEBES devolver SOLO EL JSON VÁLIDO, sin bloques de código markdown.
            `;
        } else if (task === 'parse-invoice') {
            systemInstruction += `Tu tarea es extraer datos estructurados de una factura a partir de un comando de voz natural.
            Devuelve un JSON con:
            - clientName: string (nombre del cliente si se menciona, trata de coincidir con el contexto si es posible o usa el nombre tal cual)
            - items: array de objetos { quantity: number, description: string, unitPrice: number }

            Contexto de Clientes Disponibles (si se provee):
            ${context || "No hay lista de clientes disponible."}

            Reglas:
            1. Si el usuario dice "Factura a Juan...", el cliente es "Juan".
            2. Si dice "2 aires acondicionados a 5000", quantity=2, description="aires acondicionados", unitPrice=5000.
            3. Si no se menciona precio, ponlo en 0.
            4. Si no se menciona cantidad, asume 1.
            5. Solo devuelve JSON válido.
            `;
        } else if (task === 'generate-quote') {
            systemInstruction += `Tu tarea es actuar como un experto cotizador.
            El usuario te pedirá una cotización en lenguaje natural (ej: "Cotiza 3 aires de 12000 BTU a 25000 cada uno").
            
            Debes extraer la información y devolver un JSON con esta estructura:
            {
              "items": [
                { "description": "Aire Acondicionado 12000 BTU", "quantity": 3, "unitPrice": 25000, "total": 75000 }
              ],
              "total": 75000,
              "notes": "Incluye instalación básica." (Cualquier nota adicional inferida o relevante)
            }

            Reglas:
            1. Si no se menciona precio, estima uno realista de mercado en Pesos Dominicanos (DOP) o pon 0 si no estás seguro.
            2. Si la descripción es vaga, complétala profesionalmente (ej: "Mantenimiento" -> "Mantenimiento Preventivo de Aire Acondicionado").
            3. Calcula los totales correctamente (cantidad * precio).
            4. Devuelve SOLO JSON válido.
            `;
        } else {
            // Default generic helper
            systemInstruction += "Responde de manera útil, concisa y profesional.";
        }

        // Combine instructions for the prompt (Gemini 1.5 style)
        const fullPrompt = `${systemInstruction}\n\n---\nCONTENIDO ORIGINAL:\n"${prompt || context}"\n---\n\nRESPUESTA (JSON si aplica):`;

        const result = await model.generateContent(fullPrompt);
        const response = result.response;
        let text = response.candidates?.[0].content.parts[0].text;

        if (!text) {
            throw new Error("No response generated from Gemini");
        }

        // Clean markdown code blocks if present (Gemini loves ```json ... ```)
        text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        if (task === 'generate-report') {
            // Validate JSON
            try {
                // Return parsed object to ensure valid JSON client-side or just string?
                // Returning object is safer so client doesn't have to parse string again
                const jsonResponse = JSON.parse(text);
                return NextResponse.json({ output: jsonResponse });
            } catch (e) {
                console.error("Failed to parse Gemini JSON:", text);
                return NextResponse.json({ error: "La IA generó un formato inválido. Intenta de nuevo.", raw: text }, { status: 500 });
            }
        }

        if (task === 'parse-invoice') {
            try {
                const jsonResponse = JSON.parse(text);
                return NextResponse.json({ output: jsonResponse });
            } catch (e) {
                console.error("Failed to parse Gemini Invoice JSON:", text);
                return NextResponse.json({ error: "Error al interpretar la factura.", raw: text }, { status: 500 });
            }
        }

        if (task === 'generate-quote') {
            try {
                // Sanitize text: remove markdown code blocks if present
                const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
                const jsonResponse = JSON.parse(cleanText);
                return NextResponse.json({ output: jsonResponse });
            } catch (e) {
                console.error("Failed to parse Gemini Quote JSON:", text, e);
                // Fallback: try to return text if JSON fails, or error
                return NextResponse.json({ error: "La IA no generó un formato válido. Intenta de nuevo.", raw: text }, { status: 500 });
            }
        }

        return NextResponse.json({ output: text.trim() });

    } catch (error: any) {
        console.error("Gemini API Error:", error);

        // Return a safe error message
        const errorMessage = error.message?.includes("Missing Google Cloud credentials")
            ? "Faltan credenciales de Google Cloud en el servidor."
            : "Error al procesar con IA.";

        return NextResponse.json({ error: errorMessage, details: error.message }, { status: 500 });
    }
}
