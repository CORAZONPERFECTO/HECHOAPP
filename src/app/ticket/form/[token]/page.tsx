"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { TicketToken } from "@/types/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle2, Lock } from "lucide-react";

export default function PublicTicketForm() {
    const params = useParams();
    const router = useRouter();
    const tokenString = params.token as string;

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [tokenData, setTokenData] = useState<TicketToken | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        clientName: "",
        contactPhone: "",
        description: "",
        address: ""
    });

    useEffect(() => {
        const validateToken = async () => {
            if (!tokenString) return;

            try {
                // Optimized read: Direct getDoc using token as ID
                const tokenDoc = await getDoc(doc(db, "ticketTokens", tokenString));

                if (!tokenDoc.exists()) {
                    setError("Este enlace no es válido.");
                    setLoading(false);
                    return;
                }

                const data = { id: tokenDoc.id, ...tokenDoc.data() } as TicketToken;

                if (data.status === 'INVALID') {
                    setError("Este enlace ya no está disponible. Si necesita soporte, solicite un nuevo enlace de servicio.");
                } else if (data.status === 'USED') {
                    // Check if ticket is closed
                    if (data.ticketId) {
                        const ticketDoc = await getDoc(doc(db, "tickets", data.ticketId));
                        if (ticketDoc.exists()) {
                            const ticket = ticketDoc.data();
                            if (ticket.status === 'COMPLETED' || ticket.status === 'CANCELLED') {
                                setError("Este enlace ya no está disponible porque el ticket fue cerrado.");
                            } else {
                                setError("Este enlace ya fue utilizado para crear un ticket que está en proceso.");
                            }
                        } else {
                            setError("Enlace ya utilizado.");
                        }
                    } else {
                        setError("Enlace ya utilizado.");
                    }
                } else {
                    // Valid ACTIVE token
                    setTokenData(data);
                }

            } catch (err) {
                console.error("Error validating token:", err);
                setError("Error al validar el enlace.");
            } finally {
                setLoading(false);
            }
        };

        validateToken();
    }, [tokenString]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tokenData) return;

        setSubmitting(true);
        try {
            // 1. Create Ticket
            const ticketData = {
                clientName: formData.clientName,
                description: formData.description,
                locationName: formData.address || "Dirección no especificada",
                contactPhone: formData.contactPhone, // Add to schema if needed, or put in description
                status: "OPEN", // Or PENDIENTE_DE_ASIGNACION if that status existed, using OPEN for now
                priority: "MEDIUM",
                serviceType: "MANTENIMIENTO", // Default or add selector
                creadoPorId: "CLIENTE_EXTERNO",
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                checklist: [],
                photos: []
            };

            const ticketRef = await addDoc(collection(db, "tickets"), ticketData);

            // 2. Update Token
            await updateDoc(doc(db, "ticketTokens", tokenString), {
                status: 'USED',
                ticketId: ticketRef.id,
                usedAt: serverTimestamp()
            });

            setSuccess(true);

        } catch (err) {
            console.error("Error creating ticket:", err);
            alert("Error al crear el ticket. Por favor intente nuevamente.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="mx-auto bg-red-100 p-3 rounded-full w-fit mb-4">
                            <Lock className="h-6 w-6 text-red-600" />
                        </div>
                        <CardTitle className="text-red-600">Enlace No Disponible</CardTitle>
                        <CardDescription className="text-base mt-2">
                            {error}
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="mx-auto bg-green-100 p-3 rounded-full w-fit mb-4">
                            <CheckCircle2 className="h-6 w-6 text-green-600" />
                        </div>
                        <CardTitle className="text-green-600">¡Ticket Creado!</CardTitle>
                        <CardDescription>
                            Su solicitud ha sido registrada correctamente. Nos pondremos en contacto pronto.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Solicitud de Servicio</h1>
                    <p className="mt-2 text-gray-600">Complete el formulario para crear un nuevo ticket.</p>
                </div>

                <Card>
                    <form onSubmit={handleSubmit}>
                        <CardContent className="space-y-4 pt-6">
                            <div className="space-y-2">
                                <Label htmlFor="clientName">Nombre / Empresa</Label>
                                <Input
                                    id="clientName"
                                    required
                                    value={formData.clientName}
                                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                                    placeholder="Su nombre o nombre de la empresa"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone">Teléfono de Contacto</Label>
                                <Input
                                    id="phone"
                                    required
                                    value={formData.contactPhone}
                                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                                    placeholder="(809) 000-0000"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="address">Dirección / Ubicación</Label>
                                <Input
                                    id="address"
                                    required
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    placeholder="Calle, Número, Sector..."
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Descripción del Problema</Label>
                                <Textarea
                                    id="description"
                                    required
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Describa brevemente qué servicio necesita..."
                                    rows={4}
                                />
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" className="w-full" disabled={submitting}>
                                {submitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Enviando...
                                    </>
                                ) : (
                                    "Crear Ticket"
                                )}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            </div>
        </div>
    );
}
