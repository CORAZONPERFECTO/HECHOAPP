"use client";

import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
    ZoomIn,
    ZoomOut,
    RotateCcw,
    Download,
    ExternalLink,
    Share2,
    FileText,
    Loader2,
} from "lucide-react";
import { saveAs } from "file-saver";

interface DocumentViewerModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    pdfBlob?: Blob | null;
    pdfUrl?: string | null;
    title?: string;
    documentNumber?: string;
    clientName?: string;
    villaName?: string;
    documentDate?: string;
    downloadFileName?: string;
    isInternalOnly?: boolean;
}

export function DocumentViewerModal({
    open,
    onOpenChange,
    pdfBlob,
    pdfUrl: incomingUrl,
    title = "Vista Previa de Cotización",
    documentNumber = "COT-DOC",
    clientName = "Cliente",
    villaName,
    documentDate,
    downloadFileName,
    isInternalOnly = false,
}: DocumentViewerModalProps) {
    const [localUrl, setLocalUrl] = useState<string | null>(null);
    const [zoom, setZoom] = useState<number>(100);
    const [isMobile, setIsMobile] = useState(false);

    // Detect mobile viewport
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    // Manage blob URL lifecycle
    useEffect(() => {
        if (pdfBlob) {
            const url = URL.createObjectURL(pdfBlob);
            setLocalUrl(url);
            return () => {
                URL.revokeObjectURL(url);
            };
        } else if (incomingUrl) {
            setLocalUrl(incomingUrl);
        } else {
            setLocalUrl(null);
        }
    }, [pdfBlob, incomingUrl]);

    // Reset zoom on open
    useEffect(() => {
        if (open) {
            setZoom(100);
        }
    }, [open]);

    const activeUrl = localUrl;

    const handleZoomIn = () => {
        setZoom((prev) => Math.min(prev + 20, 200));
    };

    const handleZoomOut = () => {
        setZoom((prev) => Math.max(prev - 20, 60));
    };

    const handleResetZoom = () => {
        setZoom(100);
    };

    // Clean string helper for file names
    const sanitizeName = (str: string) => {
        return str
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9_-]/g, "_")
            .replace(/_+/g, "_")
            .replace(/^_|_$/g, "");
    };

    const getFormattedFileName = () => {
        if (downloadFileName) {
            return downloadFileName.endsWith(".pdf") ? downloadFileName : `${downloadFileName}.pdf`;
        }

        const typePrefix = isInternalOnly ? "PRESUPUESTO_INTERNO" : "COTIZACION";
        const parts: string[] = [typePrefix];

        if (villaName && villaName.trim()) {
            parts.push(sanitizeName(villaName.trim()));
        }
        if (clientName && clientName.trim() && clientName !== "Cliente") {
            parts.push(sanitizeName(clientName.trim()));
        }

        const dateStr = documentDate || new Date().toISOString().split("T")[0];
        parts.push(dateStr);

        if (documentNumber && documentNumber.trim()) {
            parts.push(sanitizeName(documentNumber.trim()));
        }

        return `${parts.join("_")}.pdf`;
    };

    const handleDownload = () => {
        const fileName = getFormattedFileName();
        if (pdfBlob) {
            saveAs(pdfBlob, fileName);
        } else if (activeUrl) {
            const link = document.createElement("a");
            link.href = activeUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const handleOpenInNewTab = () => {
        if (activeUrl) {
            window.open(activeUrl, "_blank");
        }
    };

    const handleShareWhatsApp = async () => {
        const fileName = `${documentNumber}.pdf`;
        const shareText = isInternalOnly
            ? `📄 Presupuesto Interno No. ${documentNumber} — HECHO SRL (Uso Confidencial)`
            : `Estimado/a ${clientName}, le compartimos la cotización formal No. ${documentNumber} emitida por HECHO SRL. Quedamos a su entera disposición.`;

        // If Web Share API is supported with files and we have a blob
        if (navigator.share && pdfBlob) {
            try {
                const file = new File([pdfBlob], fileName, { type: "application/pdf" });
                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        title: `Cotización ${documentNumber} - HECHO SRL`,
                        text: shareText,
                        files: [file],
                    });
                    return;
                }
            } catch (err) {
                // Fallback to text link
                console.log("Web Share API fallback:", err);
            }
        }

        // WhatsApp Web / App text fallback
        const encoded = encodeURIComponent(shareText);
        window.open(`https://wa.me/?text=${encoded}`, "_blank");
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl w-[96vw] h-[92vh] p-0 flex flex-col overflow-hidden bg-slate-900 border-slate-700 shadow-2xl rounded-2xl">
                {/* Header Bar */}
                <DialogHeader className="px-4 py-3 bg-slate-900 border-b border-slate-800 text-white shrink-0 flex flex-row items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`p-2 rounded-lg ${isInternalOnly ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                            <FileText className="h-5 w-5" />
                        </div>
                        <div className="truncate">
                            <DialogTitle className="text-sm md:text-base font-bold text-slate-100 flex items-center gap-2 truncate">
                                <span>{title}</span>
                                {isInternalOnly ? (
                                    <span className="bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] px-2 py-0.5 rounded-full font-semibold">
                                        USO INTERNO
                                    </span>
                                ) : (
                                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded-full font-semibold">
                                        CLIENTE
                                    </span>
                                )}
                            </DialogTitle>
                            <DialogDescription className="text-xs text-slate-400 truncate">
                                {documentNumber} • {clientName}
                            </DialogDescription>
                        </div>
                    </div>

                    {/* Toolbar Actions */}
                    <div className="flex items-center gap-1.5 md:gap-2">
                        {/* Zoom Controls (Desktop only) */}
                        <div className="hidden sm:flex items-center bg-slate-800/80 border border-slate-700 rounded-lg p-0.5 mr-1">
                            <Button
                                size="icon"
                                variant="ghost"
                                onClick={handleZoomOut}
                                disabled={zoom <= 60}
                                className="h-7 w-7 text-slate-300 hover:text-white hover:bg-slate-700"
                                title="Reducir zoom"
                            >
                                <ZoomOut className="h-3.5 w-3.5" />
                            </Button>
                            <span className="text-[11px] font-mono text-slate-300 px-1.5 min-w-[3rem] text-center">
                                {zoom}%
                            </span>
                            <Button
                                size="icon"
                                variant="ghost"
                                onClick={handleZoomIn}
                                disabled={zoom >= 200}
                                className="h-7 w-7 text-slate-300 hover:text-white hover:bg-slate-700"
                                title="Aumentar zoom"
                            >
                                <ZoomIn className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                                size="icon"
                                variant="ghost"
                                onClick={handleResetZoom}
                                className="h-7 w-7 text-slate-400 hover:text-white hover:bg-slate-700"
                                title="Ajustar 100%"
                            >
                                <RotateCcw className="h-3 w-3" />
                            </Button>
                        </div>

                        {/* Open in New Tab */}
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleOpenInNewTab}
                            className="text-slate-300 hover:text-white hover:bg-slate-800 text-xs gap-1.5 h-8 px-2.5 hidden sm:flex"
                            title="Abrir en pestaña completa"
                        >
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span>Abrir</span>
                        </Button>

                        {/* WhatsApp Button (Only client documents) */}
                        {!isInternalOnly && (
                            <Button
                                size="sm"
                                onClick={handleShareWhatsApp}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 h-8 px-2.5 font-semibold shadow-sm"
                                title="Compartir vía WhatsApp"
                            >
                                <Share2 className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">WhatsApp</span>
                            </Button>
                        )}

                        {/* Download PDF */}
                        <Button
                            size="sm"
                            onClick={handleDownload}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5 h-8 px-3 font-semibold shadow-sm"
                            title="Descargar archivo PDF"
                        >
                            <Download className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Descargar</span>
                        </Button>
                    </div>
                </DialogHeader>

                {/* Main PDF Viewer Stage */}
                <div className="flex-1 w-full bg-slate-950/60 overflow-auto flex items-center justify-center p-2 sm:p-4">
                    {activeUrl ? (
                        <div
                            className="transition-transform duration-150 origin-top w-full h-full flex justify-center"
                            style={{
                                transform: zoom !== 100 ? `scale(${zoom / 100})` : undefined,
                                width: zoom > 100 ? `${zoom}%` : "100%",
                                height: zoom > 100 ? `${zoom}%` : "100%",
                            }}
                        >
                            {/* Standard PDF embed/iframe viewer */}
                            <iframe
                                src={`${activeUrl}#toolbar=0&navpanes=0&scrollbar=1`}
                                className="w-full h-full border border-slate-800 rounded-lg shadow-2xl bg-white"
                                title={`Documento ${documentNumber}`}
                            />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center text-slate-400 gap-3 py-16">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                            <p className="text-sm font-medium">Renderizando documento PDF...</p>
                        </div>
                    )}
                </div>

                {/* Mobile Quick Action Footer */}
                {isMobile && (
                    <div className="p-2.5 bg-slate-900 border-t border-slate-800 flex justify-around items-center shrink-0">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleOpenInNewTab}
                            className="text-slate-300 hover:text-white text-xs gap-1.5"
                        >
                            <ExternalLink className="h-3.5 w-3.5" /> Pantalla completa
                        </Button>
                        {!isInternalOnly && (
                            <Button
                                size="sm"
                                onClick={handleShareWhatsApp}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 font-semibold"
                            >
                                <Share2 className="h-3.5 w-3.5" /> WhatsApp
                            </Button>
                        )}
                        <Button
                            size="sm"
                            onClick={handleDownload}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5 font-semibold"
                        >
                            <Download className="h-3.5 w-3.5" /> Descargar
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
