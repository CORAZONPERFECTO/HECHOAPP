"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Car, Loader2 } from "lucide-react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { User } from "@/types/schema";

export function MileagePromptModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        brand: "",
        model: "",
        year: "",
        currentMileage: "",
    });

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setUserId(user.uid);
                await checkMileageStatus(user.uid);
            } else {
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, []);

    const checkMileageStatus = async (uid: string) => {
        try {
            const userDoc = await getDoc(doc(db, "users", uid));
            if (userDoc.exists()) {
                const userData = userDoc.data() as User;
                const role = userData.rol || (userData as any).role;
                
                // Solo para técnicos
                if (role === 'TECNICO') {
                    const vehicle = userData.vehicle || {};
                    const lastUpdateStr = vehicle.lastMileageUpdateDate;
                    
                    const now = new Date();
                    // Verificar si son más de las 6:00 AM
                    if (now.getHours() >= 6) {
                        let shouldPrompt = false;

                        if (!lastUpdateStr) {
                            shouldPrompt = true;
                        } else {
                            const lastUpdate = new Date(lastUpdateStr);
                            const diffTime = Math.abs(now.getTime() - lastUpdate.getTime());
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                            
                            // Cada 5 días
                            if (diffDays >= 5) {
                                shouldPrompt = true;
                            }
                        }

                        if (shouldPrompt) {
                            setFormData({
                                brand: vehicle.brand || "",
                                model: vehicle.model || "",
                                year: vehicle.year || "",
                                currentMileage: vehicle.currentMileage?.toString() || "",
                            });
                            setIsOpen(true);
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Error comprobando kilometraje:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!formData.brand || !formData.model || !formData.year || !formData.currentMileage) {
            alert("Por favor, completa todos los campos del vehículo.");
            return;
        }

        if (!userId) return;

        setSaving(true);
        try {
            const nowStr = new Date().toISOString(); // Using ISO string or YYYY-MM-DD
            
            await updateDoc(doc(db, "users", userId), {
                "vehicle.brand": formData.brand,
                "vehicle.model": formData.model,
                "vehicle.year": formData.year,
                "vehicle.currentMileage": Number(formData.currentMileage),
                "vehicle.lastMileageUpdateDate": nowStr
            });

            setIsOpen(false);
        } catch (error) {
            console.error("Error guardando kilometraje:", error);
            alert("Hubo un error al guardar. Intenta de nuevo.");
        } finally {
            setSaving(false);
        }
    };

    // No renderizamos nada si no está abierto
    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            // Impedir que se cierre si el usuario hace clic fuera
            if (!open) return; 
            setIsOpen(open);
        }}>
            <DialogContent className="sm:max-w-md [&>button]:hidden" onPointerDownOutside={(e) => e.preventDefault()}>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl text-blue-900">
                        <Car className="h-6 w-6" />
                        Registro de Vehículo y Kilometraje
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <p className="text-sm text-gray-500">
                        Para empezar los servicios de hoy, por favor actualiza la información de tu vehículo y el kilometraje actual.
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Marca del Vehículo</Label>
                            <Input 
                                value={formData.brand} 
                                onChange={(e) => setFormData({...formData, brand: e.target.value})}
                                placeholder="Ej: Toyota" 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Modelo</Label>
                            <Input 
                                value={formData.model} 
                                onChange={(e) => setFormData({...formData, model: e.target.value})}
                                placeholder="Ej: Hilux" 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Año</Label>
                            <Input 
                                value={formData.year} 
                                type="number"
                                onChange={(e) => setFormData({...formData, year: e.target.value})}
                                placeholder="Ej: 2020" 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="font-bold text-blue-700">Kilometraje Actual</Label>
                            <Input 
                                value={formData.currentMileage} 
                                type="number"
                                onChange={(e) => setFormData({...formData, currentMileage: e.target.value})}
                                placeholder="Ej: 150000" 
                                className="border-blue-300 bg-blue-50"
                            />
                        </div>
                    </div>
                </div>
                <Button onClick={handleSave} disabled={saving} className="w-full h-12 text-lg">
                    {saving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Guardar para Empezar el Día"}
                </Button>
            </DialogContent>
        </Dialog>
    );
}
