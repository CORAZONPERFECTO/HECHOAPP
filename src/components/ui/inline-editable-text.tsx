
import React, { useState, useEffect, useRef } from 'react';
import { cn } from "@/lib/utils";

interface InlineEditableTextProps {
    value: string;
    onSave: (newValue: string) => void;
    className?: string;
    as?: 'input' | 'textarea';
    disabled?: boolean;
    placeholder?: string;
}

export function InlineEditableText({
    value,
    onSave,
    className,
    as = 'textarea',
    disabled = false,
    placeholder = 'Click to edit...'
}: InlineEditableTextProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [currentValue, setCurrentValue] = useState(value);
    const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

    useEffect(() => {
        setCurrentValue(value);
    }, [value]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isEditing]);

    const handleBlur = () => {
        setIsEditing(false);
        if (currentValue !== value) {
            onSave(currentValue);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey && as === 'input') {
            handleBlur();
        }
        if (e.key === 'Escape') {
            setIsEditing(false);
            setCurrentValue(value);
        }
    };

    if (disabled) {
        return <span className={cn("whitespace-pre-wrap", className)}>{value}</span>;
    }

    if (isEditing) {
        if (as === 'input') {
            return (
                <input
                    ref={inputRef as React.RefObject<HTMLInputElement>}
                    value={currentValue}
                    onChange={(e) => setCurrentValue(e.target.value)}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    className={cn("w-full bg-transparent border-b border-blue-500 focus:outline-none px-1", className)}
                />
            );
        }
        return (
            <textarea
                ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                value={currentValue}
                onChange={(e) => setCurrentValue(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                className={cn("w-full bg-transparent border-b border-blue-500 focus:outline-none px-1 resize-none overflow-hidden", className)}
                // Simple auto-resize logic could be added here if needed
                style={{ minHeight: '1.5em' }}
                rows={Math.max(1, currentValue.split('\n').length)}
            />
        );
    }

    return (
        <div
            onClick={() => setIsEditing(true)}
            className={cn(
                "cursor-text hover:bg-black/5 dark:hover:bg-white/10 rounded px-1 -mx-1 transition-colors whitespace-pre-wrap border border-transparent hover:border-dashed hover:border-gray-400",
                !value && "text-gray-400 italic",
                className
            )}
            role="button"
            tabIndex={0}
        >
            {value || placeholder}
        </div>
    );
}
