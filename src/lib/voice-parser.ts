
import { Client, InvoiceItem } from "@/types/schema";

interface ParsedInvoiceData {
    clientName?: string;
    clientId?: string;
    items: InvoiceItem[];
    confidence: number;
}

// Helper to remove accents and lower case
const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export function parseInvoiceCommand(text: string, availableClients: Client[] = []): ParsedInvoiceData {
    const normalizedText = normalize(text);
    const result: ParsedInvoiceData = {
        items: [],
        confidence: 0
    };

    // 1. EXTRACT CLIENT
    // Patterns: "para [Client]", "cliente [Client]", "a [Client]" (riskier)
    // We will look for "para" or "cliente" and take the next 2-4 words as a candidate
    let clientMatch = normalizedText.match(/(?:para|cliente|a la empresa)\s+(.+?)(?:\,|\s+por|\s+con|\s+que|\s+el|\s+un|\.|$)/);

    if (clientMatch && clientMatch[1]) {
        const potentialName = clientMatch[1].trim();

        // Simple fuzzy match against availableClients
        const bestMatch = availableClients.find(c =>
            normalize(c.nombreComercial).includes(potentialName) ||
            normalize(c.personaContacto || "").includes(potentialName)
        );

        if (bestMatch) {
            result.clientName = bestMatch.nombreComercial;
            result.clientId = bestMatch.id;
            result.confidence += 0.4;
        } else {
            // Keep the raw name if no match found
            result.clientName = potentialName.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "); // Capitalize
            result.confidence += 0.2;
        }
    }

    // 2. EXTRACT ITEMS
    // Patterns: 
    // - "2 aires acondicionados a 5000 pesos"
    // - "un mantenimiento de 1500"
    // - "3 cajas de guantes por 200 cada una"

    // Strategy: Split by " y " or commas to handle multiple items? 
    // Or just iterate regex matches.

    // Regex Explanation:
    // (\d+|un|una|dos|tres...) -> Quantity (numeric or basic words)
    // \s+(.+?)\s+ -> Description (lazy match until price indicator)
    // (?:a|por|costo|precio)\s+ -> Price indicator
    // (\d+(?:\.\d+)?) -> Price value

    // Replacing word numbers for digits first might be safer
    let textForItems = normalizedText
        .replace(/\bun\b|\buna\b/g, "1")
        .replace(/\bdos\b/g, "2")
        .replace(/\btres\b/g, "3")
        .replace(/\bcuatro\b/g, "4")
        .replace(/\bcinco\b/g, "5");

    const itemRegex = /(\d+)\s+(.+?)\s+(?:a|por|precio|costo)\s+(\d+(?:\.\d+)?)/g;
    let match;

    while ((match = itemRegex.exec(textForItems)) !== null) {
        const quantity = parseFloat(match[1]);
        const descriptionRaw = match[2].trim();
        const price = parseFloat(match[3]);

        // Clean up description (remove 'de', 'cajas de', etc if needed, but keeping it raw is safer)
        // Ensure description doesn't contain the split words " y " at the start
        const description = descriptionRaw.replace(/^(y|e|,)\s+/, "");

        if (quantity > 0 && price >= 0) {
            result.items.push({
                description: description.charAt(0).toUpperCase() + description.slice(1),
                quantity: quantity,
                unitPrice: price,
                taxRate: 0.18, // Default, can be refined later
                taxAmount: price * quantity * 0.18,
                total: price * quantity * 1.18
            });
            result.confidence += 0.2;
        }
    }

    // Fallback: Check for simple "mantenimiento por 5000" (implied quantity 1)
    if (result.items.length === 0) {
        const simpleItemRegex = /(?:un|el|realizar|hacer)\s+(.+?)\s+(?:a|por)\s+(\d+(?:\.\d+)?)/;
        const simpleMatch = textForItems.match(simpleItemRegex);
        if (simpleMatch) {
            const description = simpleMatch[1].trim();
            const price = parseFloat(simpleMatch[2]);
            result.items.push({
                description: description.charAt(0).toUpperCase() + description.slice(1),
                quantity: 1,
                unitPrice: price,
                taxRate: 0.18,
                taxAmount: price * 0.18,
                total: price * 1.18
            });
            result.confidence += 0.2;
        }
    }

    return result;
}
