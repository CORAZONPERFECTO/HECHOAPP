
import { Client, InvoiceItem } from "@/types/schema";

interface ParsedInvoiceData {
    clientName?: string;
    clientId?: string;
    items: InvoiceItem[];
    confidence: number;
}

// Helper to remove accents and lower case
const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export async function parseInvoiceCommand(text: string, availableClients: Client[] = []): Promise<ParsedInvoiceData> {
    const normalizedText = normalize(text);
    const result: ParsedInvoiceData = {
        items: [],
        confidence: 0
    };

    // AI-BASED PARSING
    try {
        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt: text,
                task: 'parse-invoice',
                context: availableClients.map(c => c.nombreComercial).join(", ") // Pass client names for context
            }),
        });

        if (!response.ok) {
            throw new Error("Failed to parse with AI");
        }

        const data = await response.json();
        // Type definition for the expected AI response structure directly from the API result
        interface AIResponseItem {
            description: string;
            quantity: string | number;
            unitPrice: string | number;
        }

        interface AIResponse {
            clientName?: string;
            items: AIResponseItem[];
        }

        const aiResult: AIResponse = data.output;

        // Map AI result to our internal structure
        // Expecting { clientName: string, items: [] }
        if (aiResult) {
            // Try to match client ID if specific name returned
            let matchedClientId = undefined;
            if (aiResult.clientName) {
                const found = availableClients.find(c =>
                    c.nombreComercial.toLowerCase().includes(aiResult.clientName!.toLowerCase())
                );
                if (found) {
                    matchedClientId = found.id;
                    // Prefer the official name from DB
                    result.clientName = found.nombreComercial;
                } else {
                    result.clientName = aiResult.clientName;
                }
            }

            result.items = (aiResult.items || []).map((item: AIResponseItem) => ({
                description: item.description,
                quantity: Number(item.quantity) || 1,
                unitPrice: Number(item.unitPrice) || 0,
                taxRate: 0.18,
                taxAmount: (Number(item.unitPrice) || 0) * (Number(item.quantity) || 1) * 0.18,
                total: (Number(item.unitPrice) || 0) * (Number(item.quantity) || 1) * 1.18
            }));

            result.confidence = 0.9; // AI is confident!
            result.clientId = matchedClientId;
        }

    } catch (error) {
        console.error("AI Parsing failed, falling back to basic:", error);
        // We could fallback to regex here if we kept code, but for now just return empty with error
        result.confidence = 0;
    }

    return result;
}
