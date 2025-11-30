import { RecurringInvoiceForm } from "@/components/income/recurring-invoice-form";

export default function NewRecurringInvoicePage() {
    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-4xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Nueva Factura Recurrente</h1>
                    <p className="text-gray-500">Configura una factura que se generará automáticamente.</p>
                </div>
                <RecurringInvoiceForm />
            </div>
        </div>
    );
}
