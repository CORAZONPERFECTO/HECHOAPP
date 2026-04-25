"use client";

import { useState } from "react";
import { HVACAsset, AssetStatus } from "@/types/hvac";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { QrCode, ClipboardList, Wrench, AlertTriangle, CheckCircle, PowerOff } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface AssetCardProps {
    asset: HVACAsset;
    onViewHistory?: () => void;
    onNewIntervention?: () => void;
    onShowQr?: () => void;
    showActions?: boolean;
}

const statusConfig: Record<AssetStatus, { color: string, icon: any, label: string }> = {
    'OPERATIONAL': { color: 'bg-green-500', icon: CheckCircle, label: 'Operativo' },
    'WARNING': { color: 'bg-yellow-500', icon: AlertTriangle, label: 'Advertencia' },
    'CRITICAL': { color: 'bg-red-500', icon: AlertTriangle, label: 'Crítico' },
    'OFFLINE': { color: 'bg-gray-500', icon: PowerOff, label: 'Apagado' },
    'MAINTENANCE': { color: 'bg-blue-500', icon: Wrench, label: 'Mantenimiento' },
};

export function AssetCard({ asset, onViewHistory, onNewIntervention, onShowQr, showActions = true }: AssetCardProps) {
    const status = statusConfig[asset.status] || statusConfig['OFFLINE'];
    const StatusIcon = status.icon;

    return (
        <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    {asset.name}
                </CardTitle>
                <Badge className={`${status.color} hover:${status.color} text-white`}>
                    <StatusIcon className="mr-1 h-3 w-3" />
                    {status.label}
                </Badge>
            </CardHeader>
            <CardContent>
                <div className="grid gap-2 mb-4">
                    <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                        <span>Marca/Modelo:</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">{asset.specs.brand} {asset.specs.model}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                        <span>Serie:</span>
                        <span className="font-mono text-gray-900 dark:text-gray-100">{asset.specs.serialNumber}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                        <span>Capacidad:</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">{asset.specs.btu ? `${asset.specs.btu.toLocaleString()} BTU` : 'N/A'}</span>
                    </div>
                    {asset.lastServiceDate && (
                        <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 mt-2 pt-2 border-t">
                            <span>Último Servicio:</span>
                            <span className="font-medium text-blue-600">
                                {format(asset.lastServiceDate.toDate(), "dd MMM yyyy", { locale: es })}
                            </span>
                        </div>
                    )}
                </div>
            </CardContent>
            {showActions && (
                <CardFooter className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={onViewHistory} className="flex-1" title="Historial">
                        <ClipboardList className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={onShowQr} className="flex-none px-3" title="Código QR">
                        <QrCode className="h-4 w-4" />
                    </Button>
                    <Button variant="default" size="sm" onClick={onNewIntervention} className="flex-[2] bg-blue-600 hover:bg-blue-700">
                        <Wrench className="mr-2 h-4 w-4" />
                        Intervenir
                    </Button>
                </CardFooter>
            )}
        </Card>
    );
}
