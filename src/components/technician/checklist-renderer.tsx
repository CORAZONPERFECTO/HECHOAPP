"use client";

import { ChecklistItem } from "@/types/schema";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface ChecklistRendererProps {
    items: ChecklistItem[];
    onUpdate: (items: ChecklistItem[]) => void;
    readOnly?: boolean;
}

export function ChecklistRenderer({ items, onUpdate, readOnly = false }: ChecklistRendererProps) {
    const handleCheck = (id: string, checked: boolean) => {
        if (readOnly) return;
        const newItems = items.map(item =>
            item.id === id ? { ...item, checked } : item
        );
        onUpdate(newItems);
    };

    if (!items || items.length === 0) {
        return <div className="text-gray-500 text-sm italic">No hay items en la lista.</div>;
    }

    return (
        <div className="space-y-3">
            {items.map((item) => (
                <div key={item.id} className="flex items-start space-x-3 p-2 rounded hover:bg-slate-50">
                    <Checkbox
                        id={item.id}
                        checked={item.checked}
                        onCheckedChange={(checked) => handleCheck(item.id, checked as boolean)}
                        disabled={readOnly}
                        className="mt-1"
                    />
                    <div className="grid gap-1.5 leading-none">
                        <Label
                            htmlFor={item.id}
                            className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${item.checked ? 'line-through text-gray-500' : ''}`}
                        >
                            {item.text}
                        </Label>
                    </div>
                </div>
            ))}
        </div>
    );
}
