const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const envPath = path.resolve(process.cwd(), '.env.local');
const env = {};

if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split(/\r?\n/).forEach(line => {
        if (line.trim().startsWith('#') || !line.includes('=')) return;
        const firstEq = line.indexOf('=');
        const key = line.substring(0, firstEq).trim();
        let value = line.substring(firstEq + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        env[key] = value;
    });
}

const apiKey = env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("API Key not found.");
    process.exit(1);
}
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

async function test() {
    const prompt = `Mañana hay que ir a Cap Cana a la villa 15 a arreglar una fuga urgente, que vaya Juan`;
    const systemInstruction = `Tu tarea es actuar como un asistente inteligente que extrae datos para crear un Ticket de Mantenimiento a partir de texto o un dictado de voz transcrito.
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

    const finalPrompt = `${systemInstruction}\n\n---\nCONTENIDO:\n"${prompt}"\n---`;

    try {
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: finalPrompt }] }]
        });
        const responseText = result.response.text();
        console.log("RAW RESPONSE:", responseText);

        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : responseText;
        const cleanText = jsonString.replace(/```json/g, '').replace(/```/g, '').trim();
        const jsonResponse = JSON.parse(cleanText);
        console.log("✅ PARSED SUCCESS:", jsonResponse);
    } catch (e) {
        console.error("❌ TEST FAILED:", e);
    }
}

test();
