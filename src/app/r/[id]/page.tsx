"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { TicketReportNew } from "@/types/schema";
import { TicketReportView } from "@/components/reports/ticket-report-view";
import { Button } from "@/components/ui/button";
import { Loader2, Download, MessageSquare, CheckCircle2 } from "lucide-react";
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
            <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <p className="text-slate-600 font-semibold text-sm">Cargando informe oficial de servicio...</p>
            </div>
        );
    }

    if (!report) {
        return (
            <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
                <Card className="max-w-md w-full p-8 text-center space-y-4 rounded-3xl shadow-xl border-none">
                    <div className="mx-auto w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-4">
                        <span className="text-2xl">📄</span>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900">Informe no disponible</h2>
                    <p className="text-slate-500 text-sm">
                        El enlace que intentas abrir no existe o ha expirado. Por favor, solicita un enlace actualizado a tu asesor de servicio en HECHO SRL.
                    </p>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100/80 py-4 sm:py-8 px-2 sm:px-4">
            {/* Top Navigation Bar - Hidden on Print */}
            <div className="max-w-4xl mx-auto mb-6 bg-white/90 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-slate-200/80 flex items-center justify-between flex-wrap gap-3 print:hidden">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center text-white font-extrabold shadow-sm">
                        H
                    </div>
                    <div>
                        <span className="font-extrabold text-slate-900 tracking-tight text-base block">HECHO SRL</span>
                        <span className="text-[11px] text-slate-500 font-medium">Portal Oficial de Informes Técnicos</span>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2 rounded-xl text-xs font-semibold h-9">
                        <Download className="h-4 w-4 text-blue-600" />
                        <span>Guardar / Imprimir PDF</span>
                    </Button>
                </div>
            </div>

            {/* Main Report Document Container */}
            <main className="max-w-4xl mx-auto">
                <TicketReportView report={report} isInteractive={false} />
            </main>

            {/* Footer */}
            <footer className="max-w-4xl mx-auto mt-8 text-center text-xs text-slate-500 print:hidden pb-8">
                <p className="font-medium">© {new Date().getFullYear()} HECHO SRL • Todos los derechos reservados.</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Documento técnico digital generado por HECHOAPP</p>
            </footer>
        </div>
    );
}
