
"use client";

import { InvoiceItem, Client } from "@/types/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, ShoppingCart, Mic, ChevronDown, Tag } from "lucide-react";
import { VoiceCommandCenter } from "@/components/income/voice-command-center";
import { useState } from "react";
import { useErpCatalog } from "@/hooks/use-erp-catalog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

interface StepItemsProps {
    data: any;
    updateData: (key: string, value: any) => void;
    clients: Client[];
    mode?: "invoice" | "quote";
}

export function StepItems({ data, updateData, clients, mode = "invoice" }: StepItemsProps) {
    const [showVoiceAgent, setShowVoiceAgent] = useState(false);
    const { items: erpItems, getPriceForItem, loading: catalogLoading } = useErpCatalog();

    const items: InvoiceItem[] = data.items || [];
    const currency = data.currency || "DOP";
    const currencySymbol = currency === "USD" ? "US$" : "RD$";

    const handleAddItem = () => {
        const newItem: InvoiceItem = {
            description: "",
            quantity: 1,
            unitPrice: 0,
            taxRate: 0.18,
            taxAmount: 0,
            total: 0,
        };
        updateData("items", [...items, newItem]);
    };

    const handleUpdateItem = (index: number, field: keyof InvoiceItem, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };

        const q = field === "quantity" ? value : newItems[index].quantity;
        const p = field === "unitPrice" ? value : newItems[index].unitPrice;
        const sub = q * p;
        newItems[index].taxAmount = sub * newItems[index].taxRate;
        newItems[index].total = sub + newItems[index].taxAmount;

        updateData("items", newItems);
    };

    /** Fills description + price from ERP catalog */
    const handleSelectErpItem = (index: number, itemCode: string) => {
        const erpItem = erpItems.find(i => i.name === itemCode);
        if (!erpItem) return;
        const price = getPriceForItem(itemCode);
        const newItems = [...items];
        const qty = newItems[index].quantity || 1;
        const sub = qty * price;
        newItems[index] = {
            ...newItems[index],
            description: erpItem.item_name || erpItem.name,
            itemCode,
            unitPrice: price,
            taxAmount: sub * newItems[index].taxRate,
            total: sub + sub * newItems[index].taxRate,
        };
        updateData("items", newItems);
    };

    const handleRemoveItem = (index: number) => {
        updateData("items", items.filter((_, i) => i !== index));
    };

    const handleVoiceData = (voiceData: { items: InvoiceItem[] }) => {
        updateData("items", [...items, ...voiceData.items]);
    };

    // Group ERP items by item_group for better UX
    const grouped = erpItems.reduce<Record<string, typeof erpItems>>((acc, item) => {
        const group = item.item_group || "General";
        if (!acc[group]) acc[group] = [];
        acc[group].push(item);
        return acc;
    }, {});

    return (
        <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
            <div className="flex justify-between items-start">
                <div className="space-y-1">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5 text-purple-600" />
                        Productos y Servicios
                    </h2>
                    <p className="text-sm text-gray-500">
                        Agrega los ítems para {mode === "quote" ? "la cotización" : "la factura"}.
                    </p>
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
                                <th className="p-4 text-right font-medium text-gray-500 w-36">Precio</th>
                                <th className="p-4 text-right font-medium text-gray-500 w-36">Total</th>
                                <th className="p-4 w-12"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {items.map((item, index) => (
                                <tr key={index} className="group hover:bg-blue-50/30 transition-colors align-top">
                                    <td className="p-3">
                                        <Input
                                            value={item.description}
                                            onChange={(e) => handleUpdateItem(index, "description", e.target.value)}
                                            className="bg-transparent border-transparent hover:border-gray-200 focus:bg-white transition-all"
                                            placeholder="Ej. Mantenimiento de A/C..."
                                        />
                                        {/* ERP Catalog picker */}
                                        {!catalogLoading && erpItems.length > 0 && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <button className="mt-1 flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 transition-colors px-1 py-0.5 rounded hover:bg-blue-50">
                                                        <Tag className="h-3 w-3" />
                                                        {(item as any).itemCode
                                                            ? <span className="font-medium">ERP: {(item as any).itemCode}</span>
                                                            : <span>Elegir del catálogo</span>
                                                        }
                                                        <ChevronDown className="h-3 w-3 ml-0.5" />
                                                    </button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent className="w-80 max-h-64 overflow-y-auto shadow-lg">
                                                    {Object.entries(grouped).map(([group, groupItems]) => (
                                                        <div key={group}>
                                                            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-gray-400 px-3 py-1.5">
                                                                {group}
                                                            </DropdownMenuLabel>
                                                            {groupItems.map(ei => {
                                                                const price = getPriceForItem(ei.name);
                                                                return (
                                                                    <DropdownMenuItem
                                                                        key={ei.name}
                                                                        onSelect={() => handleSelectErpItem(index, ei.name)}
                                                                        className="flex justify-between gap-3 cursor-pointer"
                                                                    >
                                                                        <span className="truncate text-gray-800">{ei.item_name || ei.name}</span>
                                                                        {price > 0 && (
                                                                            <span className="text-gray-400 text-xs shrink-0 font-mono">
                                                                                {currencySymbol} {price.toLocaleString()}
                                                                            </span>
                                                                        )}
                                                                    </DropdownMenuItem>
                                                                );
                                                            })}
                                                            <DropdownMenuSeparator />
                                                        </div>
                                                    ))}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                        {catalogLoading && (
                                            <span className="text-xs text-gray-400 px-1 mt-1 block">Cargando catálogo ERP…</span>
                                        )}
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
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">{currencySymbol}</span>
                                            <Input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={item.unitPrice}
                                                onChange={(e) => handleUpdateItem(index, "unitPrice", parseFloat(e.target.value) || 0)}
                                                className="text-right bg-transparent border-transparent hover:border-gray-200 focus:bg-white transition-all pl-8"
                                            />
                                        </div>
                                    </td>
                                    <td className="p-3 text-right font-mono font-semibold text-gray-700 pt-[1.1rem]">
                                        {currencySymbol} {item.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="p-3 text-center pt-[0.85rem]">
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
                        <div>
                            <p className="text-gray-600 font-medium">No hay ítems aún</p>
                            <p className="text-sm text-gray-400 mt-1">
                                Agrega manualmente o elige del <span className="text-blue-500 font-medium">catálogo ERP</span>
                            </p>
                        </div>
                        <Button onClick={handleAddItem} variant="outline" className="gap-2 border-purple-200 text-purple-600 hover:bg-purple-50">
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
