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
            [key: number]: {
                transcript: string;
            };
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
    const { toast } = useToast();

    React.useEffect(() => {
        if (typeof window !== "undefined") {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognition) {
                const recognition = new SpeechRecognition() as SpeechRecognition;
                recognition.continuous = true;
                recognition.interimResults = true;
                recognition.lang = 'es-DO'; // Default to Dominican Spanish

                recognition.onresult = (event: SpeechRecognitionEvent) => {
                    let finalTranscript = '';
                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        if (event.results[i].isFinal) {
                            finalTranscript += event.results[i][0].transcript;
                        }
                    }

                    if (finalTranscript) {
                        const currentValue = (value as string) || "";
                        const newValue = currentValue ? `${currentValue} ${finalTranscript}` : finalTranscript;
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
            } else {
                setIsSupported(false);
            }
        }
    }, [value]); // Removed onChange/onValueChange from dependency to avoid re-binding loop

    const triggerChange = (newValue: string) => {
        if (onValueChange) {
            onValueChange(newValue);
        }
        if (onChange) {
            const syntheticEvent = {
                target: { value: newValue }
            } as React.ChangeEvent<HTMLTextAreaElement>;
            onChange(syntheticEvent);
        }
    };

    const toggleListening = () => {
        if (!isSupported) {
            toast({ title: "No soportado", description: "El dictado por voz no está disponible.", variant: "destructive" });
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
        if (!value || (value as string).trim().length === 0) {
            toast({ title: "Texto vacío", description: "Escribe o dicta algo primero para mejorarlo.", variant: "warning" });
            return;
        }

        setIsProcessing(true);
        try {
            const response = await fetch('/api/gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: value,
                    task: 'refine'
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Error en la API");
            }

            if (data.output) {
                triggerChange(data.output);
                toast({ title: "¡Mejorado con IA!", description: "El texto ha sido profesionalizado.", variant: "success" });
            }

        } catch (error: unknown) {
            console.error("AI Refine Error:", error);
            const err = error as Error;

            if (err.message?.includes("Faltan credenciales")) {
                toast({
                    title: "Falta Configuración",
                    description: "No se han detectado las llaves de Vertex AI (Google Cloud).",
                    variant: "destructive"
                });
            } else {
                toast({
                    title: "Error IA",
                    description: "No se pudo procesar el texto en este momento.",
                    variant: "destructive"
                });
            }
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="relative group">
            <Textarea
                value={value}
                onChange={onChange}
                className={cn("pr-24 min-h-[100px]", className)} // Add padding for buttons
                disabled={isProcessing}
                placeholder="Escribe o dicta aquí..."
                {...props}
            />

            {/* Action Buttons */}
            <div className="absolute top-2 right-2 flex gap-1 bg-white/80 p-1 rounded-md backdrop-blur-sm border shadow-sm">

                {/* AI Refine Button */}
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={cn(
                        "h-7 w-7 transition-all",
                        isProcessing ? "text-purple-500" : "text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                    )}
                    onClick={handleSmartRefine}
                    title="Tecnificar con IA (Gemini)"
                    disabled={isProcessing || !value}
                >
                    {isProcessing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Sparkles className="h-4 w-4" />
                    )}
                </Button>

                {/* Separator */}
                <div className="w-[1px] h-6 bg-slate-200 my-auto mx-1" />

                {/* Mic Button */}
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={cn(
                        "h-7 w-7 transition-colors",
                        isListening ? "text-red-500 hover:text-red-600 bg-red-50 animate-pulse" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                    )}
                    onClick={toggleListening}
                    title={isListening ? "Detener dictado" : "Iniciar dictado"}
                    disabled={isProcessing}
                >
                    {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
            </div>

            {isListening && (
                <div className="absolute bottom-2 right-2 text-[10px] text-red-500 font-medium animate-pulse">
                    Escuchando...
                </div>
            )}
        </div>
    );
}
