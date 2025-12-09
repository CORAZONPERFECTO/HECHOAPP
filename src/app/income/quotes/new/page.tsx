import { InvoiceWizard } from "@/components/income/invoice-wizard/invoice-wizard";
import { AppLayout } from "@/components/layout/app-layout";

export default function NewQuotePage() {
    return (
        <AppLayout>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Nueva Cotización</h1>
                <p className="text-gray-500">Genera una propuesta formal para el cliente.</p>
            </div>
            <InvoiceWizard mode="quote" />
        </AppLayout>
    );
}
