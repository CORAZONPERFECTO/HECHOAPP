import { VertexAI } from '@google-cloud/vertexai';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { prompt, systemInstruction } = await req.json();

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        const projectId = process.env.GCP_PROJECT_ID;
        const clientEmail = process.env.GCP_CLIENT_EMAIL;
        const privateKey = process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, '\n');
        const location = process.env.GCP_LOCATION || 'us-central1';

        if (!projectId || !clientEmail || !privateKey) {
            console.error("Missing GCP credentials in environment variables");
            return NextResponse.json({ error: 'Server configuration error: Missing Credentials' }, { status: 500 });
        }

        // Initialize Vertex AI with explicit credentials
        const vertexAI = new VertexAI({
            project: projectId,
            location: location,
            googleAuthOptions: {
                credentials: {
                    client_email: clientEmail,
                    private_key: privateKey,
                }
            }
        });

        // Use Gemini 2.0 Flash (Experimental) as it is the only active model for this project
        const model = 'gemini-2.0-flash-exp';

        const generativeModel = vertexAI.getGenerativeModel({
            model: model,
            systemInstruction: systemInstruction ? { role: 'system', parts: [{ text: systemInstruction }] } : undefined,
            generationConfig: {
                maxOutputTokens: 2048,
                temperature: 0.2, // Lower temperature for more deterministic/structured outputs
                topP: 0.8,
                topK: 40,
            },
        });

        const result = await generativeModel.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
        });

        const response = await result.response;
        const text = response.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            throw new Error("No text generated from model");
        }

        return NextResponse.json({ result: text });

    } catch (error: any) {
        console.error('Vertex AI API Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
