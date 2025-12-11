'use client';

import { TicketReportNew } from '@/types/schema';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { FileDown, FileText, Image, Loader2, Sparkles, Printer, LayoutTemplate } from 'lucide-react';
import {
    exportToPDFStandard,
    exportToPDFModern,
    exportToPDFWith2Photos,
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
                            {exportType ? exportType : 'Exportando...'}
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
                <DropdownMenuLabel className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Formatos PDF
                </DropdownMenuLabel>

                <DropdownMenuItem
                    onClick={() => handleExport('Moderno', () => exportToPDFModern(report))}
                    disabled={exporting}
                    className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium cursor-pointer"
                >
                    <Sparkles className="mr-2 h-4 w-4 text-blue-500" />
                    <div className="flex flex-col">
                        <span>Moderno 2025</span>
                        <span className="text-[10px] opacity-80">Diseño corporativo + Grid</span>
                    </div>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                    onClick={() => handleExport('Clásico', exportToPDFStandard)}
                    disabled={exporting}
                    className="cursor-pointer"
                >
                    <Printer className="mr-2 h-4 w-4" />
                    <div className="flex flex-col">
                        <span>Clásico</span>
                        <span className="text-[10px] text-gray-500">Formato original (Impresión)</span>
                    </div>
                </DropdownMenuItem>

                <DropdownMenuItem
                    onClick={() => handleExport('Simple', () => exportToPDFWith2Photos(report))}
                    disabled={exporting}
                    className="cursor-pointer"
                >
                    <LayoutTemplate className="mr-2 h-4 w-4" />
                    <div className="flex flex-col">
                        <span>Simple</span>
                        <span className="text-[10px] text-gray-500">PDF Compacto</span>
                    </div>
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Otros
                </DropdownMenuLabel>

                <DropdownMenuItem
                    onClick={() => handleExport('Word', () => exportToWord(report))}
                    disabled={exporting}
                    className="cursor-pointer"
                >
                    <FileText className="mr-2 h-4 w-4" />
                    <div className="flex flex-col">
                        <span>Word (.docx)</span>
                        <span className="text-[10px] text-gray-500">Documento editable</span>
                    </div>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
