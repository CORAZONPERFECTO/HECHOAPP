import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

let genAI: GoogleGenerativeAI | null = null;
let geminiModel: GenerativeModel | null = null;

export async function getGeminiModel(): Promise<GenerativeModel> {
    if (geminiModel) return geminiModel;

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        throw new Error("Missing GEMINI_API_KEY environment variable.");
    }

    genAI = new GoogleGenerativeAI(apiKey);

    geminiModel = genAI.getGenerativeModel({
        model: 'gemini-pro',
        generationConfig: {
            maxOutputTokens: 2048,
            temperature: 0.4,
            topP: 0.8,
        },
    });

    return geminiModel;
}
