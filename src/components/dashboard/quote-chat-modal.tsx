"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, Send, Loader2, FileText, X, Mic, MicOff } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";

interface QuoteItem {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
}

interface QuoteResponse {
    items: QuoteItem[];
    total: number;
    notes?: string;
}

interface Message {
    role: "user" | "assistant";
    content: string | QuoteResponse;
    type: "text" | "quote";
}

interface QuoteChatModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function QuoteChatModal({ open, onOpenChange }: QuoteChatModalProps) {
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([
        { role: "assistant", type: "text", content: "Hola, soy tu asistente de cotizaciones. Dime qué necesitas cotizar o sube una foto del equipo dañado." }
    ]);
    const [loading, setLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    // Voice Dictation Logic
    const toggleListening = () => {
        if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
            if (isListening) {
                // Stop manually if already running (though usually handled by onend)
                // We rely on the browser's native stop mainly, but we can force it if we kept the ref.
                // For simplicity in this functional component, just let user know to click to start.
                // If we want to force stop, we'd need to keep the recognition instance in a ref.
                setIsListening(false);
                return;
            }

            const SpeechRecognition = (window as any).webkitSpeechRecognition;
            const recognition = new SpeechRecognition();
            recognition.lang = 'es-DO';
            recognition.continuous = true; // Keep listening until user stops
            recognition.interimResults = true; // See results as they speak

            recognition.onstart = () => setIsListening(true);
            recognition.onend = () => setIsListening(false);

            recognition.onresult = (event: any) => {
                let finalTranscript = '';
                // With continuous=true, we get multiple results
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    }
                }

                // For interim, we might want to show it, but for now let's just append final blocks
                if (finalTranscript) {
                    setInput(prev => (prev ? `${prev} ${finalTranscript}` : finalTranscript));
                }
            };

            // Handle cleanup if component unmounts? 
            // For now, standard start.
            recognition.start();
        } else {
            alert("Tu navegador no soporta dictado por voz (webkitSpeechRecognition).");
        }
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    const handleSend = async () => {
        if (!input.trim() && !selectedImage) return;

        const userMsg = input;
        const currentImage = selectedImage; // snapshot

        setInput("");
        setSelectedImage(null);

        // Add User Message to UI
        setMessages(prev => [
            ...prev,
            {
                role: "user",
                type: "text",
                content: userMsg + (currentImage ? " [Imagen Adjunta]" : "")
            }
        ]);

        setLoading(true);

        try {
            const res = await fetch("/api/gemini", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    task: "generate-quote",
                    prompt: userMsg,
                    image: currentImage // Send base64 if exists
                })
            });

            const data = await res.json();

            if (data.error) {
                setMessages(prev => [...prev, { role: "assistant", type: "text", content: `Error: ${data.error}` }]);
            } else {
                setMessages(prev => [...prev, { role: "assistant", type: "quote", content: data.output }]);
            }

        } catch (error) {
            setMessages(prev => [...prev, { role: "assistant", type: "text", content: "Error de conexión." }]);
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadPDF = async (quote: QuoteResponse) => {
        // Dynamic import to allow server-side builds to pass if jspdf not friendly there (though usually fine)
        const jsPDF = (await import('jspdf')).default;
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text("Cotización Express", 20, 20);

        doc.setFontSize(10);
        doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 20, 30);

        let y = 40;

        // Table Header
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Cant.", 20, y);
        doc.text("Descripción", 40, y);
        doc.text("Total", 170, y, { align: 'right' });

        y += 10;
        doc.setFont("helvetica", "normal");

        quote.items.forEach(item => {
            doc.text(item.quantity.toString(), 20, y);
            const splitDesc = doc.splitTextToSize(item.description, 120);
            doc.text(splitDesc, 40, y);
            doc.text(`$${item.total.toLocaleString()}`, 170, y, { align: 'right' });

            y += (10 * splitDesc.length);
        });

        y += 10;
        doc.setLineWidth(0.5);
        doc.line(20, y, 190, y);
        y += 10;

        doc.setFont("helvetica", "bold");
        doc.text("Total:", 140, y);
        doc.text(`$${quote.total.toLocaleString()}`, 170, y, { align: 'right' });

        if (quote.notes) {
            y += 20;
            doc.setFont("helvetica", "italic");
            doc.setFontSize(10);
            doc.text("Notas:", 20, y);
            const notes = doc.splitTextToSize(quote.notes, 170);
            doc.text(notes, 20, y + 5);
        }

        doc.save("cotizacion_express.pdf");
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md h-[600px] flex flex-col p-0 gap-0">
                <DialogHeader className="p-4 border-b bg-slate-50">
                    <DialogTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-purple-600" />
                        Cotizador Express IA
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-hidden bg-slate-100 p-4">
                    <div className="space-y-4 h-full overflow-y-auto pr-2">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                {msg.type === "text" ? (
                                    <div className={`p-3 rounded-lg max-w-[85%] text-sm ${msg.role === "user" ? "bg-purple-600 text-white" : "bg-white border text-slate-700"}`}>
                                        <p className="whitespace-pre-wrap">{msg.content as string}</p>
                                    </div>
                                ) : (
                                    <Card className="w-[90%] border-purple-200 shadow-sm animate-in fade-in zoom-in-95 duration-300">
                                        <CardContent className="p-3 space-y-3">
                                            <div className="flex items-center gap-2 border-b pb-2">
                                                <FileText className="h-4 w-4 text-purple-600" />
                                                <span className="font-semibold text-sm">Cotización Generada</span>
                                            </div>
                                            <div className="space-y-2">
                                                {(msg.content as QuoteResponse).items.map((item, i) => (
                                                    <div key={i} className="flex justify-between text-xs">
                                                        <span>{item.quantity}x {item.description}</span>
                                                        <span className="font-mono">${item.total.toLocaleString()}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="border-t pt-2 flex justify-between font-bold text-sm">
                                                <span>Total</span>
                                                <span>${(msg.content as QuoteResponse).total.toLocaleString()}</span>
                                            </div>
                                            {(msg.content as QuoteResponse).notes && (
                                                <p className="text-[10px] text-gray-500 italic">{(msg.content as QuoteResponse).notes}</p>
                                            )}
                                            <Button
                                                size="sm"
                                                className="w-full mt-2 bg-purple-100 text-purple-700 hover:bg-purple-200 gap-2"
                                                onClick={() => handleDownloadPDF(msg.content as QuoteResponse)}
                                            >
                                                <FileText className="h-3 w-3" />
                                                Descargar PDF
                                            </Button>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-white p-3 rounded-lg border">
                                    <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Preview Image if selected */}
                {selectedImage && (
                    <div className="px-4 py-2 bg-slate-50 border-t flex items-center justify-between">
                        <span className="text-xs text-blue-600 font-medium truncate">Imagen seleccionada</span>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedImage(null)} className="h-6 w-6 p-0 text-gray-400">
                            <X className="h-3 w-3" />
                        </Button>
                    </div>
                )}

                <div className="p-4 bg-white border-t flex gap-2 items-end">

                    {/* Image Upload Input */}
                    <input
                        type="file"
                        accept="image/*"
                        id="quote-img-upload"
                        className="hidden"
                        onChange={handleImageSelect}
                    />
                    <label htmlFor="quote-img-upload">
                        <div className={`p-2 rounded-md hover:bg-slate-100 cursor-pointer transition-colors ${selectedImage ? 'text-blue-500 bg-blue-50' : 'text-gray-500'}`}>
                            {/* Simple Camera/Clip Icon */}
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                        </div>
                    </label>

                    <Button
                        onClick={toggleListening}
                        variant="ghost"
                        size="icon"
                        className={`transition-all ${isListening ? "text-red-500 bg-red-100 animate-pulse scale-110" : "text-gray-500"}`}
                    >
                        {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                    </Button>

                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={isListening ? "Escuchando..." : "Escribe o sube foto..."}
                        onKeyDown={(e) => e.key === "Enter" && handleSend()}
                        className="flex-1"
                    />

                    <Button onClick={handleSend} disabled={loading || (!input.trim() && !selectedImage)} size="icon" className="bg-purple-600 hover:bg-purple-700">
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// Helper trigger component to be used in the Dashboard Grid
export function QuoteChatTrigger({ onClick }: { onClick: () => void }) {
    return (
        <Button variant="ghost" className="w-full h-full p-0 flex flex-col items-center justify-center gap-2" onClick={onClick}>
            <MessageSquare className="h-8 w-8 text-pink-500" />
            <span className="font-medium text-gray-600">Cotizador IA</span>
        </Button>
    )
}
