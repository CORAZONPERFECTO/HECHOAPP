import { useState, useCallback, useRef } from 'react';

interface UseUndoRedoOptions<T> {
    initialState: T;
    maxHistory?: number;
}

interface UseUndoRedoReturn<T> {
    state: T;
    setState: (newState: T | ((prev: T) => T)) => void;
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    clearHistory: () => void;
}

/**
 * Hook para manejar undo/redo con historial de estados
 * 
 * @example
 * const { state, setState, undo, redo, canUndo, canRedo } = useUndoRedo({
 *   initialState: myInitialValue,
 *   maxHistory: 50
 * });
 */
export function useUndoRedo<T>({
    initialState,
    maxHistory = 50
}: UseUndoRedoOptions<T>): UseUndoRedoReturn<T> {
    const [state, setStateInternal] = useState<T>(initialState);
    const [undoStack, setUndoStack] = useState<T[]>([]);
    const [redoStack, setRedoStack] = useState<T[]>([]);

    // Ref para evitar agregar al historial durante undo/redo
    const isUndoingRef = useRef(false);

    const setState = useCallback((newState: T | ((prev: T) => T)) => {
        setStateInternal(prevState => {
            const nextState = typeof newState === 'function'
                ? (newState as (prev: T) => T)(prevState)
                : newState;

            // Solo agregar al historial si no estamos en medio de undo/redo
            if (!isUndoingRef.current) {
                setUndoStack(prev => {
                    const newStack = [...prev, prevState];
                    // Limitar el tamaño del historial
                    return newStack.slice(-maxHistory);
                });
                // Limpiar redo stack cuando hacemos un cambio nuevo
                setRedoStack([]);
            }

            return nextState;
        });
    }, [maxHistory]);

    const undo = useCallback(() => {
        if (undoStack.length === 0) return;

        isUndoingRef.current = true;

        const previousState = undoStack[undoStack.length - 1];
        setUndoStack(prev => prev.slice(0, -1));

        setStateInternal(currentState => {
            setRedoStack(prev => [currentState, ...prev].slice(0, maxHistory));
            return previousState;
        });

        // Reset flag después de un tick
        setTimeout(() => {
            isUndoingRef.current = false;
        }, 0);
    }, [undoStack, maxHistory]);

    const redo = useCallback(() => {
        if (redoStack.length === 0) return;

        isUndoingRef.current = true;

        const nextState = redoStack[0];
        setRedoStack(prev => prev.slice(1));

        setStateInternal(currentState => {
            setUndoStack(prev => [...prev, currentState].slice(-maxHistory));
            return nextState;
        });

        // Reset flag después de un tick
        setTimeout(() => {
            isUndoingRef.current = false;
        }, 0);
    }, [redoStack, maxHistory]);

    const clearHistory = useCallback(() => {
        setUndoStack([]);
        setRedoStack([]);
    }, []);

    return {
        state,
        setState,
        undo,
        redo,
        canUndo: undoStack.length > 0,
        canRedo: redoStack.length > 0,
        clearHistory,
    };
}
