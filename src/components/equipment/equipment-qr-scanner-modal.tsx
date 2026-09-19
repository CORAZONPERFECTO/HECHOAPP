"use client";

import { useEffect, useState, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, X, AlertTriangle, RefreshCw } from "lucide-react";

interface EquipmentQrScannerModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onScan: (codeOrToken: string) => void;
}

export function EquipmentQrScannerModal({ open, onOpenChange, onScan }: EquipmentQrScannerModalProps) {
    const [scannerRunning, setScannerRunning] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
    const containerId = "equipment-qr-reader-container";

    const startScanner = async () => {
        try {
            setErrorMsg(null);
            const html5QrCode = new Html5Qrcode(containerId);
            html5QrCodeRef.current = html5QrCode;

            const config = {
                fps: 12,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0
            };

            await html5QrCode.start(
                { facingMode: "environment" },
                config,
                (decodedText) => {
                    // Extraer el código limpio si es una URL tipo https://hecho.online/qr/EQ-00184
                    let cleanCode = decodedText.trim();
                    if (cleanCode.includes("/qr/")) {
                        const parts = cleanCode.split("/qr/");
                        cleanCode = parts[parts.length - 1].split("?")[0].trim();
                    }

                    stopScanner();
                    onScan(cleanCode);
                    onOpenChange(false);
                },
                () => {
                    // Frame scan failure (ignorar para no saturar consola)
                }
            );

            setScannerRunning(true);
        } catch (err: any) {
            console.error("Error starting QR scanner:", err);
            setErrorMsg("No se pudo acceder a la cámara. Por favor concede los permisos correspondientes.");
            setScannerRunning(false);
        }
    };

    const stopScanner = async () => {
        if (html5QrCodeRef.current && scannerRunning) {
            try {
                await html5QrCodeRef.current.stop();
                html5QrCodeRef.current.clear();
            } catch (err) {
                console.error("Error stopping scanner:", err);
            } finally {
                html5QrCodeRef.current = null;
                setScannerRunning(false);
            }
        }
    };

    useEffect(() => {
        if (open) {
            // Dar tiempo al modal para renderizar el contenedor antes de iniciar la cámara
            const timer = setTimeout(() => {
                startScanner();
            }, 300);
            return () => clearTimeout(timer);
        } else {
            stopScanner();
        }
    }, [open]);

    const handleClose = () => {
        stopScanner();
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md p-4">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-sm font-bold text-slate-900">
                        <Camera className="w-4 h-4 text-blue-600" />
                        Escanear Código QR del Equipo
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-3 pt-2">
                    <p className="text-xs text-slate-500">
                        Apunta la cámara a la etiqueta adhesiva del aire acondicionado para identificarlo al instante.
                    </p>

                    <div className="relative rounded-2xl overflow-hidden bg-black aspect-square flex items-center justify-center border-2 border-slate-800">
                        <div id={containerId} className="w-full h-full" />

                        {/* Guía visual para centrar el QR */}
                        {scannerRunning && (
                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                <div className="w-48 h-48 border-2 border-dashed border-blue-400 rounded-xl bg-blue-500/10 animate-pulse" />
                            </div>
                        )}
                    </div>

                    {errorMsg && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
                            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                            <span>{errorMsg}</span>
                        </div>
                    )}
                </div>

                <DialogFooter className="pt-2 flex justify-between sm:justify-between">
                    <Button variant="ghost" size="sm" onClick={handleClose}>
                        <X className="w-4 h-4 mr-1" /> Cancelar
                    </Button>
                    {errorMsg && (
                        <Button size="sm" onClick={startScanner} variant="outline">
                            <RefreshCw className="w-4 h-4 mr-1" /> Reintentar
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
