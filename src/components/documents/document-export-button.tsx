"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileDown, Printer, Loader2, Settings } from "lucide-react";
import { DocumentData, generateDocumentPDF } from "@/lib/document-generator";
import { useDocumentSettings, DocumentFormat, DocumentType } from "@/stores/document-settings-store";
import { saveAs } from "file-saver";

interface DocumentExportButtonProps {
    data: DocumentData;
    type: DocumentType;
}

export function DocumentExportButton({ data, type }: DocumentExportButtonProps) {
    const { formats, setFormat } = useDocumentSettings();
    const defaultFormat = formats[type] || 'classic';

    const [loading, setLoading] = useState(false);
    const [selectedFormat, setSelectedFormat] = useState<DocumentFormat>(defaultFormat);
    const [showPreview, setShowPreview] = useState(false);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);

    const handleGenerate = async (action: 'download' | 'preview' | 'print') => {
        setLoading(true);
        try {
            const blob = await generateDocumentPDF(data, selectedFormat);

            if (action === 'download') {
                saveAs(blob, `${data.type}-${data.number}.pdf`);
            } else {
                const url = URL.createObjectURL(blob);
                setPdfUrl(url);
                if (action === 'print') {
                    // Open new window for printing
                    const printWindow = window.open(url);
                    if (printWindow) {
                        printWindow.onload = () => {
                            printWindow.print();
                        }
                    }
                } else {
                    setShowPreview(true);
                }
            }
        } catch (error) {
            console.error("Error generating PDF:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                        Exportar / Imprimir
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Formato de Documento</DropdownMenuLabel>
                    <div className="px-2 py-2">
                        <Select
                            value={selectedFormat}
                            onValueChange={(val: DocumentFormat) => setSelectedFormat(val)}
                        >
                            <SelectTrigger className="h-8">
                                <SelectValue placeholder="Seleccionar formato" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="classic">Clásico (Corporativo)</SelectItem>
                                <SelectItem value="modern">Moderno (Color)</SelectItem>
                                <SelectItem value="simple">Simple (Ahorro)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleGenerate('preview')}>
                        <FileDown className="mr-2 h-4 w-4" />
                        Vista Previa
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleGenerate('download')}>
                        <FileDown className="mr-2 h-4 w-4" />
                        Descargar PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleGenerate('print')}>
                        <Printer className="mr-2 h-4 w-4" />
                        Imprimir
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={showPreview} onOpenChange={setShowPreview}>
                <DialogContent className="max-w-4xl h-[90vh]">
                    <DialogHeader>
                        <DialogTitle>Vista Previa ({selectedFormat})</DialogTitle>
                        <DialogDescription>
                            Revisa el documento antes de imprimir.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 w-full h-full bg-gray-100 rounded-md overflow-hidden">
                        {pdfUrl && (
                            <iframe
                                src={pdfUrl}
                                className="w-full h-full border-none"
                                title="PDF Preview"
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
