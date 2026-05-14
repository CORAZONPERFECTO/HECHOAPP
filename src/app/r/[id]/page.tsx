"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { TicketReportNew } from "@/types/schema";
import { TicketReportView } from "@/components/reports/ticket-report-view";
import { Button } from "@/components/ui/button";
import { Loader2, Download, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function SmartReportPage() {
    const params = useParams();
    const reportId = params.id as string;
    
    const [report, setReport] = useState<TicketReportNew | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!reportId) return;

        const loadReport = async () => {
            try {
                const docSnap = await getDoc(doc(db, "ticketReports", reportId));
                if (docSnap.exists()) {
                    setReport(docSnap.data() as TicketReportNew);
                }
            } catch (error) {
                console.error("Error loading report:", error);
            } finally {
                setLoading(false);
            }
        };

        loadReport();
    }, [reportId]);

    const handlePrint = () => {
        window.print();
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <p className="text-gray-500 font-medium">Cargando reporte seguro...</p>
            </div>
        );
    }

    if (!report) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <Card className="max-w-md w-full p-8 text-center space-y-4">
                    <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                        <span className="text-2xl">📄</span>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">Reporte no encontrado</h2>
                    <p className="text-gray-500">
                        El enlace que intentas abrir no existe o ha expirado. Por favor, solicita un nuevo enlace a tu proveedor de servicio.
                    </p>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Top Navigation / Actions Bar - Hidden on print */}
            <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b shadow-sm print:hidden">
                <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                            H
                        </div>
                        <span className="font-bold text-gray-900 tracking-tight">HECHO SRL</span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
                            <Download className="h-4 w-4" />
                            <span className="hidden sm:inline">Guardar PDF</span>
                        </Button>
                        <Button size="sm" className="gap-2 bg-green-600 hover:bg-green-700 text-white" onClick={() => alert("Función de aprobación en desarrollo.")}>
                            <CheckCircle2 className="h-4 w-4" />
                            Aprobar
                        </Button>
                    </div>
                </div>
            </div>

            {/* Warning banner */}
            <div className="bg-blue-50 border-b border-blue-100 py-2 px-4 text-center print:hidden">
                <p className="text-xs sm:text-sm text-blue-800">
                    Este es un documento oficial de solo lectura. Los cambios se guardan automáticamente.
                </p>
            </div>

            {/* Main Report Container */}
            <main className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden ring-1 ring-gray-200">
                    <div className="p-6 sm:p-10 md:p-14">
                        <TicketReportView report={report} isInteractive={false} />
                    </div>
                </div>
            </main>
            
            <footer className="text-center py-8 text-sm text-gray-400 print:hidden">
                <p>Generado de forma segura a través de HECHOAPP</p>
            </footer>
        </div>
    );
}
