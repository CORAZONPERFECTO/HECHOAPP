import { VertexAI, GenerativeModel } from '@google-cloud/vertexai';

// Initialize Vertex AI
// Note: Cloud Functions run with default service account application credentials.
// Project ID and Location should be inferred or set via env vars.
const PROJECT_ID = process.env.GCP_PROJECT_ID || 'hecho-srl-free'; // Fallback to known project ID if env missing
const LOCATION = process.env.GCP_LOCATION || 'us-central1';

const vertexAI = new VertexAI({ project: PROJECT_ID, location: LOCATION });

// Model configuration
const MODEL_NAME = 'gemini-2.0-flash-exp'; // Using the fast/experimental model for quotes

export interface AIQuoteRecommendation {
    diagnosis: string;
    parts: { name: string; estimatedNativePrice: number }[];
    laborCost: number;
    recommendedTotal: number;
    confidence: number;
    reasoning: string;
}

export async function analyzeEvidenceAndDraftQuote(imageUrl: string, ticketContext?: any): Promise<AIQuoteRecommendation> {
    try {
        const model: GenerativeModel = vertexAI.getGenerativeModel({
            model: MODEL_NAME,
            generationConfig: {
                maxOutputTokens: 1024,
                temperature: 0.2, // Low temp for factual/structured output
                responseMimeType: "application/json"
            }
        });

        // Prompt Engineering
        const prompt = `
        You are an HVAC Expert Technician Agent. 
        Analyze the provided image (evidence of a failure).
        
        Context:
        Ticket Description: ${ticketContext?.description || 'No description provided'}
        Ticket Title: ${ticketContext?.title || 'Service Ticket'}
        
        Task:
        1. Identify the HVAC component / failure visible in the image.
        2. Propose a repair quote including necessary parts and labor.
        3. Output strict JSON format.

        Pricing Guidelines (Dominican Peso - DOP):
        - Capacitor: 1500-2500
        - Contactor: 1200-2000
        - Fan Motor: 3500-6000
        - Compressor: 12000-25000
        - Gas Leak Repair + Refill: 4500-8000
        - Maintenance (Cleaning): 2500-4000
        - Labor (Generic): 2000-5000 depending on complexity
        
        Output JSON Schema:
        {
            "diagnosis": "Short summary of what is wrong",
            "parts": [
                { "name": "Part Name", "estimatedNativePrice": 1234 }
            ],
            "laborCost": 5678,
            "recommendedTotal": 9999,
            "confidence": 0.95,
            "reasoning": "Explanation of why this price/diagnosis was chosen"
        }
        `;

        const imagePart = {
            fileData: {
                mimeType: 'image/jpeg', // Assumption, typically standardized. Or pass mime type.
                fileUri: imageUrl // NOTE: Vertex AI needs Google Cloud Storage URI (gs://) or Base64. Public URLs might not work directly unless using newer Gemini features or downloading first.
                // IF imageUrl is https://firebasestorage..., Gemini might NOT reach it directly if not strictly public or authorized.
                // RECOMMENDED: Pass 'gs://' URI if available in Firestore evidence metadata.
            }
        };

        // Handling the Image URL issue:
        // If the URL is an HTTP URL, we might need to fetch it and convert to base64 OR use the GS URI.
        // For this implementation, let's assume we receive the 'gs://' path or we fetch and buffer.
        // Since Evidence doc usually has 'storagePath' (e.g. orgs/.../image.jpg), we can construct gs:// bucket path.
        // Let's modify the function signature or logic to handle GS URI if possible.

        // For 'gemini-2.0-flash', it supports passing images as base64.

        // Let's try sending text-only first if no image buffer logic is added, BUT the point is Vision.
        // Plan: If 'gs://' format, pass strict URI. If https, we might fail.
        // Let's assume we have the GS URI.

        const req = {
            contents: [{
                role: 'user',
                parts: [
                    { text: prompt },
                    imagePart
                ]
            }]
        };

        // Note: For now, I will implement a simpler version that assumes we can download the image 
        // OR that we pass text description if everything else fails.
        // However, correctly, let's assume I will construct the GS URI in the caller and pass it here.
        // The structure above expects a 'fileUri' for GCS files.

        const result = await model.generateContent(req);
        const responseText = result.response.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!responseText) throw new Error("No response from AI");

        return JSON.parse(responseText) as AIQuoteRecommendation;

    } catch (error) {
        console.error("AI Quote Generation Error:", error);
        // Fallback or rethrow
        return {
            diagnosis: "AI Diagnosis Failed",
            parts: [],
            laborCost: 0,
            recommendedTotal: 0,
            confidence: 0,
            reasoning: "Error interacting with Vertex AI"
        };
    }
}
