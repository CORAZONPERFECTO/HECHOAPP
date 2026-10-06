"use client";

import { useState, useEffect, useCallback, useRef } from 'react';

// Extend the Window interface to include SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface UseVoiceDictationProps {
  onTranscriptChange?: (text: string) => void;
  language?: string;
}

export function useVoiceDictation({ onTranscriptChange, language = 'es-DO' }: UseVoiceDictationProps = {}) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<any>(null);
  const accumulatedTranscriptRef = useRef(""); // To store previous text if we stop/start

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

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

      // We only fire the change with the newly recognized text. 
      // The parent component is responsible for appending it to the existing text.
      if (finalTranscript || interimTranscript) {
        const currentText = finalTranscript + interimTranscript;
        if (onTranscriptChange) {
           onTranscriptChange(currentText);
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      if (event.error !== 'no-speech') {
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      // Si el usuario no lo detuvo manualmente, pero se cortó, lo mantenemos apagado
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [language, onTranscriptChange]);

  const toggleListening = useCallback(() => {
    if (!isSupported || !recognitionRef.current) {
        alert("Tu navegador no soporta dictado por voz. Intenta usar Chrome o Safari.");
        return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        console.error("Error starting recognition", error);
        setIsListening(false);
      }
    }
  }, [isListening, isSupported]);

  return {
    isListening,
    isSupported,
    toggleListening,
  };
}
