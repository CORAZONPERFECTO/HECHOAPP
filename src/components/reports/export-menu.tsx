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
            <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuLabel className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Formatos PDF
                </DropdownMenuLabel>

                <DropdownMenuItem
                    onClick={() => handleExport('PDF Corporativo', () => exportToPDFModern(report))}
                    disabled={exporting}
                    className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-semibold cursor-pointer border border-emerald-200/60 dark:border-emerald-800/40 rounded-lg p-2.5 my-1"
                >
                    <Sparkles className="mr-2.5 h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                            <span className="text-sm">PDF Corporativo Moderno</span>
                            <span className="bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase">Oficial</span>
                        </div>
                        <span className="text-[11px] font-normal text-emerald-700/80 dark:text-emerald-400/80">Paginación inteligente & sin cortes</span>
                    </div>
                </DropdownMenuItem>

                <DropdownMenuItem
                    onClick={() => handleExport('Impresión', exportToPDFStandard)}
                    disabled={exporting}
                    className="cursor-pointer p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg"
                >
                    <Printer className="mr-2.5 h-4 w-4 text-slate-500 shrink-0" />
                    <div className="flex flex-col">
                        <span className="text-xs font-medium text-slate-800 dark:text-zinc-200">Impresión Directa (Navegador)</span>
                        <span className="text-[10px] text-slate-400">Diálogo de impresión del sistema</span>
                    </div>
                </DropdownMenuItem>

                <DropdownMenuItem
                    onClick={() => handleExport('Simple', () => exportToPDFWith2Photos(report))}
                    disabled={exporting}
                    className="cursor-pointer p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg"
                >
                    <LayoutTemplate className="mr-2.5 h-4 w-4 text-slate-500 shrink-0" />
                    <div className="flex flex-col">
                        <span className="text-xs font-medium text-slate-800 dark:text-zinc-200">PDF Compacto</span>
                        <span className="text-[10px] text-slate-400">Formato simplificado de 2 fotos</span>
                    </div>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="my-1.5" />
                <DropdownMenuLabel className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Otros Formatos
                </DropdownMenuLabel>

                <DropdownMenuItem
                    onClick={() => handleExport('Word', () => exportToWord(report))}
                    disabled={exporting}
                    className="cursor-pointer p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg"
                >
                    <FileText className="mr-2.5 h-4 w-4 text-blue-500 shrink-0" />
                    <div className="flex flex-col">
                        <span className="text-xs font-medium text-slate-800 dark:text-zinc-200">Microsoft Word (.docx)</span>
                        <span className="text-[10px] text-slate-400">Documento editable para oficina</span>
                    </div>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
