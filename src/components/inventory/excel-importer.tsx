
"use client";

import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FileSpreadsheet, Upload, CheckCircle, AlertTriangle, Loader2, Download } from "lucide-react";
import { InventoryProduct } from "@/types/inventory";
import { createProduct } from "@/lib/inventory-service";
import { useToast } from "@/components/ui/use-toast";

// Helper to download template
const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
        {
            sku: "GAS-410",
            name: "Gas Refrigerante R410A",
            category: "Materiales",
            unit: "LIBRAS",
            minStock: 5,
            averageCost: 450
        }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
    XLSX.writeFile(wb, "plantilla_carga_productos.xlsx");
};

export function ExcelImporter({ onImportSuccess }: { onImportSuccess: () => void }) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);
                setPreviewData(data);
            } catch (error) {
                console.error(error);
                toast({ title: "Error al leer archivo", variant: "destructive" });
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleImport = async () => {
        setLoading(true);
        let successCount = 0;
        let errors = 0;

        try {
            // Process in chunks or one by one (for now sequential to show progress could be nice, but simple promise.all is faster)
            // Using sequential to avoid overwhelming firestore write limits if file is huge, 
            // but for typical usage Promise.all is fine. Let's do batch of 50?
            // Simple sequential for safety:

            for (const row of previewData) {
                try {
                    // Map Row to InventoryProduct
                    // Basic validation
                    if (!row.name) continue;

                    const productToSave: Partial<InventoryProduct> = {
                        sku: row.sku ? String(row.sku).toUpperCase() : `SKU-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                        name: String(row.name),
                        category: row.category || "General",
                        unit: (row.unit || "UNIDAD") as any, // Simple cast, user responsible for correctness
                        minStock: Number(row.minStock) || 0,
                        averageCost: Number(row.averageCost) || 0,
                        isActive: true
                    };

                    await createProduct(productToSave as any);
                    successCount++;
                } catch (e) {
                    console.error("Row error", row, e);
                    errors++;
                }
            }

            toast({
                title: "Importación Completada",
                description: `Se importaron ${successCount} productos. ${errors > 0 ? `${errors} errores.` : ''}`
            });
            setIsOpen(false);
            setPreviewData([]);
            onImportSuccess();

        } catch (error) {
            console.error(error);
            toast({ title: "Error crítico en importación", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-green-600" />
                    Importar Excel
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Importar Productos Masivamente</DialogTitle>
                    <DialogDescription>
                        Carga tu inventario desde un archivo Excel (.xlsx).
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Action Area */}
                    <div className="flex flex-col gap-4 border-2 border-dashed rounded-lg p-8 items-center justify-center bg-slate-50">
                        <input
                            type="file"
                            accept=".xlsx, .xls"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                        />

                        {previewData.length === 0 ? (
                            <>
                                <Upload className="h-10 w-10 text-gray-400" />
                                <div className="text-center">
                                    <p className="text-sm font-medium">Arrastra tu archivo o haz clic para buscar</p>
                                    <p className="text-xs text-gray-500 mt-1">Soporta .xlsx</p>
                                </div>
                                <Button onClick={() => fileInputRef.current?.click()}>Seleccionar Archivo</Button>
                                <Button variant="link" size="sm" onClick={downloadTemplate} className="text-blue-600">
                                    <Download className="mr-1 h-3 w-3" /> Descargar Plantilla
                                </Button>
                            </>
                        ) : (
                            <div className="flex items-center gap-4">
                                <FileSpreadsheet className="h-8 w-8 text-green-600" />
                                <div>
                                    <p className="font-bold">{previewData.length} productos detectados</p>
                                    <p className="text-xs text-gray-500">Listos para importar</p>
                                </div>
                                <Button variant="outline" onClick={() => setPreviewData([])} disabled={loading}>
                                    Cancelar
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Preview Table */}
                    {previewData.length > 0 && (
                        <div className="border rounded-md overflow-hidden max-h-60 overflow-y-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>SKU</TableHead>
                                        <TableHead>Nombre</TableHead>
                                        <TableHead>Categoría</TableHead>
                                        <TableHead>Stock Mín.</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {previewData.slice(0, 10).map((row, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="font-mono text-xs">{row.sku || 'AUTO'}</TableCell>
                                            <TableCell>{row.name}</TableCell>
                                            <TableCell>{row.category}</TableCell>
                                            <TableCell>{row.minStock}</TableCell>
                                        </TableRow>
                                    ))}
                                    {previewData.length > 10 && (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center text-xs text-gray-500">
                                                ... y {previewData.length - 10} más ...
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}

                    {previewData.length > 0 && (
                        <div className="flex justify-end gap-3">
                            <Button variant="ghost" onClick={() => setIsOpen(false)} disabled={loading}>Cancelar</Button>
                            <Button onClick={handleImport} disabled={loading} className="gap-2">
                                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                                Importar {previewData.length} Productos
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
