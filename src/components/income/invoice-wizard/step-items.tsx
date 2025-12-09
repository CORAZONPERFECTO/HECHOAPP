
"use client";

import { InvoiceItem, Client } from "@/types/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, ShoppingCart, Mic } from "lucide-react";
import { VoiceCommandCenter } from "@/components/income/voice-command-center";
import { useState } from "react";

interface StepItemsProps {
    data: any;
    updateData: (key: string, value: any) => void;
    clients: Client[]; // Passed for voice context if needed
}

export function StepItems({ data, updateData, clients }: StepItemsProps) {
    const [showVoiceAgent, setShowVoiceAgent] = useState(false);

    const items: InvoiceItem[] = data.items || [];

    const handleAddItem = () => {
        const newItem: InvoiceItem = {
            description: "",
            quantity: 1,
            unitPrice: 0,
            taxRate: 0.18,
            taxAmount: 0,
            total: 0
        };
        updateData("items", [...items, newItem]);
    };

    const handleUpdateItem = (index: number, field: keyof InvoiceItem, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };

        // Recalculate directly here for responsiveness
        const q = field === 'quantity' ? value : newItems[index].quantity;
        const p = field === 'unitPrice' ? value : newItems[index].unitPrice;
        const sub = q * p;
        newItems[index].taxAmount = sub * newItems[index].taxRate;
        newItems[index].total = sub + newItems[index].taxAmount;

        updateData("items", newItems);
    };

    const handleRemoveItem = (index: number) => {
        updateData("items", items.filter((_, i) => i !== index));
    };

    const handleVoiceData = (voiceData: { items: InvoiceItem[] }) => {
        updateData("items", [...items, ...voiceData.items]);
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
            <div className="flex justify-between items-start">
                <div className="space-y-2">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5 text-purple-600" />
                        Productos y Servicios
                    </h2>
                    <p className="text-sm text-gray-500">Agrega los ítems para la factura.</p>
                </div>
                <Button
                    variant="outline"
                    className="gap-2 text-purple-600 border-purple-200 hover:bg-purple-50"
                    onClick={() => setShowVoiceAgent(true)}
                >
                    <Mic className="h-4 w-4" />
                    Dictar Ítems
                </Button>
            </div>

            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50/50 border-b">
                            <tr>
                                <th className="p-4 text-left font-medium text-gray-500">Descripción</th>
                                <th className="p-4 text-right font-medium text-gray-500 w-24">Cant.</th>
                                <th className="p-4 text-right font-medium text-gray-500 w-32">Precio</th>
                                <th className="p-4 text-right font-medium text-gray-500 w-32">Total</th>
                                <th className="p-4 w-12"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {items.map((item, index) => (
                                <tr key={index} className="group hover:bg-blue-50/30 transition-colors">
                                    <td className="p-3">
                                        <Input
                                            value={item.description}
                                            onChange={(e) => handleUpdateItem(index, "description", e.target.value)}
                                            className="bg-transparent border-transparent hover:border-gray-200 focus:bg-white transition-all"
                                            placeholder="Ej. Mantenimiento..."
                                        />
                                    </td>
                                    <td className="p-3">
                                        <Input
                                            type="number"
                                            min="1"
                                            value={item.quantity}
                                            onChange={(e) => handleUpdateItem(index, "quantity", parseFloat(e.target.value) || 0)}
                                            className="text-right bg-transparent border-transparent hover:border-gray-200 focus:bg-white transition-all"
                                        />
                                    </td>
                                    <td className="p-3">
                                        <Input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={item.unitPrice}
                                            onChange={(e) => handleUpdateItem(index, "unitPrice", parseFloat(e.target.value) || 0)}
                                            className="text-right bg-transparent border-transparent hover:border-gray-200 focus:bg-white transition-all"
                                        />
                                    </td>
                                    <td className="p-3 text-right font-mono font-medium text-gray-700">
                                        {item.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="p-3 text-center">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleRemoveItem(index)}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600 hover:bg-red-50"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {items.length === 0 && (
                    <div className="p-12 text-center space-y-4">
                        <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-400">
                            <ShoppingCart className="h-8 w-8" />
                        </div>
                        <p className="text-gray-500">Tu carrito está vacío.</p>
                        <Button onClick={handleAddItem} variant="outline" className="gap-2">
                            <Plus className="h-4 w-4" /> Agregar Primer Ítem
                        </Button>
                    </div>
                )}

                {items.length > 0 && (
                    <div className="p-4 border-t bg-gray-50/30 flex justify-center">
                        <Button onClick={handleAddItem} variant="ghost" className="gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                            <Plus className="h-4 w-4" /> Agregar Otro Ítem
                        </Button>
                    </div>
                )}
            </div>

            {showVoiceAgent && (
                <VoiceCommandCenter
                    availableClients={clients}
                    onClose={() => setShowVoiceAgent(false)}
                    onInvoiceDataDetected={handleVoiceData}
                />
            )}
        </div>
    );
}
