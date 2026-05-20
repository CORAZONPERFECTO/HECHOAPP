import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { prompt, systemInstruction } = await req.json();

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            console.error("Missing GEMINI_API_KEY in environment variables");
            return NextResponse.json({ error: 'Server configuration error: Missing Credentials' }, { status: 500 });
        }

        // Initialize GoogleGenerativeAI
        const genAI = new GoogleGenerativeAI(apiKey);

        // Use gemini-2.5-flash which is functional
        const generativeModel = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            systemInstruction: systemInstruction ? systemInstruction : undefined,
            generationConfig: {
                maxOutputTokens: 2048,
                temperature: 0.2, // Lower temperature for more deterministic/structured outputs
                topP: 0.8,
            },
        });

        const result = await generativeModel.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
        });

        const response = await result.response;
        const text = response.text();

        if (!text) {
            throw new Error("No text generated from model");
        }

        return NextResponse.json({ result: text });

    } catch (error: any) {
        console.error('Vertex (Gemini API fallback) Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
