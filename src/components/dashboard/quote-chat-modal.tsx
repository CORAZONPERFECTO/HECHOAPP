"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, Send, Loader2, FileText, X } from "lucide-react";
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

export function QuoteChatModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([
        { role: "assistant", type: "text", content: "Hola, soy tu asistente de cotizaciones. Dime qué necesitas cotizar y lo armaré por ti.\n\nEj: 'Cotiza 2 aires de 12000 BTU a 25000 cada uno'." }
    ]);
    const [loading, setLoading] = useState(false);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg = input;
        setInput("");
        setMessages(prev => [...prev, { role: "user", type: "text", content: userMsg }]);
        setLoading(true);

        try {
            const res = await fetch("/api/gemini", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    task: "generate-quote",
                    prompt: userMsg
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

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {/* This trigger might be overriden or used as standalone */}
                <div />
            </DialogTrigger>
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
                                    <Card className="w-[90%] border-purple-200 shadow-sm">
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
                                            <Button size="sm" className="w-full mt-2 bg-purple-100 text-purple-700 hover:bg-purple-200" onClick={() => alert("Función 'Guardar como PDF' pendiente")}>
                                                Guardar / Imprimir
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

                <div className="p-4 bg-white border-t flex gap-2">
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Escribe aquí... (Enter para enviar)"
                        onKeyDown={(e) => e.key === "Enter" && handleSend()}
                        className="flex-1"
                    />
                    <Button onClick={handleSend} disabled={loading || !input.trim()} size="icon" className="bg-purple-600 hover:bg-purple-700">
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
