
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
    // Refined Regex: Stop capturing at commas, known connectors, OR before a digit (likely start of an item)
    let clientMatch = normalizedText.match(/(?:para|cliente|a la empresa)\s+(.+?)(?:\,|\s+por|\s+con|\s+que|\s+el|\s+un|\s+\d|\.|$)/);

    if (clientMatch && clientMatch[1]) {
        let potentialName = clientMatch[1].trim();

        // Extra cleanup if it captured a trailing " y" or similar
        potentialName = potentialName.replace(/\s+y$/, "");

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

    // Text Normalization for Numbers (Expanded)
    let textForItems = normalizedText
        .replace(/\bun\b|\buna\b/g, "1")
        .replace(/\bdos\b/g, "2")
        .replace(/\btres\b/g, "3")
        .replace(/\bcuatro\b/g, "4")
        .replace(/\bcinco\b/g, "5")
        .replace(/\bseis\b/g, "6")
        .replace(/\bsiete\b/g, "7")
        .replace(/\bocho\b/g, "8")
        .replace(/\bnueve\b/g, "9")
        .replace(/\bdiez\b/g, "10");

    // Regex for Items
    // Group 1: Quantity
    // Group 2: Description
    // Group 3: Price (ignoring 'pesos' etc)
    const itemRegex = /(\d+)\s+(.+?)\s+(?:a|por|precio|costo|son)\s+(?:RD\$|\$)?\s*(\d+(?:\.\d+)?)/g;
    let match;

    while ((match = itemRegex.exec(textForItems)) !== null) {
        const quantity = parseFloat(match[1]);
        let descriptionRaw = match[2].trim();
        const price = parseFloat(match[3]);

        // Clean up description start (connectors)
        descriptionRaw = descriptionRaw.replace(/^(y|e|,)\s+/, "");

        // Clean up description end (trailing connectors before price that weren't caught)
        // e.g. "cajas de ... a"

        if (quantity > 0 && price >= 0) {
            result.items.push({
                description: descriptionRaw.charAt(0).toUpperCase() + descriptionRaw.slice(1),
                quantity: quantity,
                unitPrice: price,
                taxRate: 0.18,
                taxAmount: price * quantity * 0.18,
                total: price * quantity * 1.18
            });
            result.confidence += 0.2;
        }
    }

    // Fallback: Check for simple "mantenimiento por 5000" (implied quantity 1)
    if (result.items.length === 0) {
        // Look for pattern: [action/item] + [price connector] + [price] [optional currency]
        const simpleItemRegex = /(?:un|el|realizar|hacer)?\s*(.+?)\s+(?:a|por|cuesta|valor)\s+(?:RD\$|\$)?\s*(\d+(?:\.\d+)?)/;
        const simpleMatch = textForItems.match(simpleItemRegex);

        // Ensure "para ..." wasn't matched as item description if client came first
        // Simple heuristic: if description contains "para [client]", it's wrong. 
        // But since we extract client first, maybe we can strip it? 
        // For now, relies on user pausing or specific structure.

        if (simpleMatch) {
            let description = simpleMatch[1].trim();
            // Remove typical starters if they remain
            description = description.replace(/^(y|e|,|un|el)\s+/, "");

            const price = parseFloat(simpleMatch[2]);

            // Validation: Description shouldn't be empty
            if (description.length > 2) {
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
    }

    return result;
}
