"use server";

/**
 * Server Action: Analyze Receipt Image via Gemini API (direct, no Vertex AI)
 * Replaces the broken Vertex AI implementation.
 */
export async function analyzeReceiptAction(formData: FormData): Promise<{
    success: boolean;
    data?: {
        provider?: string;
        providerName?: string;
        rnc?: string;
        rncEmisor?: string;
        rnc_emisor?: string;
        ncf?: string;
        eNcf?: string;
        eNCF?: string;
        encf?: string;
        e_ncf?: string;
        buyerRnc?: string;
        buyerRNC?: string;
        buyer_rnc?: string;
        rncComprador?: string;
        buyerName?: string;
        buyer_name?: string;
        razonSocialComprador?: string;
        status?: string;
        date?: string;
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

        const prompt = `Eres un asistente experto en facturas y recibos de la República Dominicana (incluyendo la modalidad de Facturación Electrónica e-CF de la DGII).
Analiza detalladamente esta imagen de factura o recibo y extrae la información en el formato JSON especificado abajo.

INSTRUCCIONES DE BÚSQUEDA Y EXTRACCIÓN:
1. **Emisor (Proveedor/Vendedor)**:
   - "provider": Nombre comercial, razón social o marca del emisor (proveedor) que vende los bienes/servicios. Suele ser el texto más grande al inicio/cabecera de la factura (ej: "FERRETERIA OCHOA", "CLARO DOMINICANA", "ALTICE", "BRAVO", "FERRETERIA POPULAR").
   - "rnc": RNC (tax ID) del emisor. Es un número de 9 u 11 dígitos, a veces formateado como X-XX-XXXXX-X o XXXXXXXXX. Es casi siempre el primer RNC listado en la cabecera. Si no aparece, usa cadena vacía.

2. **Comprador (Cliente / Adquiriente)**:
   - "buyerName": Razón social o nombre del comprador/cliente. Busca secciones que digan "Cliente", "Adquiriente", "Comprador", "Facturado a". Por defecto, si es un comprobante fiscal para la empresa de este sistema, suele ser "HECHO SRL" o "HECHO, S.R.L.". Si no se lee otro nombre, usa "HECHO SRL".
   - "buyerRnc": RNC del comprador/cliente. Busca secciones que digan "RNC Cliente", "RNC Comprador", "Identificación del Adquiriente". Frecuentemente es "131947532" (RNC de HECHO SRL) o similar. Si no se lee ninguno, usa "131947532" como valor predeterminado si el comprobante indica que es con valor fiscal, sino cadena vacía.

3. **Comprobante Fiscal (e-NCF / NCF)**:
   - "eNcf": Número de Comprobante Fiscal Electrónico (e-NCF). En la facturación electrónica dominicana (e-CF), este número **SIEMPRE empieza con la letra 'E'** seguida de 10 caracteres/dígitos (ej: E310000000001, E3100000001, E3200000005, etc.). Labeled as "NCF", "e-NCF", "Comprobante", "Comprobante Electrónico", "No. Aprobación" o "Secuencia". Si detectas una secuencia que inicia con 'E', extráela AQUÍ y deja "ncf" vacío.
   - "ncf": Número de Comprobante Fiscal tradicional. **SIEMPRE empieza con la letra 'B'** seguida de 10 dígitos (ej: B0100000001, B0200000005). Si detectas una secuencia que inicia con 'B', extráela AQUÍ y deja "eNcf" vacío.

4. **Fecha y Estado**:
   - "date": Fecha de emisión de la factura en formato YYYY-MM-DD (ej: 2026-05-21). Si no aparece, usa la fecha actual o una cadena vacía.
   - "status": Estado de la factura electrónica. Si aparece algún indicador de estado (ej: ACEPTADA, APROBADA, PENDIENTE, VÁLIDA, RECHAZADA), extráelo. Si no se indica explícitamente pero es un e-CF electrónico válido, usa "ACEPTADA".

5. **Líneas de Detalle (items)**:
   - Extrae cada producto o servicio en la lista de items. Si no hay items detallados en la imagen (por ejemplo, es un bauche de tarjeta o un recibo corto), genera un único item con descripción genérica (ej: "Compra de materiales" o "Servicios varios") con la cantidad 1 y el precio unitario igual al total.

6. **Valores Numéricos**:
   - "tax": El ITBIS (impuesto al valor agregado) total. Si está en 0 o no se especifica, usa 0.
   - "total": El monto total pagado/facturado.

Responde ÚNICAMENTE con un objeto JSON válido que siga este formato exacto, sin bloques markdown de tipo \`\`\`json, sin texto adicional:
{
  "provider": "nombre o razón social del emisor",
  "rnc": "RNC del emisor",
  "buyerRnc": "RNC del comprador",
  "buyerName": "nombre o razón social del comprador",
  "ncf": "NCF tradicional (inicia con B)",
  "eNcf": "e-NCF electrónico (inicia con E)",
  "status": "ACEPTADA",
  "date": "YYYY-MM-DD",
  "tax": 0,
  "total": 0,
  "items": [
    {
      "description": "descripción del item",
      "quantity": 1,
      "unitPrice": 0,
      "total": 0
    }
  ]
}`;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
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
                        responseMimeType: "application/json",
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

        // Parse JSON — strip markdown fences if present, extract outermost braces
        let parsed: any = null;
        try {
            const cleaned = rawText
                .replace(/```json\n?/gi, "")
                .replace(/```\n?/g, "")
                .trim();
            
            const firstBrace = cleaned.indexOf('{');
            const lastBrace = cleaned.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1) {
                const jsonContent = cleaned.substring(firstBrace, lastBrace + 1);
                parsed = JSON.parse(jsonContent);
            } else {
                parsed = JSON.parse(cleaned);
            }
        } catch (parseError: any) {
            console.error("JSON parsing of Gemini response failed:", parseError);
            console.error("Raw response text was:", rawText);
            // JSON parse failed — return blank form so user fills manually
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

        // Normalize parsed data for electronic invoicing consistency
        if (parsed) {
            let detectedNcf = (parsed.ncf || "").trim();
            let detectedENcf = (parsed.eNcf || parsed.eNCF || parsed.encf || parsed.e_ncf || "").trim();

            // If traditional NCF starts with 'E', it is actually an electronic NCF (e-NCF)
            if (detectedNcf.toUpperCase().startsWith("E")) {
                detectedENcf = detectedNcf;
                detectedNcf = "";
            }

            parsed.ncf = detectedNcf;
            parsed.eNcf = detectedENcf;
            parsed.eNCF = detectedENcf;

            // Ensure key aliases exist
            parsed.providerName = parsed.providerName || parsed.provider || "";
            parsed.provider = parsed.provider || parsed.providerName || "";
            parsed.rncEmisor = parsed.rnc || parsed.rncEmisor || parsed.rnc_emisor || "";
            parsed.rnc = parsed.rnc || parsed.rncEmisor || parsed.rnc_emisor || "";
            parsed.buyerRnc = parsed.buyerRnc || parsed.buyerRNC || parsed.buyer_rnc || parsed.rncComprador || "";
            parsed.buyerName = parsed.buyerName || parsed.buyer_name || parsed.buyerName || parsed.razonSocialComprador || "";
        }

        return { success: true, data: parsed };

    } catch (error: any) {
        console.error("analyzeReceiptAction error:", error);
        return { success: false, error: error.message || "Error analizando la imagen" };
    }
}
