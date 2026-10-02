"use client";

import { useState, useEffect } from "react";
import { 
    getOrCreateCrewToken, 
    updateCrewTokenMaxOpens, 
    resetCrewTokenDevices,
    setTicketStandby
} from "@/lib/crew-link-service";
import { TicketCrewToken, Ticket } from "@/types/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
    Users, 
    Link2, 
    Copy, 
    Check, 
    Share2, 
    Plus, 
    RotateCcw, 
    Lock, 
    Pause, 
    Play, 
    Smartphone, 
    Loader2,
    ShieldCheck
} from "lucide-react";

interface AdminCrewLinkCardProps {
    ticket: Ticket;
    currentUserRole?: string | null;
    currentUserName?: string;
    currentUserId?: string;
    onTicketUpdated?: () => void;
}

export function AdminCrewLinkCard({
    ticket,
    currentUserRole,
    currentUserName,
    currentUserId,
    onTicketUpdated
}: AdminCrewLinkCardProps) {
    const [tokenData, setTokenData] = useState<TicketCrewToken | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!ticket.id) return;
        loadToken();
    }, [ticket.id]);

    const loadToken = async () => {
        setLoading(true);
        try {
            const data = await getOrCreateCrewToken(
                ticket.id,
                ticket.ticketNumber,
                ticket.clientName,
                ticket.locationName,
                currentUserId,
                currentUserName,
                2
            );
            setTokenData(data);
        } catch (error) {
            console.error("Error loading crew token:", error);
        } finally {
            setLoading(false);
        }
    };

    const crewUrl = typeof window !== 'undefined' && tokenData 
        ? `${window.location.origin}/t/${tokenData.token}`
        : '';

    const handleCopy = () => {
        if (!crewUrl) return;
        navigator.clipboard.writeText(crewUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    const handleShareWhatsApp = () => {
        if (!crewUrl || !tokenData) return;
        const text = `🛠️ *ORDEN DE TRABAJO - HECHO SRL*\n` +
            `Ticket: *#${ticket.ticketNumber || ticket.id.slice(0, 8)}*\n` +
            `Cliente: ${ticket.clientName}\n` +
            `Ubicación: ${ticket.locationName || 'En sitio'}\n\n` +
            `📲 *Enlace de Cuadrilla (Técnico + Ayudante):*\n${crewUrl}\n\n` +
            `_Nota: Este enlace permite hasta ${tokenData.maxOpens} celulares registrados (Líder y Ayudante) para subir fotos y completar el servicio en tiempo real._`;
        
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    const handleIncreaseOpens = async (amount: number = 1) => {
        if (!tokenData) return;
        setUpdating(true);
        try {
            const newMax = (tokenData.maxOpens || 2) + amount;
            await updateCrewTokenMaxOpens(tokenData.token, newMax);
            setTokenData(prev => prev ? { ...prev, maxOpens: newMax } : null);
        } catch (error: any) {
            alert("Error al aumentar aperturas: " + error.message);
        } finally {
            setUpdating(false);
        }
    };

    const handleResetDevices = async () => {
        if (!tokenData) return;
        const confirmReset = confirm(
            "¿Deseas reiniciar los dispositivos registrados?\n" +
            "Esto liberará los cupos de apertura para que técnicos o ayudantes con celulares nuevos puedan ingresar."
        );
        if (!confirmReset) return;

        setUpdating(true);
        try {
            await resetCrewTokenDevices(tokenData.token);
            setTokenData(prev => prev ? { ...prev, registeredDeviceIds: [], openCount: 0 } : null);
            alert("Dispositivos reiniciados correctamente.");
        } catch (error: any) {
            alert("Error al reiniciar dispositivos: " + error.message);
        } finally {
            setUpdating(false);
        }
    };

    const handleToggleStandby = async () => {
        if (!ticket.id) return;
        const isCurrentStandby = !!ticket.isStandby;
        const nextState = !isCurrentStandby;
        let reason = "";

        if (nextState) {
            const promptReason = prompt("Motivo de la pausa / standby (ej: Almuerzo, Espera de repuesto, Continuación al día siguiente):", "Pausa operativa");
            if (promptReason === null) return;
            reason = promptReason || "Pausa operativa";
        }

        setUpdating(true);
        try {
            await setTicketStandby(ticket.id, nextState, reason, currentUserId, currentUserName);
            if (onTicketUpdated) onTicketUpdated();
            await loadToken();
        } catch (error: any) {
            alert("Error al cambiar estado de standby: " + error.message);
        } finally {
            setUpdating(false);
        }
    };

    const isClosed = ticket.status === 'COMPLETED' || ticket.status === 'CANCELLED';
    const usedDevices = tokenData?.registeredDeviceIds?.length || 0;
    const maxDevices = tokenData?.maxOpens || 2;
    const isLimitFull = usedDevices >= maxDevices;

    if (loading) {
        return (
            <Card className="border-slate-200 shadow-xs">
                <CardContent className="p-4 flex items-center justify-center gap-2 text-slate-500 text-xs">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    <span>Cargando enlace de cuadrilla...</span>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={`border shadow-xs overflow-hidden transition-all ${
            isClosed 
                ? 'border-slate-200 bg-slate-50/70' 
                : ticket.isStandby 
                ? 'border-amber-300 bg-amber-50/30' 
                : 'border-blue-200 bg-gradient-to-br from-white to-blue-50/30'
        }`}>
            <CardHeader className="p-4 pb-2 border-b bg-white/70">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            isClosed ? 'bg-slate-200 text-slate-600' : 'bg-blue-600 text-white shadow-xs'
                        }`}>
                            <Users className="w-4 h-4" />
                        </div>
                        <div>
                            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                Enlace de Cuadrilla (2 Aperturas)
                                {isClosed ? (
                                    <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-700 border-slate-300 gap-1">
                                        <Lock className="w-3 h-3" /> Cerrado
                                    </Badge>
                                ) : ticket.isStandby ? (
                                    <Badge variant="outline" className="text-[10px] bg-amber-100 text-amber-800 border-amber-300 gap-1 animate-pulse">
                                        <Pause className="w-3 h-3" /> En Standby
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-300 gap-1">
                                        <ShieldCheck className="w-3 h-3" /> Activo
                                    </Badge>
                                )}
                            </CardTitle>
                            <CardDescription className="text-xs text-slate-500">
                                Permite al técnico líder y a su ayudante abrir el ticket y subir fotos simultáneamente.
                            </CardDescription>
                        </div>
                    </div>

                    {/* Standby Toggle Button */}
                    {!isClosed && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={handleToggleStandby}
                            disabled={updating}
                            className={`h-8 text-xs font-semibold gap-1.5 shadow-2xs ${
                                ticket.isStandby 
                                    ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200' 
                                    : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                            }`}
                        >
                            {ticket.isStandby ? (
                                <>
                                    <Play className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
                                    Reanudar
                                </>
                            ) : (
                                <>
                                    <Pause className="w-3.5 h-3.5 text-amber-600" />
                                    Standby
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </CardHeader>

            <CardContent className="p-4 space-y-3.5">
                {/* Visualizador del Enlace y Copia Rápida */}
                <div>
                    <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg p-1.5 px-2.5 shadow-2xs">
                        <Link2 className="w-4 h-4 text-blue-600 shrink-0" />
                        <span className="text-xs font-mono text-slate-800 truncate flex-1 font-medium">
                            {crewUrl || "Generando enlace..."}
                        </span>
                        
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleCopy}
                            disabled={!crewUrl}
                            className="h-7 px-2 text-xs gap-1 text-slate-600 hover:text-slate-900"
                        >
                            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            {copied ? "Copiado" : "Copiar"}
                        </Button>

                        <Button
                            size="sm"
                            onClick={handleShareWhatsApp}
                            disabled={!crewUrl}
                            className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1 shadow-2xs"
                        >
                            <Share2 className="w-3.5 h-3.5" />
                            WhatsApp
                        </Button>
                    </div>
                </div>

                {/* Métricas de Dispositivos y Cupos de Apertura */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-slate-50/80 rounded-lg border border-slate-200/80 text-xs">
                    <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-slate-500 shrink-0" />
                        <div>
                            <span className="font-semibold text-slate-800">
                                Dispositivos Registrados: {usedDevices} de {maxDevices}
                            </span>
                            <p className="text-[10px] text-slate-500">
                                {isClosed 
                                    ? "Servicio cerrado: ya no admite aperturas ni modificaciones."
                                    : isLimitFull 
                                    ? "Cupo completo (Líder + Ayudante autorizados)." 
                                    : `Queda ${maxDevices - usedDevices} apertura disponible para otro dispositivo.`}
                            </p>
                        </div>
                    </div>

                    {/* Controles de Administrador */}
                    {!isClosed && (
                        <div className="flex items-center gap-1.5 self-end sm:self-auto">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleIncreaseOpens(1)}
                                disabled={updating}
                                className="h-7 text-xs border-blue-200 text-blue-700 hover:bg-blue-50 gap-1 font-semibold"
                                title="Aumentar una apertura más para otro ayudante o celular"
                            >
                                <Plus className="w-3 h-3" />
                                +1 Cupo
                            </Button>

                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleResetDevices}
                                disabled={updating || usedDevices === 0}
                                className="h-7 text-xs text-slate-500 hover:text-slate-800 gap-1"
                                title="Resetear lista de celulares para permitir nuevos dispositivos"
                            >
                                <RotateCcw className="w-3 h-3" />
                                Reset
                            </Button>
                        </div>
                    )}
                </div>

                {ticket.isStandby && ticket.standbyReason && (
                    <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                        <Pause className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                            <span className="font-bold">Motivo de Standby:</span> {ticket.standbyReason}
                            <p className="text-[10px] text-amber-700 mt-0.5">
                                La cuadrilla puede volver a abrir el enlace en sus celulares para continuar sin perder datos.
                            </p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
