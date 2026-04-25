"use client";

import { useOfflineSync } from "@/hooks/use-offline-sync";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import { SyncConflictResolver } from "../technician/conflict-resolver-modal";

export function SyncStatusIndicator() {
    const { isOnline, isSyncing, pendingOperations } = useOfflineSync();

    return (
        <div className="flex items-center gap-2">
            <SyncConflictResolver />

            {/* Standard Status */}
            {!isOnline ? (
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200">
                    <WifiOff className="h-3 w-3 mr-1" />
                    Offline ({pendingOperations})
                </Badge>
            ) : isSyncing ? (
                <Badge variant="default" className="bg-blue-600 animate-pulse">
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    Syncing...
                </Badge>
            ) : pendingOperations > 0 ? (
                <Badge variant="outline" className="text-muted-foreground">
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Pending: {pendingOperations}
                </Badge>
            ) : (
                <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900">
                    <Wifi className="h-3 w-3 mr-1" />
                    Online
                </Badge>
            )}
        </div>
    );
}
