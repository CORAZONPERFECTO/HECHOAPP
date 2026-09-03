"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { serverTimestamp, doc, setDoc, deleteDoc, collection, getDocs } from "firebase/firestore";
import { db, firebaseConfig, auth } from "@/lib/firebase";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { User, UserRole } from "@/types/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Trash2, KeyRound, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
        allowVideoUpload: initialData?.allowVideoUpload ?? false,
        assignedLocations: initialData?.assignedLocations || [],
        allowedDeviceIds: initialData?.allowedDeviceIds || [],
    });
    const [password, setPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [passwordSaving, setPasswordSaving] = useState(false);
    const [passwordSuccess, setPasswordSuccess] = useState(false);

    const [deviceResetting, setDeviceResetting] = useState(false);
    
    const handleResetDevices = async () => {
        if (!initialData?.id || !confirm("¿Estás seguro de que deseas desvincular todos los dispositivos de este usuario? El técnico tendrá que volver a iniciar sesión desde su teléfono para registrarlo nuevamente.")) return;
        
        setDeviceResetting(true);
        try {
            const userRef = doc(db, "users", initialData.id);
            await setDoc(userRef, { allowedDeviceIds: [] }, { merge: true });
            setFormData(prev => ({ ...prev, allowedDeviceIds: [] }));
            alert("Dispositivos restablecidos con éxito.");
        } catch (e: any) {
            console.error("Error resetting devices:", e);
            alert("Error al restablecer dispositivos: " + e.message);
        } finally {
            setDeviceResetting(false);
        }
    };

    const [allLocations, setAllLocations] = useState<any[]>([]);
    const [allClients, setAllClients] = useState<any[]>([]);
    const [locationsLoading, setLocationsLoading] = useState(false);
    const [locationSearch, setLocationSearch] = useState("");

    useEffect(() => {
        if (formData.rol !== "PROPERTY_MANAGER") return;

        const fetchData = async () => {
            setLocationsLoading(true);
            try {
                const clientsSnap = await getDocs(collection(db, "clients"));
                const clientsList = clientsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setAllClients(clientsList);

                const locsSnap = await getDocs(collection(db, "locations"));
                const locsList = locsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setAllLocations(locsList);
            } catch (error) {
                console.error("Error loading clients and locations:", error);
            } finally {
                setLocationsLoading(false);
            }
        };

        fetchData();
    }, [formData.rol]);

    const filteredLocationsToShow = allLocations
        .map(loc => {
            const client = allClients.find(c => c.id === loc.clientId);
            return {
                ...loc,
                clientName: client ? client.nombreComercial : "Cliente Desconocido"
            };
        })
        .filter(loc => {
            const search = locationSearch.toLowerCase();
            return (
                loc.nombre?.toLowerCase().includes(search) ||
                loc.clientName?.toLowerCase().includes(search)
            );
        })
        .sort((a, b) => {
            const clientComp = a.clientName.localeCompare(b.clientName);
            if (clientComp !== 0) return clientComp;
            return (a.nombre || "").localeCompare(b.nombre || "");
        });

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
            } else if (uid && (formData.email !== initialData?.email || formData.nombre !== initialData?.nombre)) {
                // Sync updated email or name to Firebase Auth via admin endpoint
                try {
                    await fetch("/api/admin/set-password", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            uid,
                            newEmail: formData.email,
                            displayName: formData.nombre
                        })
                    });
                } catch (authSyncErr) {
                    console.warn("Could not sync to Auth:", authSyncErr);
                }
            }

            const userData = {
                ...formData,
                displayName: formData.nombre,
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
        if (!initialData?.id || !confirm("¿Estás seguro de que deseas eliminar este técnico? Esta acción no se puede deshacer y borrará su acceso al sistema completamente.")) return;

        setLoading(true);
        try {
            const idToken = await auth.currentUser?.getIdToken();
            const res = await fetch("/api/admin/delete-user", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${idToken}`
                },
                body: JSON.stringify({ uid: initialData.id }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Error desconocido al eliminar");
            }

            alert("Técnico eliminado correctamente del sistema.");
            router.push("/technicians");
            router.refresh();
        } catch (error: any) {
            console.error("Error deleting technician:", error);
            alert("Error al eliminar el técnico: " + error.message);
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
            const idToken = await auth.currentUser?.getIdToken();
            const res = await fetch("/api/admin/set-password", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${idToken}`
                },
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
                    />
                    {isEditing && (
                        <p className="text-[11px] text-gray-500">
                            Si cambias el correo, se actualizará también el usuario de inicio de sesión en Firebase Auth.
                        </p>
                    )}
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
                            <SelectItem value="ADMIN">👑 Administrador Full</SelectItem>
                            <SelectItem value="SUPERVISOR">🔵 Supervisor</SelectItem>
                            <SelectItem value="GERENTE_TICKETS">🎫 Gerente de Tickets</SelectItem>
                            <SelectItem value="TECNICO">🔧 Técnico de Campo</SelectItem>
                            <SelectItem value="CONTRATISTA">👷‍♂️ Contratista Externo</SelectItem>
                            <SelectItem value="CLIENTE">👤 Cliente</SelectItem>
                            <SelectItem value="PROPERTY_MANAGER">🏢 Gestor de Propiedades (Property Manager)</SelectItem>
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

            {(formData.rol === "TECNICO" || formData.rol === "CONTRATISTA") && (
                <div className="pt-6 border-t border-gray-100 space-y-6">
                    {/* Permiso de Video */}
                    <div className="bg-slate-50 p-5 rounded-lg border border-slate-200 space-y-4">
                        <h3 className="text-md font-semibold text-slate-800 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500"><path d="M23 7a2 2 0 0 0-2.45-1.45L16 7V5a2 2 0 0 0-2-2H2a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2l4.55 1.45A2 2 0 0 0 23 17V7z"/></svg>
                            Permisos de Multimedia
                        </h3>
                        <div className="flex items-start space-x-3 pt-2">
                            <input
                                id="allowVideoUpload"
                                type="checkbox"
                                checked={formData.allowVideoUpload || false}
                                onChange={e => setFormData(prev => ({ ...prev, allowVideoUpload: e.target.checked }))}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer mt-1"
                            />
                            <div className="grid gap-1.5 leading-none">
                                <Label htmlFor="allowVideoUpload" className="cursor-pointer font-medium text-slate-800">
                                    Permitir subir videos (máx. 15 segundos)
                                </Label>
                                <p className="text-xs text-slate-500">
                                    Habilita al técnico a grabar y subir videos cortos para reportar fugas, ruidos o detalles técnicos. Los videos se auto-eliminarán a los 60 días para ahorrar espacio.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-5 rounded-lg border border-slate-200 space-y-4">
                        <h3 className="text-md font-semibold text-slate-800 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>
                            Vehículo Asignado
                        </h3>
                        <p className="text-sm text-slate-500 mb-4">
                            Los datos del vehículo permiten realizar el seguimiento del kilometraje y avisos de mantenimiento al técnico.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Marca y Modelo</Label>
                                <Input
                                    value={formData.vehicle?.brand || ""}
                                    onChange={e => setFormData(prev => ({ ...prev, vehicle: { ...prev.vehicle, brand: e.target.value } }))}
                                    placeholder="Ej. Nissan AD"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Año</Label>
                                <Input
                                    value={formData.vehicle?.year || ""}
                                    onChange={e => setFormData(prev => ({ ...prev, vehicle: { ...prev.vehicle, year: e.target.value } }))}
                                    placeholder="Ej. 2014"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Placa</Label>
                                <Input
                                    value={formData.vehicle?.plate || ""}
                                    onChange={e => setFormData(prev => ({ ...prev, vehicle: { ...prev.vehicle, plate: e.target.value } }))}
                                    placeholder="Ej. A123456"
                                    className="uppercase"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Costo Operativo por KM (RD$)</Label>
                                <Input
                                    type="number"
                                    step="0.5"
                                    value={formData.vehicle?.costPerKm || 18}
                                    onChange={e => setFormData(prev => ({ ...prev, vehicle: { ...prev.vehicle, costPerKm: Number(e.target.value) } }))}
                                    placeholder="18.00"
                                />
                                <p className="text-[10px] text-gray-400">Combustible, gomas y mantenimiento por cada km.</p>
                            </div>
                            <div className="space-y-2">
                                <Label>Odómetro Actual (KM)</Label>
                                <Input
                                    type="number"
                                    value={formData.vehicle?.currentMileage || 0}
                                    onChange={e => setFormData(prev => ({ ...prev, vehicle: { ...prev.vehicle, currentMileage: Number(e.target.value) } }))}
                                    placeholder="120000"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Intervalo Cambio de Aceite (KM)</Label>
                                <Input
                                    type="number"
                                    value={formData.vehicle?.oilChangeInterval || 4500}
                                    onChange={e => setFormData(prev => ({ ...prev, vehicle: { ...prev.vehicle, oilChangeInterval: Number(e.target.value) } }))}
                                    placeholder="4500"
                                />
                            </div>
                        </div>
                    </div>

                    {isEditing && (
                        <div className="bg-slate-50 p-5 rounded-lg border border-slate-200 space-y-4">
                            <h3 className="text-md font-semibold text-slate-800 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                                Dispositivos Móviles Vinculados
                            </h3>
                            <p className="text-sm text-slate-500">
                                Para evitar accesos no autorizados, el inicio de sesión del técnico está restringido a un máximo de 2 dispositivos activos (flotilla).
                            </p>
                            
                            <div className="space-y-2">
                                {(!formData.allowedDeviceIds || formData.allowedDeviceIds.length === 0) ? (
                                    <p className="text-xs text-slate-400 italic">No hay ningún dispositivo vinculado. El técnico se registrará automáticamente al iniciar sesión desde su teléfono.</p>
                                ) : (
                                    <div className="space-y-1.5">
                                        <span className="text-xs font-semibold text-slate-600 block">Dispositivos registrados ({formData.allowedDeviceIds.length}/2):</span>
                                        <ul className="text-xs text-slate-700 bg-white border rounded p-2 divide-y font-mono text-[10px]">
                                            {formData.allowedDeviceIds.map((devId: string, idx: number) => (
                                                <li key={idx} className="py-1.5 flex justify-between items-center">
                                                    <span>ID: {devId}</span>
                                                    <Badge className="bg-blue-50 text-blue-700 border-blue-100 text-[9px] scale-90">Activo</Badge>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>

                            {formData.allowedDeviceIds && formData.allowedDeviceIds.length > 0 && (
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={handleResetDevices}
                                    className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 flex items-center gap-1.5 mt-2"
                                    disabled={deviceResetting}
                                >
                                    {deviceResetting ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
                                    )}
                                    Restablecer Dispositivos
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            )}

            {formData.rol === "PROPERTY_MANAGER" && (
                <div className="pt-6 border-t border-gray-100 space-y-6">
                    <div className="bg-slate-50 p-5 rounded-lg border border-slate-200 space-y-4">
                        <h3 className="text-md font-semibold text-slate-800 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                            Villas Asignadas (Gestor)
                        </h3>
                        <p className="text-sm text-slate-500">
                            Selecciona las villas/ubicaciones que este gestor podrá visualizar y supervisar.
                        </p>

                        <Input
                            placeholder="Buscar por villa o cliente..."
                            value={locationSearch}
                            onChange={(e) => setLocationSearch(e.target.value)}
                            className="bg-white mb-2"
                        />

                        {locationsLoading ? (
                            <div className="flex items-center gap-2 text-sm text-gray-500 py-4 justify-center">
                                <Loader2 className="h-4 w-4 animate-spin" /> Cargando villas...
                            </div>
                        ) : (
                            <div className="max-h-60 overflow-y-auto border bg-white rounded-md p-3 space-y-2">
                                {filteredLocationsToShow.length === 0 ? (
                                    <p className="text-xs text-gray-500 text-center py-2">No se encontraron villas.</p>
                                ) : (
                                    filteredLocationsToShow.map((loc) => {
                                        const isChecked = (formData.assignedLocations || []).includes(loc.id);
                                        return (
                                            <label key={loc.id} className="flex items-start gap-2.5 p-1.5 hover:bg-slate-50 rounded cursor-pointer text-sm">
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={(e) => {
                                                        const current = formData.assignedLocations || [];
                                                        const next = e.target.checked
                                                            ? [...current, loc.id]
                                                            : current.filter(id => id !== loc.id);
                                                        setFormData(prev => ({ ...prev, assignedLocations: next }));
                                                    }}
                                                    className="h-4 w-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500 mt-0.5 cursor-pointer"
                                                />
                                                <div className="leading-tight">
                                                    <span className="font-medium text-gray-900">{loc.nombre}</span>
                                                    <span className="block text-[11px] text-gray-400">
                                                        Cliente: {loc.clientName || "Desconocido"}
                                                    </span>
                                                </div>
                                            </label>
                                        );
                                    })
                                )}
                            </div>
                        )}
                        <div className="text-xs text-gray-400 font-medium">
                            {(formData.assignedLocations || []).length} villa(s) seleccionada(s).
                        </div>
                    </div>
                </div>
            )}

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
