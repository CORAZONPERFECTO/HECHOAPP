import { useEffect, useState } from 'react';

/**
 * Hook personalizado para debounce de un valor
 * @param value Valor a observar
 * @param delay Tiempo de espera en ms (default 500ms)
 * @returns El valor con debounce aplicado
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        // Configurar el timer
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        // Limpiar el timer si el valor cambia o el componente se desmonta
        return () => {
            clearTimeout(timer);
        };
    }, [value, delay]);

    return debouncedValue;
}
