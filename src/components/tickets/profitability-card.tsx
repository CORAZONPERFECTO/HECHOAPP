import { Ticket } from "@/types/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DollarSign, TrendingUp, TrendingDown, Calculator, ExternalLink } from "lucide-react";
import { useState, useEffect } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";

interface ProfitabilityCardProps {
    ticket: Ticket;
    onUpdate?: () => void;
}

export function ProfitabilityCard({ ticket, onUpdate }: ProfitabilityCardProps) {
    const router = useRouter();
    const [editing, setEditing] = useState(false);
    const [formData, setFormData] = useState({
        laborHours: ticket.laborHours?.toString() || "",
        laborRate: ticket.laborRate?.toString() || "",
        materialsCost: ticket.materialsCost?.toString() || "",
        otherCosts: ticket.otherCosts?.toString() || "",
        revenue: ticket.revenue?.toString() || "",
    });

    // Calculate totals
    const laborHours = parseFloat(formData.laborHours) || 0;
    const laborRate = parseFloat(formData.laborRate) || 0;
    const materialsCost = parseFloat(formData.materialsCost) || 0;
    const otherCosts = parseFloat(formData.otherCosts) || 0;
    const revenue = parseFloat(formData.revenue) || 0;

    const laborCost = laborHours * laborRate;
    const totalCost = laborCost + materialsCost + otherCosts;
    const profit = revenue - totalCost;
    const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

    const handleSave = async () => {
        try {
            await updateDoc(doc(db, "tickets", ticket.id), {
                laborHours,
                laborRate,
                materialsCost,
                otherCosts,
                totalCost,
                revenue,
                profitMargin,
                updatedAt: new Date(),
            });
            setEditing(false);
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error("Error updating profitability:", error);
            alert("Error al guardar datos de rentabilidad");
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center gap-2">
                        <Calculator className="h-5 w-5 text-blue-600" />
                        Análisis de Rentabilidad
                    </CardTitle>
                    {!editing && (
                        <Button onClick={() => setEditing(true)} variant="outline" size="sm">
                            Editar Costos
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {editing ? (
                    <>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Horas de Labor</Label>
                                <Input
                                    type="number"
                                    step="0.5"
                                    value={formData.laborHours}
                                    onChange={(e) => setFormData({ ...formData, laborHours: e.target.value })}
                                    placeholder="0"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Tarifa por Hora (RD$)</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={formData.laborRate}
                                    onChange={(e) => setFormData({ ...formData, laborRate: e.target.value })}
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Costo de Materiales (RD$)</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={formData.materialsCost}
                                    onChange={(e) => setFormData({ ...formData, materialsCost: e.target.value })}
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Otros Costos (RD$)</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={formData.otherCosts}
                                    onChange={(e) => setFormData({ ...formData, otherCosts: e.target.value })}
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="col-span-2 space-y-2">
                                <Label>Ingreso Total (RD$)</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={formData.revenue}
                                    onChange={(e) => setFormData({ ...formData, revenue: e.target.value })}
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={handleSave} className="flex-1">
                                Guardar
                            </Button>
                            <Button onClick={() => setEditing(false)} variant="outline" className="flex-1">
                                Cancelar
                            </Button>
                        </div>
                    </>
                ) : (
                    <>
                        {/* Cost Breakdown */}
                        <div className="space-y-3">
                            <h4 className="font-semibold text-sm text-gray-700">Desglose de Costos</h4>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">
                                        Labor ({laborHours}h × RD$ {laborRate.toFixed(2)}/h)
                                    </span>
                                    <span className="font-medium">RD$ {laborCost.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Materiales</span>
                                    <span className="font-medium">RD$ {materialsCost.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Otros Costos</span>
                                    <span className="font-medium">RD$ {otherCosts.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between pt-2 border-t font-semibold">
                                    <span>Costo Total</span>
                                    <span className="text-red-600">RD$ {totalCost.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Revenue & Profit */}
                        <div className="space-y-3 pt-4 border-t">
                            <div className="flex justify-between text-lg">
                                <span className="font-semibold">Ingreso</span>
                                <span className="font-bold text-green-600">RD$ {revenue.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-lg">
                                <span className="font-semibold">Ganancia</span>
                                <span className={`font-bold ${profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                                    RD$ {profit.toFixed(2)}
                                </span>
                            </div>
                        </div>

                        {/* Profit Margin */}
                        <div className="bg-slate-50 p-4 rounded-lg">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {profitMargin >= 0 ? (
                                        <TrendingUp className="h-6 w-6 text-green-600" />
                                    ) : (
                                        <TrendingDown className="h-6 w-6 text-red-600" />
                                    )}
                                    <span className="font-semibold">Margen de Ganancia</span>
                                </div>
                                <span
                                    className={`text-2xl font-bold ${profitMargin >= 30
                                            ? "text-green-600"
                                            : profitMargin >= 15
                                                ? "text-yellow-600"
                                                : "text-red-600"
                                        }`}
                                >
                                    {profitMargin.toFixed(1)}%
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                {profitMargin >= 30
                                    ? "Excelente rentabilidad"
                                    : profitMargin >= 15
                                        ? "Rentabilidad aceptable"
                                        : profitMargin >= 0
                                            ? "Rentabilidad baja"
                                            : "Pérdida"}
                            </p>
                        </div>

                        {/* Link to Invoice */}
                        {ticket.linkedInvoiceId && (
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => router.push(`/income/invoices/${ticket.linkedInvoiceId}`)}
                            >
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Ver Factura Relacionada
                            </Button>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
}
