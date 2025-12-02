"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Package, Send, Loader2 } from "lucide-react";

interface MaterialRequestFormProps {
    ticketId: string;
    ticketNumber?: string;
    userId: string;
    userName: string;
    onSuccess?: () => void;
}

export function MaterialRequestForm({ ticketId, ticketNumber, userId, userName, onSuccess }: MaterialRequestFormProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        materialName: "",
        quantity: "1",
        urgency: "NORMAL" as "NORMAL" | "URGENT",
        notes: "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Create approval request for material purchase
            await addDoc(collection(db, "approvalRequests"), {
                ticketId,
                ticketNumber: ticketNumber || ticketId.slice(0, 6),
                requestedBy: userId,
                requestedByName: userName,
                type: "MATERIAL_PURCHASE",
                title: `Material: ${formData.materialName}`,
                description: `Cantidad: ${formData.quantity}\n${formData.notes}`,
                urgency: formData.urgency === "URGENT" ? "HIGH" : "MEDIUM",
                status: "PENDING",
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            // Reset form
            setFormData({
                materialName: "",
                quantity: "1",
                urgency: "NORMAL",
                notes: "",
            });

            alert("✅ Solicitud enviada exitosamente");

            if (onSuccess) {
                onSuccess();
            }
        } catch (error) {
            console.error("Error creating material request:", error);
            alert("❌ Error al enviar solicitud");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-blue-600" />
                    Solicitar Material
                </CardTitle>
                <CardDescription>
                    Envía una solicitud rápida para materiales que necesites
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Material Necesario *</Label>
                        <Input
                            value={formData.materialName}
                            onChange={(e) => setFormData({ ...formData, materialName: e.target.value })}
                            placeholder="Ej. Gas R410A, Capacitor 35µF, etc."
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Cantidad</Label>
                            <Input
                                type="number"
                                min="1"
                                value={formData.quantity}
                                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Urgencia</Label>
                            <Select
                                value={formData.urgency}
                                onValueChange={(val) => setFormData({ ...formData, urgency: val as "NORMAL" | "URGENT" })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="NORMAL">Normal</SelectItem>
                                    <SelectItem value="URGENT">Urgente</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Notas Adicionales</Label>
                        <Textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Especificaciones, marca preferida, etc..."
                            rows={3}
                        />
                    </div>

                    <Button type="submit" disabled={loading || !formData.materialName} className="w-full" size="lg">
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
                </form>
            </CardContent>
        </Card>
    );
}
