import { z } from "zod";

export const ReceiptItemSchema = z.object({
    description: z.string(),
    quantity: z.number().default(1),
    unitPrice: z.number().default(0),
    total: z.number().default(0)
});

export const ReceiptAnalysisSchema = z.object({
    merchantName: z.string().default('Desconocido'),
    rnc: z.string().optional(),
    ncf: z.string().optional(),
    date: z.string().optional(),
    totalAmount: z.number().default(0),
    taxAmount: z.number().default(0),
    items: z.array(ReceiptItemSchema).default([])
});

export type ReceiptAnalysisResult = z.infer<typeof ReceiptAnalysisSchema>;

export const VoiceCommandSchema = z.object({
    action: z.enum(['CREATE_TICKET', 'UPDATE_STATUS', 'ADD_NOTE', 'NAVIGATE', 'UNKNOWN']),
    confidence: z.number(),
    entities: z.object({
        client: z.string().optional(),
        priority: z.string().optional(),
        description: z.string().optional(),
        status: z.string().optional(),
        target: z.string().optional() // For navigation
    }).optional()
});

export type VoiceCommandResult = z.infer<typeof VoiceCommandSchema>;
