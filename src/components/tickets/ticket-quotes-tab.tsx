"use client";

import React, { useState, useEffect } from "react";
import {
    collection,
    query,
    where,
    onSnapshot,
    addDoc,
    doc,
    updateDoc,
    getDoc,
    serverTimestamp,
    Timestamp
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Ticket, UserRole, CompanySettings } from "@/types/schema";
import { Quote, QuoteItem, InternalBudgetBreakdown } from "@/types/finance";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from "@/components/ui/dialog";
import {
    FileText,
    Plus,
    Eye,
    Download,
    Share2,
    Copy,
    DollarSign,
    TrendingUp,
    ShieldAlert,
    AlertCircle,
    Loader2,
    Calculator,
    CheckCircle2,
    Clock,
    Layers,
    History,
    FileCheck2,
    Sparkles,
    Wand2
} from "lucide-react";
import { generateDocumentPDF, mapQuoteToDocument } from "@/lib/document-generator";
import { generateNextNumber } from "@/lib/numbering-service";
import { DocumentViewerModal } from "@/components/documents/document-viewer-modal";
import { VoiceQuoteModal } from "@/components/income/quotes/voice-quote-modal";
import { useToast } from "@/components/ui/use-toast";

interface TicketQuotesTabProps {
    ticket: Ticket;
    currentUserRole?: UserRole | null;
}

export function TicketQuotesTab({ ticket, currentUserRole }: TicketQuotesTabProps) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);

    // Dialog state for new quote or internal budget
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [createType, setCreateType] = useState<"COTIZACION_CLIENTE" | "PRESUPUESTO_INTERNO">("COTIZACION_CLIENTE");
    const [creating, setCreating] = useState(false);

    // Form inputs for new quote
    const [currency, setCurrency] = useState<"DOP" | "USD">("DOP");
    const [items, setItems] = useState<{ description: string; qty: number; rate: number }[]>([
        { description: `Servicio técnico para ${ticket.description || ticket.serviceType || 'Ticket'}`, qty: 1, rate: 0 }
    ]);
    const [notes, setNotes] = useState("");
    const [terms, setTerms] = useState("100% al confirmar el servicio.");

    // Internal Budget Breakdown fields
    const [internalBreakdown, setInternalBreakdown] = useState<InternalBudgetBreakdown>({
        materialsCost: 0,
        laborCost: 0,
        transportCost: 0,
        subcontractorCost: 0,
        contingencyCost: 0,
        otherCost: 0,
        totalInternalCost: 0
    });

    // Viewer Modal State
    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewingBlob, setViewingBlob] = useState<Blob | null>(null);
    const [viewingDocNumber, setViewingDocNumber] = useState("");
    const [viewingClientName, setViewingClientName] = useState("");
    const [viewingVillaName, setViewingVillaName] = useState("");
    const [viewingDate, setViewingDate] = useState("");
    const [viewingIsInternal, setViewingIsInternal] = useState(false);
    const [viewingTitle, setViewingTitle] = useState("");
    const [generatingDocId, setGeneratingDocId] = useState<string | null>(null);

    // AI Voice & Natural Language Assistant State
    const [voiceModalOpen, setVoiceModalOpen] = useState(false);

    // Roles permission
    const isAdminOrManager =
        currentUserRole === "ADMIN" ||
        currentUserRole === "GERENTE" ||
        currentUserRole === "GERENTE_TICKETS" ||
        currentUserRole === "SUPERVISOR";

    // Load company settings
    useEffect(() => {
        const loadCompany = async () => {
            try {
                const snap = await getDoc(doc(db, "settings", "company"));
                if (snap.exists()) {
                    setCompanySettings(snap.data() as CompanySettings);
                }
            } catch (err) {
                console.error("Error loading company settings:", err);
            }
        };
        loadCompany();
    }, []);

    // Subscribe to quotes for this ticket
    useEffect(() => {
        if (!ticket.id) return;

        const q = query(
            collection(db, "quotes"),
            where("ticketId", "==", ticket.id)
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const list = snapshot.docs.map((docSnap) => ({
                    id: docSnap.id,
                    ...docSnap.data()
                })) as Quote[];

                // Sort newest first
                list.sort((a, b) => {
                    const timeA = (a.createdAt as any)?.seconds || 0;
                    const timeB = (b.createdAt as any)?.seconds || 0;
                    return timeB - timeA;
                });

                setQuotes(list);
                setLoading(false);
            },
            (error) => {
                console.error("Error subscribing to ticket quotes:", error);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [ticket.id]);

    // Recalculate internal total cost when fields change
    useEffect(() => {
        const total =
            (Number(internalBreakdown.materialsCost) || 0) +
            (Number(internalBreakdown.laborCost) || 0) +
            (Number(internalBreakdown.transportCost) || 0) +
            (Number(internalBreakdown.subcontractorCost) || 0) +
            (Number(internalBreakdown.contingencyCost) || 0) +
            (Number(internalBreakdown.otherCost) || 0);

        setInternalBreakdown((prev) => ({
            ...prev,
            totalInternalCost: total
        }));
    }, [
        internalBreakdown.materialsCost,
        internalBreakdown.laborCost,
        internalBreakdown.transportCost,
        internalBreakdown.subcontractorCost,
        internalBreakdown.contingencyCost,
        internalBreakdown.otherCost
    ]);

    // Separation of quotes
    const clientQuotes = quotes.filter(
        (q) => !q.isInternalOnly && q.documentType !== "PRESUPUESTO_INTERNO"
    );
    const internalBudgets = quotes.filter(
        (q) => q.isInternalOnly || q.documentType === "PRESUPUESTO_INTERNO"
    );

    // Financial Metrics Calculation for Admin/Manager
    const latestClientQuote = clientQuotes[0];
    const latestInternalBudget = internalBudgets[0];

    const quotedAmount = latestClientQuote ? (latestClientQuote.grand_total || latestClientQuote.total || 0) : 0;
    const internalCost = latestInternalBudget
        ? (latestInternalBudget.internalBudget?.totalInternalCost || latestInternalBudget.grand_total || latestInternalBudget.total || 0)
        : 0;

    const projectedProfit = quotedAmount > 0 ? quotedAmount - internalCost : 0;
    const grossMarginPct = quotedAmount > 0 ? (projectedProfit / quotedAmount) * 100 : 0;

    // View PDF action
    const handleViewDocument = async (quoteItem: Quote) => {
        if (!companySettings) {
            toast({
                variant: "destructive",
                title: "Configuración no disponible",
                description: "Cargando datos de la empresa..."
            });
            return;
        }

        setGeneratingDocId(quoteItem.id);
        try {
            const isInternal = quoteItem.isInternalOnly || quoteItem.documentType === "PRESUPUESTO_INTERNO";
            const docData = mapQuoteToDocument(
                quoteItem,
                companySettings,
                isInternal ? "PRESUPUESTO INTERNO" : "COTIZACIÓN"
            );

            const blob = await generateDocumentPDF(docData, "classic");
            setViewingBlob(blob);
            setViewingDocNumber(docData.number);
            setViewingClientName(docData.client.name || ticket.clientName);
            setViewingVillaName(ticket.specificLocation || ticket.locationName || "");
            setViewingDate(quoteItem.transaction_date || new Date().toISOString().split("T")[0]);
            setViewingIsInternal(isInternal);
            setViewingTitle(isInternal ? "Presupuesto Interno de Costos" : "Cotización Comercial");
            setViewerOpen(true);
        } catch (err: any) {
            console.error("Error generando PDF para visor:", err);
            toast({
                variant: "destructive",
                title: "Error al visualizar",
                description: err.message || "No se pudo generar el documento PDF."
            });
        } finally {
            setGeneratingDocId(null);
        }
    };

    // Duplicate as new version (V2, V3...)
    const handleDuplicateVersion = async (parentQuote: Quote) => {
        setLoading(true);
        try {
            const nextVersion = (parentQuote.version || 1) + 1;
            const currentHistory = parentQuote.versionHistory || [];

            const historySnapshot = [
                ...currentHistory,
                {
                    version: parentQuote.version || 1,
                    quoteCode: parentQuote.quoteCode || parentQuote.name || parentQuote.number || "V1",
                    createdAt: parentQuote.createdAt instanceof Timestamp ? parentQuote.createdAt : Timestamp.now(),
                    createdBy: auth.currentUser?.displayName || "Usuario",
                    totalAmount: parentQuote.grand_total || parentQuote.total || 0,
                    changeReason: `Nueva versión V${nextVersion} creada a partir de V${parentQuote.version || 1}`
                }
            ];

            const newCode = `${parentQuote.quoteCode || parentQuote.name || "COT"}-V${nextVersion}`;

            const duplicatedDoc = {
                ...parentQuote,
                quoteCode: newCode,
                version: nextVersion,
                versionHistory: historySnapshot,
                status: "Draft",
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                notes: `Versión V${nextVersion}. ${parentQuote.notes || ""}`
            };
            delete (duplicatedDoc as any).id;

            const docRef = await addDoc(collection(db, "quotes"), duplicatedDoc);

            toast({
                title: `✅ Versión V${nextVersion} Creada`,
                description: `Nueva cotización generada con código ${newCode}`
            });
        } catch (err: any) {
            console.error("Error duplicando versión:", err);
            toast({
                variant: "destructive",
                title: "Error al duplicar",
                description: err.message
            });
        } finally {
            setLoading(false);
        }
    };

    // Handle Create Quote / Budget
    const handleCreateDocument = async () => {
        if (items.length === 0 || items.some((i) => !i.description.trim())) {
            toast({
                variant: "destructive",
                title: "Campos requeridos",
                description: "Agrega al menos un concepto o descripción."
            });
            return;
        }

        setCreating(true);
        try {
            const isInternal = createType === "PRESUPUESTO_INTERNO";
            const prefix = isInternal ? "INT" : "COT";
            const seqNumber = await generateNextNumber(prefix);

            const calculatedSubtotal = Number(
                (isInternal
                    ? (internalBreakdown.totalInternalCost ?? 0)
                    : items.reduce((sum, item) => sum + (Number(item.qty) || 1) * (Number(item.rate) || 0), 0)
                ) || 0
            );

            const taxTotal = isInternal ? 0 : Number((calculatedSubtotal * 0.18).toFixed(2));
            const grandTotal = calculatedSubtotal + taxTotal;

            const quoteItems: QuoteItem[] = isInternal
                ? [
                      { item_code: "MAT", item_name: "Materiales y Repuestos", description: "Costo directo de materiales", qty: 1, uom: "Unit", rate: Number(internalBreakdown.materialsCost) || 0, amount: Number(internalBreakdown.materialsCost) || 0 },
                      { item_code: "MO", item_name: "Mano de Obra Técnica", description: "Horas hombre y técnicos asignados", qty: 1, uom: "Unit", rate: Number(internalBreakdown.laborCost) || 0, amount: Number(internalBreakdown.laborCost) || 0 },
                      { item_code: "TRANS", item_name: "Transporte y Logística", description: "Combustible, dietas y traslados", qty: 1, uom: "Unit", rate: Number(internalBreakdown.transportCost) || 0, amount: Number(internalBreakdown.transportCost) || 0 },
                      { item_code: "SUBCONT", item_name: "Subcontratistas / Especialistas", description: "Servicios tercerizados", qty: 1, uom: "Unit", rate: Number(internalBreakdown.subcontractorCost) || 0, amount: Number(internalBreakdown.subcontractorCost) || 0 },
                      { item_code: "CONTING", item_name: "Contingencias e Imprevistos", description: "Fondo de contingencia operativo", qty: 1, uom: "Unit", rate: Number(internalBreakdown.contingencyCost) || 0, amount: Number(internalBreakdown.contingencyCost) || 0 },
                      { item_code: "OTRO", item_name: "Otros Gastos Directos", description: "Herramientas o insumos especiales", qty: 1, uom: "Unit", rate: Number(internalBreakdown.otherCost) || 0, amount: Number(internalBreakdown.otherCost) || 0 }
                  ].filter((item) => (item.amount ?? 0) > 0)
                : items.map((it, idx) => ({
                      item_code: `SERV-${idx + 1}`,
                      item_name: it.description,
                      description: it.description,
                      qty: Number(it.qty) || 1,
                      uom: "Unit",
                      rate: Number(it.rate) || 0,
                      amount: (Number(it.qty) || 1) * (Number(it.rate) || 0)
                  }));

            const newDoc: Partial<Quote> = {
                ticketId: ticket.id,
                ticketNumber: ticket.ticketNumber,
                documentType: createType,
                quoteCode: seqNumber,
                name: seqNumber,
                number: seqNumber,
                version: 1,
                versionHistory: [],
                isInternalOnly: isInternal,
                party_name: ticket.clientName,
                customer_name: ticket.clientName,
                currency,
                transaction_date: new Date().toISOString().split("T")[0],
                status: "Draft",
                items: quoteItems,
                net_total: calculatedSubtotal,
                subtotal: calculatedSubtotal,
                total_taxes_and_charges: taxTotal,
                taxTotal,
                grand_total: grandTotal,
                total: grandTotal,
                notes: notes.trim() || (isInternal ? "Presupuesto confidencial de costos para el ticket." : `Cotización de servicio para ticket No. ${ticket.ticketNumber || ticket.id}`),
                terms: terms.trim(),
                internalBudget: isInternal ? internalBreakdown : undefined,
                createdAt: serverTimestamp() as any,
                updatedAt: serverTimestamp() as any
            };

            await addDoc(collection(db, "quotes"), newDoc);

            toast({
                title: isInternal ? "✅ Presupuesto Interno Creado" : "✅ Cotización Creada",
                description: `Documento registrado con número ${seqNumber}`
            });

            setCreateDialogOpen(false);
            // Reset form
            setItems([{ description: `Servicio técnico para ${ticket.description || ticket.serviceType || 'Ticket'}`, qty: 1, rate: 0 }]);
            setNotes("");
        } catch (err: any) {
            console.error("Error creando cotización/presupuesto:", err);
            toast({
                variant: "destructive",
                title: "Error al crear",
                description: err.message
            });
        } finally {
            setCreating(false);
        }
    };

    const currencySymbol = currency === "USD" ? "US$" : "RD$";

    return (
        <div className="space-y-6">
            {/* Header with quick creation buttons */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-xl border shadow-sm">
                <div>
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-600" />
                        Cotizaciones y Presupuestos del Ticket
                    </h2>
                    <p className="text-xs text-slate-500">
                        Gestiona cotizaciones para el cliente, presupuestos internos de costo y rentabilidad.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Botón de Cotizar con IA usando la descripción del ticket */}
                    <Button
                        size="sm"
                        onClick={() => setVoiceModalOpen(true)}
                        className="bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-xs gap-1.5 shadow-md"
                    >
                        <Sparkles className="h-3.5 w-3.5 text-amber-300 animate-pulse" />
                        Cotizar con IA desde Ticket
                    </Button>

                    <Button
                        size="sm"
                        onClick={() => {
                            // Pre-fill with ticket description if available
                            if (ticket.description) {
                                setItems([{ description: ticket.description, qty: 1, rate: 0 }]);
                            }
                            setCreateType("COTIZACION_CLIENTE");
                            setCreateDialogOpen(true);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-1.5 shadow-sm"
                    >
                        <Plus className="h-4 w-4" />
                        Nueva Cotización Manual
                    </Button>

                    {isAdminOrManager && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                                setCreateType("PRESUPUESTO_INTERNO");
                                setCreateDialogOpen(true);
                            }}
                            className="border-amber-400 text-amber-800 bg-amber-50 hover:bg-amber-100 font-semibold text-xs gap-1.5"
                        >
                            <Calculator className="h-4 w-4 text-amber-600" />
                            Nuevo Presupuesto Interno
                        </Button>
                    )}
                </div>
            </div>

            {/* Financial Summary Card (Visible only to Admin / Management) */}
            {isAdminOrManager && (
                <Card className="border-indigo-100 shadow-sm bg-gradient-to-br from-slate-50 via-white to-blue-50/40 rounded-xl overflow-hidden">
                    <CardHeader className="py-3 px-4 border-b border-indigo-50/60 bg-white/70">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-indigo-600" />
                                Control Financiero & Rentabilidad Estimada
                            </CardTitle>
                            <Badge variant="outline" className="text-[10px] font-semibold border-indigo-200 text-indigo-700 bg-indigo-50">
                                Vista Administrativa
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {/* Quoted to Client */}
                            <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
                                <div className="text-slate-500 text-[11px] font-medium">Cotizado al Cliente</div>
                                <div className="text-base font-bold text-emerald-700 mt-0.5">
                                    RD$ {quotedAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                </div>
                                <div className="text-[10px] text-slate-400 mt-1 truncate">
                                    {latestClientQuote ? `${latestClientQuote.quoteCode || latestClientQuote.number || "V1"}` : "Sin cotización"}
                                </div>
                            </div>

                            {/* Internal Estimated Cost */}
                            <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
                                <div className="text-slate-500 text-[11px] font-medium">Costo Interno (INT)</div>
                                <div className="text-base font-bold text-slate-800 mt-0.5">
                                    RD$ {internalCost.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                </div>
                                <div className="text-[10px] text-slate-400 mt-1 truncate">
                                    {latestInternalBudget ? `${latestInternalBudget.quoteCode || "INT-001"}` : "Sin desglose interno"}
                                </div>
                            </div>

                            {/* Projected Profit */}
                            <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
                                <div className="text-slate-500 text-[11px] font-medium">Utilidad Estimada</div>
                                <div className={`text-base font-bold mt-0.5 ${projectedProfit >= 0 ? 'text-blue-700' : 'text-rose-600'}`}>
                                    RD$ {projectedProfit.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                </div>
                                <div className="text-[10px] text-slate-400 mt-1">
                                    {projectedProfit >= 0 ? "Margen positivo" : "Margen negativo"}
                                </div>
                            </div>

                            {/* Margin % */}
                            <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
                                <div className="text-slate-500 text-[11px] font-medium">Margen Bruto</div>
                                <div className={`text-base font-bold mt-0.5 ${grossMarginPct >= 30 ? 'text-emerald-600' : grossMarginPct >= 15 ? 'text-amber-600' : 'text-rose-600'}`}>
                                    {grossMarginPct.toFixed(1)}%
                                </div>
                                <div className="text-[10px] text-slate-400 mt-1">
                                    {grossMarginPct >= 30 ? "Rentabilidad óptima" : "Revisar costos"}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* List of Client Quotations */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <FileCheck2 className="h-4 w-4 text-emerald-600" />
                        Cotizaciones Comerciales para Cliente ({clientQuotes.length})
                    </h3>
                </div>

                {loading ? (
                    <div className="py-8 flex justify-center items-center text-slate-400">
                        <Loader2 className="h-6 w-6 animate-spin mr-2 text-blue-600" />
                        <span className="text-xs">Cargando cotizaciones...</span>
                    </div>
                ) : clientQuotes.length === 0 ? (
                    <Card className="border-dashed border-slate-200 bg-slate-50/50">
                        <CardContent className="py-8 text-center">
                            <FileText className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                            <p className="text-xs text-slate-500 font-medium">
                                No se han emitido cotizaciones para este ticket.
                            </p>
                            <div className="mt-3 flex flex-wrap justify-center gap-2">
                                <Button
                                    size="sm"
                                    onClick={() => setVoiceModalOpen(true)}
                                    className="bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-xs gap-1.5 shadow-sm"
                                >
                                    <Sparkles className="h-3.5 w-3.5 text-amber-300 animate-pulse" />
                                    Cotizar con IA desde Descripción del Ticket
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                        if (ticket.description) {
                                            setItems([{ description: ticket.description, qty: 1, rate: 0 }]);
                                        }
                                        setCreateType("COTIZACION_CLIENTE");
                                        setCreateDialogOpen(true);
                                    }}
                                    className="text-xs"
                                >
                                    <Plus className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                                    Crear Manualmente
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 gap-3">
                        {clientQuotes.map((q) => {
                            const isGenerating = generatingDocId === q.id;
                            const totalAmount = q.grand_total || q.total || 0;
                            const currencyCode = q.currency || "DOP";
                            const currSymbol = currencyCode === "USD" ? "US$" : "RD$";
                            const dateStr = q.transaction_date || "Fecha no especificada";

                            return (
                                <Card
                                    key={q.id}
                                    className="border-slate-200 shadow-2xs hover:shadow-sm transition-all bg-white rounded-xl overflow-hidden"
                                >
                                    <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="space-y-1.5">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-mono font-bold text-sm text-slate-900">
                                                    {q.quoteCode || q.number || q.name || "COT"}
                                                </span>
                                                {q.version && (
                                                    <Badge variant="secondary" className="text-[10px] font-semibold bg-blue-50 text-blue-700">
                                                        V{q.version}
                                                    </Badge>
                                                )}
                                                <Badge
                                                    variant="outline"
                                                    className={`text-[10px] font-semibold ${
                                                        q.status === "Ordered" || (q.status as string) === "Accepted"
                                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                            : q.status === "Draft"
                                                            ? "bg-amber-50 text-amber-700 border-amber-200"
                                                            : "bg-slate-50 text-slate-700 border-slate-200"
                                                    }`}
                                                >
                                                    {q.status || "Draft"}
                                                </Badge>
                                            </div>
                                            <div className="text-xs text-slate-600 flex items-center gap-2">
                                                <Clock className="h-3 w-3 text-slate-400" />
                                                <span>Emitido: {dateStr}</span>
                                                <span>•</span>
                                                <span>{q.items?.length || 0} ítems</span>
                                            </div>
                                            {q.notes && (
                                                <p className="text-[11px] text-slate-500 line-clamp-1 italic">
                                                    {q.notes}
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex flex-col md:items-end gap-2 shrink-0">
                                            <div className="text-base font-bold text-slate-900">
                                                {currSymbol} {totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                            </div>

                                            <div className="flex flex-wrap items-center gap-1.5">
                                                {/* Visualizar en Visor PDF Interactivo */}
                                                <Button
                                                    size="sm"
                                                    variant="default"
                                                    onClick={() => handleViewDocument(q)}
                                                    disabled={isGenerating}
                                                    className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5 shadow-2xs"
                                                >
                                                    {isGenerating ? (
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    ) : (
                                                        <Eye className="h-3.5 w-3.5" />
                                                    )}
                                                    Ver PDF
                                                </Button>

                                                {/* Crear Nueva Versión */}
                                                {isAdminOrManager && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleDuplicateVersion(q)}
                                                        className="h-8 text-xs gap-1 text-slate-700 hover:text-slate-900 border-slate-200"
                                                        title="Duplicar como nueva versión (V+1)"
                                                    >
                                                        <Copy className="h-3 w-3" />
                                                        <span className="hidden sm:inline">Nueva Versión</span>
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* List of Internal Budgets (Visible only to Admin / Management) */}
            {isAdminOrManager && (
                <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                            <ShieldAlert className="h-4 w-4 text-amber-600" />
                            Presupuestos Internos de Costos ({internalBudgets.length})
                        </h3>
                        <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md font-medium">
                            Confidencial — No visible para clientes ni técnicos
                        </span>
                    </div>

                    {internalBudgets.length === 0 ? (
                        <Card className="border-dashed border-amber-200 bg-amber-50/20">
                            <CardContent className="py-6 text-center">
                                <Calculator className="h-7 w-7 text-amber-400 mx-auto mb-1.5" />
                                <p className="text-xs text-slate-600 font-medium">
                                    No hay presupuestos internos de costos registrados.
                                </p>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                        setCreateType("PRESUPUESTO_INTERNO");
                                        setCreateDialogOpen(true);
                                    }}
                                    className="mt-2 text-xs border-amber-300 text-amber-800 hover:bg-amber-100"
                                >
                                    <Plus className="h-3.5 w-3.5 mr-1" />
                                    Registrar Costos Internos
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 gap-3">
                            {internalBudgets.map((b) => {
                                const isGenerating = generatingDocId === b.id;
                                const totalCost =
                                    b.internalBudget?.totalInternalCost || b.grand_total || b.total || 0;

                                return (
                                    <Card
                                        key={b.id}
                                        className="border-amber-200/80 shadow-2xs hover:shadow-sm transition-all bg-gradient-to-r from-amber-50/30 to-white rounded-xl overflow-hidden"
                                    >
                                        <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono font-bold text-sm text-slate-900">
                                                        {b.quoteCode || b.number || "INT"}
                                                    </span>
                                                    <Badge className="bg-red-500/10 text-red-700 border-red-300 text-[10px] font-semibold">
                                                        USO INTERNO
                                                    </Badge>
                                                    <span className="text-xs text-slate-400">
                                                        {b.transaction_date || "Hoy"}
                                                    </span>
                                                </div>

                                                {/* Mini breakdown chips */}
                                                {b.internalBudget && (
                                                    <div className="flex flex-wrap gap-2 pt-1 text-[11px] text-slate-600">
                                                        <span>Mat: RD${(b.internalBudget.materialsCost || 0).toLocaleString()}</span>
                                                        <span>•</span>
                                                        <span>MO: RD${(b.internalBudget.laborCost || 0).toLocaleString()}</span>
                                                        <span>•</span>
                                                        <span>Transp: RD${(b.internalBudget.transportCost || 0).toLocaleString()}</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex flex-col md:items-end gap-2 shrink-0">
                                                <div className="text-base font-bold text-slate-800">
                                                    RD$ {totalCost.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                                </div>

                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleViewDocument(b)}
                                                    disabled={isGenerating}
                                                    className="h-8 text-xs border-amber-300 text-amber-900 hover:bg-amber-100 font-semibold gap-1.5"
                                                >
                                                    {isGenerating ? (
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    ) : (
                                                        <Eye className="h-3.5 w-3.5 text-amber-600" />
                                                    )}
                                                    Ver PDF Interno (Marca de Agua)
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Create Quote or Budget Modal */}
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white p-6 rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                            {createType === "PRESUPUESTO_INTERNO" ? (
                                <>
                                    <Calculator className="h-5 w-5 text-amber-600" />
                                    Nuevo Presupuesto Interno de Costos
                                </>
                            ) : (
                                <>
                                    <FileText className="h-5 w-5 text-emerald-600" />
                                    Nueva Cotización para Cliente
                                </>
                            )}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            {createType === "PRESUPUESTO_INTERNO"
                                ? "Desglosa los costos operativos directos e indirectos. Este documento lleva marca de agua y no se envía al cliente."
                                : "Crea la propuesta comercial formal con precios de venta, ITBIS y condiciones para el cliente."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {/* Currency selector */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Moneda</Label>
                                <div className="flex gap-2 mt-1">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={currency === "DOP" ? "default" : "outline"}
                                        onClick={() => setCurrency("DOP")}
                                        className="text-xs h-8 px-3"
                                    >
                                        RD$ (Pesos)
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={currency === "USD" ? "default" : "outline"}
                                        onClick={() => setCurrency("USD")}
                                        className="text-xs h-8 px-3"
                                    >
                                        US$ (Dólares)
                                    </Button>
                                </div>
                            </div>

                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Cliente Asociado</Label>
                                <Input
                                    value={ticket.clientName || "Cliente General"}
                                    disabled
                                    className="bg-slate-50 text-xs h-8 mt-1"
                                />
                            </div>
                        </div>

                        {/* INTERNAL BUDGET MODE FIELDS */}
                        {createType === "PRESUPUESTO_INTERNO" ? (
                            <div className="space-y-3 bg-amber-50/40 p-4 rounded-xl border border-amber-200">
                                <h4 className="text-xs font-bold text-amber-900 uppercase">
                                    Desglose de Costos Reales
                                </h4>
                                <div className="grid grid-cols-2 gap-3 text-xs">
                                    <div>
                                        <Label className="text-[11px] text-slate-700">1. Materiales y Repuestos ({currencySymbol})</Label>
                                        <Input
                                            type="number"
                                            value={internalBreakdown.materialsCost || ""}
                                            onChange={(e) =>
                                                setInternalBreakdown({ ...internalBreakdown, materialsCost: Number(e.target.value) })
                                            }
                                            placeholder="0.00"
                                            className="bg-white h-8 text-xs mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-[11px] text-slate-700">2. Mano de Obra Técnica ({currencySymbol})</Label>
                                        <Input
                                            type="number"
                                            value={internalBreakdown.laborCost || ""}
                                            onChange={(e) =>
                                                setInternalBreakdown({ ...internalBreakdown, laborCost: Number(e.target.value) })
                                            }
                                            placeholder="0.00"
                                            className="bg-white h-8 text-xs mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-[11px] text-slate-700">3. Transporte y Logística ({currencySymbol})</Label>
                                        <Input
                                            type="number"
                                            value={internalBreakdown.transportCost || ""}
                                            onChange={(e) =>
                                                setInternalBreakdown({ ...internalBreakdown, transportCost: Number(e.target.value) })
                                            }
                                            placeholder="0.00"
                                            className="bg-white h-8 text-xs mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-[11px] text-slate-700">4. Subcontratistas / Terceros ({currencySymbol})</Label>
                                        <Input
                                            type="number"
                                            value={internalBreakdown.subcontractorCost || ""}
                                            onChange={(e) =>
                                                setInternalBreakdown({ ...internalBreakdown, subcontractorCost: Number(e.target.value) })
                                            }
                                            placeholder="0.00"
                                            className="bg-white h-8 text-xs mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-[11px] text-slate-700">5. Contingencias / Imprevistos ({currencySymbol})</Label>
                                        <Input
                                            type="number"
                                            value={internalBreakdown.contingencyCost || ""}
                                            onChange={(e) =>
                                                setInternalBreakdown({ ...internalBreakdown, contingencyCost: Number(e.target.value) })
                                            }
                                            placeholder="0.00"
                                            className="bg-white h-8 text-xs mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-[11px] text-slate-700">6. Otros Costos Directos ({currencySymbol})</Label>
                                        <Input
                                            type="number"
                                            value={internalBreakdown.otherCost || ""}
                                            onChange={(e) =>
                                                setInternalBreakdown({ ...internalBreakdown, otherCost: Number(e.target.value) })
                                            }
                                            placeholder="0.00"
                                            className="bg-white h-8 text-xs mt-1"
                                        />
                                    </div>
                                </div>

                                <div className="p-3 bg-white rounded-lg border border-amber-300 flex justify-between items-center mt-2">
                                    <span className="font-bold text-xs text-amber-900">COSTO INTERNO TOTAL:</span>
                                    <span className="font-bold text-sm text-slate-900">
                                        {currencySymbol} {(internalBreakdown.totalInternalCost ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            /* CLIENT QUOTE ITEMS */
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <Label className="text-xs font-semibold text-slate-700">Ítems a Cotizar</Label>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setItems([...items, { description: "", qty: 1, rate: 0 }])}
                                        className="h-7 text-[11px] gap-1"
                                    >
                                        <Plus className="h-3 w-3" /> Agregar Fila
                                    </Button>
                                </div>

                                <div className="space-y-2">
                                    {items.map((it, idx) => (
                                        <div key={idx} className="flex gap-2 items-center bg-slate-50 p-2 rounded-lg border">
                                            <Input
                                                placeholder="Descripción del servicio o material..."
                                                value={it.description}
                                                onChange={(e) => {
                                                    const copy = [...items];
                                                    copy[idx].description = e.target.value;
                                                    setItems(copy);
                                                }}
                                                className="flex-1 h-8 text-xs bg-white"
                                            />
                                            <Input
                                                type="number"
                                                placeholder="Cant"
                                                value={it.qty}
                                                onChange={(e) => {
                                                    const copy = [...items];
                                                    copy[idx].qty = Number(e.target.value);
                                                    setItems(copy);
                                                }}
                                                className="w-16 h-8 text-xs bg-white text-center"
                                            />
                                            <Input
                                                type="number"
                                                placeholder="Precio"
                                                value={it.rate || ""}
                                                onChange={(e) => {
                                                    const copy = [...items];
                                                    copy[idx].rate = Number(e.target.value);
                                                    setItems(copy);
                                                }}
                                                className="w-28 h-8 text-xs bg-white text-right"
                                            />
                                            {items.length > 1 && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setItems(items.filter((_, i) => i !== idx))}
                                                    className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600"
                                                >
                                                    ×
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Notes & Terms */}
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold text-slate-700">Notas / Alcance</Label>
                            <Textarea
                                rows={2}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Notas adicionales o especificaciones técnicas..."
                                className="text-xs bg-white"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCreateDialogOpen(false)}
                            disabled={creating}
                            className="text-xs"
                        >
                            Cancelar
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleCreateDocument}
                            disabled={creating}
                            className={`text-xs text-white font-semibold ${
                                createType === "PRESUPUESTO_INTERNO"
                                    ? "bg-amber-600 hover:bg-amber-700"
                                    : "bg-emerald-600 hover:bg-emerald-700"
                            }`}
                        >
                            {creating ? (
                                <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                                    Guardando...
                                </>
                            ) : (
                                "Guardar Documento"
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Universal Interactive Document Viewer Modal */}
            <DocumentViewerModal
                open={viewerOpen}
                onOpenChange={setViewerOpen}
                pdfBlob={viewingBlob}
                title={viewingTitle}
                documentNumber={viewingDocNumber}
                clientName={viewingClientName}
                villaName={viewingVillaName}
                documentDate={viewingDate}
                isInternalOnly={viewingIsInternal}
            />

            {/* AI Voice/Description Quotation Modal */}
            <VoiceQuoteModal
                open={voiceModalOpen}
                onOpenChange={setVoiceModalOpen}
                initialDescription={ticket.description}
                ticketId={ticket.id}
                ticketNumber={ticket.ticketNumber}
                clientName={ticket.clientName}
                locationName={ticket.specificLocation || ticket.locationName}
            />
        </div>
    );
}
