import { useEffect, useCallback } from 'react';

export interface KeyboardShortcut {
    key: string;
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    handler: () => void;
    description?: string;
}

/**
 * Hook para manejar atajos de teclado
 * 
 * @example
 * useKeyboardShortcuts([
 *   { key: 's', ctrl: true, handler: handleSave, description: 'Guardar' },
 *   { key: 'z', ctrl: true, handler: undo, description: 'Deshacer' },
 *   { key: 'y', ctrl: true, handler: redo, description: 'Rehacer' },
 * ]);
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[], enabled = true) {
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (!enabled) return;

        for (const shortcut of shortcuts) {
            const ctrlMatch = shortcut.ctrl
                ? (e.ctrlKey || e.metaKey)
                : (!e.ctrlKey && !e.metaKey);

            const shiftMatch = shortcut.shift
                ? e.shiftKey
                : !e.shiftKey;

            const altMatch = shortcut.alt
                ? e.altKey
                : !e.altKey;

            const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();

            if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
                e.preventDefault();
                e.stopPropagation();
                shortcut.handler();
                break; // Solo ejecutar el primer match
            }
        }
    }, [shortcuts, enabled]);

    useEffect(() => {
        if (!enabled) return;

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown, enabled]);
}

/**
 * Hook para manejar un solo atajo de teclado
 */
export function useKeyboardShortcut(
    key: string,
    handler: () => void,
    options: { ctrl?: boolean; shift?: boolean; alt?: boolean; enabled?: boolean } = {}
) {
    const { ctrl = false, shift = false, alt = false, enabled = true } = options;

    useKeyboardShortcuts([
        { key, ctrl, shift, alt, handler }
    ], enabled);
}
