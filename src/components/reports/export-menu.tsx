'use client';

import { TicketReportNew } from '@/types/schema';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { FileDown, FileText, Image, Loader2 } from 'lucide-react';
import {
    exportToPDFStandard,
    exportToPDFWith2Photos,
    exportToPDFWith3Photos,
    exportToWord,
} from '@/lib/export-utils';
import { useState } from 'react';

interface ExportMenuProps {
    report: TicketReportNew;
}

export function ExportMenu({ report }: ExportMenuProps) {
    const [exporting, setExporting] = useState(false);
    const [exportType, setExportType] = useState<string>('');

    const handleExport = async (type: string, exportFn: () => Promise<void>) => {
        setExporting(true);
        setExportType(type);
        try {
            await exportFn();
        } catch (error) {
            console.error(`Error exporting as ${type}:`, error);
            alert(`Error al exportar como ${type}`);
        } finally {
            setExporting(false);
            setExportType('');
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    className="gap-2 bg-blue-600 hover:bg-blue-700"
                    disabled={exporting}
                >
                    {exporting ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Exportando...
                        </>
                    ) : (
                        <>
                            <FileDown className="h-4 w-4" />
                            Exportar
                        </>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
                <div className="px-2 py-1.5 text-sm font-semibold text-gray-700">
                    Formato de Exportación
                </div>
                <DropdownMenuSeparator />

                <DropdownMenuItem
                    onClick={() => handleExport('PDF Estándar', exportToPDFStandard)}
                    disabled={exporting}
                >
                    <FileText className="mr-2 h-4 w-4" />
                    <div className="flex flex-col">
                        <span>PDF Estándar</span>
                        <span className="text-xs text-gray-500">Fotos integradas en el documento</span>
                    </div>
                </DropdownMenuItem>

                <DropdownMenuItem
                    onClick={() => handleExport('PDF 2 Fotos', () => exportToPDFWith2Photos(report))}
                    disabled={exporting}
                >
                    <Image className="mr-2 h-4 w-4" />
                    <div className="flex flex-col">
                        <span>PDF + 2 Fotos/Página</span>
                        <span className="text-xs text-gray-500">Anexo fotográfico separado</span>
                    </div>
                </DropdownMenuItem>

                <DropdownMenuItem
                    onClick={() => handleExport('PDF 3 Fotos', () => exportToPDFWith3Photos(report))}
                    disabled={exporting}
                >
                    <Image className="mr-2 h-4 w-4" />
                    <div className="flex flex-col">
                        <span>PDF + 3 Fotos/Página</span>
                        <span className="text-xs text-gray-500">Anexo fotográfico compacto</span>
                    </div>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                    onClick={() => handleExport('Word', () => exportToWord(report))}
                    disabled={exporting}
                >
                    <FileText className="mr-2 h-4 w-4" />
                    <div className="flex flex-col">
                        <span>Word (.docx)</span>
                        <span className="text-xs text-gray-500">Documento editable</span>
                    </div>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
