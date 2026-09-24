import { NextRequest, NextResponse } from "next/server";
import { getGeminiModel } from "@/lib/vertex-client";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { searchInventoryTool } from "@/lib/ai-tools";

export async function POST(req: NextRequest) {
    try {
        const { prompt, context, task, image, imageUrl } = await req.json();

        if (!prompt && !context && !image && !imageUrl) {
            return NextResponse.json({ error: "Missing prompt, image, or content to process" }, { status: 400 });
        }

        const model = await getGeminiModel();

        // Construct a system-like instruction based on the task
        // Vertex AI API (Gemini) takes parts
        let systemInstruction = "Eres un asistente de IA experto en redacción técnica para técnicos de refrigeración y mantenimiento. ";

        if (task === 'refine') {
            systemInstruction += "Tu tarea es tomar el texto proporcionado y reescribirlo de manera profesional. Corrige ortografía y gramática. Devuelve SOLO el texto corregido.";
        } else if (task === 'refine-technician-note') {
            systemInstruction += `Tu tarea es organizar y profesionalizar una nota de servicio técnico dictada por voz por un técnico de campo en República Dominicana.

El texto puede contener:
- Errores de reconocimiento de voz (palabras mal transcritas)
- Lenguaje coloquial o informal
- Terminología técnica de HVAC / refrigeración / mantenimiento eléctrico
- Frases incompletas o desordenadas

INSTRUCCIONES:
1. Corrige los errores de dictado y ortografía manteniendo el significado técnico.
2. Estructura la nota en párrafos claros: diagnóstico, trabajos realizados, materiales usados, observaciones.
3. Usa terminología técnica correcta (ej: "compresor", "condensador", "gas refrigerante R-410A", "presión de succión").
4. Mantén un tono profesional y conciso, como para un informe técnico.
5. Devuelve SOLO el texto organizado, sin explicaciones adicionales.`;

        } else if (task === 'describe-image') {
            systemInstruction += "Tu tarea es analizar la imagen proporcionada y generar una descripción profesional, técnica y concisa de lo que se observa, enfocándote en el estado del equipo/komponente o el trabajo realizado. Devuelve SOLO el texto de la descripción.";
        } else if (task === 'summarize') {
            systemInstruction += "Tu tarea es resumir el siguiente contenido en puntos clave técnicos.";
        } else if (task === 'generate-report') {
            systemInstruction += `Tu tarea es generar un informe técnico completo en JSON basado en los datos de un ticket.
            
            ESTRUCTURA JSON REQUERIDA:
            {
              "sections": [
                { "type": "h2", "content": "Título de Sección" },
                { "type": "text", "content": "Párrafo de texto..." },
                { "type": "list", "items": ["Item 1", "Item 2"] },
                { 
                  "type": "beforeAfter", 
                  "beforePhotoUrl": "url_antes", 
                  "afterPhotoUrl": "url_despues", 
                  "description": "Descripción del cambio"
                },
                { 
                  "type": "photo", 
                  "photoUrl": "url_foto", 
                  "description": "Descripción de la evidencia" 
                },
                 { 
                  "type": "gallery", 
                  "photos": [
                     { "photoUrl": "url1", "description": "desc1" },
                     { "photoUrl": "url2", "description": "desc2" }
                  ]
                }
              ]
            }

            REGLAS:
            1. Analiza el contexto y las DESCRIPCIONES DE FOTOS provistas.
            2. Si identificas dos fotos que parecen ser "Antes" y "Después" (o una secuencia lógica), AGRÚPALAS en una sección "beforeAfter".
            3. Si hay varias fotos generales, úsalas en una sección "gallery" o múltiples "photo".
            4. Genera texto profesional para las secciones de Diagnóstico y Solución.
            5. Si hay "materialsUsed" en el contexto, INCLUYE obligatoriamente una sección de tipo "list" con el título "Materiales y Herramientas".
            6. DEBES devolver SOLO EL JSON VÁLIDO.
            `;
        } else if (task === 'parse-invoice') {
            systemInstruction += `Tu tarea es extraer datos estructurados de una factura (voz o texto). Devuelve JSON válido con clientName e items.`;
        } else if (task === 'parse-ticket') {
            systemInstruction += `Tu tarea es actuar como un asistente inteligente que extrae datos para crear un Ticket de Mantenimiento a partir de texto o un dictado de voz transcrito.
            Debes devolver un JSON con esta estructura exacta:
            {
              "clientName": "Nombre del cliente si se menciona (o vacío)",
              "locationName": "Ubicación general o nombre del residencial si se menciona",
              "locationZone": "Zona geográfica si se menciona (ej. BAVARO, CAP CANA, PUNTA CANA RESORT)",
              "locationStreet": "Calle si se menciona (o vacío)",
              "locationHouseNumber": "Número de casa, villa o apartamento (o vacío)",
              "priority": "LOW, MEDIUM, HIGH o URGENT según la urgencia",
              "description": "Descripción profesional, clara y detallada del problema o tarea, corrigiendo errores de dictado",
              "technicianName": "Nombre del técnico si se asigna (o vacío)"
            }
            Reglas:
            1. Si la urgencia suena grave (fuga, no enfría nada en lugar crítico), usa URGENT o HIGH. Por defecto MEDIUM.
            2. Redacta la descripción de manera formal y coherente, eliminando palabras innecesarias del habla.
            3. Devuelve SOLO JSON válido sin bloques markdown.`;
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
        } else if (task === 'extract-gauge-readings') {
            const refrigerantExpected = typeof context === 'object' && context?.refrigerant ? context.refrigerant : (typeof context === 'string' ? context : "R410A");
            const btuExpected = typeof context === 'object' && context?.btu ? context.btu : "18000";

            systemInstruction += `Tu tarea es actuar como un especialista senior en instrumentación y diagnóstico de climatización (HVAC).
            Analiza cuidadosamente la FOTOGRAFÍA proporcionada, la cual puede contener:
            - Un manómetro analógico o digital de refrigeración (reloj azul de baja presión o reloj rojo de alta).
            - Una pinza amperimétrica (amperímetro digital) midiendo consumo eléctrico.
            - Un termómetro digital (o de contacto) midiendo temperatura de retorno o inyección.
            
            DATOS TÉCNICOS DEL EQUIPO:
            - Refrigerante de la unidad: ${refrigerantExpected}
            - Capacidad: ${btuExpected} BTU

            INSTRUCCIONES DE LECTURA:
            1. Si hay un manómetro:
               - Lee la aguja o display digital en la escala PSI de succión/baja (típicamente entre 50 y 160 PSI para R410A, o 45 y 80 PSI para R22).
               - Extrae el valor numérico en el campo "psiLow". Si no se observa, pon null.
            2. Si hay una pinza amperimétrica / multímetro:
               - Lee los amperios en la pantalla digital (ej. 4.2, 5.8).
               - Extrae el valor numérico en el campo "amp". Si no se observa, pon null.
            3. Si hay termómetros o lecturas de temperatura:
               - Calcula o extrae el salto térmico en °C en "tempDelta". Si no se observa, pon null.
            4. Realiza una breve evaluación diagnóstica en "diagnosis":
               - Evalúa si la presión está en rango normal para ${refrigerantExpected}, o si sugiere falta de gas/fuga (baja presión) o sobrecarga/suciedad (alta presión).
            5. Indica el nivel de certeza en "confidence": "HIGH", "MEDIUM" o "LOW".

            ESTRUCTURA JSON OBLIGATORIA (devuelve ÚNICAMENTE este JSON sin markdown adicional):
            {
              "psiLow": "120",
              "amp": "4.8",
              "tempDelta": null,
              "diagnosis": "Presión de succión en 120 PSI, dentro del rango óptimo para ${refrigerantExpected}.",
              "status": "NORMAL",
              "confidence": "HIGH"
            }
            El campo "status" debe ser uno de: "NORMAL", "LOW_PRESSURE", "HIGH_PRESSURE", "UNCERTAIN".
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

        const finalPrompt = `${systemInstruction}\n\n---\nCONTENIDO:\n"${prompt || context || "Analiza la imagen adjunta"}"\n---`;

        parts.push({ text: finalPrompt });

        let imageBase64 = image;

        // If imageUrl provided, fetch it
        if (imageUrl) {
            try {
                const imgRes = await fetch(imageUrl);
                const arrayBuffer = await imgRes.arrayBuffer();
                imageBase64 = Buffer.from(arrayBuffer).toString('base64');
            } catch (e) {
                console.error("Error fetching image URL:", e);
                // Continue without image or fail? Fail better.
                return NextResponse.json({ error: "Failed to download image from URL" }, { status: 400 });
            }
        }

        if (imageBase64) {
            // Expecting 'image' to be base64 string without data:image/xxx prefix preferably, or strip it
            const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
            parts.push({
                inlineData: {
                    mimeType: "image/jpeg",
                    data: base64Data
                }
            });
        }

        let result;
        let response;
        let text = "";

        if (task === 'generate-quote') {
            const apiKey = process.env.GEMINI_API_KEY;
            const genAIInstance = new GoogleGenerativeAI(apiKey!);
            const modelWithTools = genAIInstance.getGenerativeModel({
                model: 'gemini-2.5-flash',
                generationConfig: {
                    maxOutputTokens: 2048,
                    temperature: 0.3,
                    topP: 0.8,
                },
                tools: [{
                    functionDeclarations: [
                        {
                            name: 'searchInventory',
                            description: 'Busca productos, repuestos, herramientas y materiales reales en el catálogo de inventario por palabras clave (ej: "capacitor", "refrigerante", "compresor"). Devuelve nombre, precio y descripción.',
                            parameters: {
                                type: SchemaType.OBJECT,
                                properties: {
                                    query: {
                                        type: SchemaType.STRING,
                                        description: 'Palabra clave de búsqueda, ej. "capacitor" o "R410A"'
                                    }
                                },
                                required: ['query']
                            }
                        }
                    ]
                }]
            });

            result = await modelWithTools.generateContent({
                contents: [{ role: 'user', parts }]
            });

            response = result.response;
            const functionCalls = response.functionCalls ? response.functionCalls() : undefined;

            if (functionCalls && functionCalls.length > 0) {
                const call = functionCalls[0];
                if (call.name === 'searchInventory') {
                    const args = call.args as { query: string };
                    const toolResult = await searchInventoryTool(args.query);

                    console.log(`[Gemini Route] Suministrando resultados de la herramienta al modelo...`);

                    const secondResult = await modelWithTools.generateContent({
                        contents: [
                            { role: 'user', parts },
                            response.candidates![0].content,
                            {
                                role: 'function',
                                parts: [{
                                    functionResponse: {
                                        name: 'searchInventory',
                                        response: toolResult
                                    }
                                }]
                            }
                        ]
                    });

                    response = secondResult.response;
                }
            }
            text = response.text();
        } else {
            result = await model.generateContent({
                contents: [{ role: 'user', parts }]
            });
            response = result.response;
            text = response.text();
        }

        if (!text) {
            throw new Error("No response generated from Gemini");
        }

        // --- JSON Parsing Logic ---
        if (['generate-report', 'parse-invoice', 'generate-quote', 'parse-ticket', 'extract-gauge-readings'].includes(task)) {
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
