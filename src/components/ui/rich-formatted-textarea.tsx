"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Textarea, TextareaProps } from "@/components/ui/textarea";
import { 
    Bold, 
    Italic, 
    List, 
    Heading2, 
    RemoveFormatting, 
    Undo2, 
    Redo2, 
    Mic, 
    MicOff, 
    Sparkles, 
    Loader2 
} from "lucide-react";
import { useVoiceDictation } from "@/hooks/use-voice-dictation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface RichFormattedTextareaProps extends TextareaProps {
    onValueChange?: (value: string) => void;
    containerClassName?: string;
    onRefineWithAI?: () => Promise<void>;
    isRefining?: boolean;
    showAIBtn?: boolean;
    showHeadingBtn?: boolean;
    showListBtn?: boolean;
    label?: string;
}

export const RichFormattedTextarea = React.forwardRef<HTMLTextAreaElement, RichFormattedTextareaProps>(
    (
        {
            className,
            containerClassName,
            value,
            onChange,
            onValueChange,
            onRefineWithAI,
            isRefining = false,
            showAIBtn = false,
            showHeadingBtn = true,
            showListBtn = true,
            label,
            ...props
        },
        ref
    ) => {
        const innerRef = useRef<HTMLTextAreaElement | null>(null);
        
        // Historial local de Undo/Redo para el texto
        const [history, setHistory] = useState<string[]>([String(value || "")]);
        const [historyIndex, setHistoryIndex] = useState<number>(0);
        const [baseText, setBaseText] = useState<string>(String(value || ""));
        const [interimText, setInterimText] = useState("");

        // Sincronizar con cambios externos si no estamos dictando ni editando activamente
        useEffect(() => {
            const valStr = String(value ?? "");
            setBaseText(valStr);
            setHistory(prev => {
                if (prev[historyIndex] === valStr) return prev;
                // Si viene un valor externo nuevo (ej: al cargar o pulir con IA), actualizar historial
                const newHist = [...prev.slice(0, historyIndex + 1), valStr];
                if (newHist.length > 30) newHist.shift();
                setHistoryIndex(newHist.length - 1);
                return newHist;
            });
        }, [value]);

        const updateValue = useCallback((newVal: string, addToHistory = true) => {
            setBaseText(newVal);
            if (addToHistory) {
                setHistory(prev => {
                    const newHist = [...prev.slice(0, historyIndex + 1), newVal];
                    if (newHist.length > 30) newHist.shift();
                    setHistoryIndex(newHist.length - 1);
                    return newHist;
                });
            }

            if (onValueChange) {
                onValueChange(newVal);
            }
            if (onChange) {
                const syntheticEvent = {
                    target: { value: newVal }
                } as React.ChangeEvent<HTMLTextAreaElement>;
                onChange(syntheticEvent);
            }
        }, [historyIndex, onChange, onValueChange]);

        const handleLocalUndo = () => {
            if (historyIndex > 0) {
                const newIdx = historyIndex - 1;
                setHistoryIndex(newIdx);
                const prevVal = history[newIdx];
                updateValue(prevVal, false);
            }
        };

        const handleLocalRedo = () => {
            if (historyIndex < history.length - 1) {
                const newIdx = historyIndex + 1;
                setHistoryIndex(newIdx);
                const nextVal = history[newIdx];
                updateValue(nextVal, false);
            }
        };

        // Dictado por voz
        const { isListening, isSupported, toggleListening } = useVoiceDictation({
            onTranscriptChange: (newTranscript) => {
                setInterimText(newTranscript);
                const fullText = baseText ? `${baseText} ${newTranscript}` : newTranscript;
                updateValue(fullText, false);
            }
        });

        const handleToggleVoice = (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            if (!isListening) {
                setBaseText(String(value || ""));
                setInterimText("");
            } else {
                const fullText = baseText ? `${baseText} ${interimText}` : interimText;
                setBaseText(fullText);
                setInterimText("");
                updateValue(fullText, true);
            }
            toggleListening();
        };

        // Formateo de Texto (Negrita, Cursiva, Encabezado, Lista, Limpiar)
        const applyFormat = (type: 'bold' | 'italic' | 'heading' | 'list' | 'clear') => {
            const textarea = innerRef.current;
            if (!textarea) return;

            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const currentStr = String(value || "");
            const selectedText = currentStr.substring(start, end);
            const before = currentStr.substring(0, start);
            const after = currentStr.substring(end);

            let newText = currentStr;
            let newSelectionStart = start;
            let newSelectionEnd = end;

            if (type === 'bold') {
                // Si la selección ya tiene ** al inicio y al final, los quitamos
                if (selectedText.startsWith('**') && selectedText.endsWith('**') && selectedText.length >= 4) {
                    const unwrapped = selectedText.slice(2, -2);
                    newText = before + unwrapped + after;
                    newSelectionStart = start;
                    newSelectionEnd = start + unwrapped.length;
                } else if (before.endsWith('**') && after.startsWith('**')) {
                    newText = before.slice(0, -2) + selectedText + after.slice(2);
                    newSelectionStart = start - 2;
                    newSelectionEnd = end - 2;
                } else {
                    const target = selectedText || 'texto en negrita';
                    newText = before + `**${target}**` + after;
                    newSelectionStart = start + 2;
                    newSelectionEnd = start + 2 + target.length;
                }
            } else if (type === 'italic') {
                if (selectedText.startsWith('*') && selectedText.endsWith('*') && !selectedText.startsWith('**') && selectedText.length >= 2) {
                    const unwrapped = selectedText.slice(1, -1);
                    newText = before + unwrapped + after;
                    newSelectionStart = start;
                    newSelectionEnd = start + unwrapped.length;
                } else if (before.endsWith('*') && !before.endsWith('**') && after.startsWith('*') && !after.startsWith('**')) {
                    newText = before.slice(0, -1) + selectedText + after.slice(1);
                    newSelectionStart = start - 1;
                    newSelectionEnd = end - 1;
                } else {
                    const target = selectedText || 'texto en cursiva';
                    newText = before + `*${target}*` + after;
                    newSelectionStart = start + 1;
                    newSelectionEnd = start + 1 + target.length;
                }
            } else if (type === 'heading') {
                const target = selectedText || 'Área o Sección';
                newText = before + `**${target}**:\n` + after;
                newSelectionStart = start + 2;
                newSelectionEnd = start + 2 + target.length;
            } else if (type === 'list') {
                if (selectedText) {
                    const lines = selectedText.split('\n');
                    const formatted = lines.map(l => l.startsWith('• ') ? l.slice(2) : `• ${l}`).join('\n');
                    newText = before + formatted + after;
                    newSelectionStart = start;
                    newSelectionEnd = start + formatted.length;
                } else {
                    newText = before + '• ' + after;
                    newSelectionStart = start + 2;
                    newSelectionEnd = start + 2;
                }
            } else if (type === 'clear') {
                if (selectedText) {
                    const cleaned = selectedText
                        .replace(/\*\*(.*?)\*\*/g, '$1')
                        .replace(/\*(.*?)\*/g, '$1')
                        .replace(/__(.*?)__/g, '$1')
                        .replace(/_(.*?)_/g, '$1');
                    newText = before + cleaned + after;
                    newSelectionStart = start;
                    newSelectionEnd = start + cleaned.length;
                }
            }

            updateValue(newText, true);

            setTimeout(() => {
                if (innerRef.current) {
                    innerRef.current.focus();
                    innerRef.current.setSelectionRange(newSelectionStart, newSelectionEnd);
                }
            }, 0);
        };

        const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
                e.preventDefault();
                applyFormat('bold');
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
                e.preventDefault();
                applyFormat('italic');
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
                e.preventDefault();
                handleLocalUndo();
            } else if ((e.ctrlKey || e.metaKey) && ((e.key.toLowerCase() === 'z' && e.shiftKey) || e.key.toLowerCase() === 'y')) {
                e.preventDefault();
                handleLocalRedo();
            }
        };

        return (
            <div className={cn("border border-slate-200 dark:border-zinc-700 rounded-lg overflow-hidden bg-white dark:bg-zinc-900 shadow-xs focus-within:ring-2 focus-within:ring-emerald-500/50 focus-within:border-emerald-500 transition-all", containerClassName)}>
                {/* TOOLBAR SUPERIOR */}
                <div className="flex flex-wrap items-center justify-between gap-1 px-2 py-1.5 bg-slate-50 dark:bg-zinc-800/80 border-b border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 select-none">
                    <div className="flex items-center gap-0.5">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => applyFormat('bold')}
                            className="h-7 w-7 p-0 rounded hover:bg-slate-200 dark:hover:bg-zinc-700 font-bold text-slate-800 dark:text-zinc-100"
                            title="Negrita (Ctrl+B) - Agregar o quitar **negrita**"
                        >
                            <Bold className="h-3.5 w-3.5" />
                        </Button>

                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => applyFormat('italic')}
                            className="h-7 w-7 p-0 rounded hover:bg-slate-200 dark:hover:bg-zinc-700 italic text-slate-800 dark:text-zinc-100"
                            title="Cursiva (Ctrl+I) - Agregar o quitar *cursiva*"
                        >
                            <Italic className="h-3.5 w-3.5" />
                        </Button>

                        {showHeadingBtn && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => applyFormat('heading')}
                                className="h-7 px-1.5 rounded hover:bg-slate-200 dark:hover:bg-zinc-700 text-xs font-semibold text-slate-800 dark:text-zinc-100 gap-0.5"
                                title="Clave / Título de Área en Negrita (**Área:**)"
                            >
                                <Heading2 className="h-3.5 w-3.5" />
                                <span className="text-[10px] hidden sm:inline">Área</span>
                            </Button>
                        )}

                        {showListBtn && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => applyFormat('list')}
                                className="h-7 w-7 p-0 rounded hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-100"
                                title="Lista con viñetas (• )"
                            >
                                <List className="h-3.5 w-3.5" />
                            </Button>
                        )}

                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => applyFormat('clear')}
                            className="h-7 w-7 p-0 rounded hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-500 hover:text-slate-800 dark:hover:text-zinc-100"
                            title="Limpiar formato de la selección"
                        >
                            <RemoveFormatting className="h-3.5 w-3.5" />
                        </Button>

                        <div className="h-4 w-px bg-slate-300 dark:bg-zinc-700 mx-1" />

                        {/* Deshacer / Retroceder & Rehacer */}
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleLocalUndo}
                            disabled={historyIndex <= 0}
                            className="h-7 w-7 p-0 rounded hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 disabled:opacity-30"
                            title="Retroceder / Deshacer (Ctrl+Z)"
                        >
                            <Undo2 className="h-3.5 w-3.5" />
                        </Button>

                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleLocalRedo}
                            disabled={historyIndex >= history.length - 1}
                            className="h-7 w-7 p-0 rounded hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 disabled:opacity-30"
                            title="Rehacer (Ctrl+Y)"
                        >
                            <Redo2 className="h-3.5 w-3.5" />
                        </Button>
                    </div>

                    <div className="flex items-center gap-1">
                        {/* IA Refine Button */}
                        {showAIBtn && onRefineWithAI && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={onRefineWithAI}
                                disabled={isRefining || !value}
                                className="h-6 px-2 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-100 dark:hover:bg-purple-950/40 gap-1"
                                title="Mejorar redacción con IA"
                            >
                                {isRefining ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                                <span className="text-[11px] font-medium">{isRefining ? "Mejorando..." : "Pulir con IA"}</span>
                            </Button>
                        )}

                        {/* Mic Voice Button */}
                        {isSupported && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={handleToggleVoice}
                                className={cn(
                                    "h-7 px-2 text-xs rounded transition-all flex items-center gap-1",
                                    isListening
                                        ? "bg-emerald-500 text-white hover:bg-emerald-600 animate-pulse shadow-xs"
                                        : "text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-slate-200 dark:hover:bg-zinc-700"
                                )}
                                title={isListening ? "Detener dictado por voz" : "Dictar por voz"}
                            >
                                {isListening ? <Mic className="h-3.5 w-3.5 text-white" /> : <MicOff className="h-3.5 w-3.5" />}
                                <span className="text-[10px] hidden sm:inline">{isListening ? "Escuchando..." : "Voz"}</span>
                            </Button>
                        )}
                    </div>
                </div>

                {/* TEXTAREA REAL */}
                <div className="relative">
                    <Textarea
                        ref={(node) => {
                            innerRef.current = node;
                            if (typeof ref === "function") ref(node);
                            else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
                        }}
                        className={cn(
                            "border-0 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none resize-y font-sans text-sm leading-relaxed p-3 bg-transparent",
                            isListening && "bg-emerald-50/20 dark:bg-emerald-950/20",
                            className
                        )}
                        value={value}
                        onChange={(e) => updateValue(e.target.value, true)}
                        onKeyDown={handleKeyDown}
                        {...props}
                    />
                </div>
            </div>
        );
    }
);

RichFormattedTextarea.displayName = "RichFormattedTextarea";
