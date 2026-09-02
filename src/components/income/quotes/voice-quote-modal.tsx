"use client";

import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch-ui";
import { Label } from "@/components/ui/label";
import {
    Mic, MicOff, Sparkles, FileDown, Eye, Save, Trash2, Plus,
    Loader2, CheckCircle2, Share2, Building2, DollarSign, Image as ImageIcon, X
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { collection, getDocs, addDoc, serverTimestamp, Timestamp, doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { generateNextNumber } from "@/lib/numbering-service";
import { generateDocumentPDF, DocumentData } from "@/lib/document-generator";
import { CompanySettings, Client } from "@/types/schema";
import { saveAs } from "file-saver";
import { useRouter } from "next/navigation";

interface QuoteItemDraft {
    id: string;
    description: string;
    qty: number;
    rate: number;
    amount: number;
    uom: string;
}

interface ParsedQuoteResult {
    clientName: string;
    clientId?: string;
    clientRnc?: string;
    currency: "DOP" | "USD";
    items: QuoteItemDraft[];
    net_total: number;
    total_taxes_and_charges: number;
    grand_total: number;
    terms: string;
    notes: string;
}

interface VoiceQuoteModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onQuoteSaved?: (quoteId: string, quoteNumber: string) => void;
}

export function VoiceQuoteModal({ open, onOpenChange, onQuoteSaved }: VoiceQuoteModalProps) {
    const { toast } = useToast();
    const router = useRouter();

    // Voice & Input State
    const [transcript, setTranscript] = useState("");
    const [isListening, setIsListening] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [applyTax, setApplyTax] = useState(true);

    // Context & Clients
    const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
    const [clientsList, setClientsList] = useState<Client[]>([]);

    // Generated Quote State
    const [quoteResult, setQuoteResult] = useState<ParsedQuoteResult | null>(null);
    const [saving, setSaving] = useState(false);
    const [generatingPdf, setGeneratingPdf] = useState(false);
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
    const [showPdfDialog, setShowPdfDialog] = useState(false);

    const recognitionRef = useRef<any>(null);

    // Presets for quick click
    const quickPresets = [
        "Mantenimiento preventivo 4 aires Split 18k BTU a 2,800 pesos c/u para Villa 42, incluye limpieza química.",
        "Instalación de consola 24,000 BTU Inverter para Hotel Viva Maya: mano de obra 4,500 y recarga gas R410 3,800.",
        "Cambio de contactor 40A y capacitor de marcha 45uF para Plaza Coral, mano de obra 2,500."
    ];

    // Load Company and Clients data
    useEffect(() => {
        if (!open) return;

        const loadData = async () => {
            try {
                const [compSnap, clientSnap] = await Promise.all([
                    getDoc(doc(db, "settings", "company")),
                    getDocs(collection(db, "clients"))
                ]);

                if (compSnap.exists()) {
                    setCompanySettings(compSnap.data() as CompanySettings);
                }
                const clients = clientSnap.docs.map(d => ({ id: d.id, ...d.data() } as Client));
                setClientsList(clients);
            } catch (err) {
                console.error("Error loading voice quote context:", err);
            }
        };

        loadData();
    }, [open]);

    // Cleanup Speech Recognition on unmount
    useEffect(() => {
        return () => {
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.stop();
                } catch (e) { }
            }
        };
    }, []);

    // Speech Recognition Handler
    const toggleSpeechRecognition = () => {
        if (typeof window === "undefined") return;

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

        if (!SpeechRecognition) {
            toast({
                variant: "destructive",
                title: "Reconocimiento no disponible",
                description: "Tu navegador no soporta Web Speech API. Puedes escribir directamente en el cuadro de texto."
            });
            return;
        }

        if (isListening) {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
            setIsListening(false);
            return;
        }

        try {
            const recognition = new SpeechRecognition();
            recognition.lang = "es-DO";
            recognition.continuous = true;
            recognition.interimResults = true;

            recognition.onstart = () => {
                setIsListening(true);
            };

            recognition.onend = () => {
                setIsListening(false);
            };

            recognition.onerror = (event: any) => {
                console.warn("Speech error:", event.error);
                setIsListening(false);
            };

            recognition.onresult = (event: any) => {
                let finalTranscript = "";
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    }
                }

                if (finalTranscript) {
                    setTranscript(prev => (prev ? `${prev} ${finalTranscript}` : finalTranscript));
                }
            };

            recognitionRef.current = recognition;
            recognition.start();
        } catch (err) {
            console.error("Speech recognition start error:", err);
            setIsListening(false);
        }
    };

    // Handle Image Upload
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (ev.target?.result) {
                    setSelectedImage(ev.target.result as string);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    // Process Quote with Gemini AI
    const handleProcessWithAI = async (textToProcess?: string) => {
        const text = textToProcess || transcript;
        if (!text.trim() && !selectedImage) {
            toast({
                variant: "destructive",
                title: "Texto o imagen requerida",
                description: "Por favor dicta o escribe lo que deseas cotizar."
            });
            return;
        }

        if (isListening && recognitionRef.current) {
            recognitionRef.current.stop();
            setIsListening(false);
        }

        setProcessing(true);
        try {
            const res = await fetch("/api/quotes/voice-parser", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    transcript: text,
                    image: selectedImage
                })
            });

            const json = await res.json();

            if (!json.success || !json.data) {
                throw new Error(json.error || "No se pudo interpretar la cotización.");
            }

            const data = json.data;

            // Match Client if exists
            let matchedClient = clientsList.find(c => {
                const cName = (c.nombreComercial || (c as any).name || "").toLowerCase();
                const target = (data.clientName || "").toLowerCase();
                return cName.includes(target) || target.includes(cName);
            });

            const items: QuoteItemDraft[] = (data.items || []).map((item: any, idx: number) => ({
                id: `item-${Date.now()}-${idx}`,
                description: item.description || "Servicio",
                qty: Number(item.qty) || 1,
                rate: Number(item.rate) || 0,
                amount: Number((item.qty * item.rate).toFixed(2)),
                uom: item.uom || "Unidad"
            }));

            const subtotal = items.reduce((acc, curr) => acc + curr.amount, 0);
            const tax = applyTax ? subtotal * 0.18 : 0;
            const total = subtotal + tax;

            setQuoteResult({
                clientName: matchedClient ? (matchedClient.nombreComercial || (matchedClient as any).name) : (data.clientName || "Cliente General"),
                clientId: matchedClient?.id,
                clientRnc: matchedClient?.rnc || data.clientRnc || "",
                currency: data.currency || "DOP",
                items,
                net_total: Number(subtotal.toFixed(2)),
                total_taxes_and_charges: Number(tax.toFixed(2)),
                grand_total: Number(total.toFixed(2)),
                terms: data.terms || "Validez: 15 días. Forma de pago: 100% al confirmar.",
                notes: data.notes || "Servicio profesional garantizado."
            });

            toast({
                title: "✨ ¡Cotización generada!",
                description: `Se estructuraron ${items.length} ítems para ${data.clientName || "el cliente"}.`
            });

        } catch (error: any) {
            console.error("Voice parser error:", error);
            toast({
                variant: "destructive",
                title: "Error al generar cotización",
                description: error.message || "Verifica tu conexión y clave de Gemini API."
            });
        } finally {
            setProcessing(false);
        }
    };

    // Recalculate totals on item change
    const updateItem = (id: string, field: keyof QuoteItemDraft, value: any) => {
        if (!quoteResult) return;

        const updatedItems = quoteResult.items.map(item => {
            if (item.id !== id) return item;
            const updated = { ...item, [field]: value };
            if (field === 'qty' || field === 'rate') {
                const qty = field === 'qty' ? Number(value) || 0 : item.qty;
                const rate = field === 'rate' ? Number(value) || 0 : item.rate;
                updated.amount = Number((qty * rate).toFixed(2));
            }
            return updated;
        });

        const subtotal = updatedItems.reduce((acc, curr) => acc + curr.amount, 0);
        const tax = applyTax ? subtotal * 0.18 : 0;

        setQuoteResult({
            ...quoteResult,
            items: updatedItems,
            net_total: Number(subtotal.toFixed(2)),
            total_taxes_and_charges: Number(tax.toFixed(2)),
            grand_total: Number((subtotal + tax).toFixed(2))
        });
    };

    const addItem = () => {
        if (!quoteResult) return;
        const newItem: QuoteItemDraft = {
            id: `item-${Date.now()}`,
            description: "Nuevo servicio o repuesto",
            qty: 1,
            rate: 1500,
            amount: 1500,
            uom: "Servicio"
        };
        const updatedItems = [...quoteResult.items, newItem];
        const subtotal = updatedItems.reduce((acc, curr) => acc + curr.amount, 0);
        const tax = applyTax ? subtotal * 0.18 : 0;

        setQuoteResult({
            ...quoteResult,
            items: updatedItems,
            net_total: Number(subtotal.toFixed(2)),
            total_taxes_and_charges: Number(tax.toFixed(2)),
            grand_total: Number((subtotal + tax).toFixed(2))
        });
    };

    const removeItem = (id: string) => {
        if (!quoteResult || quoteResult.items.length <= 1) return;
        const updatedItems = quoteResult.items.filter(item => item.id !== id);
        const subtotal = updatedItems.reduce((acc, curr) => acc + curr.amount, 0);
        const tax = applyTax ? subtotal * 0.18 : 0;

        setQuoteResult({
            ...quoteResult,
            items: updatedItems,
            net_total: Number(subtotal.toFixed(2)),
            total_taxes_and_charges: Number(tax.toFixed(2)),
            grand_total: Number((subtotal + tax).toFixed(2))
        });
    };

    // Toggle Tax
    const handleToggleTax = (checked: boolean) => {
        setApplyTax(checked);
        if (!quoteResult) return;
        const tax = checked ? quoteResult.net_total * 0.18 : 0;
        setQuoteResult({
            ...quoteResult,
            total_taxes_and_charges: Number(tax.toFixed(2)),
            grand_total: Number((quoteResult.net_total + tax).toFixed(2))
        });
    };

    // Helper: Build DocumentData for PDF engine
    const buildDocumentData = (quoteNumber: string): DocumentData => {
        const company: CompanySettings = companySettings || {
            name: "HECHO SRL",
            rnc: "131-94753-2",
            address: "Punta Cana, Rep. Dominicana",
            phone: "829-649-2702",
            email: "info@hecho.do",
            logoUrl: "",
            website: "https://hecho.do"
        };

        return {
            id: "draft-voice-quote",
            type: "COTIZACIÓN",
            number: quoteNumber,
            date: new Date(),
            validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
            company: {
                name: company.name || "HECHO SRL",
                rnc: company.rnc || "131-94753-2",
                address: company.address || "Punta Cana, Rep. Dominicana",
                phone: company.phone || "829-649-2702",
                email: company.email || "info@hecho.do",
                logoUrl: company.logoUrl || "",
                website: company.website || "https://hecho.do"
            },
            client: {
                name: quoteResult?.clientName || "Cliente General",
                rnc: quoteResult?.clientRnc || "",
                address: "",
                phone: "",
                email: ""
            },
            items: (quoteResult?.items || []).map(item => ({
                description: item.description,
                quantity: item.qty,
                unitPrice: item.rate,
                total: item.amount,
                taxAmount: applyTax ? item.amount * 0.18 : 0
            })),
            currency: quoteResult?.currency || "DOP",
            subtotal: quoteResult?.net_total || 0,
            taxTotal: quoteResult?.total_taxes_and_charges || 0,
            discountTotal: 0,
            total: quoteResult?.grand_total || 0,
            notes: quoteResult?.notes || "",
            terms: quoteResult?.terms || "",
            status: "DRAFT"
        };
    };

    // Direct PDF Download
    const handleDownloadPDF = async () => {
        if (!quoteResult) return;
        setGeneratingPdf(true);
        try {
            const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santo_Domingo' }).format(new Date());
            const docData = buildDocumentData(`CT-${todayStr}-001`);
            const blob = await generateDocumentPDF(docData, "classic");
            saveAs(blob, `Cotizacion-${quoteResult.clientName.replace(/\s+/g, "_")}.pdf`);
            toast({ title: "📄 PDF Descargado", description: "El presupuesto fue generado exitosamente." });
        } catch (err: any) {
            console.error("Error al generar PDF:", err);
            toast({ variant: "destructive", title: "Error al generar PDF", description: err.message });
        } finally {
            setGeneratingPdf(false);
        }
    };

    // PDF Preview Modal
    const handlePreviewPDF = async () => {
        if (!quoteResult) return;
        setGeneratingPdf(true);
        try {
            if (pdfPreviewUrl) {
                URL.revokeObjectURL(pdfPreviewUrl);
            }
            const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santo_DOMINGO' }).format(new Date());
            const docData = buildDocumentData(`CT-${todayStr}-001`);
            const blob = await generateDocumentPDF(docData, "classic");
            const url = URL.createObjectURL(blob);
            setPdfPreviewUrl(url);
            setShowPdfDialog(true);
        } catch (err: any) {
            console.error("Error previsualizando PDF:", err);
            toast({ variant: "destructive", title: "Error", description: err.message });
        } finally {
            setGeneratingPdf(false);
        }
    };

    // Save Quote to Firestore with Official Sequence Number (COT-XXXXXX)
    const handleSaveQuote = async () => {
        if (!quoteResult) return;
        setSaving(true);
        try {
            const user = auth.currentUser;
            const sequenceNumber = await generateNextNumber("COT");

            const todayStr = new Date().toISOString().split("T")[0];
            const in15daysStr = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

            const quotationItems = quoteResult.items.map((item, idx) => ({
                item_code: `SERV-${idx + 1}`,
                item_name: item.description,
                description: item.description,
                qty: item.qty,
                uom: item.uom,
                rate: item.rate,
                amount: item.amount,
                tax_amount: applyTax ? Number((item.amount * 0.18).toFixed(2)) : 0
            }));

            const newQuoteDoc = {
                number: sequenceNumber,
                name: sequenceNumber,
                party_name: quoteResult.clientName,
                customer_name: quoteResult.clientName,
                clientId: quoteResult.clientId || "",
                clientRnc: quoteResult.clientRnc || "",
                quotation_to: "Customer",
                transaction_date: todayStr,
                valid_till: in15daysStr,
                currency: quoteResult.currency,
                selling_price_list: "Standard Selling",
                items: quotationItems,
                net_total: quoteResult.net_total,
                total_taxes_and_charges: quoteResult.total_taxes_and_charges,
                grand_total: quoteResult.grand_total,
                total_qty: quoteResult.items.reduce((acc, c) => acc + c.qty, 0),
                terms: quoteResult.terms,
                note: quoteResult.notes,
                status: "Draft",
                docstatus: 0,
                timeline: [{
                    status: "Draft",
                    timestamp: Timestamp.now(),
                    userId: user?.uid || "voice-ai",
                    userName: user?.displayName || "Asistente de Voz IA",
                    note: `Cotización creada con Asistente de Voz IA (${sequenceNumber})`
                }],
                sellerId: user?.uid || "",
                sellerName: user?.displayName || "Usuario",
                createdBy: user?.uid || "",
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            const docRef = await addDoc(collection(db, "quotes"), newQuoteDoc);

            toast({
                title: `✅ Cotización ${sequenceNumber} Guardada`,
                description: `Registrada con éxito en el sistema para ${quoteResult.clientName}.`
            });

            if (onQuoteSaved) {
                onQuoteSaved(docRef.id, sequenceNumber);
            }

            onOpenChange(false);
            router.push(`/income/quotes/${docRef.id}`);

        } catch (err: any) {
            console.error("Error guardando cotización:", err);
            toast({
                variant: "destructive",
                title: "Error al guardar cotización",
                description: err.message || "No se pudo guardar la cotización."
            });
        } finally {
            setSaving(false);
        }
    };

    // Share via WhatsApp
    const handleShareWhatsApp = () => {
        if (!quoteResult) return;
        const currencySymbol = quoteResult.currency === 'USD' ? 'US$' : 'RD$';
        let text = `*PROPUESTA DE SERVICIO - HECHO SRL*\n`;
        text += `*Cliente:* ${quoteResult.clientName}\n`;
        text += `----------------------------------------\n`;
        quoteResult.items.forEach((item, index) => {
            text += `${index + 1}. ${item.description} (x${item.qty}) -> ${currencySymbol} ${item.amount.toLocaleString()}\n`;
        });
        text += `----------------------------------------\n`;
        text += `*Subtotal:* ${currencySymbol} ${quoteResult.net_total.toLocaleString()}\n`;
        if (quoteResult.total_taxes_and_charges > 0) {
            text += `*ITBIS (18%):* ${currencySymbol} ${quoteResult.total_taxes_and_charges.toLocaleString()}\n`;
        }
        text += `*TOTAL:* ${currencySymbol} ${quoteResult.grand_total.toLocaleString()}\n\n`;
        text += `*Condiciones:* ${quoteResult.terms}\n`;
        text += `*Notas:* ${quoteResult.notes}`;

        const encoded = encodeURIComponent(text);
        window.open(`https://wa.me/?text=${encoded}`, '_blank');
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-slate-50">
                    {/* Header con gradiente IA */}
                    <DialogHeader className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white shrink-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-blue-500/20 border border-blue-400/30 rounded-xl backdrop-blur-md">
                                    <Sparkles className="h-6 w-6 text-blue-300 animate-pulse" />
                                </div>
                                <div>
                                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                                        Cotizador por Voz IA <Badge className="bg-blue-500/30 text-blue-200 border-blue-400/30 text-[10px]">Grok-Style Copilot</Badge>
                                    </DialogTitle>
                                    <DialogDescription className="text-slate-300 text-xs">
                                        Dicta o escribe en lenguaje natural. La IA estructurará los ítems, precios, impuestos y generará el PDF al instante.
                                    </DialogDescription>
                                </div>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="p-6 overflow-y-auto space-y-6 flex-1">
                        {/* 1. Panel de Entrada por Voz / Texto */}
                        <Card className="border-indigo-100 shadow-sm bg-white rounded-2xl overflow-hidden">
                            <CardContent className="p-5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                        <Mic className="h-4 w-4 text-blue-600" />
                                        Dictado por Voz o Instrucción
                                    </Label>
                                    {isListening && (
                                        <div className="flex items-center gap-2 text-rose-600 text-xs font-semibold animate-pulse">
                                            <span className="h-2 w-2 rounded-full bg-rose-600" />
                                            Escuchando en vivo...
                                        </div>
                                    )}
                                </div>

                                <div className="relative">
                                    <Textarea
                                        value={transcript}
                                        onChange={(e) => setTranscript(e.target.value)}
                                        placeholder="Ej: Cotizar a Hotel Punta Cana 4 mantenimientos de aires 18000 BTU a 2800 pesos cada uno, cambio de capacitor a 1500 y 1 carga de gas R410 a 3800..."
                                        rows={3}
                                        className="resize-none pr-12 text-sm bg-slate-50/70 border-slate-200 focus:bg-white transition-all rounded-xl"
                                    />
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant={isListening ? "destructive" : "secondary"}
                                        onClick={toggleSpeechRecognition}
                                        className={`absolute right-2.5 bottom-2.5 h-9 w-9 rounded-lg shadow-sm transition-all ${isListening ? "animate-bounce" : "bg-blue-50 text-blue-600 hover:bg-blue-100"}`}
                                        title={isListening ? "Detener micrófono" : "Iniciar dictado por voz"}
                                    >
                                        {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                                    </Button>
                                </div>

                                {/* Imagen opcional adjunta */}
                                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                                    <div className="flex items-center gap-2">
                                        <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium transition-colors">
                                            <ImageIcon className="h-3.5 w-3.5 text-slate-500" />
                                            {selectedImage ? "Cambiar Foto Equipo" : "Adjuntar Foto Equipo (Opcional)"}
                                            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                                        </label>
                                        {selectedImage && (
                                            <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg text-xs">
                                                <span>Foto cargada</span>
                                                <button onClick={() => setSelectedImage(null)} className="text-blue-500 hover:text-blue-700">
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <Button
                                        onClick={() => handleProcessWithAI()}
                                        disabled={processing || (!transcript.trim() && !selectedImage)}
                                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md rounded-xl gap-2 font-bold px-6 text-xs h-9"
                                    >
                                        {processing ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Procesando con Gemini...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="h-4 w-4" />
                                                Estructurar Cotización
                                            </>
                                        )}
                                    </Button>
                                </div>

                                {/* Chips de Sugerencia Rápida */}
                                <div className="pt-2 border-t border-slate-100">
                                    <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">⚡ Ejemplos rápidos:</span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {quickPresets.map((preset, i) => (
                                            <button
                                                key={i}
                                                type="button"
                                                onClick={() => {
                                                    setTranscript(preset);
                                                    handleProcessWithAI(preset);
                                                }}
                                                className="text-[11px] text-left text-slate-600 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 px-2.5 py-1 rounded-md transition-colors border border-slate-200/60 truncate max-w-xs"
                                            >
                                                {preset}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* 2. Resultado de la Cotización Generada */}
                        {quoteResult && (
                            <Card className="border-blue-200 shadow-md bg-white rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                                <div className="p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                                        <span className="font-bold text-sm">Propuesta Estructurada por IA</span>
                                        <Badge variant="outline" className="text-emerald-300 border-emerald-500/40 text-[10px]">
                                            Secuencia: COT-XXXXXX (al guardar)
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <Label htmlFor="tax-switch" className="text-xs text-slate-300">ITBIS (18%)</Label>
                                            <Switch
                                                id="tax-switch"
                                                checked={applyTax}
                                                onCheckedChange={handleToggleTax}
                                                className="data-[state=checked]:bg-emerald-500"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <CardContent className="p-5 space-y-4">
                                    {/* Datos del Cliente y Moneda */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                                        <div className="sm:col-span-2">
                                            <Label className="text-[11px] font-bold text-slate-600 block mb-1">Cliente / Proyecto</Label>
                                            <Input
                                                value={quoteResult.clientName}
                                                onChange={(e) => setQuoteResult({ ...quoteResult, clientName: e.target.value })}
                                                className="h-8 text-xs bg-white"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-[11px] font-bold text-slate-600 block mb-1">Moneda</Label>
                                            <select
                                                value={quoteResult.currency}
                                                onChange={(e) => setQuoteResult({ ...quoteResult, currency: e.target.value as any })}
                                                className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            >
                                                <option value="DOP">DOP (RD$ Pesos)</option>
                                                <option value="USD">USD (US$ Dólares)</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Tabla de Ítems */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-xs font-bold text-slate-800">Desglose de Ítems ({quoteResult.items.length})</Label>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={addItem}
                                                className="h-7 text-[11px] gap-1 bg-white hover:bg-slate-50"
                                            >
                                                <Plus className="h-3 w-3" /> Agregar Ítem
                                            </Button>
                                        </div>

                                        <div className="divide-y border rounded-xl overflow-hidden bg-white">
                                            {quoteResult.items.map((item, index) => (
                                                <div key={item.id} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50">
                                                    <div className="flex-1">
                                                        <Input
                                                            value={item.description}
                                                            onChange={(e) => updateItem(item.id, "description", e.target.value)}
                                                            className="h-8 text-xs bg-transparent border-slate-200"
                                                            placeholder="Descripción del ítem"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <div className="w-16">
                                                            <Input
                                                                type="number"
                                                                value={item.qty}
                                                                onChange={(e) => updateItem(item.id, "qty", e.target.value)}
                                                                className="h-8 text-xs text-center"
                                                                title="Cantidad"
                                                            />
                                                        </div>
                                                        <div className="w-24">
                                                            <Input
                                                                type="number"
                                                                value={item.rate}
                                                                onChange={(e) => updateItem(item.id, "rate", e.target.value)}
                                                                className="h-8 text-xs text-right"
                                                                title="Precio Unitario"
                                                            />
                                                        </div>
                                                        <div className="w-24 text-right font-bold text-xs text-slate-800">
                                                            {quoteResult.currency === 'USD' ? 'US$' : 'RD$'} {item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => removeItem(item.id)}
                                                            disabled={quoteResult.items.length <= 1}
                                                            className="h-7 w-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Resumen Financiero */}
                                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                                        <div className="space-y-2 flex-1 w-full">
                                            <div>
                                                <Label className="text-[11px] font-bold text-slate-600 block mb-1">Términos y Condiciones</Label>
                                                <Input
                                                    value={quoteResult.terms}
                                                    onChange={(e) => setQuoteResult({ ...quoteResult, terms: e.target.value })}
                                                    className="h-8 text-xs bg-white"
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-[11px] font-bold text-slate-600 block mb-1">Notas Técnicas</Label>
                                                <Input
                                                    value={quoteResult.notes}
                                                    onChange={(e) => setQuoteResult({ ...quoteResult, notes: e.target.value })}
                                                    className="h-8 text-xs bg-white"
                                                />
                                            </div>
                                        </div>

                                        <div className="w-full sm:w-64 space-y-1.5 text-right border-t sm:border-t-0 sm:border-l border-slate-200 sm:pl-4 pt-2 sm:pt-0">
                                            <div className="flex justify-between text-xs text-slate-600">
                                                <span>Subtotal:</span>
                                                <span className="font-semibold">{quoteResult.currency === 'USD' ? 'US$' : 'RD$'} {quoteResult.net_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                            </div>
                                            <div className="flex justify-between text-xs text-slate-600">
                                                <span>ITBIS (18%):</span>
                                                <span className="font-semibold">{quoteResult.currency === 'USD' ? 'US$' : 'RD$'} {quoteResult.total_taxes_and_charges.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                            </div>
                                            <div className="flex justify-between text-sm font-black text-slate-900 pt-1 border-t border-slate-200">
                                                <span>Total Final:</span>
                                                <span className="text-blue-600">{quoteResult.currency === 'USD' ? 'US$' : 'RD$'} {quoteResult.grand_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Botonera de Acciones Inmediatas */}
                                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                                        <div className="flex items-center gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={handlePreviewPDF}
                                                disabled={generatingPdf}
                                                className="gap-1.5 h-9 text-xs bg-white"
                                            >
                                                <Eye className="h-3.5 w-3.5 text-slate-600" />
                                                Vista Previa
                                            </Button>

                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={handleDownloadPDF}
                                                disabled={generatingPdf}
                                                className="gap-1.5 h-9 text-xs bg-white border-blue-200 text-blue-700 hover:bg-blue-50 font-semibold"
                                            >
                                                {generatingPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
                                                Descargar PDF Oficial
                                            </Button>

                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={handleShareWhatsApp}
                                                className="gap-1.5 h-9 text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200 font-semibold"
                                            >
                                                <Share2 className="h-3.5 w-3.5" />
                                                WhatsApp
                                            </Button>
                                        </div>

                                        <Button
                                            type="button"
                                            onClick={handleSaveQuote}
                                            disabled={saving}
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-bold px-6 text-xs h-9 shadow-md rounded-xl"
                                        >
                                            {saving ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                    Generando Secuencia y Guardando...
                                                </>
                                            ) : (
                                                <>
                                                    <Save className="h-4 w-4" />
                                                    Guardar Cotización en Sistema
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Modal de Vista Previa PDF */}
            <Dialog open={showPdfDialog} onOpenChange={setShowPdfDialog}>
                <DialogContent className="max-w-4xl h-[88vh] p-0 flex flex-col overflow-hidden bg-slate-900">
                    <DialogHeader className="p-4 bg-slate-800 text-white shrink-0 flex flex-row items-center justify-between">
                        <DialogTitle className="text-sm font-bold flex items-center gap-2">
                            <Eye className="h-4 w-4 text-blue-400" />
                            Vista Previa de Cotización (HECHO SRL)
                        </DialogTitle>
                        <Button
                            size="sm"
                            onClick={handleDownloadPDF}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5 h-8 mr-6"
                        >
                            <FileDown className="h-3.5 w-3.5" /> Descargar
                        </Button>
                    </DialogHeader>
                    <div className="flex-1 w-full bg-slate-100 overflow-hidden">
                        {pdfPreviewUrl && (
                            <iframe
                                src={pdfPreviewUrl}
                                className="w-full h-full border-none"
                                title="Vista Previa PDF"
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
