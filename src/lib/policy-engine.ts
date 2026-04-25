import { ServiceTicket, PolicyRule, ApprovalResult } from "@/types/service";
import { Quote } from "@/types/finance";

// Constants for Rules (can be moved to DB settings later)
const MAX_AUTO_APPROVE_AMOUNT = 15000; // RD$
const MAX_DISCOUNT_PERCENT = 10; // 10%

// Define Rules Repository
const RULES: PolicyRule[] = [
    {
        id: 'RULE_HIGH_VALUE',
        name: 'High Value Quote',
        priority: 100,
        reason: 'HIGH_VALUE',
        condition: (_, quote) => (quote.grand_total ?? (quote as any).total ?? 0) > MAX_AUTO_APPROVE_AMOUNT
    },
    {
        id: 'RULE_HIGH_DISCOUNT',
        name: 'Excessive Discount',
        priority: 90,
        reason: 'DISCOUNT_EXCEEDS_LIMIT',
        condition: (_, quote) => {
            const netTotal = quote.net_total ?? (quote as any).subtotal ?? 0;
            const discount = (quote as any).discountTotal ?? 0;
            if (netTotal === 0) return false;
            const discountPercent = (discount / netTotal) * 100;
            return discountPercent > MAX_DISCOUNT_PERCENT;
        }
    },
    {
        id: 'RULE_CRITICAL_ITEM',
        name: 'Critical Compresor Item',
        priority: 80,
        reason: 'CRITICAL_ITEM',
        condition: (_, quote) => {
            // Check if any item description implies a Compressor replacement
            return quote.items.some(item => {
                const desc = (item.item_name || item.description || '').toLowerCase();
                return desc.includes('compresor') || desc.includes('motor');
            });
        }
    }
];

/**
 * Evaluates a ticket and quote against all active policy rules.
 * @param ticket The service ticket context
 * @param quote The proposed quote
 * @returns ApprovalResult indicating if approval is needed and why.
 */
export function evaluateApproval(ticket: ServiceTicket, quote: Quote): ApprovalResult {
    // 1. Sort rules by priority (High to Low)
    const sortedRules = [...RULES].sort((a, b) => b.priority - a.priority);

    // 2. Evaluate each rule
    for (const rule of sortedRules) {
        if (rule.condition(ticket, quote)) {
            return {
                requiresApproval: true,
                reason: rule.reason,
                details: `Triggered by rule: ${rule.name}`
            };
        }
    }

    // 3. Default: Auto Approve
    return {
        requiresApproval: false
    };
}
