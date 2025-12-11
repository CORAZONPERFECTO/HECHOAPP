
"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mic, Square, X, Check, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { parseInvoiceCommand } from "@/lib/voice-parser";
import { Client, InvoiceItem } from "@/types/schema";
import { cn } from "@/lib/utils";

interface VoiceCommandCenterProps {
    onInvoiceDataDetected: (data: { clientName?: string; clientId?: string; items: InvoiceItem[] }) => void;
    availableClients: Client[];
    onClose: () => void;
}

export function VoiceCommandCenter({ onInvoiceDataDetected, availableClients, onClose }: VoiceCommandCenterProps) {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState("");
    const [parsedData, setParsedData] = useState<{ clientName?: string; items: InvoiceItem[] } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [hintIndex, setHintIndex] = useState(0);

    const hints = [
        "\"Factura a Farmacia Carol por 2 mantenimientos a 2500\"",
        "\"3 cajas de guantes para el Cliente Juan Perez\"",
        "\"Un servicio de instalación por 5000 pesos\"",
        "\"Para Supermercado Bravo 10 fundas de hielo a 100\""
    ];

    // Rotate hints
    useEffect(() => {
        const interval = setInterval(() => {
            setHintIndex((prev) => (prev + 1) % hints.length);
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    const recognitionRef = useRef<any>(null);

    // Initialize Speech Recognition
    useEffect(() => {
        if (typeof window !== "undefined") {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognition) {
                const recognition = new SpeechRecognition();
                recognition.continuous = true;
                recognition.interimResults = true;
                recognition.lang = 'es-DO';

                recognition.onresult = (event: any) => {
                    let finalTranscript = '';
                    let interimTranscript = '';

                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        if (event.results[i].isFinal) {
                            finalTranscript += event.results[i][0].transcript;
                        } else {
                            interimTranscript += event.results[i][0].transcript;
                        }
                    }

                    const currentFullText = finalTranscript || interimTranscript;
                    setTranscript(currentFullText);

                    // Real-time parsing attempt
                    if (currentFullText.length > 10) {
                        const result = parseInvoiceCommand(currentFullText, availableClients);
                        if (result.confidence > 0) {
                            setParsedData({
                                clientName: result.clientName,
                                items: result.items
                            });
                        }
                    }
                };

                recognition.onerror = (event: any) => {
                    console.error("Speech error", event);
                    setError("No te escucho bien. Intenta acercarte al micrófono.");
                    setIsListening(false);
                };

                recognition.onend = () => {
                    setIsListening(false);
                };

                recognitionRef.current = recognition;

                // Auto-start
                startListening(recognition);
            } else {
                setError("Tu navegador no soporta entrada de voz.");
            }
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, []);

    const startListening = (recognition: any) => {
        try {
            recognition.start();
            setIsListening(true);
            setError(null);
        } catch (e) {
            console.error(e);
        }
    };

    const stopListening = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            setIsListening(false);
        }
    };

    const handleConfirm = () => {
        if (parsedData) {
            onInvoiceDataDetected(parsedData);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-lg shadow-2xl border-0 overflow-hidden relative">
                {/* Visual Background for listening */}
                {isListening && (
                    <div className="absolute inset-0 bg-blue-50/50 z-0 pointer-events-none overflow-hidden">
                        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-blue-400/20 rounded-full blur-3xl animate-pulse" />
                        <div className="absolute -top-20 -right-20 w-64 h-64 bg-purple-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
                    </div>
                )}

                <CardHeader className="relative z-10 text-center pb-2">
                    <CardTitle className="flex items-center justify-center gap-2 text-xl">
                        <Sparkles className="h-5 w-5 text-purple-600" />
                        Agente de Voz
                    </CardTitle>
                    <p className="text-sm text-gray-500">
                        {isListening
                            ? "Te escucho..."
                            : "Presiona el micrófono para empezar"}
                    </p>
                </CardHeader>

                <CardContent className="relative z-10 space-y-6">
                    {/* Rotating Hints */}
                    {!isListening && !transcript && (
                        <div className="text-center pb-2">
                            <p className="text-xs font-medium text-blue-600 animate-pulse bg-blue-50 py-1 px-3 rounded-full inline-block">
                                Tip: Di {hints[hintIndex]}
                            </p>
                        </div>
                    )}
                    {/* Transcript Area */}
                    <div className="min-h-[80px] p-4 bg-white/80 border rounded-xl text-lg font-medium text-gray-700 shadow-inner flex items-center justify-center text-center">
                        {transcript || <span className="text-gray-300 italic">Esperando comandos...</span>}
                    </div>

                    {/* Detected Data Preview */}
                    {parsedData && (parsedData.clientName || parsedData.items.length > 0) && (
                        <div className="bg-white border rounded-lg p-4 space-y-3 animate-in fade-in slide-in-from-bottom-2">
                            <div className="flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                                <Check className="h-4 w-4 text-green-500" /> Datos Detectados
                            </div>

                            {parsedData.clientName && (
                                <div className="flex justify-between items-center text-sm border-b pb-2">
                                    <span className="text-gray-500">Cliente:</span>
                                    <span className="font-bold text-blue-700">{parsedData.clientName}</span>
                                </div>
                            )}

                            {parsedData.items.length > 0 && (
                                <div className="space-y-2">
                                    <span className="text-xs text-gray-400">Items:</span>
                                    {parsedData.items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between text-sm bg-gray-50 p-2 rounded">
                                            <span>{item.quantity}x {item.description}</span>
                                            <span className="font-mono font-medium">RD$ {item.unitPrice}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {error && (
                        <div className="flex items-center gap-2 text-red-500 text-sm justify-center bg-red-50 p-2 rounded">
                            <AlertCircle className="h-4 w-4" />
                            {error}
                        </div>
                    )}

                    {/* Controls */}
                    <div className="flex items-center justify-center gap-4 pt-4">
                        <Button variant="ghost" size="lg" onClick={onClose} className="rounded-full h-12 w-12 p-0">
                            <X className="h-6 w-6 text-gray-400" />
                        </Button>

                        <div className="relative">
                            {isListening ? (
                                <Button
                                    onClick={stopListening}
                                    size="lg"
                                    className="h-16 w-16 rounded-full bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30 ring-4 ring-red-100"
                                >
                                    <Square className="h-6 w-6 fill-current" />
                                </Button>
                            ) : (
                                <Button
                                    onClick={() => startListening(recognitionRef.current)}
                                    size="lg"
                                    className="h-16 w-16 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30 ring-4 ring-blue-100"
                                >
                                    <Mic className="h-8 w-8" />
                                </Button>
                            )}
                        </div>

                        <Button
                            onClick={handleConfirm}
                            disabled={!parsedData}
                            size="lg"
                            className={cn(
                                "rounded-full h-12 w-12 p-0 transition-all",
                                parsedData ? "bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/30" : "bg-gray-100 text-gray-300"
                            )}
                        >
                            <Check className="h-6 w-6" />
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div >
    );
}
