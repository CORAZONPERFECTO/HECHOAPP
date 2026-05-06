"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Mic, Square, Loader2, ArrowRight } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface AITicketAssistantProps {
    onTicketParsed: (data: any) => void;
}

export function AITicketAssistant({ onTicketParsed }: AITicketAssistantProps) {
    const [text, setText] = useState("");
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const { toast } = useToast();
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        // Initialize Speech Recognition
        if (typeof window !== "undefined") {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognition) {
                const recognition = new SpeechRecognition();
                recognition.continuous = true;
                recognition.interimResults = true;
                recognition.lang = "es-DO"; // Default to Spanish (Dominican Republic)

                recognition.onresult = (event: any) => {
                    let currentTranscript = "";
                    for (let i = 0; i < event.results.length; i++) {
                        currentTranscript += event.results[i][0].transcript;
                    }
                    setText(currentTranscript);
                };

                recognition.onerror = (event: any) => {
                    console.error("Speech recognition error", event.error);
                    if (event.error !== "no-speech") {
                        toast({
                            variant: "destructive",
                            title: "Error de Micrófono",
                            description: "Asegúrate de haber dado permisos de micrófono al navegador.",
                        });
                        setIsRecording(false);
                    }
                };

                recognition.onend = () => {
                    setIsRecording(false);
                };

                recognitionRef.current = recognition;
            }
        }
    }, [toast]);

    const toggleRecording = () => {
        if (!recognitionRef.current) {
            toast({
                variant: "destructive",
                title: "No Soportado",
                description: "Tu navegador no soporta dictado por voz. Usa el teclado.",
            });
            return;
        }

        if (isRecording) {
            recognitionRef.current.stop();
            setIsRecording(false);
        } else {
            setText("");
            try {
                recognitionRef.current.start();
                setIsRecording(true);
            } catch (e) {
                console.error(e);
            }
        }
    };

    const processText = async () => {
        if (!text.trim()) {
            toast({ title: "Falta texto", description: "Escribe o dicta algo primero." });
            return;
        }

        setIsProcessing(true);
        try {
            const response = await fetch("/api/gemini", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    task: "parse-ticket",
                    prompt: text
                }),
            });

            if (!response.ok) throw new Error("Error en la IA");

            const data = await response.json();
            if (data.output) {
                onTicketParsed(data.output);
                toast({
                    title: "¡Ticket Estructurado!",
                    description: "La IA ha rellenado el formulario por ti. Revisa los datos.",
                    className: "bg-green-50 border-green-200",
                });
            }
        } catch (error) {
            console.error(error);
            toast({
                variant: "destructive",
                title: "Error de IA",
                description: "No se pudo procesar tu mensaje.",
            });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-5 mb-8 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-blue-900">Asistente Inteligente</h3>
            </div>
            <p className="text-sm text-blue-700 mb-4">
                Dicta o escribe lo que necesitas y la IA rellenará el formulario automáticamente.
                (Ej: "Mañana hay que ir a Cap Cana a la villa 15 a arreglar una fuga urgente, que vaya Juan")
            </p>

            <div className="relative">
                <Textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Escribe o dicta aquí..."
                    className="pr-12 min-h-[100px] border-blue-200 focus-visible:ring-blue-400 bg-white"
                />
                <button
                    onClick={toggleRecording}
                    className={`absolute bottom-3 right-3 p-2 rounded-full transition-all ${
                        isRecording 
                        ? 'bg-red-500 text-white animate-pulse shadow-lg' 
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                    title={isRecording ? "Detener grabación" : "Iniciar dictado por voz"}
                >
                    {isRecording ? <Square className="w-5 h-5 fill-current" /> : <Mic className="w-5 h-5" />}
                </button>
            </div>

            <div className="mt-4 flex justify-end">
                <Button 
                    onClick={processText} 
                    disabled={isProcessing || !text.trim()}
                    className="bg-blue-600 hover:bg-blue-700 text-white shadow-md"
                >
                    {isProcessing ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Procesando...
                        </>
                    ) : (
                        <>
                            Organizar con IA
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
