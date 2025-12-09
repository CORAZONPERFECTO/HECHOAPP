"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Ticket, TicketReportNew } from "@/types/schema";
import { generateReportFromTicket, updatePhotosFromTicket } from "@/lib/report-generator";
import { TicketReportEditor } from "@/components/reports/ticket-report-editor";
import { TicketReportView } from "@/components/reports/ticket-report-view";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Eye, Edit, Printer, ArrowLeft } from "lucide-react";

export default function TicketReportPage() {
    const params = useParams();
    const router = useRouter();
    const ticketId = params.id as string;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [ticket, setTicket] = useState<Ticket | null>(null);
    const [report, setReport] = useState<TicketReportNew | null>(null);
    const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");

    useEffect(() => {
        loadData();
    }, [ticketId]);

    const loadData = async () => {
        try {
            setLoading(true);

            // Load ticket
            const ticketDoc = await getDoc(doc(db, "tickets", ticketId));
            if (!ticketDoc.exists()) {
                alert("Ticket no encontrado");
                router.push("/tickets");
                return;
            }
            const ticketData = { id: ticketDoc.id, ...ticketDoc.data() } as Ticket;
            setTicket(ticketData);

            // Load or generate report
            const reportDoc = await getDoc(doc(db, "ticketReports", ticketId));

            if (reportDoc.exists()) {
                // Load existing report
                setReport(reportDoc.data() as TicketReportNew);
            } else {
                // Generate new report
                const newReport = generateReportFromTicket(ticketData);
                await setDoc(doc(db, "ticketReports", ticketId), newReport);
                setReport(newReport);
            }
        } catch (error) {
            console.error("Error loading data:", error);
            alert("Error al cargar el informe");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (updatedReport: TicketReportNew) => {
        try {
            setSaving(true);

            // Validación
            if (!updatedReport.ticketId || !updatedReport.sections) {
                throw new Error("Datos del informe incompletos");
            }

            console.log("Guardando informe:", ticketId, updatedReport);
            await setDoc(doc(db, "ticketReports", ticketId), updatedReport);
            setReport(updatedReport);

            // Show success toast
            const toast = document.createElement('div');
            toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50';
            toast.textContent = '✓ Informe guardado correctamente';
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
        } catch (error: any) {
            console.error("Error completo al guardar:", error);
            console.error("Código de error:", error?.code);
            console.error("Mensaje:", error?.message);

            let errorMsg = "Error al guardar el informe";
            if (error?.code === 'permission-denied') {
                errorMsg = "Sin permisos para guardar. Contacta al administrador.";
            } else if (error?.message) {
                errorMsg = `Error: ${error.message}`;
            }

            alert(errorMsg);
        } finally {
            setSaving(false);
        }
    };

    const handleUpdatePhotos = async () => {
        if (!ticket || !report) return;

        try {
            setSaving(true);
            const updatedReport = updatePhotosFromTicket(report, ticket);
            await setDoc(doc(db, "ticketReports", ticketId), updatedReport);
            setReport(updatedReport);

            // Show success toast
            const toast = document.createElement('div');
            toast.className = 'fixed top-4 right-4 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg z-50';
            toast.textContent = '✓ Fotos actualizadas correctamente';
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
        } catch (error) {
            console.error("Error updating photos:", error);
            alert("Error al actualizar fotos");
        } finally {
            setSaving(false);
        }
    };

    const handleRegenerate = async () => {
        if (!ticket) return;

        try {
            setSaving(true);
            const newReport = generateReportFromTicket(ticket);
            await setDoc(doc(db, "ticketReports", ticketId), newReport);
            setReport(newReport);

            // Show success toast
            const toast = document.createElement('div');
            toast.className = 'fixed top-4 right-4 bg-orange-600 text-white px-6 py-3 rounded-lg shadow-lg z-50';
            toast.textContent = '✓ Informe regenerado desde el ticket';
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
        } catch (error) {
            console.error("Error regenerating report:", error);
            alert("Error al regenerar el informe");
        } finally {
            setSaving(false);
        }
    };

    const handlePrint = async () => {
        // Pre-cargar todas las imágenes antes de imprimir
        const images = document.querySelectorAll('.photo-print');
        const imagePromises = Array.from(images).map((img: any) => {
            return new Promise((resolve) => {
                if (img.complete) {
                    resolve(true);
                } else {
                    img.onload = () => resolve(true);
                    img.onerror = () => resolve(false);
                    // Timeout después de 5 segundos
                    setTimeout(() => resolve(false), 5000);
                }
            });
        });

        await Promise.all(imagePromises);

        // Pequeño delay para asegurar renderizado
        setTimeout(() => {
            window.print();
        }, 500);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!ticket || !report) {
        return (
            <div className="flex items-center justify-center h-screen">
                <p className="text-gray-500">No se pudo cargar el informe</p>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-gray-50">
            {/* Top Navigation */}
            <div className="bg-white border-b px-6 py-3 flex items-center justify-between print:hidden">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/tickets/${ticketId}`)}
                        className="gap-2"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Volver al Ticket
                    </Button>
                    <div className="h-6 w-px bg-gray-300" />
                    <h1 className="text-lg font-semibold">
                        Informe: {ticket.ticketNumber || ticket.id.slice(0, 6)}
                    </h1>
                </div>
                <div className="flex items-center gap-2">
                    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "edit" | "preview")}>
                        <TabsList>
                            <TabsTrigger value="edit" className="gap-2">
                                <Edit className="h-4 w-4" />
                                Editar
                            </TabsTrigger>
                            <TabsTrigger value="preview" className="gap-2">
                                <Eye className="h-4 w-4" />
                                Vista Previa
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                    {activeTab === "preview" && (
                        <Button onClick={handlePrint} className="gap-2 bg-blue-600 hover:bg-blue-700">
                            <Printer className="h-4 w-4" />
                            Exportar PDF
                        </Button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
                {activeTab === "edit" ? (
                    <TicketReportEditor
                        report={report}
                        onSave={handleSave}
                        onUpdatePhotos={handleUpdatePhotos}
                        onRegenerate={handleRegenerate}
                        saving={saving}
                    />
                ) : (
                    <div className="h-full overflow-y-auto p-8 print:p-0">
                        <div className="max-w-4xl mx-auto bg-white shadow-lg p-12 print:shadow-none">
                            <TicketReportView report={report} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
