"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDocumentSettings, DocumentType, DocumentFormat } from "@/stores/document-settings-store";
import { FileText, FileSpreadsheet, StickyNote, Truck, ShoppingCart } from "lucide-react";

export function DocumentFormatSettings() {
    const { formats, setFormat } = useDocumentSettings();

    const docTypes: { type: DocumentType; label: string; icon: any }[] = [
        { type: 'invoice', label: 'Facturas', icon: FileText },
        { type: 'quote', label: 'Cotizaciones', icon: FileSpreadsheet },
        { type: 'order', label: 'Órdenes de Compra', icon: ShoppingCart },
        { type: 'delivery', label: 'Conduces', icon: Truck },
        { type: 'receipt', label: 'Recibos', icon: StickyNote },
    ];

    return (
        <Card>
            <CardHeader>
                <CardTitle>Configuración Predeterminada de Documentos</CardTitle>
                <CardDescription>
                    Selecciona el diseño predeterminado para cada tipo de documento al imprimir o exportar a PDF.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {docTypes.map(({ type, label, icon: Icon }) => (
                        <div key={type} className="flex flex-col space-y-2">
                            <Label className="flex items-center gap-2">
                                <Icon className="h-4 w-4 text-gray-500" />
                                {label}
                            </Label>
                            <Select
                                value={formats[type]}
                                onValueChange={(val: DocumentFormat) => setFormat(type, val)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar formato" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="classic">Clásico (Corporativo)</SelectItem>
                                    <SelectItem value="modern">Moderno (Color)</SelectItem>
                                    <SelectItem value="simple">Simple (Ahorro)</SelectItem>
                                </SelectContent>
                            </Select>
                            <span className="text-xs text-muted-foreground p-1">
                                Vista previa: {formats[type] === 'classic' ? 'Sobrio y Ejecutivo' : formats[type] === 'modern' ? 'Visual y Dinámico' : 'Minimalista'}
                            </span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
