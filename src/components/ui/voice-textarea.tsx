"use client";

import * as React from "react";
import { Textarea, TextareaProps } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceTextareaProps extends TextareaProps {
    onValueChange?: (value: string) => void;
}

export function VoiceTextarea({ className, value, onChange, onValueChange, ...props }: VoiceTextareaProps) {
    const [isListening, setIsListening] = React.useState(false);
    const [isSupported, setIsSupported] = React.useState(true);
    const recognitionRef = React.useRef<any>(null);

    React.useEffect(() => {
        if (typeof window !== "undefined") {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognition) {
                const recognition = new SpeechRecognition();
                recognition.continuous = true;
                recognition.interimResults = true;
                recognition.lang = 'es-DO'; // Default to Dominican Spanish, fallback to es-ES if needed

                recognition.onresult = (event: any) => {
                    let finalTranscript = '';
                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        if (event.results[i].isFinal) {
                            finalTranscript += event.results[i][0].transcript;
                        }
                    }

                    if (finalTranscript) {
                        const currentValue = (value as string) || "";
                        const newValue = currentValue ? `${currentValue} ${finalTranscript}` : finalTranscript;

                        // Trigger change updates
                        if (onValueChange) {
                            onValueChange(newValue);
                        }

                        // Create a synthetic event for standard onChange
                        if (onChange) {
                            const syntheticEvent = {
                                target: { value: newValue }
                            } as React.ChangeEvent<HTMLTextAreaElement>;
                            onChange(syntheticEvent);
                        }
                    }
                };

                recognition.onerror = (event: any) => {
                    console.error("Speech recognition error", event.error);
                    setIsListening(false);
                    if (event.error === 'not-allowed') {
                        alert("No se pudo acceder al micrófono. Verifique los permisos.");
                    }
                };

                recognition.onend = () => {
                    // Only stop if we explicitly stopped it, otherwise it might just be a pause
                    // But for simplicity in this UI, we'll treat end as stop
                    setIsListening(false);
                };

                recognitionRef.current = recognition;
            } else {
                setIsSupported(false);
            }
        }
    }, [value, onChange, onValueChange]);

    const toggleListening = () => {
        if (!isSupported) {
            alert("El dictado por voz no está disponible en este navegador.");
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

    return (
        <div className="relative">
            <Textarea
                value={value}
                onChange={onChange}
                className={cn("pr-12", className)} // Add padding for the button
                {...props}
            />
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn(
                    "absolute top-2 right-2 h-8 w-8 transition-colors",
                    isListening ? "text-red-500 hover:text-red-600 bg-red-50" : "text-gray-400 hover:text-gray-600"
                )}
                onClick={toggleListening}
                title={isListening ? "Detener dictado" : "Iniciar dictado"}
            >
                {isListening ? (
                    <MicOff className="h-4 w-4 animate-pulse" />
                ) : (
                    <Mic className="h-4 w-4" />
                )}
            </Button>
        </div>
    );
}
