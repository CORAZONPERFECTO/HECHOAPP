import { QuoteForm } from "@/components/income/quote-form";

export default function NewQuotePage() {
    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-4xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Nueva Cotización</h1>
                    <p className="text-gray-500">Crea un nuevo presupuesto para un cliente.</p>
                </div>
                <QuoteForm />
            </div>
        </div>
    );
}
