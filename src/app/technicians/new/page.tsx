import { TechnicianForm } from "@/components/technicians/technician-form";

export default function NewTechnicianPage() {
    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-4xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Nuevo Técnico</h1>
                    <p className="text-gray-500">Registra un nuevo miembro del equipo técnico.</p>
                </div>
                <TechnicianForm />
            </div>
        </div>
    );
}
