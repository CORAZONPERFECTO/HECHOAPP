"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ApprovalRequestType } from "@/types/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertCircle, Send, Loader2 } from "lucide-react";

interface ApprovalRequestFormProps {
    ticketId?: string;
    ticketNumber?: string;
    assetId?: string;
    userId: string;
    userName: string;
    onSuccess?: () => void;
}

export function ApprovalRequestForm({ ticketId, ticketNumber, assetId, userId, userName, onSuccess }: ApprovalRequestFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        type: "" as ApprovalRequestType,
        title: "",
        description: "",
        amount: "",
        urgency: "MEDIUM" as "LOW" | "MEDIUM" | "HIGH",
    });

    const requestTypes = [
        { value: "MATERIAL_PURCHASE", label: "Compra de Material" },
        { value: "PRICE_CHANGE", label: "Cambio de Precio" },
        { value: "SCOPE_CHANGE", label: "Cambio de Alcance" },
        { value: "OVERTIME", label: "Horas Extra" },
        { value: "OTHER", label: "Otro" },
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await addDoc(collection(db, "approvalRequests"), {
                ticketId: ticketId || null,
                assetId: assetId || null,
                ticketNumber: ticketNumber || (ticketId ? ticketId.slice(0, 6) : "ADHOC"),
                requestedBy: userId,
                requestedByName: userName,
                type: formData.type,
                title: formData.title,
                description: formData.description,
                amount: formData.amount ? parseFloat(formData.amount) : undefined,
                urgency: formData.urgency,
                status: "PENDING",
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            // Reset form
            setFormData({
                type: "" as ApprovalRequestType,
                title: "",
                description: "",
                amount: "",
                urgency: "MEDIUM",
            });

            if (onSuccess) {
                onSuccess();
            }
        } catch (error) {
            console.error("Error creating approval request:", error);
            alert("Error al crear solicitud. Por favor intenta de nuevo.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                    Solicitar Aprobación
                </CardTitle>
                <CardDescription>
                    Envía una solicitud al supervisor para aprobación de compras, cambios o autorizaciones especiales.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Tipo de Solicitud *</Label>
                        <Select value={formData.type} onValueChange={(val) => setFormData({ ...formData, type: val as ApprovalRequestType })}>
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar tipo" />
                            </SelectTrigger>
                            <SelectContent>
                                {requestTypes.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                        {type.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Título *</Label>
                        <Input
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="Ej. Compra de compresor de 2 toneladas"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Descripción *</Label>
                        <Textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Explica los detalles de tu solicitud..."
                            className="min-h-[100px]"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Monto (Opcional)</Label>
                            <Input
                                type="number"
                                step="0.01"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                placeholder="RD$ 0.00"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Urgencia</Label>
                            <Select value={formData.urgency} onValueChange={(val) => setFormData({ ...formData, urgency: val as "LOW" | "MEDIUM" | "HIGH" })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="LOW">Baja</SelectItem>
                                    <SelectItem value="MEDIUM">Media</SelectItem>
                                    <SelectItem value="HIGH">Alta</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                        <Button type="submit" disabled={loading || !formData.type || !formData.title || !formData.description} className="flex-1">
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Enviando...
                                </>
                            ) : (
                                <>
                                    <Send className="mr-2 h-4 w-4" />
                                    Enviar Solicitud
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
