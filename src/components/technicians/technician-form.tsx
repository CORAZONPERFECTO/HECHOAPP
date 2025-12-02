"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { collection, addDoc, serverTimestamp, doc, setDoc } from "firebase/firestore";
import { db, firebaseConfig } from "@/lib/firebase";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { User, UserRole } from "@/types/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Trash2, KeyRound } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { deleteDoc } from "firebase/firestore";
import { auth } from "@/lib/firebase";

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
        rol: initialData?.rol || "TECNICO",
        activo: initialData?.activo ?? true,
    });
    const [password, setPassword] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            let uid = initialData?.id;

            if (!isEditing) {
                // Create Auth User using a secondary app instance to avoid logging out the admin
                const secondaryAppName = "secondaryApp";
                let secondaryApp;
                try {
                    secondaryApp = getApp(secondaryAppName);
                } catch (e) {
                    secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
                }

                const secondaryAuth = getAuth(secondaryApp);
                const userCredential = await createUserWithEmailAndPassword(secondaryAuth, formData.email!, password);
                uid = userCredential.user.uid;

                // We don't need to sign out the secondary auth, it doesn't affect the main one
            }

            const userData = {
                ...formData,
                updatedAt: serverTimestamp(),
            };

            if (uid) {
                // Use setDoc with the UID (whether new or existing)
                await setDoc(doc(db, "users", uid), {
                    ...userData,
                    ...(!isEditing && { createdAt: serverTimestamp() }) // Only add createdAt for new users
                }, { merge: true });
            }

            router.push("/technicians");
            router.refresh();
        } catch (error: any) {
            console.error("Error saving technician:", error);
            if (error.code === 'auth/email-already-in-use') {
                alert("El correo electrónico ya está en uso.");
            } else if (error.code === 'auth/weak-password') {
                alert("La contraseña es muy débil. Debe tener al menos 6 caracteres.");
            } else {
                alert("Error al guardar el técnico: " + error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!initialData?.id || !confirm("¿Estás seguro de que deseas eliminar este técnico? Esta acción no se puede deshacer.")) return;

        setLoading(true);
        try {
            await deleteDoc(doc(db, "users", initialData.id));
            alert("Técnico eliminado correctamente.");
            router.push("/technicians");
            router.refresh();
        } catch (error) {
            console.error("Error deleting technician:", error);
            alert("Error al eliminar el técnico.");
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordReset = async () => {
        if (!formData.email) return;
        if (!confirm(`¿Enviar correo de restablecimiento de contraseña a ${formData.email}?`)) return;

        try {
            await sendPasswordResetEmail(auth, formData.email);
            alert("Correo enviado correctamente.");
        } catch (error: any) {
            console.error("Error sending reset email:", error);
            alert("Error al enviar el correo: " + error.message);
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

                {!isEditing && (
                    <div className="space-y-2">
                        <Label>Contraseña</Label>
                        <Input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="******"
                            required
                            minLength={6}
                        />
                        <p className="text-xs text-gray-500">Mínimo 6 caracteres.</p>
                    </div>
                )}

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
                    <Label>Rol</Label>
                    <Select
                        value={formData.rol}
                        onValueChange={(val) => setFormData(prev => ({ ...prev, rol: val as UserRole }))}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ADMIN">Administrador</SelectItem>
                            <SelectItem value="TECNICO">Técnico</SelectItem>
                            <SelectItem value="CLIENTE">Cliente</SelectItem>
                        </SelectContent>
                    </Select>
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

            {isEditing && (
                <div className="pt-4 border-t flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-sm font-medium text-gray-900">Acciones de Cuenta</h3>
                    </div>
                    <div className="flex gap-4">
                        <Button type="button" variant="outline" onClick={handlePasswordReset} className="text-blue-600 border-blue-200 hover:bg-blue-50">
                            <KeyRound className="mr-2 h-4 w-4" />
                            Resetear Contraseña
                        </Button>
                        <Button type="button" variant="destructive" onClick={handleDelete}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar Técnico
                        </Button>
                    </div>
                </div>
            )}

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
