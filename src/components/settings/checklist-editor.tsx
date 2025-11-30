"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, GripVertical } from "lucide-react";

interface ChecklistEditorProps {
    items: string[];
    onChange: (items: string[]) => void;
}

export function ChecklistEditor({ items, onChange }: ChecklistEditorProps) {
    const [newItem, setNewItem] = useState("");

    const handleAdd = () => {
        if (newItem.trim()) {
            onChange([...items, newItem.trim()]);
            setNewItem("");
        }
    };

    const handleRemove = (index: number) => {
        const newItems = [...items];
        newItems.splice(index, 1);
        onChange(newItems);
    };

    const handleMoveUp = (index: number) => {
        if (index === 0) return;
        const newItems = [...items];
        const temp = newItems[index - 1];
        newItems[index - 1] = newItems[index];
        newItems[index] = temp;
        onChange(newItems);
    };

    const handleMoveDown = (index: number) => {
        if (index === items.length - 1) return;
        const newItems = [...items];
        const temp = newItems[index + 1];
        newItems[index + 1] = newItems[index];
        newItems[index] = temp;
        onChange(newItems);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAdd();
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                <Input
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Nuevo ítem de checklist..."
                    className="flex-1"
                />
                <Button type="button" onClick={handleAdd} disabled={!newItem.trim()}>
                    <Plus className="h-4 w-4" />
                </Button>
            </div>

            <div className="space-y-2">
                {items.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-slate-50 rounded-md border group">
                        <div className="flex flex-col gap-1 mr-2">
                            <button
                                type="button"
                                onClick={() => handleMoveUp(index)}
                                disabled={index === 0}
                                className="text-gray-400 hover:text-blue-600 disabled:opacity-30"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6" /></svg>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleMoveDown(index)}
                                disabled={index === items.length - 1}
                                className="text-gray-400 hover:text-blue-600 disabled:opacity-30"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                            </button>
                        </div>
                        <span className="flex-1 text-sm">{item}</span>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemove(index)}
                            className="opacity-0 group-hover:opacity-100 h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
                {items.length === 0 && (
                    <div className="text-center py-4 text-sm text-gray-500 border-2 border-dashed rounded-md">
                        No hay ítems en la checklist
                    </div>
                )}
            </div>
        </div>
    );
}
