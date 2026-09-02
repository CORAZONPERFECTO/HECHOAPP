"use client";

import { VoiceQuoteModal } from "@/components/income/quotes/voice-quote-modal";

interface QuoteChatModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function QuoteChatModal({ open, onOpenChange }: QuoteChatModalProps) {
    return <VoiceQuoteModal open={open} onOpenChange={onOpenChange} />;
}
