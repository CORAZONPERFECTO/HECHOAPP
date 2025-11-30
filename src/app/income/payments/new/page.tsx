import { PaymentForm } from "@/components/income/payment-form";

export default function NewPaymentPage() {
    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-4xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Registrar Pago</h1>
                    <p className="text-gray-500">Registra un nuevo pago recibido de un cliente.</p>
                </div>
                <PaymentForm />
            </div>
        </div>
    );
}
