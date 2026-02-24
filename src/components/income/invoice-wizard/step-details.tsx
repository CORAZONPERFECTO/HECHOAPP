
"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, FileText, Clock, Coins } from "lucide-react";

interface StepDetailsProps {
    data: any;
    updateData: (key: string, value: any) => void;
    mode?: "invoice" | "quote";
}

export function StepDetails({ data, updateData, mode = "invoice" }: StepDetailsProps) {
    const isQuote = mode === "quote";

    return (
        <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
            <div className="space-y-1">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                    <FileText className="h-5 w-5 text-orange-600" />
                    Detalles {isQuote ? "de la Cotización" : "de la Factura"}
                </h2>
                <p className="text-sm text-gray-500">
                    Información administrativa y condiciones {isQuote ? "de la propuesta" : "del cobro"}.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Left card: Number + Currency */}
                <div className="glass-card p-6 space-y-5">
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-gray-600">
                            <FileText className="h-4 w-4" />
                            Número de {isQuote ? "Cotización" : "Factura"}
                        </Label>
                        <Input
                            value={data.number || ""}
                            onChange={(e) => updateData("number", e.target.value)}
                            placeholder="(Auto-generado al guardar)"
                            className="text-lg font-mono tracking-wide bg-gray-50/60"
                            disabled
                        />
                        <p className="text-[10px] text-gray-400">
                            El número se asignará automáticamente al finalizar.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-gray-600">
                            <Coins className="h-4 w-4" />
                            Moneda
                        </Label>
                        <Select
                            value={data.currency || "DOP"}
                            onValueChange={(val) => updateData("currency", val)}
                        >
                            <SelectTrigger className="h-11">
                                <SelectValue placeholder="Seleccionar moneda" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="DOP">
                                    <span className="font-mono mr-2">RD$</span> Peso Dominicano (DOP)
                                </SelectItem>
                                <SelectItem value="USD">
                                    <span className="font-mono mr-2">US$</span> Dólar Estadounidense (USD)
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Right card: Dates + Notes */}
                <div className="glass-card p-6 space-y-5">
                    {isQuote && (
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-gray-600">
                                <Clock className="h-4 w-4 text-amber-500" />
                                Válida hasta
                            </Label>
                            <Input
                                type="date"
                                value={data.validUntilDate || (() => {
                                    const d = new Date();
                                    d.setDate(d.getDate() + 15);
                                    return d.toISOString().split("T")[0];
                                })()}
                                onChange={(e) => updateData("validUntilDate", e.target.value)}
                                className="h-11"
                                min={new Date().toISOString().split("T")[0]}
                            />
                            <p className="text-[10px] text-gray-400">
                                Fecha límite en que el cliente puede aceptar esta cotización.
                            </p>
                        </div>
                    )}

                    {!isQuote && (
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-gray-600">
                                <CalendarDays className="h-4 w-4 text-red-500" />
                                Fecha de Vencimiento
                            </Label>
                            <Input
                                type="date"
                                value={data.dueDateStr || ""}
                                onChange={(e) => updateData("dueDateStr", e.target.value)}
                                className="h-11"
                            />
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-gray-600">
                            <FileText className="h-4 w-4" />
                            Notas para el cliente
                        </Label>
                        <Textarea
                            value={data.notes || ""}
                            onChange={(e) => updateData("notes", e.target.value)}
                            placeholder={isQuote
                                ? "Condiciones de la propuesta, garantías, tiempo de entrega..."
                                : "Información adicional visible para el cliente..."
                            }
                            className="resize-none h-32"
                        />
                    </div>
                </div>

            </div>
        </div>
    );
}
