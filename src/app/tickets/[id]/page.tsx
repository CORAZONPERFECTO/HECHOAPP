"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, onSnapshot, collection, query, where, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Ticket, TicketEvent, TicketStatus, UserRole } from "@/types/schema";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { VoiceTextarea } from "@/components/ui/voice-textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TicketStatusBadge } from "@/components/tickets/ticket-status-badge";
import { ChecklistRenderer } from "@/components/tickets/checklist-renderer";
import { PhotoUploader } from "@/components/tickets/photo-uploader";
import { SignaturePad } from "@/components/tickets/signature-pad";
import { TicketTimeline } from "@/components/tickets/ticket-timeline";
import { ReportEditor } from "@/components/tickets/report-editor";
import { useTicketAutoSave } from "@/hooks/use-ticket-auto-save";
import { ErrorSearchModal } from "@/components/resources/error-search-modal";
import { StatusActionButtons } from "@/components/technician/status-action-buttons";
import { FloatingActionButtons } from "@/components/technician/floating-action-buttons";
import { EquipmentHistoryModal } from "@/components/technician/equipment-history-modal";
import { MaterialRequestForm } from "@/components/technician/material-request-form";
import { ApprovalRequestForm } from "@/components/tickets/approval-request-form";
import { ProfitabilityCard } from "@/components/tickets/profitability-card";
import { ArrowLeft, Save, CheckCircle2, AlertCircle, Loader2, Share2 } from "lucide-react";

export default function TicketDetailPage() {
    const params = useParams();
    const router = useRouter();
    const ticketId = params.id as string;

    const [ticket, setTicket] = useState<Ticket | null>(null);
    const [events, setEvents] = useState<TicketEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUserRole, setCurrentUserRole] = useState<UserRole | undefined>(undefined);
    const [currentUserId, setCurrentUserId] = useState<string>("");
    const [currentUserName, setCurrentUserName] = useState<string>("");
    const [activeTab, setActiveTab] = useState("info");

    // Auto-save integration
    const { lastSaved, saving } = useTicketAutoSave(ticket || {}, {
        ticketId,
        onSave: (date) => console.log("Auto-saved at", date)
    });

    useEffect(() => {
        if (!ticketId) return;

        // Subscribe to ticket changes
        const unsubTicket = onSnapshot(doc(db, "tickets", ticketId), (doc) => {
            if (doc.exists()) {
                setTicket({ id: doc.id, ...doc.data() } as Ticket);
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching ticket:", error);
            setLoading(false);
        });

        // Subscribe to events
        const q = query(collection(db, "ticketEvents"), where("ticketId", "==", ticketId));
        const unsubEvents = onSnapshot(q, (snapshot) => {
            setEvents(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as TicketEvent)));
        }, (error) => {
            console.error("Error fetching events:", error);
        });

        // Fetch current user role
        const checkUserRole = async () => {
            // Wait for auth to be ready (simple check)
            // In a real app, use onAuthStateChanged, but here we assume auth is initialized or we check it
            // Actually, we should use onAuthStateChanged here too or assume the parent layout handles it?
            // The previous Technician page used onAuthStateChanged. Let's do that.
            const { auth } = await import("@/lib/firebase"); // Dynamic import to avoid SSR issues if any
            auth.onAuthStateChanged(async (user) => {
                if (user) {
                    setCurrentUserId(user.uid);
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
        checkUserRole();

        return () => {
            unsubTicket();
            unsubEvents();
        };
    }, [ticketId]);

    const handleStatusChange = async (newStatus: TicketStatus) => {
        if (!ticket) return;

        // In a real app, this would be an API call to ensure atomic updates
        // For prototype, we just update the local state which triggers auto-save
        // But for status changes, we should probably force an immediate update
        // Logic to add event would go here
    };

    if (loading) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin h-8 w-8 text-blue-600" /></div>;
    }

    if (!ticket) {
        return <div className="p-8 text-center">Ticket no encontrado</div>;
    }

    const canViewFinalReport = currentUserRole === 'ADMIN' || currentUserRole === 'SUPERVISOR' || currentUserRole === 'GERENTE';

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
                        <p className="text-xs text-gray-500">{ticket.clientName}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
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
                    {saving && <span className="text-xs text-gray-400 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Guardando...</span>}
                    {!saving && lastSaved && <span className="text-xs text-gray-400">Guardado</span>}
                    <TicketStatusBadge status={ticket.status} />
                </div>
            </header >

            {/* Status Action Buttons for Technicians */}
            {currentUserRole === 'TECHNICIAN' && (
                <div className="max-w-3xl mx-auto px-4 pt-4 print:hidden">
                    <StatusActionButtons ticket={ticket} />
                </div>
            )}

            <main className="max-w-3xl mx-auto p-4 space-y-6 print:max-w-none print:p-0">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="print:hidden">
                    <TabsList className="grid w-full grid-cols-6 h-auto p-1 bg-white border rounded-xl mb-4 overflow-x-auto">
                        <TabsTrigger value="info" className="text-xs py-2">Info</TabsTrigger>
                        <TabsTrigger value="checklist" className="text-xs py-2">Checklist</TabsTrigger>
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
                                    <div>
                                        <span className="text-gray-500 block">Tipo de Servicio</span>
                                        <span className="font-medium">{ticket.serviceType.replace(/_/g, ' ')}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 block">Prioridad</span>
                                        <span className={`font-medium ${ticket.priority === 'URGENT' ? 'text-red-600' : ''}`}>{ticket.priority}</span>
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
                            <ReportEditor ticket={ticket} currentUserRole={currentUserRole} />
                        </TabsContent>
                    )}
                </Tabs>

                {/* Print View Container (Only visible when printing) */}
                <div className="hidden print:block">
                    {/* The ReportEditor handles its own print view visibility via CSS */}
                    {canViewFinalReport && <ReportEditor ticket={ticket} currentUserRole={currentUserRole} />}
                </div>
            </main>

            {/* Floating Action Buttons */}
            <FloatingActionButtons ticket={ticket} />
        </div>
    );
}
