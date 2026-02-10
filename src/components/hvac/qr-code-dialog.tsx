"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";

interface QRCodeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    assetName: string;
    qrCode: string; // The UUID/Code
}

export function QRCodeDialog({ open, onOpenChange, assetName, qrCode }: QRCodeDialogProps) {
    // Using a reliable public API for generating the QR image
    // In production, this should be replaced with a local library like 'qrcode.react' or 'bwip-js' for offline support
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCode)}`;

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(`
        <html>
          <head>
            <title>QR Code - ${assetName}</title>
            <style>
              body { font-family: sans-serif; text-align: center; padding: 20px; }
              img { max-width: 100%; height: auto; margin-bottom: 20px; }
              .label { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
              .code { font-family: monospace; color: #555; }
            </style>
          </head>
          <body>
            <div class="label">${assetName}</div>
            <img src="${qrImageUrl}" />
            <div class="code">${qrCode}</div>
            <script>
              window.onload = function() { window.print(); window.close(); }
            </script>
          </body>
        </html>
      `);
            printWindow.document.close();
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Código QR: {assetName}</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center justify-center p-6 space-y-4">
                    <div className="bg-white p-4 rounded-xl border shadow-sm">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={qrImageUrl}
                            alt={`QR Code for ${assetName}`}
                            className="w-48 h-48 object-contain"
                            loading="lazy"
                        />
                    </div>
                    <div className="text-center">
                        <p className="text-sm text-gray-500">Escanea este código para acceder al historial y registrar intervenciones.</p>
                        <p className="font-mono text-xs text-gray-400 mt-2 select-all bg-gray-100 p-1 rounded">{qrCode}</p>
                    </div>
                </div>
                <DialogFooter className="sm:justify-between">
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>
                        <X className="w-4 h-4 mr-2" />
                        Cerrar
                    </Button>
                    <Button onClick={handlePrint}>
                        <Printer className="w-4 h-4 mr-2" />
                        Imprimir
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
