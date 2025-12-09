import { InvoiceWizard } from "@/components/income/invoice-wizard/invoice-wizard";
import { AppLayout } from "@/components/layout/app-layout"; // Optional wrapper if not globally applied yet

export default function NewInvoicePage() {
    return (
        <AppLayout>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Nueva Factura</h1>
                <p className="text-gray-500">Completa los pasos para generar el documento.</p>
            </div>
            <InvoiceWizard />
        </AppLayout>
    );
}
