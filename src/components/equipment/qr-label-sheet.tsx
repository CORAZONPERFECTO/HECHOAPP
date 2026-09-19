"use client";

import { useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";
import { EquipmentPassport } from "@/types/equipment";

interface QRLabelSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    equipments: EquipmentPassport[];
    title?: string;
}

export function QRLabelSheet({ open, onOpenChange, equipments, title = "Etiquetas QR de Equipos" }: QRLabelSheetProps) {
    const printAreaRef = useRef<HTMLDivElement>(null);

    const handlePrint = () => {
        const origin = typeof window !== "undefined" ? window.location.origin : "https://hecho.online";

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert("Permite las ventanas emergentes para imprimir las etiquetas.");
            return;
        }

        const labelsHtml = equipments.map(eq => {
            const targetUrl = `${origin}/qr/${eq.code || eq.qrToken || eq.id}`;
            const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(targetUrl)}`;

            return `
            <div class="label-card">
                <div class="label-header">
                    <div class="brand-title">HECHO SRL</div>
                    <div class="brand-subtitle">CLIMATIZACIÓN & MANTENIMIENTO</div>
                </div>
                
                <div class="label-body">
                    <div class="qr-container">
                        <img src="${qrImageUrl}" alt="QR ${eq.code}" />
                        <div class="code-badge">${eq.code}</div>
                    </div>
                    
                    <div class="info-container">
                        <div class="prop-name">${eq.locationName || 'Villa'}</div>
                        <div class="area-name">${eq.areaName || eq.name}</div>
                        
                        <div class="spec-row">
                            <span class="spec-label">Marca:</span>
                            <span class="spec-val">${eq.specs.brand || 'Genérica'}</span>
                        </div>
                        <div class="spec-row">
                            <span class="spec-label">Capacidad:</span>
                            <span class="spec-val">${eq.specs.btu ? `${eq.specs.btu} BTU` : 'N/D'}</span>
                        </div>
                        <div class="spec-row">
                            <span class="spec-label">Refrigerante:</span>
                            <span class="spec-val">${eq.specs.refrigerant || 'R410A'}</span>
                        </div>
                        ${eq.specs.serialNumber ? `
                        <div class="spec-row">
                            <span class="spec-label">S/N:</span>
                            <span class="spec-val mono">${eq.specs.serialNumber}</span>
                        </div>` : ''}
                    </div>
                </div>
                
                <div class="label-footer">
                    Escanee con la cámara para bitácora, diagnósticos y servicio técnico
                </div>
            </div>
            `;
        }).join('');

        printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>${title}</title>
            <style>
                @page {
                    size: letter portrait;
                    margin: 10mm;
                }
                * {
                    box-sizing: border-box;
                    margin: 0;
                    padding: 0;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                }
                body {
                    background: #fff;
                    color: #0f172a;
                    padding: 10px;
                }
                .sheet-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 8mm;
                    page-break-inside: avoid;
                }
                .label-card {
                    border: 2px solid #0f172a;
                    border-radius: 8px;
                    padding: 8px 12px;
                    display: flex;
                    flex-direction: column;
                    background: #fff;
                    page-break-inside: avoid;
                    min-height: 48mm;
                }
                .label-header {
                    border-bottom: 1.5px solid #0f172a;
                    padding-bottom: 4px;
                    margin-bottom: 6px;
                    display: flex;
                    justify-content: space-between;
                    align-items: baseline;
                }
                .brand-title {
                    font-size: 13px;
                    font-weight: 900;
                    letter-spacing: 0.5px;
                    color: #0f172a;
                }
                .brand-subtitle {
                    font-size: 8px;
                    font-weight: 700;
                    color: #475569;
                    letter-spacing: 0.3px;
                }
                .label-body {
                    display: flex;
                    gap: 10px;
                    align-items: center;
                    flex: 1;
                }
                .qr-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    width: 32mm;
                    flex-shrink: 0;
                }
                .qr-container img {
                    width: 28mm;
                    height: 28mm;
                    display: block;
                }
                .code-badge {
                    font-family: monospace;
                    font-size: 10px;
                    font-weight: 800;
                    background: #0f172a;
                    color: #fff;
                    padding: 1px 6px;
                    border-radius: 4px;
                    margin-top: 3px;
                    letter-spacing: 0.5px;
                }
                .info-container {
                    flex: 1;
                    min-width: 0;
                }
                .prop-name {
                    font-size: 9px;
                    text-transform: uppercase;
                    font-weight: 700;
                    color: #64748b;
                    letter-spacing: 0.5px;
                }
                .area-name {
                    font-size: 14px;
                    font-weight: 800;
                    color: #0f172a;
                    line-height: 1.15;
                    margin-bottom: 4px;
                }
                .spec-row {
                    display: flex;
                    font-size: 9px;
                    line-height: 1.35;
                    color: #334155;
                }
                .spec-label {
                    width: 22mm;
                    font-weight: 600;
                    color: #64748b;
                }
                .spec-val {
                    font-weight: 700;
                    color: #0f172a;
                }
                .mono {
                    font-family: monospace;
                    font-size: 8.5px;
                }
                .label-footer {
                    border-top: 1px solid #cbd5e1;
                    padding-top: 3px;
                    margin-top: 6px;
                    font-size: 7.5px;
                    text-align: center;
                    color: #64748b;
                    font-weight: 500;
                }
            </style>
        </head>
        <body>
            <div class="sheet-grid">
                ${labelsHtml}
            </div>
            <script>
                window.onload = function() {
                    window.print();
                    setTimeout(function() { window.close(); }, 500);
                }
            </script>
        </body>
        </html>
        `);
        printWindow.document.close();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center justify-between">
                        <span>{title} ({equipments.length})</span>
                    </DialogTitle>
                </DialogHeader>

                <div className="py-3">
                    <p className="text-xs text-slate-600 mb-4">
                        Formato industrial preparado para imprimir en hojas adhesivas. Cada etiqueta cuenta con su código permanente <strong>EQ-XXXXX</strong> y QR de resolución instantánea.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[55vh] overflow-y-auto p-2 bg-slate-50 border rounded-xl">
                        {equipments.map(eq => {
                            const targetUrl = typeof window !== "undefined" ? `${window.location.origin}/qr/${eq.code}` : `/qr/${eq.code}`;
                            const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(targetUrl)}`;

                            return (
                                <div key={eq.id} className="p-3 bg-white border border-slate-300 rounded-lg shadow-xs flex gap-3 items-center">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={qrImageUrl} alt={eq.code} className="w-16 h-16 object-contain flex-shrink-0" />
                                    <div className="min-w-0 text-xs">
                                        <span className="font-mono text-[10px] font-bold bg-slate-900 text-white px-1.5 py-0.5 rounded">
                                            {eq.code}
                                        </span>
                                        <h4 className="font-bold text-slate-900 mt-1 truncate">{eq.areaName || eq.name}</h4>
                                        <p className="text-[11px] text-slate-500 truncate">{eq.specs.brand} • {eq.specs.btu ? `${eq.specs.btu} BTU` : ''}</p>
                                        <p className="text-[10px] text-slate-400">{eq.locationName}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <DialogFooter className="flex justify-between sm:justify-between">
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>
                        <X className="w-4 h-4 mr-1.5" />
                        Cerrar
                    </Button>
                    <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700">
                        <Printer className="w-4 h-4 mr-2" />
                        Imprimir Etiquetas en Hoja Adhesiva
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
