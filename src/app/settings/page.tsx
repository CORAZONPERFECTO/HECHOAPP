
"use client";

import { CompanyProfile } from "@/components/resources/company-profile";
import { AppLayout } from "@/components/layout/app-layout";
import { DocumentFormatSettings } from "@/components/settings/document-format-settings";

export default function SettingsPage() {
    return (
        <AppLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
                    <p className="text-muted-foreground">
                        Administra los datos de tu empresa y preferencias generales.
                    </p>
                </div>
                <CompanyProfile />
                <DocumentFormatSettings />
            </div>
        </AppLayout>
    );
}
