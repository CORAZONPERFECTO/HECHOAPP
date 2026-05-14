"use client";

import * as React from "react";
import { Input, InputProps } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

interface VoiceInputProps extends InputProps {
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

export function VoiceInput({ className, value, onChange, onValueChange, ...props }: VoiceInputProps) {
    const [isListening, setIsListening] = React.useState(false);
    const [isSupported, setIsSupported] = React.useState(true);
    const recognitionRef = React.useRef<SpeechRecognition | null>(null);
    const valueRef = React.useRef<string>((value as string) || "");
    const lastProcessedIndexRef = React.useRef<number>(-1);
    const { toast } = useToast();

    React.useEffect(() => {
        valueRef.current = (value as string) || "";
    }, [value]);

    React.useEffect(() => {
        if (typeof window === "undefined") return;

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setIsSupported(false);
            return;
        }

        const recognition = new SpeechRecognition() as SpeechRecognition;
        recognition.continuous = false;  
        recognition.interimResults = false; 
        recognition.lang = 'es-DO';

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            let finalTranscript = '';
            for (let i = lastProcessedIndexRef.current + 1; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                    lastProcessedIndexRef.current = i;
                }
            }
            if (finalTranscript.trim()) {
                const current = valueRef.current;
                const newValue = current ? `${current} ${finalTranscript.trim()}` : finalTranscript.trim();
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
    }, []); 

    const triggerChange = (newValue: string) => {
        valueRef.current = newValue;
        if (onValueChange) onValueChange(newValue);
        if (onChange) {
            const syntheticEvent = {
                target: { value: newValue }
            } as React.ChangeEvent<HTMLInputElement>;
            onChange(syntheticEvent);
        }
    };

    const toggleListening = () => {
        if (!isSupported) {
            toast({
                title: "No soportado",
                description: "El dictado por voz no está disponible en este navegador.",
                variant: "destructive"
            });
            return;
        }
        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
        } else {
            try {
                lastProcessedIndexRef.current = -1;
                recognitionRef.current?.start();
                setIsListening(true);
            } catch (error) {
                console.error("Error starting speech recognition:", error);
                setIsListening(false);
            }
        }
    };

    return (
        <div className="relative group flex items-center">
            <Input
                value={value}
                onChange={onChange}
                className={cn("pr-12", className)}
                {...props}
            />

            <div className="absolute right-1 flex items-center">
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={cn(
                        "h-8 w-8 transition-colors rounded-full",
                        isListening
                            ? "text-red-500 hover:text-red-600 bg-red-50 animate-pulse"
                            : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                    )}
                    onClick={toggleListening}
                    title={isListening ? "Detener dictado" : "Iniciar dictado por voz"}
                >
                    {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
            </div>
            
            {isListening && (
                <div className="absolute -bottom-5 left-1 text-[10px] text-red-500 font-semibold animate-pulse flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block animate-ping" />
                    Escuchando...
                </div>
            )}
        </div>
    );
}
