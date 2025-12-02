import { CompanyProfile } from "@/components/resources/company-profile";

export default function CompanySettingsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-medium text-gray-900">Perfil de la Empresa</h2>
                <p className="text-sm text-gray-500">
                    Configura la información de tu empresa y el logo para los reportes.
                </p>
            </div>
            <CompanyProfile />
        </div>
    );
}
