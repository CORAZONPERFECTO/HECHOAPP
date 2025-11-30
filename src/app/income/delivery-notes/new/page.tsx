import { DeliveryNoteForm } from "@/components/income/delivery-note-form";

export default function NewDeliveryNotePage() {
    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-4xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Nuevo Conduce</h1>
                    <p className="text-gray-500">Crea una nota de entrega para despacho de mercancía.</p>
                </div>
                <DeliveryNoteForm />
            </div>
        </div>
    );
}
