import { InvoiceForm } from "@/components/income/invoice-form";

export default function NewInvoicePage() {
    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-4xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Nueva Factura</h1>
                    <p className="text-gray-500">Crea una nueva factura de venta para un cliente.</p>
                </div>
                <InvoiceForm />
            </div>
        </div>
    );
}
