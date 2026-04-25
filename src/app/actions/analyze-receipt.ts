"use server";

import { VertexAI, HarmCategory, HarmBlockThreshold } from "@google-cloud/vertexai";

// Initialize Vertex AI
const project = process.env.GCP_PROJECT_ID!;
const location = process.env.GCP_LOCATION || "us-central1";

// Client-side authentication is handled via `gcloud auth application-default login` 
// or GOOGLE_APPLICATION_CREDENTIALS in production.
// For simple dev testing without service account JSON file, 
// we assume the environment is authorized.

import fs from 'fs';
import path from 'path';

import { ReceiptAnalysisSchema } from "@/lib/ai/schemas";

export async function analyzeReceiptAction(formData: FormData) {
    const logPath = path.join(process.cwd(), 'vertex-error.log');
    try {
        const file = formData.get("file") as File;
        if (!file) throw new Error("No file uploaded");

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const base64Data = buffer.toString("base64");

        // Helper to clean the private key
        let privateKey = process.env.GCP_PRIVATE_KEY || "";

        if (privateKey.includes("\\n")) {
            privateKey = privateKey.split("\\n").join("\n");
        }

        if (privateKey.includes("\\/")) {
            privateKey = privateKey.replace(/\\\//g, '/');
        }

        const vertex_ai = new VertexAI({
            project: project,
            location: location,
            googleAuthOptions: {
                credentials: {
                    client_email: process.env.GCP_CLIENT_EMAIL,
                    private_key: privateKey
                }
            }
        });

        const generativeModel = vertex_ai.getGenerativeModel({
            model: "gemini-1.5-flash-001",
            safetySettings: [{
                category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            }],
        });

        const prompt = `
        Analyze this receipt image and extract the following data in strict JSON format:
        {
            "merchantName": "Name of the store/provider",
            "rnc": "RNC or Tax ID number found",
            "ncf": "NCF or Calendar/Fiscal Number found",
            "date": "Date of purchase in YYYY-MM-DD format",
            "totalAmount": Number (final total amount),
            "taxAmount": Number (ITBIS or Tax amount if visible, else 0),
            "items": [
                {
                    "description": "Item name/description",
                    "quantity": Number (default 1),
                    "unitPrice": Number (price per unit, or total if qty 1),
                    "total": Number
                }
            ]
        }
        
        Rules:
        - If text is blurry or not found, return empty string or 0.
        - Guess the merchantName from the logo or header.
        - valid JSON only.
        `;

        const req = {
            contents: [{
                role: 'user',
                parts: [
                    { inlineData: { mimeType: file.type, data: base64Data } },
                    { text: prompt }
                ]
            }]
        };

        const result = await generativeModel.generateContent(req);
        const response = await result.response;
        const text = response.candidates?.[0].content.parts[0].text;

        if (!text) throw new Error("No response from AI");

        // Clean markdown if present
        const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
        const rawData = JSON.parse(jsonStr);

        // Validate with Zod
        const validation = ReceiptAnalysisSchema.safeParse(rawData);

        if (!validation.success) {
            console.error("Validation Error:", validation.error);
            throw new Error("AI response validation failed");
        }

        const data = validation.data;

        // Backend transformation to match UI expectation (PurchaseService expects specific keys)
        // The UI expects: provider, rnc, ncf, total, tax, items
        // Our Zod schema uses: merchantName, rnc, ncf, totalAmount, taxAmount, items
        // We map it here or ensuring the Zod schema matches UI.
        // Let's map it to keep Zod clean and UI consistent.

        return {
            success: true,
            data: {
                provider: data.merchantName,
                rnc: data.rnc,
                ncf: data.ncf,
                date: data.date,
                total: data.totalAmount,
                tax: data.taxAmount,
                items: data.items
            }
        };

    } catch (error: any) {
        console.error("Vertex AI Error:", error);

        const timestamp = new Date().toISOString();
        const errorMessage = `[${timestamp}] Error: ${error.message}\nStack: ${error.stack}\nDetails: ${JSON.stringify(error)}\n\n`;

        try {
            fs.appendFileSync(logPath, errorMessage);
        } catch (e) {
            console.error("Failed to write log", e);
        }

        return { success: false, error: error.message };
    }
}
