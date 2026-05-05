"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { serverTimestamp, doc, setDoc } from "firebase/firestore";
import { db, firebaseConfig } from "@/lib/firebase";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { User, UserRole } from "@/types/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Trash2, KeyRound, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { deleteDoc } from "firebase/firestore";
import { Badge } from "@/components/ui/badge";

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
    const [newPassword, setNewPassword] = useState("");
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [passwordSaving, setPasswordSaving] = useState(false);
    const [passwordSuccess, setPasswordSuccess] = useState(false);

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

    const handleDirectPasswordChange = async () => {
        if (!initialData?.id) return;
        if (!newPassword || newPassword.length < 6) {
            alert("La nueva contraseña debe tener al menos 6 caracteres.");
            return;
        }
        if (!confirm(`¿Cambiar la contraseña de ${formData.nombre || formData.email}? Esta acción es inmediata.`)) return;

        setPasswordSaving(true);
        setPasswordSuccess(false);
        try {
            const res = await fetch("/api/admin/set-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ uid: initialData.id, newPassword }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Error desconocido");
            }

            setPasswordSuccess(true);
            setNewPassword("");
            setTimeout(() => setPasswordSuccess(false), 4000);
        } catch (error: any) {
            console.error("Error changing password:", error);
            alert("Error al cambiar la contraseña: " + error.message);
        } finally {
            setPasswordSaving(false);
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
                        <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                            <KeyRound className="h-4 w-4 text-blue-600" />
                            Cambiar Contraseña de Acceso
                        </h3>
                        {passwordSuccess && (
                            <Badge className="bg-green-100 text-green-700 border-green-300 flex items-center gap-1">
                                <ShieldCheck className="h-3 w-3" />
                                ¡Contraseña actualizada!
                            </Badge>
                        )}
                    </div>

                    {/* Direct Password Change */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                        <p className="text-xs text-blue-700">
                            Escribe la nueva clave y pulsa <strong>Aplicar</strong>. El cambio es inmediato — no requiere email.
                        </p>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Input
                                    type={showNewPassword ? "text" : "password"}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Nueva contraseña (mín. 6 caracteres)"
                                    minLength={6}
                                    className="pr-10 bg-white"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            <Button
                                type="button"
                                onClick={handleDirectPasswordChange}
                                disabled={passwordSaving || !newPassword || newPassword.length < 6}
                                className="bg-blue-600 hover:bg-blue-700 text-white shrink-0"
                            >
                                {passwordSaving ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <ShieldCheck className="h-4 w-4 mr-1" />
                                )}
                                Aplicar
                            </Button>
                        </div>
                    </div>

                    {/* Delete Button */}
                    <div className="flex justify-end">
                        <Button type="button" variant="destructive" onClick={handleDelete} size="sm">
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
