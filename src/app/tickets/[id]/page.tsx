"use client";
// Ticket Detail Page - Updated 2025-12-09

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, onSnapshot, collection, query, where, addDoc, serverTimestamp, deleteDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Ticket, TicketEvent, TicketStatus, UserRole } from "@/types/schema";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { VoiceTextarea } from "@/components/ui/voice-textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TicketStatusBadge } from "@/components/tickets/ticket-status-badge";
import { ChecklistRenderer } from "@/components/tickets/checklist-renderer";
import { PhotoUploader } from "@/components/tickets/photo-uploader";
import { SignaturePad } from "@/components/tickets/signature-pad";
import { TicketTimeline } from "@/components/tickets/ticket-timeline";
import { TicketReportTab } from "@/components/reports/ticket-report-tab"; // NEW Editor
import { TicketMaterialsConsumption } from "@/components/tickets/ticket-materials-consumption";
import { TicketPurchases } from "@/components/tickets/ticket-purchases";
import { useTicketAutoSave } from "@/hooks/use-ticket-auto-save";
import { ErrorSearchModal } from "@/components/resources/error-search-modal";
import { StatusActionButtons } from "@/components/technician/status-action-buttons";
import { FloatingActionButtons } from "@/components/technician/floating-action-buttons";
import { EquipmentHistoryModal } from "@/components/technician/equipment-history-modal";
import { MaterialRequestForm } from "@/components/technician/material-request-form";
import { ApprovalRequestForm } from "@/components/tickets/approval-request-form";
import { ProfitabilityCard } from "@/components/tickets/profitability-card";
import { ArrowLeft, Save, CheckCircle2, AlertCircle, Loader2, Share2, Trash2, FileText, Calendar as CalendarIcon } from "lucide-react";
import { Timestamp } from "firebase/firestore";

export default function TicketDetailPage() {
    const params = useParams();
    const router = useRouter();
    const ticketId = params.id as string;

    const [ticket, setTicket] = useState<Ticket | null>(null);
    const [events, setEvents] = useState<TicketEvent[]>([]);
    const [activeTab, setActiveTab] = useState("info");
    const [currentUserId, setCurrentUserId] = useState("");
    const [currentUserEmail, setCurrentUserEmail] = useState("");
    const [currentUserName, setCurrentUserName] = useState("");
    const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);

    const canViewFinalReport = currentUserRole === 'ADMIN' || currentUserRole === 'SUPERVISOR';

    // Auto-save functionality
    useEffect(() => {
        if (!ticket || !ticketId) return;

        const timeoutId = setTimeout(async () => {
            try {
                await setDoc(doc(db, "tickets", ticketId), ticket);
            } catch (error) {
                console.error("Error auto-saving ticket:", error);
            }
        }, 1000);

        return () => clearTimeout(timeoutId);
    }, [ticket, ticketId]);

    useEffect(() => {
        const loadAuth = async () => {
            const { auth } = await import("@/lib/firebase");
            auth.onAuthStateChanged(async (user) => {
                if (user) {
                    setCurrentUserId(user.uid);
                    setCurrentUserEmail(user.email || "");
                    setCurrentUserName(user.displayName || user.email || "Usuario");
                    if (user.email?.toLowerCase() === 'lcaa27@gmail.com') {
                        setCurrentUserRole('ADMIN');
                    } else {
                        const userDoc = await getDoc(doc(db, "users", user.uid));
                        if (userDoc.exists()) {
                            setCurrentUserRole(userDoc.data().role as UserRole);
                        }
                    }
                }
            });
        };
        loadAuth();
    }, []);

    useEffect(() => {
        if (!ticketId) return;

        const unsubscribe = onSnapshot(doc(db, "tickets", ticketId), (docSnap) => {
            if (docSnap.exists()) {
                setTicket({ id: docSnap.id, ...docSnap.data() } as Ticket);
            }
        });

        return () => unsubscribe();
    }, [ticketId]);

    useEffect(() => {
        if (!ticketId) return;

        const q = query(
            collection(db, "ticketEvents"),
            where("ticketId", "==", ticketId)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const evts = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as TicketEvent));
            evts.sort((a, b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0));
            setEvents(evts);
        });

        return () => unsubscribe();
    }, [ticketId]);

    if (!ticket) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    const handleDeleteTicket = async () => {
        if (!confirm("¿ESTÁS SEGURO? Esta acción eliminará el ticket permanentemente.")) return;

        try {
            await deleteDoc(doc(db, "tickets", ticketId));
            // Optional: Delete related events/photos if strictly required, but usually subcollections persist or are loose.
            // For now, just delete the main doc.
            router.push("/tickets");
        } catch (error) {
            console.error("Error deleting ticket:", error);
            alert("Error al eliminar el ticket.");
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header */}
            <header className="bg-white border-b sticky top-0 z-10 px-4 py-3 flex justify-between items-center shadow-sm print:hidden">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => router.push("/tickets")}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="font-bold text-gray-900">{ticket.ticketNumber || ticket.id?.slice(0, 6)}</h1>
                        <p className="text-xs text-gray-500">{ticket.clientName} <span className="text-red-500 font-bold">[{currentUserRole || 'NO_ROLE'}]</span></p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* GENERATE QUOTE BUTTON */}
                    {(currentUserRole === 'ADMIN' || currentUserRole === 'SUPERVISOR') && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                // Store ticket data for pre-fill
                                localStorage.setItem('quoteFromTicket', JSON.stringify({
                                    ticketId: ticket.id,
                                    ticketNumber: ticket.ticketNumber,
                                    clientId: ticket.clientId,
                                    clientName: ticket.clientName,
                                    serviceType: ticket.serviceType,
                                    description: ticket.description
                                }));
                                router.push('/income/quotes/new');
                            }}
                            className="gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700"
                        >
                            <FileText className="h-4 w-4" />
                            Generar Cotización
                        </Button>
                    )}

                    {/* SUPER USER DELETE BUTTON */}
                    {currentUserEmail.toLowerCase() === 'lcaa27@gmail.com' && (
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleDeleteTicket}
                            className="mr-2"
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                        </Button>
                    )}

                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 hidden sm:flex"
                        onClick={() => {
                            const url = `${window.location.origin}/technician/tickets/${ticket.id}`;
                            navigator.clipboard.writeText(url);
                            alert("Enlace copiado al portapapeles:\n" + url);
                        }}
                    >
                        <Share2 className="h-4 w-4" />
                        Compartir
                    </Button>
                    <TicketStatusBadge status={ticket.status} />
                </div>
            </header>

            {/* Status Action Buttons for Technicians */}
            {currentUserRole && (currentUserRole === 'TECNICO' || currentUserRole === 'ADMIN') && (
                <div className="max-w-3xl mx-auto px-4 pt-4 print:hidden">
                    <StatusActionButtons ticket={ticket} />
                </div>
            )}

            <main className="max-w-3xl mx-auto p-4 space-y-6 print:max-w-none print:p-0">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="print:hidden">
                    <TabsList className="grid w-full grid-cols-6 h-auto p-1 bg-white border rounded-xl mb-4 overflow-x-auto">
                        <TabsTrigger value="info" className="text-xs py-2">Info</TabsTrigger>
                        <TabsTrigger value="checklist" className="text-xs py-2">Checklist</TabsTrigger>
                        <TabsTrigger value="materials" className="text-xs py-2 font-bold text-blue-700">Materiales</TabsTrigger>
                        <TabsTrigger value="purchases" className="text-xs py-2">Compras</TabsTrigger>
                        <TabsTrigger value="evidence" className="text-xs py-2">Fotos</TabsTrigger>
                        <TabsTrigger value="diagnosis" className="text-xs py-2">Reporte</TabsTrigger>
                        <TabsTrigger value="closure" className="text-xs py-2">Cierre</TabsTrigger>
                        {canViewFinalReport && (
                            <TabsTrigger value="final-report" className="text-xs py-2 font-semibold text-blue-700">Informe Final</TabsTrigger>
                        )}
                    </TabsList>

                    <TabsContent value="info" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Detalles del Servicio</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="col-span-2 bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4">
                                        <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                                            <CalendarIcon className="h-4 w-4" />
                                            Programación
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <Label className="text-blue-700">Inicio Programado</Label>
                                                <Input
                                                    type="datetime-local"
                                                    className="bg-white mt-1"
                                                    value={ticket.scheduledStart ? new Date(ticket.scheduledStart.seconds * 1000).toISOString().slice(0, 16) : ""}
                                                    onChange={(e) => {
                                                        const date = e.target.value ? Timestamp.fromDate(new Date(e.target.value)) : undefined;
                                                        // Auto status logic: If setting a date, ensure status reflects it if currently OPEN
                                                        let newStatus = ticket.status;
                                                        setTicket({ ...ticket, scheduledStart: date, status: newStatus });
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-blue-700">Fin Estimado</Label>
                                                <Input
                                                    type="datetime-local"
                                                    className="bg-white mt-1"
                                                    value={ticket.scheduledEnd ? new Date(ticket.scheduledEnd.seconds * 1000).toISOString().slice(0, 16) : ""}
                                                    onChange={(e) => {
                                                        const date = e.target.value ? Timestamp.fromDate(new Date(e.target.value)) : undefined;
                                                        setTicket({ ...ticket, scheduledEnd: date });
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <span className="text-gray-500 block">Tipo de Servicio</span>
                                        <span className="font-medium">{ticket.serviceType.replace(/_/g, ' ')}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 block">Prioridad</span>
                                        <span className={`font-medium ${ticket.priority === 'URGENT' ? 'text-red-600' : ''}`}>{ticket.priority}</span>
                                    </div>

                                    <div className="col-span-2">
                                        <div className="flex gap-6 text-xs text-gray-500 border-t pt-2 mt-2">
                                            <span>
                                                Creado: <strong>{ticket.createdAt?.toDate().toLocaleString()}</strong>
                                            </span>
                                            <span>
                                                Programado: <strong className={ticket.scheduledStart ? "text-blue-600" : "text-gray-400"}>
                                                    {ticket.scheduledStart ? ticket.scheduledStart.toDate().toLocaleString() : "No definido"}
                                                </strong>
                                            </span>
                                        </div>
                                    </div>

                                    <div className="col-span-2">
                                        <span className="text-gray-500 block">Descripción Inicial</span>
                                        <p className="mt-1 text-gray-700 bg-slate-50 p-3 rounded-md">{ticket.description}</p>
                                    </div>

                                    <div className="col-span-2 flex items-center gap-2 mt-2 p-3 border rounded-md bg-gray-50">
                                        <input
                                            type="checkbox"
                                            id="allowGallery"
                                            checked={ticket.allowGalleryUpload || false}
                                            onChange={(e) => setTicket({ ...ticket, allowGalleryUpload: e.target.checked })}
                                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <Label htmlFor="allowGallery" className="cursor-pointer font-medium">
                                            Permitir al técnico subir fotos desde Galería
                                        </Label>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Historial</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <TicketTimeline events={events} />
                            </CardContent>
                        </Card>

                        {/* Equipment History */}
                        {ticket.equipmentId && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Historial del Equipo</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <EquipmentHistoryModal equipmentId={ticket.equipmentId} />
                                </CardContent>
                            </Card>
                        )}

                        {/* Profitability Card for Admins */}
                        {canViewFinalReport && (
                            <ProfitabilityCard ticket={ticket} />
                        )}
                    </TabsContent>

                    <TabsContent value="checklist" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Lista de Verificación</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ChecklistRenderer
                                    items={ticket.checklist || []}
                                    onItemChange={(id, checked) => {
                                        const newChecklist = ticket.checklist.map(item =>
                                            item.id === id ? { ...item, checked } : item
                                        );
                                        setTicket({ ...ticket, checklist: newChecklist });
                                    }}
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="materials" className="space-y-4">
                        <TicketMaterialsConsumption
                            ticketId={ticketId}
                            ticketNumber={ticket.ticketNumber}
                            currentUserRole={currentUserRole || 'TECNICO'}
                        />
                    </TabsContent>

                    <TabsContent value="purchases" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Compras y Gastos</CardTitle>
                                <CardDescription>Registra facturas de materiales comprados en calle.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <TicketPurchases
                                    ticketId={ticketId}
                                    ticketNumber={ticket.ticketNumber}
                                    currentUserRole={currentUserRole || 'TECNICO'}
                                    userId={currentUserId}
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="evidence" className="space-y-4">
                        <Card>
                            <CardContent className="pt-6 space-y-6">
                                <PhotoUploader
                                    label="Fotos Antes"
                                    type="BEFORE"
                                    photos={ticket.photos || []}
                                    onChange={(photos) => setTicket({ ...ticket, photos })}
                                    allowGallery={true}
                                />
                                <div className="border-t" />
                                <PhotoUploader
                                    label="Fotos Durante"
                                    type="DURING"
                                    photos={ticket.photos || []}
                                    onChange={(photos) => setTicket({ ...ticket, photos })}
                                    allowGallery={true}
                                />
                                <div className="border-t" />
                                <PhotoUploader
                                    label="Fotos Después"
                                    type="AFTER"
                                    photos={ticket.photos || []}
                                    onChange={(photos) => setTicket({ ...ticket, photos })}
                                    allowGallery={true}
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="diagnosis" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Reporte Técnico</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Diagnóstico</Label>
                                    <VoiceTextarea
                                        placeholder="¿Qué encontraste?"
                                        value={ticket.diagnosis || ''}
                                        onChange={(e) => setTicket({ ...ticket, diagnosis: e.target.value })}
                                        className="min-h-[100px]"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <Label>Solución Aplicada</Label>
                                        <ErrorSearchModal
                                            onSelectSolution={(sol: string) => {
                                                const current = ticket?.solution || "";
                                                setTicket({ ...ticket!, solution: current + (current ? "\n\n" : "") + sol });
                                            }}
                                        />
                                    </div>
                                    <VoiceTextarea
                                        placeholder="¿Qué hiciste?"
                                        value={ticket.solution || ''}
                                        onChange={(e) => setTicket({ ...ticket, solution: e.target.value })}
                                        className="min-h-[100px]"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Recomendaciones</Label>
                                    <VoiceTextarea
                                        placeholder="Sugerencias para el cliente..."
                                        value={ticket.recommendations || ''}
                                        onChange={(e) => setTicket({ ...ticket, recommendations: e.target.value })}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="closure" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Cierre y Conformidad</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800 flex gap-2">
                                    <AlertCircle className="h-5 w-5 shrink-0" />
                                    <p>Asegúrate de haber completado la checklist y subido todas las fotos antes de solicitar la firma.</p>
                                </div>

                                <div className="space-y-2">
                                    <Label>Firma del Cliente</Label>
                                    <SignaturePad
                                        value={ticket.clientSignature}
                                        onChange={(sig) => setTicket({ ...ticket, clientSignature: sig })}
                                    />
                                </div>

                                <Button className="w-full h-12 text-lg" size="lg">
                                    <CheckCircle2 className="mr-2 h-5 w-5" />
                                    Finalizar Ticket
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Material Request Form */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Solicitud de Materiales</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <MaterialRequestForm
                                    ticketId={ticket.id!}
                                    ticketNumber={ticket.ticketNumber}
                                    userId={currentUserId}
                                    userName={currentUserName}
                                />
                            </CardContent>
                        </Card>

                        {/* Approval Request Form */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Solicitud de Aprobación</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ApprovalRequestForm
                                    ticketId={ticket.id!}
                                    ticketNumber={ticket.ticketNumber}
                                    userId={currentUserId}
                                    userName={currentUserName}
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {canViewFinalReport && (
                        <TabsContent value="final-report" className="h-[calc(100vh-200px)]">
                            <TicketReportTab ticket={ticket} currentUserRole={currentUserRole} />
                        </TabsContent>
                    )}
                </Tabs>

                {/* Print View Container (Only visible when printing) */}
                <div className="hidden print:block">
                    {/* The ReportEditor handles its own print view visibility via CSS */}
                    {canViewFinalReport && <TicketReportTab ticket={ticket} currentUserRole={currentUserRole} />}
                </div>
            </main>

            {/* Floating Action Buttons */}
            <FloatingActionButtons ticket={ticket} />
        </div>
    );
}
