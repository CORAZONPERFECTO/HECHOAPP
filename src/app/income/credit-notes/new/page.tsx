import { CreditNoteForm } from "@/components/income/credit-note-form";

export default function NewCreditNotePage() {
    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-4xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Nueva Nota de Crédito</h1>
                    <p className="text-gray-500">Registra una devolución o corrección de factura.</p>
                </div>
                <CreditNoteForm />
            </div>
        </div>
    );
}
