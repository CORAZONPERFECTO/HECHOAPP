import { NextRequest, NextResponse } from "next/server";
import { VertexAI } from "@google-cloud/vertexai";

// Initialize Vertex AI
// Note: Requires GCP_PROJECT_ID and GCP_PRIVATE_KEY in .env.local
const projectId = process.env.GCP_PROJECT_ID;
const location = "us-central1"; // or your preferred region

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const brand = formData.get("brand") as string;
        const model = formData.get("model") as string || "General";
        const photos = formData.getAll("photos") as File[]; // Expecting files

        if (!photos || photos.length === 0) {
            return NextResponse.json({ error: "No photos provided" }, { status: 400 });
        }

        // Initialize Vertex AI Client (only if we have server-side credentials)
        // For local dev without ADC, we might need a custom auth client, 
        // but VertexAI SDK usually expects ADC or specific options.
        // Assuming environment is set up or we can pass credentials.

        // Quick check for keys
        if (!process.env.GCP_PROJECT_ID || !process.env.GCP_CLIENT_EMAIL || !process.env.GCP_PRIVATE_KEY) {
            console.error("Missing GCP Credentials");
            return NextResponse.json({ error: "Server configuration error: Missing GCP Credentials" }, { status: 500 });
        }

        const vertex_ai = new VertexAI({
            project: projectId,
            location: location,
            googleAuthOptions: {
                credentials: {
                    client_email: process.env.GCP_CLIENT_EMAIL,
                    private_key: process.env.GCP_PRIVATE_KEY.replace(/\\n/g, '\n'),
                }
            }
        });

        const modelId = "gemini-pro-vision"; // Or gemini-1.5-flash which is faster/cheaper for this
        const generativeModel = vertex_ai.getGenerativeModel({ model: "gemini-1.5-flash-001" });

        const parts: any[] = [];

        // Add prompt
        parts.push({
            text: `Analyze these images of Air Conditioner error code tables.
            Brand: ${brand}
            Model: ${model}

            Extract all error codes and return a JSON array with this structure:
            [
              {
                "codigo": "E1",
                "nombre_error": "Communication Error",
                "descripcion": "Details about the error...",
                "causa": "Probable cause...",
                "solucion": "Recommended solution..."
              }
            ]

            Important:
            1. Transcribe codes exactly as seen.
            2. Translate descriptions and solutions to Technical Spanish (Español Neutro).
            3. If a column is missing (e.g. solution), try to infer it from standard AC knowledge or leave empty.
            4. Return ONLY the valid JSON array, no markdown blocks.`
        });

        // Add images
        for (const photo of photos) {
            const buffer = Buffer.from(await photo.arrayBuffer());
            const base64 = buffer.toString("base64");
            parts.push({
                inlineData: {
                    mimeType: photo.type,
                    data: base64
                }
            });
        }

        const result = await generativeModel.generateContent({
            contents: [{ role: "user", parts: parts }],
        });

        const response = result.response;
        const text = response.candidates?.[0].content.parts[0].text;

        // Parse JSON
        let extractedErrors = [];
        try {
            const cleanText = text?.replace(/```json/g, "").replace(/```/g, "").trim() || "[]";
            extractedErrors = JSON.parse(cleanText);
        } catch (e) {
            console.error("JSON Parse Error", e, text);
            return NextResponse.json({ error: "Failed to parse AI response", raw: text }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            data: extractedErrors,
            raw: text
        });

    } catch (error: any) {
        console.error("API Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
