import { ClientForm } from "@/components/clients/client-form";

export default function NewClientPage() {
    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-3xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Gestión de Clientes</h1>
                    <p className="text-gray-500">Complete la información para registrar un nuevo cliente.</p>
                </div>
                <ClientForm />
            </div>
        </div>
    );
}
