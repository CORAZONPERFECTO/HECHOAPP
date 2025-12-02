"use client";

import { ChecklistItem } from "@/types/schema";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface ChecklistRendererProps {
    items: ChecklistItem[];
    onItemChange?: (id: string, checked: boolean) => void;
    readOnly?: boolean;
}

export function ChecklistRenderer({ items, onItemChange, readOnly = false }: ChecklistRendererProps) {
    return (
        <div className="space-y-3">
            {items.map((item) => (
                <div key={item.id} className="flex items-start space-x-3 p-3 rounded-lg border bg-white hover:bg-slate-50 transition-colors">
                    <Checkbox
                        id={item.id}
                        checked={item.checked}
                        onCheckedChange={(checked) => onItemChange && onItemChange(item.id, checked as boolean)}
                        disabled={readOnly}
                        className="mt-1"
                    />
                    <div className="grid gap-1.5 leading-none">
                        <Label
                            htmlFor={item.id}
                            className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${item.checked ? 'line-through text-gray-500' : 'text-gray-900'}`}
                        >
                            {item.text}
                        </Label>
                    </div>
                </div>
            ))}
        </div>
    );
}
