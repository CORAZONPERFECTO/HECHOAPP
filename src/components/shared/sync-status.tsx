// src/components/shared/sync-status.tsx
"use client";

import { Cloud, Clock } from "lucide-react";

interface SyncStatusProps {
    hasPendingWrites: boolean;
}

export function SyncStatus({ hasPendingWrites }: SyncStatusProps) {
    if (hasPendingWrites) {
        return (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-orange-500 bg-orange-50 px-2 py-1 rounded-full border border-orange-200 shadow-sm animate-pulse">
                <Clock className="w-3.5 h-3.5" />
                <span>Pendiente de envío...</span>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-200 shadow-sm">
            <Cloud className="w-3.5 h-3.5" />
            <span>Sincronizado</span>
        </div>
    );
}
