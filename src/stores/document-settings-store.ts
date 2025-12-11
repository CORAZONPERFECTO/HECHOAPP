import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type DocumentType = 'invoice' | 'quote' | 'order' | 'delivery' | 'receipt' | 'proforma';
export type DocumentFormat = 'classic' | 'modern' | 'simple';

interface DocumentSettingsState {
    formats: Record<DocumentType, DocumentFormat>;
    setFormat: (type: DocumentType, format: DocumentFormat) => void;
    getFormat: (type: DocumentType) => DocumentFormat;
}

export const useDocumentSettings = create<DocumentSettingsState>()(
    persist(
        (set, get) => ({
            formats: {
                invoice: 'classic',
                quote: 'modern',
                order: 'classic',
                delivery: 'simple',
                receipt: 'simple',
                proforma: 'classic',
            },
            setFormat: (type, format) =>
                set((state) => ({
                    formats: { ...state.formats, [type]: format },
                })),
            getFormat: (type) => get().formats[type],
        }),
        {
            name: 'document-settings-storage',
        }
    )
);
