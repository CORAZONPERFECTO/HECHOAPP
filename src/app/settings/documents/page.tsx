"use client";

import { DocumentFormatSettings } from "@/components/settings/document-format-settings";

export default function DocumentSettingsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Formatos de Documentos</h2>
                <p className="text-muted-foreground">
                    Personaliza la apariencia de tus facturas y cotizaciones.
                </p>
            </div>
            <DocumentFormatSettings />
        </div>
    );
}
