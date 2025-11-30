import { ReceiptForm } from "@/components/income/receipt-form";

export default function NewReceiptPage() {
    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-4xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Nuevo Recibo</h1>
                    <p className="text-gray-500">Genera un comprobante de pago.</p>
                </div>
                <ReceiptForm />
            </div>
        </div>
    );
}
