"use client";

import { useState } from "react";
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, Upload, FileText, Trash2, Download, Sparkles } from "lucide-react";
import { RoleGuard } from "@/components/auth/role-guard";
import { SupplierQuoteAnalyzerModal } from "@/components/income/quotes/supplier-quote-analyzer-modal";

export interface SupplierFile {
    name: string;
    url: string;
    path: string;
    uploadedAt: string;
}

interface SupplierQuotesWidgetProps {
    quoteId: string;
    files: SupplierFile[];
    onUpdate: () => void;
}

export function SupplierQuotesWidget({ quoteId, files = [], onUpdate }: SupplierQuotesWidgetProps) {
    const [uploading, setUploading] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [analyzingFile, setAnalyzingFile] = useState<SupplierFile | null>(null);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Limitar a 10MB
        if (file.size > 10 * 1024 * 1024) {
            alert("El archivo es demasiado grande (Máx 10MB).");
            e.target.value = "";
            return;
        }

        try {
            setUploading(true);
            const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const filePath = `company/quotes/${quoteId}/suppliers/${Date.now()}_${cleanName}`;
            const storageRef = ref(storage, filePath);

            const snapshot = await uploadBytes(storageRef, file);
            const url = await getDownloadURL(snapshot.ref);

            const newFile: SupplierFile = {
                name: file.name,
                url,
                path: filePath,
                uploadedAt: new Date().toISOString()
            };

            await updateDoc(doc(db, "quotes", quoteId), {
                supplierFiles: arrayUnion(newFile)
            });

            onUpdate();
        } catch (error: any) {
            console.error("Error al subir archivo del proveedor:", error);
            alert("Error al subir el archivo. Verifica tu conexión o permisos.");
        } finally {
            setUploading(false);
            e.target.value = "";
        }
    };

    const handleDelete = async (fileToDelete: SupplierFile) => {
        if (!confirm(`¿Estás seguro de eliminar el archivo "${fileToDelete.name}"?`)) return;

        setDeleting(fileToDelete.path);
        try {
            // Delete from storage
            const fileRef = ref(storage, fileToDelete.path);
            try {
                await deleteObject(fileRef);
            } catch (storageErr) {
                console.warn("Storage file missing, removing from database anyway", storageErr);
            }

            // Delete from DB array
            await updateDoc(doc(db, "quotes", quoteId), {
                supplierFiles: arrayRemove(fileToDelete)
            });

            onUpdate();
        } catch (error) {
            console.error("Error eliminando el archivo:", error);
            alert("Error al eliminar el archivo.");
        } finally {
            setDeleting(null);
        }
    };

    return (
        <Card className="p-6 glass-card bg-blue-50/50 border-blue-100">
            <h3 className="font-semibold mb-4 text-blue-900 flex items-center justify-between">
                <span>Cotizaciones de Proveedores</span>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{files.length}</span>
            </h3>

            <div className="space-y-3">
                {files.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">No hay archivos adjuntos.</p>
                ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {files.map((file, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-white p-2 rounded border text-sm">
                                <div className="flex items-center gap-2 truncate max-w-[180px]" title={file.name}>
                                    <FileText className="h-4 w-4 text-blue-500 flex-shrink-0" />
                                    <span className="truncate">{file.name}</span>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-500 hover:text-blue-600" asChild>
                                        <a href={file.url} target="_blank" rel="noopener noreferrer">
                                            <Download className="h-3 w-3" />
                                        </a>
                                    </Button>
                                    <RoleGuard allowedRoles={["ADMIN", "GERENTE", "SUPERVISOR"]} requireAuth={false}>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-yellow-500 hover:text-yellow-600 bg-yellow-50 hover:bg-yellow-100"
                                            onClick={() => setAnalyzingFile(file)}
                                            title="Analizar con IA (Leer Costos)"
                                        >
                                            <Sparkles className="h-3 w-3" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-gray-400 hover:text-red-600"
                                            onClick={() => handleDelete(file)}
                                            disabled={deleting === file.path}
                                        >
                                            {deleting === file.path ? <Loader2 className="h-3 w-3 animate-spin text-red-500" /> : <Trash2 className="h-3 w-3" />}
                                        </Button>
                                    </RoleGuard>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <RoleGuard allowedRoles={["ADMIN", "GERENTE", "SUPERVISOR"]} requireAuth={false}>
                    <div className="mt-4 pt-3 border-t border-blue-100">
                        <Input
                            id="supplier-upload"
                            type="file"
                            className="hidden"
                            onChange={handleUpload}
                            disabled={uploading}
                            accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.doc,.docx"
                        />
                        <Button
                            variant="outline"
                            className="w-full text-blue-700 border-blue-300 hover:bg-blue-100 gap-2"
                            onClick={() => document.getElementById('supplier-upload')?.click()}
                            disabled={uploading}
                        >
                            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                            {uploading ? "Subiendo..." : "Añadir Archivo"}
                        </Button>
                        <p className="text-[10px] text-center text-gray-500 mt-1">Solo Admin/Gerente. Max 10MB.</p>
                    </div>
                </RoleGuard>
            </div>

            <SupplierQuoteAnalyzerModal
                isOpen={!!analyzingFile}
                onClose={() => setAnalyzingFile(null)}
                file={analyzingFile}
                quoteId={quoteId}
                onItemAdded={onUpdate}
            />
        </Card>
    );
}
