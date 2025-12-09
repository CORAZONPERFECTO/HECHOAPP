
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, addDoc, getDocs, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Invoice, InvoiceItem, Client } from "@/types/schema";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronRight, ChevronLeft, Save, Loader2, Check } from "lucide-react";
import { StepClient } from "./step-client";
import { StepItems } from "./step-items";
import { StepDetails } from "./step-details";
import { StepReview } from "./step-review";
import { cn } from "@/lib/utils";

const STEPS = [
    { id: "client", title: "Cliente" },
    { id: "items", title: "Ítems" },
    { id: "details", title: "Detalles" },
    { id: "review", title: "Revisar" }
];

export function InvoiceWizard() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [clients, setClients] = useState<Client[]>([]);

    // Form Data State
    const [formData, setFormData] = useState<Partial<Invoice>>({
        number: "",
        clientId: "",
        clientName: "",
        items: [],
        notes: "",
        status: "DRAFT",
    });

    // Load clients
    useEffect(() => {
        const fetchClients = async () => {
            const snap = await getDocs(collection(db, "clients"));
            setClients(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Client[]);
        };
        fetchClients();
    }, []);

    const updateData = (key: string, value: any) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    // Calculate totals dynamically
    const totals = (formData.items || []).reduce((acc, item) => ({
        subtotal: acc.subtotal + (item.quantity * item.unitPrice),
        taxTotal: acc.taxTotal + ((item.quantity * item.unitPrice) * item.taxRate),
        total: acc.total + ((item.quantity * item.unitPrice) * (1 + item.taxRate))
    }), { subtotal: 0, taxTotal: 0, total: 0 });

    const handleNext = () => {
        if (currentStep < STEPS.length - 1) setCurrentStep(c => c + 1);
    };

    const handleBack = () => {
        if (currentStep > 0) setCurrentStep(c => c - 1);
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const finalData = {
                ...formData,
                subtotal: totals.subtotal,
                taxTotal: totals.taxTotal,
                total: totals.total,
                balance: totals.total,
                createdAt: serverTimestamp(),
                issueDate: Timestamp.now(),
                dueDate: Timestamp.now(), // Default due date
            };

            await addDoc(collection(db, "invoices"), finalData);
            router.push("/income/invoices");
        } catch (error) {
            console.error("Error creating invoice:", error);
        } finally {
            setLoading(false);
        }
    };

    // Render step content
    const renderStep = () => {
        switch (currentStep) {
            case 0: return <StepClient data={formData} updateData={updateData} clients={clients} />;
            case 1: return <StepItems data={formData} updateData={updateData} clients={clients} />;
            case 2: return <StepDetails data={formData} updateData={updateData} />;
            case 3: return <StepReview data={formData} tots={totals} />;
            default: return null;
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-20">
            {/* Progress Bar */}
            <div className="relative">
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-200 -z-10" />
                <div className="flex justify-between">
                    {STEPS.map((step, idx) => {
                        const isCompleted = currentStep > idx;
                        const isCurrent = currentStep === idx;
                        return (
                            <div key={idx} className="flex flex-col items-center gap-2 bg-slate-50 px-2">
                                <div className={cn(
                                    "h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 border-2",
                                    isCompleted ? "bg-green-500 border-green-500 text-white" :
                                        isCurrent ? "bg-purple-600 border-purple-600 text-white shadow-lg shadow-purple-500/30 scale-110" :
                                            "bg-white border-gray-300 text-gray-400"
                                )}>
                                    {isCompleted ? <Check className="h-4 w-4" /> : idx + 1}
                                </div>
                                <span className={cn(
                                    "text-xs font-medium transition-colors",
                                    isCurrent ? "text-purple-700" : "text-gray-400"
                                )}>{step.title}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Step Content */}
            <div className="min-h-[400px]">
                {renderStep()}
            </div>

            {/* Footer Navigation */}
            <div className="fixed bottom-0 left-0 w-full bg-white/80 backdrop-blur-md border-t p-4 flex justify-between items-center z-50 md:pl-20">
                <div className="max-w-4xl mx-auto w-full flex justify-between">
                    <Button
                        variant="ghost"
                        onClick={handleBack}
                        disabled={currentStep === 0 || loading}
                        className="text-gray-500 hover:text-gray-900"
                    >
                        <ChevronLeft className="mr-2 h-4 w-4" /> Atrás
                    </Button>

                    <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                            <p className="text-xs text-gray-500 uppercase">Total Estimado</p>
                            <p className="font-bold text-lg text-purple-700">RD$ {totals.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                        </div>

                        {currentStep === STEPS.length - 1 ? (
                            <Button onClick={handleSave} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/20">
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                <Save className="mr-2 h-4 w-4" /> Finalizar Factura
                            </Button>
                        ) : (
                            <Button onClick={handleNext} className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/20">
                                Siguiente <ChevronRight className="ml-2 h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
