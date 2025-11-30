"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { collection, addDoc, serverTimestamp, doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { User } from "@/types/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TechnicianFormProps {
    initialData?: User;
    isEditing?: boolean;
}

export function TechnicianForm({ initialData, isEditing = false }: TechnicianFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // Note: In a real app, creating a user usually involves Firebase Auth (createUserWithEmailAndPassword).
    // Since this is a client-side form, we might not be able to create the Auth user directly without logging them in.
    // For this prototype, we will create the Firestore document. The actual Auth user creation 
    // might need to be done via a Cloud Function or by the user themselves signing up.
    // For now, we'll assume we are just managing the profile data in Firestore.

    const [formData, setFormData] = useState<Partial<User>>({
        nombre: initialData?.nombre || "",
        email: initialData?.email || "",
        telefono: initialData?.telefono || "",
        rol: "TECNICO",
        activo: initialData?.activo ?? true,
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const userData = {
                ...formData,
                updatedAt: serverTimestamp(),
            };

            if (isEditing && initialData?.id) {
                await setDoc(doc(db, "users", initialData.id), userData, { merge: true });
            } else {
                // Creating a new technician profile
                // Ideally this should be linked to an Auth UID. 
                // For now, we'll let Firestore generate an ID or use the email as ID if we want uniqueness.
                // Let's use addDoc for auto-ID.
                await addDoc(collection(db, "users"), {
                    ...userData,
                    createdAt: serverTimestamp(),
                });
            }
            router.push("/technicians");
            router.refresh();
        } catch (error) {
            console.error("Error saving technician:", error);
            alert("Error al guardar el técnico. Revisa la consola.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8 bg-white p-8 rounded-lg shadow max-w-2xl mx-auto">
            <div className="space-y-6">
                <div className="space-y-2">
                    <Label>Nombre Completo</Label>
                    <Input
                        value={formData.nombre}
                        onChange={e => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                        placeholder="Ej. Juan Pérez"
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                        type="email"
                        value={formData.email}
                        onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="juan@ejemplo.com"
                        required
                        disabled={isEditing} // Prevent changing email for consistency with Auth
                    />
                </div>

                <div className="space-y-2">
                    <Label>Teléfono</Label>
                    <Input
                        type="tel"
                        value={formData.telefono}
                        onChange={e => setFormData(prev => ({ ...prev, telefono: e.target.value }))}
                        placeholder="(809) 000-0000"
                    />
                </div>

                <div className="space-y-2">
                    <Label>Estado</Label>
                    <Select
                        value={formData.activo ? "active" : "inactive"}
                        onValueChange={(val) => setFormData(prev => ({ ...prev, activo: val === "active" }))}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="active">Activo</SelectItem>
                            <SelectItem value="inactive">Inactivo</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
                    Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" />
                    {isEditing ? "Guardar Cambios" : "Crear Técnico"}
                </Button>
            </div>
        </form>
    );
}
