"use client";

import { ServiceImporter } from "@/components/settings/service-importer";

export default function ImportServicesPage() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-gray-900">Importar Servicios</h2>
                <p className="text-gray-500">
                    Carga masiva de tipos de servicios mediante archivos Excel.
                </p>
            </div>

            <ServiceImporter />
        </div>
    );
}
