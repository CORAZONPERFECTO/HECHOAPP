"use client";

import { useState } from "react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Ticket, TicketStatus } from "@/types/schema";
import { Button } from "@/components/ui/button";
import { Truck, MapPin, Wrench, CheckCircle, Loader2 } from "lucide-react";

interface StatusActionButtonsProps {
    ticket: Ticket;
    onStatusChange?: (newStatus: TicketStatus) => void;
}

type StatusAction = {
    status: TicketStatus;
    label: string;
    icon: React.ReactNode;
    color: string;
    nextStatus?: TicketStatus;
};

const STATUS_FLOW: StatusAction[] = [
    {
        status: "OPEN",
        label: "🚚 En Camino",
        icon: <Truck className="h-6 w-6" />,
        color: "bg-blue-600 hover:bg-blue-700",
        nextStatus: "IN_PROGRESS",
    },
    {
        status: "IN_PROGRESS",
        label: "📍 Llegué",
        icon: <MapPin className="h-6 w-6" />,
        color: "bg-purple-600 hover:bg-purple-700",
        nextStatus: "IN_PROGRESS", // Same status, just marks arrival
    },
    {
        status: "IN_PROGRESS",
        label: "🔧 Trabajando",
        icon: <Wrench className="h-6 w-6" />,
        color: "bg-orange-600 hover:bg-orange-700",
        nextStatus: "IN_PROGRESS",
    },
    {
        status: "IN_PROGRESS",
        label: "✅ Terminado",
        icon: <CheckCircle className="h-6 w-6" />,
        color: "bg-green-600 hover:bg-green-700",
        nextStatus: "COMPLETED",
    },
];

export function StatusActionButtons({ ticket, onStatusChange }: StatusActionButtonsProps) {
    const [loading, setLoading] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);

    const getCurrentActions = () => {
        if (ticket.status === "OPEN") {
            return [STATUS_FLOW[0]]; // En Camino
        } else if (ticket.status === "IN_PROGRESS") {
            // Show Llegué, Trabajando, Terminado based on progress
            if (currentStep === 0) {
                return [STATUS_FLOW[1]]; // Llegué
            } else if (currentStep === 1) {
                return [STATUS_FLOW[2]]; // Trabajando
            } else {
                return [STATUS_FLOW[3]]; // Terminado
            }
        }
        return [];
    };

    const handleStatusAction = async (action: StatusAction) => {
        setLoading(true);
        try {
            const updates: any = {
                status: action.nextStatus,
                updatedAt: serverTimestamp(),
            };

            // Track timestamps
            if (action.label.includes("En Camino")) {
                updates.enRouteAt = serverTimestamp();
            } else if (action.label.includes("Llegué")) {
                updates.arrivedAt = serverTimestamp();
                updates.firstResponseAt = serverTimestamp(); // For SLA tracking
            } else if (action.label.includes("Trabajando")) {
                updates.workStartedAt = serverTimestamp();
            } else if (action.label.includes("Terminado")) {
                updates.resolvedAt = serverTimestamp();
            }

            await updateDoc(doc(db, "tickets", ticket.id), updates);

            // Advance step for IN_PROGRESS flow
            if (ticket.status === "IN_PROGRESS" && currentStep < 2) {
                setCurrentStep(currentStep + 1);
            }

            if (onStatusChange) {
                onStatusChange(action.nextStatus!);
            }
        } catch (error) {
            console.error("Error updating status:", error);
            alert("Error al actualizar estado");
        } finally {
            setLoading(false);
        }
    };

    const actions = getCurrentActions();

    if (ticket.status === "COMPLETED" || ticket.status === "CANCELLED") {
        return (
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 text-center">
                <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-3" />
                <p className="text-xl font-bold text-green-900">Ticket Completado</p>
                <p className="text-sm text-green-700 mt-2">Este trabajo ya fue finalizado</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Actualizar Estado</h3>
            {actions.map((action, index) => (
                <Button
                    key={index}
                    onClick={() => handleStatusAction(action)}
                    disabled={loading}
                    className={`w-full h-20 text-2xl font-bold ${action.color} text-white shadow-lg`}
                    size="lg"
                >
                    {loading ? (
                        <>
                            <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                            Actualizando...
                        </>
                    ) : (
                        <>
                            {action.icon}
                            <span className="ml-3">{action.label}</span>
                        </>
                    )}
                </Button>
            ))}
        </div>
    );
}
