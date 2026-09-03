"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Printer, Download, Sparkles, Image as ImageIcon, CheckCircle2, Loader2, Building2, Calendar, DollarSign, User, FileText } from "lucide-react";
import { Purchase } from "@/types/purchase";
import { processReceiptImage, ReceiptProcessOptions } from "@/lib/receipt-printer-optimizer";

interface ReceiptPrintModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    purchase: Purchase | null;
    ticketNumber?: string;
    clientName?: string;
}

export function ReceiptPrintModal({
    open,
    onOpenChange,
    purchase,
    ticketNumber,
    clientName
}: ReceiptPrintModalProps) {
    const [mode, setMode] = useState<ReceiptProcessOptions['mode']>('bw_scanner');
    const [threshold, setThreshold] = useState(145);
    const [processedUrl, setProcessedUrl] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);

    const originalUrl = purchase?.evidenceUrls && purchase.evidenceUrls.length > 0 ? purchase.evidenceUrls[0] : null;

    useEffect(() => {
        if (!open || !originalUrl) {
            setProcessedUrl(null);
            return;
        }

        let isMounted = true;
        setProcessing(true);

        processReceiptImage(originalUrl, { mode, threshold })
            .then(result => {
                if (isMounted) {
                    setProcessedUrl(result);
                    setProcessing(false);
                }
            })
            .catch(() => {
                if (isMounted) {
                    setProcessedUrl(originalUrl);
                    setProcessing(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, [open, originalUrl, mode, threshold]);

    if (!purchase) return null;

    const handlePrint = () => {
        window.print();
    };

    const handleDownload = () => {
        if (!processedUrl) return;
        const link = document.createElement('a');
        link.href = processedUrl;
        link.download = `Factura_Limpia_${purchase.providerName || 'Compra'}_${ticketNumber || purchase.ticketId || 'Doc'}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const formattedDate = purchase.date 
        ? (purchase.date as any).seconds 
            ? new Date((purchase.date as any).seconds * 1000).toLocaleDateString('es-DO', { year: 'numeric', month: 'long', day: 'numeric' })
            : new Date(purchase.date as any).toLocaleDateString('es-DO', { year: 'numeric', month: 'long', day: 'numeric' })
        : 'Fecha no registrada';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-4 md:p-6 bg-slate-50 dark:bg-zinc-950">
                <DialogHeader className="print:hidden">
                    <DialogTitle className="text-lg font-bold flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            <Printer className="w-5 h-5 text-blue-600" />
                            Impresión & Descarga Contable de Factura
                        </span>
                        <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" onClick={handleDownload} className="text-xs font-semibold gap-1.5 h-8">
                                <Download className="w-3.5 h-3.5" />
                                Descargar PNG Limpio
                            </Button>
                            <Button size="sm" onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold gap-1.5 h-8">
                                <Printer className="w-3.5 h-3.5" />
                                Imprimir Hoja Contable
                            </Button>
                        </div>
                    </DialogTitle>
                </DialogHeader>

                {/* Print Control Toolbar - Hidden during print */}
                <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 space-y-4 print:hidden">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                        <div>
                            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Modo de Ahorro de Tinta</Label>
                            <p className="text-xs text-slate-500">Elimina sombras y fondos oscuros para que la impresora gaste 0 tinta en los bordes.</p>
                        </div>

                        {/* Mode Selector */}
                        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl">
                            <button
                                onClick={() => setMode('bw_scanner')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${mode === 'bw_scanner' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                            >
                                🖨️ B&N Ahorro Máximo
                            </button>
                            <button
                                onClick={() => setMode('enhanced_color')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${mode === 'enhanced_color' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                            >
                                🎨 Color Limpio
                            </button>
                            <button
                                onClick={() => setMode('original')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${mode === 'original' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                            >
                                📷 Foto Original
                            </button>
                        </div>
                    </div>

                    {mode !== 'original' && (
                        <div className="flex items-center gap-4 pt-2 border-t border-slate-100 dark:border-zinc-800">
                            <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Nivel de Blanqueo de Fondo:</span>
                            <div className="flex-1">
                                <input
                                    type="range"
                                    min={80}
                                    max={220}
                                    step={5}
                                    value={threshold}
                                    onChange={(e) => setThreshold(Number(e.target.value))}
                                    className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-200 rounded-lg appearance-none"
                                />
                            </div>
                            <span className="text-xs font-mono font-bold text-slate-700 w-8">{threshold}</span>
                        </div>
                    )}
                </div>

                {/* Printable Document Container */}
                <div className="printable-sheet bg-white text-slate-900 p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 max-w-3xl mx-auto space-y-6">
                    {/* Header with HECHO SRL */}
                    <div className="flex justify-between items-start pb-4 border-b-2 border-slate-900">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-sm">H</div>
                                <h2 className="text-lg font-black tracking-tight uppercase">HECHO SRL</h2>
                            </div>
                            <p className="text-[11px] text-slate-600 font-medium">RNC: 131947532 • Comprobante de Soporte de Gastos</p>
                        </div>

                        <div className="text-right space-y-0.5">
                            <span className="inline-block px-2.5 py-0.5 bg-slate-100 text-slate-800 font-mono font-bold text-xs rounded border border-slate-300">
                                Ticket #{ticketNumber || purchase.ticketNumber || purchase.ticketId?.slice(0, 8) || 'N/D'}
                            </span>
                            <p className="text-[11px] text-slate-500">{formattedDate}</p>
                        </div>
                    </div>

                    {/* Meta Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                        <div>
                            <span className="text-[10px] text-slate-500 block uppercase font-bold">Proveedor</span>
                            <span className="font-bold text-slate-900">{purchase.providerName || 'Proveedor General'}</span>
                        </div>
                        <div>
                            <span className="text-[10px] text-slate-500 block uppercase font-bold">RNC Emisor</span>
                            <span className="font-mono font-semibold text-slate-800">{purchase.rnc || 'No especificado'}</span>
                        </div>
                        <div>
                            <span className="text-[10px] text-slate-500 block uppercase font-bold">NCF / e-NCF</span>
                            <span className="font-mono font-bold text-blue-700">{purchase.eNcf || purchase.ncf || 'Comprobante Simple'}</span>
                        </div>
                        <div>
                            <span className="text-[10px] text-slate-500 block uppercase font-bold">Monto Total</span>
                            <span className="font-mono font-extrabold text-slate-900 text-sm">RD$ {purchase.total?.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>

                    {/* Items List */}
                    {purchase.items && purchase.items.length > 0 && (
                        <div className="space-y-1.5">
                            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Detalle de Items / Conceptos</h4>
                            <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-100 text-slate-700 text-[10px] uppercase font-bold border-b">
                                        <tr>
                                            <th className="p-2">Descripción</th>
                                            <th className="p-2 text-center">Cant.</th>
                                            <th className="p-2 text-right">Precio Unit.</th>
                                            <th className="p-2 text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {purchase.items.map((item, idx) => (
                                            <tr key={idx}>
                                                <td className="p-2 font-medium">{item.description}</td>
                                                <td className="p-2 text-center font-mono">{item.quantity}</td>
                                                <td className="p-2 text-right font-mono">RD$ {item.unitPrice?.toLocaleString()}</td>
                                                <td className="p-2 text-right font-mono font-bold">RD$ {item.total?.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Receipt Clean Image */}
                    <div className="space-y-2">
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                            <span>Comprobante / Bauche Adjunto</span>
                            <span className="text-[10px] text-emerald-600 font-normal">Fondo Blanco Optimizado para Impresión</span>
                        </h4>

                        <div className="w-full min-h-[260px] bg-white rounded-xl border border-slate-200 p-2 flex items-center justify-center overflow-hidden">
                            {processing ? (
                                <div className="flex flex-col items-center justify-center p-8 text-slate-400 gap-2">
                                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                                    <span className="text-xs">Blanqueando fondo de imagen...</span>
                                </div>
                            ) : processedUrl ? (
                                <img
                                    src={processedUrl}
                                    alt="Factura Procesada"
                                    className="max-h-[500px] w-auto max-w-full object-contain mx-auto"
                                />
                            ) : (
                                <div className="p-8 text-center text-slate-400 text-xs">Sin imagen adjunta</div>
                            )}
                        </div>
                    </div>

                    {/* Signatures for Accounting */}
                    <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-center">
                        <div>
                            <div className="h-14 border-b border-slate-300"></div>
                            <p className="text-[10px] uppercase font-bold text-slate-700 mt-1.5">Entregado por (Técnico)</p>
                        </div>
                        <div>
                            <div className="h-14 border-b border-slate-300"></div>
                            <p className="text-[10px] uppercase font-bold text-slate-700 mt-1.5">Revisado y Aprobado (Contabilidad)</p>
                        </div>
                    </div>
                </div>

                <style jsx global>{`
                    @media print {
                        body * {
                            visibility: hidden;
                        }
                        .printable-sheet, .printable-sheet * {
                            visibility: visible;
                        }
                        .printable-sheet {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                            padding: 0;
                            margin: 0;
                            box-shadow: none;
                            border: none;
                        }
                    }
                `}</style>
            </DialogContent>
        </Dialog>
    );
}
