"use client";

import { useOnlineStatus } from "@/hooks/use-online-status";
import { Wifi, WifiOff, Cloud, CloudOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface OfflineIndicatorProps {
    pendingOperations?: number;
    isSyncing?: boolean;
}

export function OfflineIndicator({ pendingOperations = 0, isSyncing = false }: OfflineIndicatorProps) {
    const isOnline = useOnlineStatus();

    if (isOnline && pendingOperations === 0 && !isSyncing) {
        return null; // Hide when online and no pending operations
    }

    return (
        <div
            className={cn(
                "fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg text-sm font-medium transition-all",
                isOnline
                    ? "bg-blue-600 text-white"
                    : "bg-orange-600 text-white"
            )}
        >
            {isSyncing ? (
                <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Sincronizando...</span>
                </>
            ) : isOnline ? (
                <>
                    <Cloud className="h-4 w-4" />
                    <span>
                        {pendingOperations > 0
                            ? `Sincronizando ${pendingOperations} cambios`
                            : "En línea"}
                    </span>
                </>
            ) : (
                <>
                    <CloudOff className="h-4 w-4" />
                    <span>
                        Modo offline
                        {pendingOperations > 0 && ` (${pendingOperations} pendientes)`}
                    </span>
                </>
            )}
        </div>
    );
}
