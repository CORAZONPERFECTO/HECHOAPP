"use client";
// Ticket Detail Page - Updated 2025-12-09

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, onSnapshot, collection, query, where, addDoc, serverTimestamp, deleteDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { formatDistance, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
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
import { ArrowLeft, Save, CheckCircle2, AlertCircle, Loader2, Share2, Trash2, FileText, Calendar as CalendarIcon, Clock } from "lucide-react";
import { Timestamp } from "firebase/firestore";
import { LocationInput } from "@/components/ui/location-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function TicketDetailPage() {
    const params = useParams();
    const router = useRouter();
    const ticketId = params.id as string;

    const [ticket, setTicket] = useState<Ticket | null>(null);
    const [isDirty, setIsDirty] = useState(false);
    const [events, setEvents] = useState<TicketEvent[]>([]);
    const [activeTab, setActiveTab] = useState("info");
    const [currentUserId, setCurrentUserId] = useState("");
    const [currentUserEmail, setCurrentUserEmail] = useState("");
    const [currentUserName, setCurrentUserName] = useState("");
    const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
    const [technicians, setTechnicians] = useState<{ id: string; name: string }[]>([]);
    const [showNewVisitModal, setShowNewVisitModal] = useState(false);
    const [newVisitTechId, setNewVisitTechId] = useState("");
    const [newVisitDate, setNewVisitDate] = useState("");

    const canViewFinalReport = currentUserRole === 'ADMIN' || currentUserRole === 'SUPERVISOR' || currentUserRole === 'GERENTE_TICKETS';

    useEffect(() => {
        if (currentUserRole === 'ADMIN' || currentUserRole === 'SUPERVISOR' || currentUserRole === 'GERENTE_TICKETS' || currentUserRole === 'GERENTE') {
            import("firebase/firestore").then(async ({ collection, getDocs }) => {
                try {
                    const snap = await getDocs(collection(db, "users"));
                    const techs = snap.docs
                        .filter(d => d.data().role === 'TECNICO' || d.data().rol === 'TECNICO')
                        .map(d => ({
                            id: d.id,
                            name: d.data().name || d.data().displayName || d.data().email || "Técnico"
                        }));
                    setTechnicians(techs);
                } catch (err) {
                    console.error("Error loading technicians:", err);
                }
            });
        }
    }, [currentUserRole]);

    const handleReassign = async (techId: string) => {
        if (!ticket) return;
        const selectedTech = technicians.find(t => t.id === techId);
        if (!selectedTech) return;

        if (ticket.arrivedAt || ticket.status === 'COMPLETED' || ticket.status === 'CANCELLED') {
            alert("⚠️ El técnico ya llegó al servicio. No se puede reasignar.");
            return;
        }

        try {
            const currentVisits = ticket.visits || [];
            let updatedVisits = [...currentVisits];
            
            if (updatedVisits.length === 0) {
                updatedVisits.push({
                    id: `v1-${Date.now()}`,
                    visitNumber: 1,
                    technicianId: selectedTech.id,
                    technicianName: selectedTech.name,
                    status: 'SCHEDULED',
                    scheduledDate: ticket.scheduledStart || Timestamp.now()
                });
            } else {
                const lastIndex = updatedVisits.length - 1;
                if (updatedVisits[lastIndex].status === 'SCHEDULED') {
                    updatedVisits[lastIndex] = {
                        ...updatedVisits[lastIndex],
                        technicianId: selectedTech.id,
                        technicianName: selectedTech.name
                    };
                } else {
                    alert("⚠️ No se puede modificar una visita que ya no está programada.");
                    return;
                }
            }

            const updatedTicket = {
                ...ticket,
                technicianId: selectedTech.id,
                technicianName: selectedTech.name,
                visits: updatedVisits,
                updatedAt: Timestamp.now()
            };

            await setDoc(doc(db, "tickets", ticketId), updatedTicket);
            setTicket(updatedTicket);

            await addDoc(collection(db, "ticketEvents"), {
                ticketId,
                userId: currentUserId,
                userName: currentUserName,
                type: 'ASSIGNMENT',
                description: `Reasignó el ticket a ${selectedTech.name}`,
                timestamp: serverTimestamp()
            });

            alert(`✅ Ticket reasignado a ${selectedTech.name}`);
        } catch (error) {
            console.error("Error reassigning ticket:", error);
            alert("Error al reasignar el ticket.");
        }
    };

    const handleScheduleNewVisit = async () => {
        if (!ticket || !newVisitTechId || !newVisitDate) {
            alert("Por favor completa todos los campos.");
            return;
        }

        const selectedTech = technicians.find(t => t.id === newVisitTechId);
        if (!selectedTech) return;

        try {
            const currentVisits = ticket.visits || [];
            const nextVisitNumber = currentVisits.length + 1;
            
            const newVisit: any = {
                id: `v${nextVisitNumber}-${Date.now()}`,
                visitNumber: nextVisitNumber,
                technicianId: selectedTech.id,
                technicianName: selectedTech.name,
                status: 'SCHEDULED',
                scheduledDate: Timestamp.fromDate(new Date(newVisitDate))
            };

            const updatedVisits = [...currentVisits, newVisit];

            const updatedTicket: Ticket = {
                ...ticket,
                technicianId: selectedTech.id,
                technicianName: selectedTech.name,
                status: 'OPEN' as TicketStatus,
                scheduledStart: Timestamp.fromDate(new Date(newVisitDate)),
                visits: updatedVisits,
                updatedAt: Timestamp.now()
            };

            // Delete active time tracking fields for the new visit so they are cleared in the overwrite
            delete updatedTicket.enRouteAt;
            delete updatedTicket.arrivedAt;
            delete updatedTicket.workStartedAt;
            delete updatedTicket.startMileage;
            delete updatedTicket.endMileage;

            await setDoc(doc(db, "tickets", ticketId), updatedTicket);
            setTicket(updatedTicket);

            await addDoc(collection(db, "ticketEvents"), {
                ticketId,
                userId: currentUserId,
                userName: currentUserName,
                type: 'ASSIGNMENT',
                description: `Programó la Visita #${nextVisitNumber} con el técnico ${selectedTech.name} para el ${new Date(newVisitDate).toLocaleString()}`,
                timestamp: serverTimestamp()
            });

            setShowNewVisitModal(false);
            setNewVisitTechId("");
            setNewVisitDate("");
            alert(`✅ Visita #${nextVisitNumber} programada con éxito.`);
        } catch (error) {
            console.error("Error scheduling new visit:", error);
            alert("Error al programar la nueva visita.");
        }
    };

    const updateTicket = (updated: Ticket) => {
        setTicket(updated);
        setIsDirty(true);
    };

    // Auto-save functionality
    useEffect(() => {
        if (!ticket || !ticketId || !isDirty) return;

        const timeoutId = setTimeout(async () => {
            try {
                await setDoc(doc(db, "tickets", ticketId), ticket);
                setIsDirty(false);
            } catch (error) {
                console.error("Error auto-saving ticket:", error);
            }
        }, 1000);

        return () => clearTimeout(timeoutId);
    }, [ticket, ticketId, isDirty]);

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
                            setCurrentUserRole((userDoc.data().rol || userDoc.data().role) as UserRole);
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
                setIsDirty(false);
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

    const handlePhotoAdded = async (photo: import("@/types/schema").TicketPhoto) => {
        try {
            await addDoc(collection(db, "ticketEvents"), {
                ticketId,
                userId: currentUserId,
                userName: currentUserName,
                type: 'PHOTO_UPLOAD',
                description: `Subió una foto (${photo.type})`,
                timestamp: serverTimestamp(),
                mediaUrl: photo.url
            });
        } catch (error) {
            console.error("Error logging photo upload event:", error);
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
                    {(currentUserRole === 'ADMIN' || currentUserRole === 'SUPERVISOR' || currentUserRole === 'GERENTE_TICKETS') && (
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
                    {(currentUserRole === 'ADMIN' || currentUserEmail.toLowerCase() === 'lcaa27@gmail.com') && (
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
                    {/* MARK AS BILLED BUTTON */}
                    {(currentUserRole === 'ADMIN' || currentUserRole === 'SUPERVISOR' || currentUserRole === 'GERENTE' || currentUserRole === 'GERENTE_TICKETS') && ticket.status === 'COMPLETED' && ticket.billingStatus !== 'BILLED' && ticket.billingStatus !== 'PAID' && (
                        <Button
                            variant="default"
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={async () => {
                                const num = prompt("Introduce el número de factura para este ticket:");
                                if (num && num.trim() !== "") {
                                    try {
                                        await setDoc(doc(db, "tickets", ticketId), { billingStatus: 'BILLED', linkedInvoiceId: num.trim() }, { merge: true });
                                        alert(`Ticket facturado con No. ${num.trim()}`);
                                    } catch (error) {
                                        console.error("Error updating billing status:", error);
                                    }
                                }
                            }}
                        >
                            Facturar
                        </Button>
                    )}

                    <TicketStatusBadge status={ticket.status} />
                </div>
            </header>

            {/* Status Action Buttons for Technicians */}
            {currentUserRole && (currentUserRole === 'TECNICO' || currentUserRole === 'ADMIN') && (
                <div className="max-w-3xl mx-auto px-4 pt-4 print:hidden">
                    <StatusActionButtons ticket={ticket} />
                </div>
            )}

            {/* BILLING REMINDER BANNER */}
            {ticket.status === 'COMPLETED' && ticket.billingStatus !== 'BILLED' && ticket.billingStatus !== 'PAID' && (currentUserRole === 'ADMIN' || currentUserRole === 'SUPERVISOR' || currentUserRole === 'GERENTE' || currentUserRole === 'GERENTE_TICKETS') && (
                <div className="max-w-3xl mx-auto px-4 pt-4 print:hidden">
                    <div className="bg-orange-100 border-l-4 border-orange-500 p-4 rounded-r-md shadow-sm flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <AlertCircle className="h-6 w-6 text-orange-600 animate-pulse" />
                            <div>
                                <h3 className="font-bold text-orange-900">¡Facturación Pendiente!</h3>
                                <p className="text-orange-800 text-sm">Este ticket fue completado pero no ha sido marcado como facturado.</p>
                            </div>
                        </div>
                        <Button 
                            className="bg-orange-600 hover:bg-orange-700 text-white"
                            onClick={async () => {
                                const num = prompt("Introduce el número de factura para este ticket:");
                                if (num && num.trim() !== "") {
                                    try {
                                        await setDoc(doc(db, "tickets", ticketId), { billingStatus: 'BILLED', linkedInvoiceId: num.trim() }, { merge: true });
                                        alert(`Ticket facturado con No. ${num.trim()}`);
                                    } catch (error) {
                                        console.error("Error updating billing status:", error);
                                    }
                                }
                            }}
                        >
                            Marcar como Facturado
                        </Button>
                    </div>
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
                                <CardTitle className="flex justify-between items-center">
                                    <span>Detalles del Servicio</span>
                                    {ticket.arrivedAt && (
                                        <div className="text-sm font-normal px-3 py-1 bg-green-100 text-green-800 rounded-full flex items-center gap-2">
                                            <Clock className="h-4 w-4" />
                                            {ticket.closedAt ? 
                                                `Tiempo Total: ${formatDistance(new Date(ticket.arrivedAt.seconds * 1000), new Date(ticket.closedAt.seconds * 1000), { locale: es })}`
                                                : 
                                                `Tiempo Transcurrido: ${formatDistanceToNow(new Date(ticket.arrivedAt.seconds * 1000), { locale: es })}`
                                            }
                                        </div>
                                    )}
                                </CardTitle>
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
                                                        const newStatus = ticket.status;
                                                        updateTicket({ ...ticket, scheduledStart: date, status: newStatus });
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
                                                        updateTicket({ ...ticket, scheduledEnd: date });
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <span className="text-gray-500 block">Tipo de Servicio</span>
                                        <div className="flex flex-col gap-1">
                                            <span className="font-medium">{ticket.serviceType.replace(/_/g, ' ')}</span>
                                            {ticket.extraServices?.map(es => (
                                                <span key={es} className="font-medium text-blue-600">+ {es.replace(/_/g, ' ')}</span>
                                            ))}
                                            {(currentUserRole === 'ADMIN' || currentUserRole === 'SUPERVISOR' || currentUserRole === 'GERENTE_TICKETS') && (
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    className="w-fit h-6 text-xs mt-1 border border-dashed border-gray-300"
                                                    onClick={() => {
                                                        const sv = prompt("Escribe el nombre del servicio adicional (ej: MANTENIMIENTO, REPARACION):");
                                                        if (sv) {
                                                            const arr = ticket.extraServices || [];
                                                            updateTicket({ ...ticket, extraServices: [...arr, sv.toUpperCase()] });
                                                        }
                                                    }}
                                                >
                                                    + Agregar Servicio
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 block">Prioridad</span>
                                        <span className={`font-medium ${ticket.priority === 'URGENT' ? 'text-red-600' : ''}`}>{ticket.priority}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 block font-semibold mb-1">Técnico Asignado</span>
                                        {ticket.arrivedAt || ticket.status === 'COMPLETED' || ticket.status === 'CANCELLED' ? (
                                            <div className="flex flex-col">
                                                <span className="font-medium text-slate-800">{ticket.technicianName || "Sin asignar"}</span>
                                                <span className="text-xs text-amber-600 italic mt-0.5">⚠️ Servicio iniciado o finalizado (Asignación bloqueada)</span>
                                            </div>
                                        ) : (
                                            (currentUserRole === 'ADMIN' || currentUserRole === 'SUPERVISOR' || currentUserRole === 'GERENTE_TICKETS' || currentUserRole === 'GERENTE') ? (
                                                <Select
                                                    value={ticket.technicianId || "unassigned"}
                                                    onValueChange={(val) => {
                                                        if (val !== "unassigned") {
                                                            handleReassign(val);
                                                        }
                                                    }}
                                                >
                                                    <SelectTrigger className="w-full bg-white h-9 mt-0.5 text-xs border-slate-200">
                                                        <SelectValue placeholder="Seleccionar técnico..." />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-white">
                                                        <SelectItem value="unassigned">Sin asignar</SelectItem>
                                                        {technicians.map(t => (
                                                            <SelectItem key={t.id} value={t.id}>
                                                                {t.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <span className="font-medium text-slate-800">{ticket.technicianName || "Sin asignar"}</span>
                                            )
                                        )}
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

                                    {/* 📍 LOCATION LINK — Readonly for Technicians, editable for Admin/Managers */}
                                    <div className="col-span-2">
                                        <LocationInput
                                            label="Ubicación del Cliente"
                                            value={ticket.locationUrl || ticket.locationName || ""}
                                            onChange={(val) => {
                                                if (currentUserRole === 'ADMIN' || currentUserRole === 'SUPERVISOR' || currentUserRole === 'GERENTE_TICKETS') {
                                                    updateTicket({ ...ticket, locationUrl: val, locationName: val });
                                                }
                                            }}
                                            placeholder={
                                                (currentUserRole === 'ADMIN' || currentUserRole === 'SUPERVISOR' || currentUserRole === 'GERENTE_TICKETS')
                                                ? "Pega el link de Google Maps o WhatsApp del cliente..."
                                                : "Dirección de servicio"
                                            }
                                            showGpsButton={false}
                                            showOpenLink={true}
                                            disabled={!(currentUserRole === 'ADMIN' || currentUserRole === 'SUPERVISOR' || currentUserRole === 'GERENTE_TICKETS')}
                                        />
                                        {(currentUserRole === 'ADMIN' || currentUserRole === 'SUPERVISOR' || currentUserRole === 'GERENTE_TICKETS') && (
                                            <p className="text-xs text-gray-400 mt-1">
                                                💡 El técnico podrá abrir esta ubicación directamente desde su app.
                                            </p>
                                        )}
                                    </div>

                                    <div className="col-span-2 flex items-center gap-2 mt-2 p-3 border rounded-md bg-gray-50">
                                        <input
                                            type="checkbox"
                                            id="allowGallery"
                                            checked={ticket.allowGalleryUpload || false}
                                            onChange={(e) => updateTicket({ ...ticket, allowGalleryUpload: e.target.checked })}
                                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <Label htmlFor="allowGallery" className="cursor-pointer font-medium">
                                            Permitir al técnico subir fotos desde Galería
                                        </Label>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Historial de Visitas */}
                        {ticket.visits && ticket.visits.length > 0 && (
                            <Card className="border-slate-200">
                                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                                    <div>
                                        <CardTitle className="text-base">Historial de Visitas</CardTitle>
                                        <CardDescription>Detalle de cada visita técnica programada o realizada.</CardDescription>
                                    </div>
                                    {(currentUserRole === 'ADMIN' || currentUserRole === 'SUPERVISOR' || currentUserRole === 'GERENTE_TICKETS' || currentUserRole === 'GERENTE') && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                                setNewVisitTechId(ticket.technicianId || "");
                                                setShowNewVisitModal(true);
                                            }}
                                            className="text-xs font-semibold text-blue-600 hover:text-blue-700 border-blue-200 hover:bg-blue-50"
                                        >
                                            + Nueva Visita
                                        </Button>
                                    )}
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-3">
                                        {ticket.visits.map((visit) => (
                                            <div key={visit.id} className="p-3 border rounded-lg bg-white shadow-xs text-sm space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <span className="font-bold text-slate-800">Visita #{visit.visitNumber}</span>
                                                    <Badge variant={visit.status === 'COMPLETED' ? 'default' : visit.status === 'IN_PROGRESS' ? 'secondary' : 'outline'}>
                                                        {visit.status === 'COMPLETED' ? 'Completada' : visit.status === 'IN_PROGRESS' ? 'En Curso' : 'Programada'}
                                                    </Badge>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                                                    <div>
                                                        <span className="font-semibold block">Técnico</span>
                                                        <span>{visit.technicianName}</span>
                                                    </div>
                                                    <div>
                                                        <span className="font-semibold block">Fecha</span>
                                                        <span>
                                                            {visit.scheduledDate ? new Date(visit.scheduledDate.seconds * 1000).toLocaleString() : "Sin fecha"}
                                                        </span>
                                                    </div>
                                                    {visit.arrivedAt && (
                                                        <div>
                                                            <span className="font-semibold block">Llegada / Inicio</span>
                                                            <span>{new Date(visit.arrivedAt.seconds * 1000).toLocaleString()}</span>
                                                        </div>
                                                    )}
                                                    {visit.workEndedAt && (
                                                        <div>
                                                            <span className="font-semibold block">Fin de Trabajo</span>
                                                            <span>{new Date(visit.workEndedAt.seconds * 1000).toLocaleString()}</span>
                                                        </div>
                                                    )}
                                                    {visit.startMileage !== undefined && visit.startMileage !== null && (
                                                        <div>
                                                            <span className="font-semibold block">KM Inicial</span>
                                                            <span>{visit.startMileage} km</span>
                                                        </div>
                                                    )}
                                                    {visit.endMileage !== undefined && visit.endMileage !== null && (
                                                        <div>
                                                            <span className="font-semibold block">KM Final</span>
                                                            <span>{visit.endMileage} km</span>
                                                        </div>
                                                    )}
                                                </div>
                                                {(visit.diagnosis || visit.solution || visit.recommendations) && (
                                                    <div className="mt-2 border-t pt-2 space-y-1 text-xs text-gray-700 bg-slate-50 p-2 rounded">
                                                        {visit.diagnosis && <p><strong>Diagnóstico:</strong> {visit.diagnosis}</p>}
                                                        {visit.solution && <p><strong>Solución:</strong> {visit.solution}</p>}
                                                        {visit.recommendations && <p><strong>Recomendaciones:</strong> {visit.recommendations}</p>}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        <Card>
                            <CardHeader>
                                <CardTitle>Historial</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <TicketTimeline 
                                    events={events} 
                                    ticketId={ticketId}
                                    currentUserId={currentUserId}
                                    currentUserName={currentUserName}
                                />
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
                                        updateTicket({ ...ticket, checklist: newChecklist });
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
                                    onChange={(photos) => updateTicket({ ...ticket, photos })}
                                    allowGallery={true}
                                    onPhotoAdded={handlePhotoAdded}
                                />
                                <div className="border-t" />
                                <PhotoUploader
                                    label="Fotos Durante"
                                    type="DURING"
                                    photos={ticket.photos || []}
                                    onChange={(photos) => updateTicket({ ...ticket, photos })}
                                    allowGallery={true}
                                    onPhotoAdded={handlePhotoAdded}
                                />
                                <div className="border-t" />
                                <PhotoUploader
                                    label="Fotos Después"
                                    type="AFTER"
                                    photos={ticket.photos || []}
                                    onChange={(photos) => updateTicket({ ...ticket, photos })}
                                    allowGallery={true}
                                    onPhotoAdded={handlePhotoAdded}
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
                                        onChange={(e) => updateTicket({ ...ticket, diagnosis: e.target.value })}
                                        className="min-h-[100px]"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <Label>Solución Aplicada</Label>
                                        <ErrorSearchModal
                                            onSelectSolution={(sol: string) => {
                                                const current = ticket?.solution || "";
                                                updateTicket({ ...ticket!, solution: current + (current ? "\n\n" : "") + sol });
                                            }}
                                        />
                                    </div>
                                    <VoiceTextarea
                                        placeholder="¿Qué hiciste?"
                                        value={ticket.solution || ''}
                                        onChange={(e) => updateTicket({ ...ticket, solution: e.target.value })}
                                        className="min-h-[100px]"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Recomendaciones</Label>
                                    <VoiceTextarea
                                        placeholder="Sugerencias para el cliente..."
                                        value={ticket.recommendations || ''}
                                        onChange={(e) => updateTicket({ ...ticket, recommendations: e.target.value })}
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

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Nombre de quien recibe</Label>
                                        <Input
                                            value={ticket.clientSignatureName || ""}
                                            onChange={(e) => updateTicket({ ...ticket, clientSignatureName: e.target.value })}
                                            placeholder="Ej. Juan Pérez"
                                            className="h-10"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Firma del Cliente</Label>
                                        <SignaturePad
                                            value={ticket.clientSignature}
                                            onChange={(sig) => updateTicket({ ...ticket, clientSignature: sig })}
                                        />
                                    </div>
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

            {/* Modal para programar nueva visita */}
            <Dialog open={showNewVisitModal} onOpenChange={setShowNewVisitModal}>
                <DialogContent className="sm:max-w-md bg-white">
                    <DialogHeader>
                        <DialogTitle>Programar Nueva Visita</DialogTitle>
                        <CardDescription>Crea una nueva visita técnica para este ticket de servicio.</CardDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4 text-sm">
                        <div className="space-y-1.5">
                            <Label htmlFor="visitTech">Técnico Asignado</Label>
                            <Select value={newVisitTechId} onValueChange={setNewVisitTechId}>
                                <SelectTrigger id="visitTech" className="bg-white">
                                    <SelectValue placeholder="Seleccionar técnico..." />
                                </SelectTrigger>
                                <SelectContent className="bg-white">
                                    {technicians.map(t => (
                                        <SelectItem key={t.id} value={t.id}>
                                            {t.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="visitDate">Fecha y Hora Programada</Label>
                            <Input
                                id="visitDate"
                                type="datetime-local"
                                value={newVisitDate}
                                onChange={e => setNewVisitDate(e.target.value)}
                                className="bg-white"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowNewVisitModal(false)}>
                            Cancelar
                        </Button>
                        <Button 
                            onClick={handleScheduleNewVisit}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            Programar Visita
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
