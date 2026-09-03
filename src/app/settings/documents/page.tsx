"use client";

import { DocumentFormatSettings } from "@/components/settings/document-format-settings";
import { ReportPolicySettingsComponent } from "@/components/settings/report-policy-settings";

export default function DocumentSettingsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Formatos de Documentos e Informes</h2>
                <p className="text-muted-foreground text-sm">
                    Personaliza la apariencia de tus facturas, cotizaciones y las políticas de garantía de tus informes técnicos.
                </p>
            </div>
            <DocumentFormatSettings />
            <ReportPolicySettingsComponent />
        </div>
    );
}
