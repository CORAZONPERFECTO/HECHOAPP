import { NextRequest, NextResponse } from "next/server";
import { getGeminiModel } from "@/lib/vertex-client";

export async function POST(req: NextRequest) {
    try {
        const { prompt, context, task, image } = await req.json();

        if (!prompt && !context && !image) {
            return NextResponse.json({ error: "Missing prompt, image, or content to process" }, { status: 400 });
        }

        const model = await getGeminiModel();

        // Construct a system-like instruction based on the task
        // Vertex AI API (Gemini) takes parts
        let systemInstruction = "Eres un asistente de IA experto en redacción técnica para técnicos de refrigeración y mantenimiento. ";

        if (task === 'refine') {
            systemInstruction += "Tu tarea es tomar el texto proporcionado y reescribirlo de manera profesional. Corrige ortografía y gramática. Devuelve SOLO el texto corregido.";
        } else if (task === 'summarize') {
            systemInstruction += "Tu tarea es resumir el siguiente contenido en puntos clave técnicos.";
        } else if (task === 'generate-report') {
            systemInstruction += `Tu tarea es generar un informe técnico completo en JSON basado en los datos de un ticket.
            ... (mismas reglas de reporte) ...
            DEBES devolver SOLO EL JSON VÁLIDO.
            `;
        } else if (task === 'parse-invoice') {
            systemInstruction += `Tu tarea es extraer datos estructurados de una factura (voz o texto). Devuelve JSON válido con clientName e items.`;
        } else if (task === 'generate-quote') {
            systemInstruction += `Tu tarea es actuar como un experto cotizador de HVAC (Refrigeración).
            El usuario te pedirá una cotización en lenguaje natural o te mostrará una IMAGEN de un equipo dañado.
            
            SI HAY IMAGEN:
            1. Analiza visualmente el tipo de equipo (Split, Central, Nevera, etc.).
            2. Identifica posibles daños visibles (óxido, quemaduras, suciedad extrema).
            3. Si el usuario no dio detalles, usa la imagen para sugerir una reparación lógica.

            Debes devolver un JSON con esta estructura exacta:
            {
              "items": [
                { "description": "Descripción clara del item", "quantity": 1, "unitPrice": 0, "total": 0 }
              ],
              "total": 0,
              "notes": "Notas técnicas relevantes u observaciones de la imagen."
            }

            Reglas de Precios (Estimados en DOP):
            - Mantenimiento: 2,500 - 4,500
            - Capacitor: 1,800 - 2,800
            - Contactor: 1,500 - 2,500
            - Motor Ventilador: 4,000 - 7,500
            - Compresor: 15,000+ (Variar según capacidad estimada)
            - Gas Refrigerante: 3,500 - 6,000

            Reglas Generales:
            1. Sé realista con los precios.
            2. Devuelve SOLO JSON válido.
            `;
        } else {
            systemInstruction += "Responde de manera útil, concisa y profesional.";
        }

        // Construct the parts
        const parts: any[] = [];

        // Add System Instruction as text first (Gemini 1.5/2.0 often favors this as part of user prompt or system instruction param)
        // Since we are using the 'parts' array for the user message, let's prepend the system context there if not supported directly in lib yet, 
        // BUT vertex-client might support systemInstruction. 
        // For safety/flexibility with multimodal, let's combine text.

        let finalPrompt = `${systemInstruction}\n\n---\nCONTENIDO:\n"${prompt || context || "Analiza la imagen adjunta"}"\n---`;

        parts.push({ text: finalPrompt });

        if (image) {
            // Expecting 'image' to be base64 string without data:image/xxx prefix preferably, or strip it
            const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
            parts.push({
                inlineData: {
                    mimeType: "image/jpeg",
                    data: base64Data
                }
            });
        }

        const result = await model.generateContent({
            contents: [{ role: 'user', parts }]
        });

        const response = result.response;
        let text = response.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            throw new Error("No response generated from Gemini");
        }

        // --- JSON Parsing Logic ---
        if (['generate-report', 'parse-invoice', 'generate-quote'].includes(task)) {
            try {
                // Robust JSON extraction
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                const jsonString = jsonMatch ? jsonMatch[0] : text;
                const cleanText = jsonString.replace(/```json/g, '').replace(/```/g, '').trim();
                const jsonResponse = JSON.parse(cleanText);
                return NextResponse.json({ output: jsonResponse });
            } catch (e) {
                console.error(`Failed to parse Gemini JSON for task ${task}:`, text);
                return NextResponse.json({ error: "La IA no generó un formato válido.", raw: text }, { status: 500 });
            }
        }

        return NextResponse.json({ output: text.trim() });

    } catch (error: any) {
        console.error("Gemini API Error:", error);
        return NextResponse.json({ error: error.message || "Error interno del servidor" }, { status: 500 });
    }
}
