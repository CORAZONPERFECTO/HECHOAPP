import { VertexAI, GenerativeModel } from '@google-cloud/vertexai';
import { GoogleAuth } from 'google-auth-library';

// Helper to sanitize private key from Vercel/Env variables
// Vercel sometimes escapes newlines as \\n, we need real \n
const formatPrivateKey = (key: string) => {
    return key.replace(/\\n/g, '\n');
};

let vertexAIClient: VertexAI | null = null;
let geminiModel: GenerativeModel | null = null;

export async function getGeminiModel(): Promise<GenerativeModel> {
    if (geminiModel) return geminiModel;

    const projectId = process.env.GCP_PROJECT_ID;
    const clientEmail = process.env.GCP_CLIENT_EMAIL;
    const privateKey = process.env.GCP_PRIVATE_KEY;
    const location = process.env.GCP_LOCATION || 'us-central1'; // Previews often require us-central1

    if (!projectId || !clientEmail || !privateKey) {
        throw new Error("Missing Google Cloud credentials in environment variables (GCP_PROJECT_ID, GCP_CLIENT_EMAIL, GCP_PRIVATE_KEY).");
    }

    // Explicit Auth implementation for environments like Vercel
    const auth = new GoogleAuth({
        credentials: {
            client_email: clientEmail,
            private_key: formatPrivateKey(privateKey),
        },
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
        projectId: projectId,
    });

    vertexAIClient = new VertexAI({
        project: projectId,
        location: location,
        googleAuthOptions: {
            authClient: auth as any // VertexAI expects generic GoogleAuthOptions
        }
    });

    // gemini-pro is legacy, gemini-1.5-flash is faster and cheaper, or gemini-1.5-pro for complex reasoning
    // Using gemini-1.5-flash by default for responsiveness
    geminiModel = vertexAIClient.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: {
            maxOutputTokens: 2048,
            temperature: 0.4, // Lower temperature for more deterministic/professional output
            topP: 0.8,
        },
    });

    return geminiModel;
}
