
"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CalendarDays, FileText } from "lucide-react";

interface StepDetailsProps {
    data: any;
    updateData: (key: string, value: any) => void;
}

export function StepDetails({ data, updateData }: StepDetailsProps) {
    return (
        <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
            <div className="space-y-2">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                    <FileText className="h-5 w-5 text-orange-600" />
                    Detalles Generales
                </h2>
                <p className="text-sm text-gray-500">Información administrativa de la factura.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                <div className="glass-card p-6 space-y-4">
                    <div className="space-y-2">
                        <Label>Número de Factura</Label>
                        <Input
                            value={data.number}
                            onChange={(e) => updateData("number", e.target.value)}
                            placeholder="Ej. INV-2025-001"
                            className="text-lg font-mono tracking-wide"
                        />
                    </div>
                </div>

                <div className="glass-card p-6 space-y-4">
                    <div className="space-y-2">
                        <Label>Nota Interna / Pública</Label>
                        <Textarea
                            value={data.notes}
                            onChange={(e) => updateData("notes", e.target.value)}
                            placeholder="Notas visibles para el cliente..."
                            className="resize-none h-32"
                        />
                    </div>
                </div>

            </div>
        </div>
    );
}
