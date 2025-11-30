"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { doc, setDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Client, ClientType } from "@/types/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface ClientFormProps {
    initialData?: Client;
    isEditing?: boolean;
}

export function ClientForm({ initialData, isEditing = false }: ClientFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [formData, setFormData] = useState<Partial<Client>>(
        initialData || {
            nombreComercial: "",
            tipoCliente: "RESIDENCIAL",
            rnc: "",
            personaContacto: "",
            telefonoContacto: "",
            emailContacto: "",
            notas: "",
        }
    );

    const handleChange = (field: keyof Client, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const clientData = {
                ...formData,
                updatedAt: serverTimestamp(),
            };

            if (isEditing && initialData?.id) {
                // Update existing
                await setDoc(doc(db, "clients", initialData.id), clientData, { merge: true });
            } else {
                // Create new
                await addDoc(collection(db, "clients"), {
                    ...clientData,
                    createdAt: serverTimestamp(),
                });
            }

            router.push("/clients");
            router.refresh();
        } catch (err: any) {
            console.error("Error saving client:", err);
            setError("Error al guardar el cliente. Por favor intente de nuevo.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
            <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-800">
                    {isEditing ? "Editar Cliente" : "Nuevo Cliente"}
                </h2>

                {error && (
                    <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="nombreComercial">Nombre Comercial / Razón Social</Label>
                        <Input
                            id="nombreComercial"
                            required
                            value={formData.nombreComercial}
                            onChange={(e) => handleChange("nombreComercial", e.target.value)}
                            placeholder="Ej. Hotel Paradise"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="tipoCliente">Tipo de Cliente</Label>
                        <Select
                            value={formData.tipoCliente}
                            onValueChange={(value) => handleChange("tipoCliente", value as ClientType)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar tipo" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="RESIDENCIAL">Residencial</SelectItem>
                                <SelectItem value="EMPRESA">Empresa</SelectItem>
                                <SelectItem value="HOTEL">Hotel</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="rnc">RNC / Cédula</Label>
                        <Input
                            id="rnc"
                            value={formData.rnc}
                            onChange={(e) => handleChange("rnc", e.target.value)}
                            placeholder="000-0000000-0"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="personaContacto">Persona de Contacto</Label>
                        <Input
                            id="personaContacto"
                            required
                            value={formData.personaContacto}
                            onChange={(e) => handleChange("personaContacto", e.target.value)}
                            placeholder="Nombre del contacto"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="telefonoContacto">Teléfono</Label>
                        <Input
                            id="telefonoContacto"
                            required
                            value={formData.telefonoContacto}
                            onChange={(e) => handleChange("telefonoContacto", e.target.value)}
                            placeholder="809-555-5555"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="emailContacto">Email</Label>
                        <Input
                            id="emailContacto"
                            type="email"
                            value={formData.emailContacto}
                            onChange={(e) => handleChange("emailContacto", e.target.value)}
                            placeholder="contacto@ejemplo.com"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="notas">Notas Adicionales</Label>
                    <Input
                        id="notas"
                        value={formData.notas}
                        onChange={(e) => handleChange("notas", e.target.value)}
                        placeholder="Información relevante..."
                    />
                </div>
            </div>

            <div className="flex justify-end gap-4 pt-4">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    disabled={loading}
                >
                    Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isEditing ? "Guardar Cambios" : "Crear Cliente"}
                </Button>
            </div>
        </form>
    );
}
