"use client";

import { useEffect, useState, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QrCode, Camera, CheckCircle2, AlertCircle, RefreshCw, Upload, X } from "lucide-react";

export interface DgiiQrParseResult {
    rawText: string;
    rncEmisor?: string;
    rncComprador?: string;
    eNcf?: string;
    ncf?: string;
    issueDate?: string;
    totalAmount?: number;
    taxAmount?: number;
    securityCode?: string;
    isValidDgiiFormat: boolean;
}

interface DgiiQrScannerProps {
    onScanSuccess: (result: DgiiQrParseResult) => void;
    onClose?: () => void;
}

export function parseDgiiQrPayload(decodedText: string): DgiiQrParseResult {
    const result: DgiiQrParseResult = {
        rawText: decodedText,
        isValidDgiiFormat: false
    };

    try {
        // Caso 1: URL de la DGII (ej. https://ecf.dgii.gov.do/consultatimbre?...)
        if (decodedText.includes("http://") || decodedText.includes("https://")) {
            const url = new URL(decodedText);
            const params = url.searchParams;

            result.rncEmisor = params.get("RncEmisor") || params.get("rncEmisor") || params.get("rnc") || undefined;
            result.rncComprador = params.get("RncComprador") || params.get("rncComprador") || params.get("rncComprador") || undefined;
            
            const rawNcf = params.get("ENCF") || params.get("eNCF") || params.get("encf") || params.get("NCF") || params.get("ncf");
            if (rawNcf) {
                if (rawNcf.toUpperCase().startsWith("E")) {
                    result.eNcf = rawNcf.toUpperCase();
                } else {
                    result.ncf = rawNcf.toUpperCase();
                }
            }

            result.issueDate = params.get("FechaEmision") || params.get("fechaEmision") || params.get("Fecha") || undefined;
            
            const totalStr = params.get("MontoTotal") || params.get("montoTotal") || params.get("Total") || params.get("total");
            if (totalStr) result.totalAmount = parseFloat(totalStr.replace(/,/g, ''));

            const itbisStr = params.get("MontoITBIS") || params.get("montoITBIS") || params.get("MontoItbis") || params.get("ITBIS") || params.get("itbis");
            if (itbisStr) result.taxAmount = parseFloat(itbisStr.replace(/,/g, ''));

            result.securityCode = params.get("CodigoSeguridad") || params.get("codigoSeguridad") || params.get("CodSeguridad") || params.get("cs") || undefined;

            if (result.eNcf || result.ncf || result.rncEmisor) {
                result.isValidDgiiFormat = true;
                return result;
            }
        }

        // Caso 2: Formato Delimitado por Pipes (|)
        if (decodedText.includes("|")) {
            const parts = decodedText.split("|").map(p => p.trim());
            // Estructura común: RNC_EMISOR|RNC_COMPRADOR|ENCF|COD_SEGURIDAD|FECHA|MONTO|ITBIS
            if (parts.length >= 3) {
                result.rncEmisor = parts[0];
                result.rncComprador = parts[1];
                const code = parts[2];
                if (code.toUpperCase().startsWith("E")) result.eNcf = code.toUpperCase();
                else result.ncf = code.toUpperCase();

                if (parts[3] && !parts[3].includes("-")) result.securityCode = parts[3];
                if (parts[4] && parts[4].includes("-")) result.issueDate = parts[4];
                if (parts[5]) result.totalAmount = parseFloat(parts[5].replace(/,/g, ''));
                if (parts[6]) result.taxAmount = parseFloat(parts[6].replace(/,/g, ''));

                result.isValidDgiiFormat = true;
                return result;
            }
        }

        // Caso 3: NCF o e-NCF directo en el QR
        const ncfMatch = decodedText.match(/\\b([EB]\\d{10,12})\\b/i);
        if (ncfMatch) {
            const code = ncfMatch[1].toUpperCase();
            if (code.startsWith("E")) result.eNcf = code;
            else result.ncf = code;
            result.isValidDgiiFormat = true;
        }

        const rncMatch = decodedText.match(/\\b(1\\d{8}|\\d{9}|\\d{11})\\b/);
        if (rncMatch) {
            result.rncEmisor = rncMatch[1];
        }

    } catch (e) {
        console.error("Error parsing QR payload:", e);
    }

    return result;
}

export function DgiiQrScanner({ onScanSuccess, onClose }: DgiiQrScannerProps) {
    const [scannerRunning, setScannerRunning] = useState(false);
    const [scannedData, setScannedData] = useState<DgiiQrParseResult | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
    const containerId = "dgii-qr-reader-container";

    const startScanner = async () => {
        try {
            setErrorMsg(null);
            const html5QrCode = new Html5Qrcode(containerId);
            html5QrCodeRef.current = html5QrCode;

            const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0
            };

            await html5QrCode.start(
                { facingMode: "environment" },
                config,
                (decodedText) => {
                    const parsed = parseDgiiQrPayload(decodedText);
                    setScannedData(parsed);
                    stopScanner();
                    onScanSuccess(parsed);
                },
                (errorMessage) => {
                    // ignore frame scan failures
                }
            );

            setScannerRunning(true);
        } catch (err: any) {
            console.error("Error starting QR scanner:", err);
            setErrorMsg("No se pudo acceder a la cámara. Puedes subir una foto del código QR.");
            setScannerRunning(false);
        }
    };

    const stopScanner = async () => {
        if (html5QrCodeRef.current && scannerRunning) {
            try {
                await html5QrCodeRef.current.stop();
                html5QrCodeRef.current = null;
            } catch (e) {
                console.error("Error stopping scanner:", e);
            }
            setScannerRunning(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setErrorMsg(null);
            const html5QrCode = new Html5Qrcode(containerId);
            const decodedText = await html5QrCode.scanFile(file, true);
            const parsed = parseDgiiQrPayload(decodedText);
            setScannedData(parsed);
            onScanSuccess(parsed);
        } catch (err) {
            setErrorMsg("No se detectó ningún código QR válido en la imagen seleccionada.");
        }
    };

    useEffect(() => {
        startScanner();
        return () => {
            if (html5QrCodeRef.current) {
                html5QrCodeRef.current.stop().catch(() => {});
            }
        };
    }, []);

    return (
        <Card className="w-full max-w-md mx-auto shadow-2xl border-2 border-indigo-200">
            <CardHeader className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-4 rounded-t-xl flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-indigo-400" />
                    <div>
                        <CardTitle className="text-sm font-black">Escáner QR DGII (e-CF)</CardTitle>
                        <CardDescription className="text-xs text-slate-300">Lectura instantánea de Facturación Electrónica</CardDescription>
                    </div>
                </div>
                {onClose && (
                    <Button variant="ghost" size="icon" onClick={() => { stopScanner(); onClose(); }} className="text-white hover:bg-white/20 h-8 w-8">
                        <X className="w-4 h-4" />
                    </Button>
                )}
            </CardHeader>

            <CardContent className="p-4 space-y-4">
                <div className="relative rounded-2xl overflow-hidden bg-black aspect-square flex items-center justify-center border-2 border-slate-700">
                    <div id={containerId} className="w-full h-full" />
                </div>

                {errorMsg && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{errorMsg}</span>
                    </div>
                )}

                {scannedData && scannedData.isValidDgiiFormat && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1 text-xs text-emerald-900">
                        <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            Comprobante e-CF Detectado Exitosamente
                        </div>
                        <div className="grid grid-cols-2 gap-1 pt-1 font-mono text-[11px]">
                            <div><strong>e-NCF:</strong> {scannedData.eNcf || scannedData.ncf || "N/A"}</div>
                            <div><strong>RNC:</strong> {scannedData.rncEmisor || "N/A"}</div>
                            <div><strong>Total:</strong> RD$ {scannedData.totalAmount?.toLocaleString() || "0"}</div>
                            <div><strong>ITBIS:</strong> RD$ {scannedData.taxAmount?.toLocaleString() || "0"}</div>
                        </div>
                    </div>
                )}

                <div className="flex items-center justify-between gap-2 pt-2 border-t">
                    <label className="flex-1">
                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleFileUpload}
                        />
                        <Button type="button" variant="outline" className="w-full text-xs font-semibold gap-1.5 h-9" asChild>
                            <span>
                                <Upload className="w-3.5 h-3.5" /> Subir Foto con QR
                            </span>
                        </Button>
                    </label>

                    {!scannerRunning ? (
                        <Button type="button" onClick={startScanner} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold gap-1.5 h-9">
                            <Camera className="w-3.5 h-3.5" /> Reactivar Cámara
                        </Button>
                    ) : (
                        <Button type="button" variant="secondary" onClick={stopScanner} className="text-xs font-bold gap-1.5 h-9">
                            Pausar Cámara
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
