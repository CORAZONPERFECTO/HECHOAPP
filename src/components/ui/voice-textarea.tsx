"use client";

import * as React from "react";
import { Textarea, TextareaProps } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

interface VoiceTextareaProps extends TextareaProps {
    onValueChange?: (value: string) => void;
}

interface SpeechRecognitionEvent {
    resultIndex: number;
    results: {
        [key: number]: {
            isFinal: boolean;
            [key: number]: { transcript: string };
        };
        length: number;
    };
}

interface SpeechRecognitionErrorEvent {
    error: string;
}

interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start(): void;
    stop(): void;
    onresult: (event: SpeechRecognitionEvent) => void;
    onerror: (event: SpeechRecognitionErrorEvent) => void;
    onend: () => void;
}

export function VoiceTextarea({ className, value, onChange, onValueChange, ...props }: VoiceTextareaProps) {
    const [isListening, setIsListening] = React.useState(false);
    const [isProcessing, setIsProcessing] = React.useState(false);
    const [isSupported, setIsSupported] = React.useState(true);
    const recognitionRef = React.useRef<SpeechRecognition | null>(null);
    // ✅ FIX: Use a ref to track the latest value — avoids re-creating SpeechRecognition on every keystroke
    const valueRef = React.useRef<string>((value as string) || "");
    const { toast } = useToast();

    // Sync valueRef whenever prop changes
    React.useEffect(() => {
        valueRef.current = (value as string) || "";
    }, [value]);

    // ✅ FIX: Initialize SpeechRecognition ONCE — no value in deps
    React.useEffect(() => {
        if (typeof window === "undefined") return;

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setIsSupported(false);
            return;
        }

        const recognition = new SpeechRecognition() as SpeechRecognition;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'es-DO';

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                }
            }
            if (finalTranscript) {
                const current = valueRef.current;
                const newValue = current ? `${current} ${finalTranscript}` : finalTranscript;
                triggerChange(newValue);
            }
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            console.error("Speech recognition error", event.error);
            setIsListening(false);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognitionRef.current = recognition;

        return () => { recognition.stop(); };
    }, []); // ← empty deps: only runs once

    const triggerChange = (newValue: string) => {
        valueRef.current = newValue;
        if (onValueChange) onValueChange(newValue);
        if (onChange) {
            const syntheticEvent = {
                target: { value: newValue }
            } as React.ChangeEvent<HTMLTextAreaElement>;
            onChange(syntheticEvent);
        }
    };

    const toggleListening = () => {
        if (!isSupported) {
            toast({
                title: "No soportado",
                description: "El dictado por voz no está disponible. Usa Chrome en Android o Safari en iPhone.",
                variant: "destructive"
            });
            return;
        }
        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
        } else {
            try {
                recognitionRef.current?.start();
                setIsListening(true);
            } catch (error) {
                console.error("Error starting speech recognition:", error);
                setIsListening(false);
            }
        }
    };

    const handleSmartRefine = async () => {
        const currentText = valueRef.current.trim();

        if (!currentText) {
            toast({
                title: "Texto vacío",
                description: "Dicta o escribe algo primero, luego presiona ✨ para organizarlo.",
                variant: "destructive"
            });
            return;
        }

        setIsProcessing(true);
        try {
            const response = await fetch('/api/gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: currentText,
                    task: 'refine-technician-note'
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Error en la API de IA");
            }

            if (data.output) {
                triggerChange(data.output);
                toast({
                    title: "✅ Nota organizada con IA",
                    description: "El texto fue profesionalizado exitosamente.",
                });
            }
        } catch (error: unknown) {
            const err = error as Error;
            console.error("AI Refine Error:", err);
            toast({
                title: "Error IA",
                description: err.message || "No se pudo procesar el texto. Verifica la conexión.",
                variant: "destructive"
            });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="relative group">
            <Textarea
                value={value}
                onChange={onChange}
                className={cn("pr-24 min-h-[100px]", className)}
                disabled={isProcessing}
                placeholder="Escribe o dicta aquí..."
                {...props}
            />

            {/* Action Buttons */}
            <div className="absolute top-2 right-2 flex gap-1 bg-white/80 p-1 rounded-md backdrop-blur-sm border shadow-sm">

                {/* ✨ AI Refine Button — always enabled (not gated by !value) */}
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={cn(
                        "h-7 w-7 transition-all",
                        isProcessing ? "text-purple-500" : "text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                    )}
                    onClick={handleSmartRefine}
                    title="Organizar con IA — profesionaliza tus notas de voz"
                    disabled={isProcessing}
                >
                    {isProcessing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Sparkles className="h-4 w-4" />
                    )}
                </Button>

                {/* Separator */}
                <div className="w-[1px] h-6 bg-slate-200 my-auto mx-1" />

                {/* 🎤 Mic Button */}
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={cn(
                        "h-7 w-7 transition-colors",
                        isListening
                            ? "text-red-500 hover:text-red-600 bg-red-50 animate-pulse"
                            : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                    )}
                    onClick={toggleListening}
                    title={isListening ? "Detener dictado" : "Iniciar dictado por voz"}
                    disabled={isProcessing}
                >
                    {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
            </div>

            {isListening && (
                <div className="absolute bottom-2 left-3 text-[10px] text-red-500 font-semibold animate-pulse flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block animate-ping" />
                    Escuchando...
                </div>
            )}
        </div>
    );
}
