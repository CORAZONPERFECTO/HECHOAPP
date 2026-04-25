"use client";

import { useOfflineSync } from "@/hooks/use-offline-sync";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle, CheckCircle, Trash2, RefreshCw } from "lucide-react";

export function SyncConflictResolver() {
    const { syncQueue, retryOperation, discardOperation, isSyncing } = useOfflineSync();

    // Filter for items that need attention
    const troubledItems = syncQueue.filter(op => op.status === 'CONFLICT' || op.status === 'FAILED');

    if (troubledItems.length === 0) return null;

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="destructive" size="sm" className="gap-2 animate-pulse">
                    <AlertTriangle className="h-4 w-4" />
                    {troubledItems.length} Sync Error{troubledItems.length > 1 ? 's' : ''}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Sync Issues Resolution</DialogTitle>
                </DialogHeader>
                <div className="text-sm text-muted-foreground mb-4">
                    The following operations failed to sync. Please choose to retry or discard them.
                </div>
                <ScrollArea className="h-[300px] pr-4">
                    <div className="space-y-4">
                        {troubledItems.map((op) => (
                            <div key={op.id} className="border rounded-lg p-4 bg-muted/30">
                                <div className="flex justify-between items-start mb-2">
                                    <Badge variant={op.status === 'CONFLICT' ? "destructive" : "secondary"}>
                                        {op.status}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                        {new Date(op.timestamp).toLocaleTimeString()}
                                    </span>
                                </div>
                                <div className="font-medium mb-1">
                                    {op.type === 'UPDATE_TICKET' ? 'Ticket Update' :
                                        op.type === 'UPLOAD_PHOTO' ? 'Photo Upload' :
                                            op.type === 'CREATE_PURCHASE' ? 'Purchase' : op.type}
                                </div>
                                {op.error && (
                                    <div className="text-xs text-red-500 mb-3 bg-red-50 p-2 rounded border border-red-100 dark:bg-red-950/30 dark:border-red-900">
                                        {op.error}
                                    </div>
                                )}
                                <div className="flex gap-2 justify-end mt-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => discardOperation(op.id)}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                        <Trash2 className="h-3 w-3 mr-1" />
                                        Discard
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={() => retryOperation(op.id)}
                                        disabled={isSyncing}
                                    >
                                        <RefreshCw className={`h-3 w-3 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
                                        Retry
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
