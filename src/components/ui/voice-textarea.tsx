"use client";

import React, { useRef, useState, useEffect } from "react";
import { Textarea, TextareaProps } from "@/components/ui/textarea";
import { Mic, MicOff } from "lucide-react";
import { useVoiceDictation } from "@/hooks/use-voice-dictation";
import { Button } from "./button";
import { cn } from "@/lib/utils";

interface VoiceTextareaProps extends TextareaProps {
  onValueChange?: (value: string) => void;
  containerClassName?: string;
}

export const VoiceTextarea = React.forwardRef<HTMLTextAreaElement, VoiceTextareaProps>(
  ({ className, containerClassName, value, onChange, onValueChange, ...props }, ref) => {
    // Mantener rastro del texto original antes de empezar a dictar
    const [baseText, setBaseText] = useState<string>(String(value || ""));
    const [interimText, setInterimText] = useState("");
    
    // Sincronizar baseText si cambia el value desde afuera cuando NO estamos dictando
    useEffect(() => {
        setBaseText(String(value || ""));
    }, [value]);

    const { isListening, isSupported, toggleListening } = useVoiceDictation({
      onTranscriptChange: (newTranscript) => {
        setInterimText(newTranscript);
        // Construimos el valor completo
        const fullText = baseText ? `${baseText} ${newTranscript}` : newTranscript;
        
        // Disparamos los eventos onChange para que los formularios funcionen
        if (onValueChange) {
            onValueChange(fullText);
        }
        if (onChange) {
            // Simulamos un evento de input para los manejadores estándar
            const e = {
                target: { value: fullText }
            } as React.ChangeEvent<HTMLTextAreaElement>;
            onChange(e);
        }
      }
    });

    const handleToggle = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isListening) {
            // Al iniciar a escuchar, el texto base es el valor actual real
            setBaseText(String(value || ""));
            setInterimText("");
        } else {
            // Al detener, el nuevo texto base ya incluye lo dictado
            const fullText = baseText ? `${baseText} ${interimText}` : interimText;
            setBaseText(fullText);
            setInterimText("");
        }
        toggleListening();
    };

    return (
      <div className={cn("relative", containerClassName)}>
        <Textarea
          ref={ref}
          className={cn("pr-12", isListening && "ring-2 ring-emerald-500/50 border-emerald-500", className)}
          value={value}
          onChange={(e) => {
             setBaseText(e.target.value);
             if (onChange) onChange(e);
             if (onValueChange) onValueChange(e.target.value);
          }}
          {...props}
        />
        
        {isSupported && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleToggle}
              className={cn(
                  "absolute right-2 top-2 h-8 w-8 rounded-full transition-all duration-300",
                  isListening 
                    ? "bg-emerald-100 text-emerald-600 hover:bg-emerald-200 animate-pulse scale-110 shadow-sm" 
                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              )}
              title={isListening ? "Detener dictado" : "Dictar por voz"}
            >
              {isListening ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            </Button>
        )}
      </div>
    );
  }
);

VoiceTextarea.displayName = "VoiceTextarea";
