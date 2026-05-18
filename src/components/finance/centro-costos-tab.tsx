"use client";

import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Expense, ExpenseCategory } from "@/types/finance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Car, Users, Home, Loader2, DollarSign, Image as ImageIcon } from "lucide-react";
import { PhotoUploader } from "@/components/technician/photo-uploader";

export function CentroCostosTab() {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();

    // Form
    const [category, setCategory] = useState<ExpenseCategory>("GASTOS_FIJOS");
    const [subcategory, setSubcategory] = useState("");
    const [amount, setAmount] = useState("");
    const [description, setDescription] = useState("");
    const [receiptPhotos, setReceiptPhotos] = useState<string[]>([]);
    const [mileage, setMileage] = useState("");

    useEffect(() => {
        const q = query(collection(db, "expenses"), orderBy("date", "desc"));
        const unsub = onSnapshot(q, (snap) => {
            setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Expense)));
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!subcategory || !amount || !description) return;

        setSaving(true);
        try {
            await addDoc(collection(db, "expenses"), {
                category,
                subcategory,
                amount: parseFloat(amount),
                description,
                receiptUrl: receiptPhotos[0] || null,
                mileage: mileage ? parseInt(mileage) : null,
                date: serverTimestamp(),
                createdBy: auth.currentUser?.uid || "Admin",
                createdAt: serverTimestamp()
            });

            toast({ title: "Gasto registrado", description: "Se ha añadido al Centro de Costos." });
            setSubcategory("");
            setAmount("");
            setDescription("");
            setReceiptPhotos([]);
            setMileage("");
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "No se pudo registrar el gasto.", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const getCategoryIcon = (cat: string) => {
        switch (cat) {
            case 'FLOTILLA': return <Car className="h-4 w-4" />;
            case 'NOMINA': return <Users className="h-4 w-4" />;
            case 'GASTOS_FIJOS': return <Home className="h-4 w-4" />;
            default: return <DollarSign className="h-4 w-4" />;
        }
    };

    const formatMoney = (val: number) => {
        return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(val);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
            {/* Form */}
            <div className="lg:col-span-1 space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Registrar OPEX / Nómina</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Categoría Principal</Label>
                                <Select value={category} onValueChange={(v) => setCategory(v as ExpenseCategory)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="FLOTILLA"><div className="flex items-center gap-2"><Car className="h-4 w-4 text-blue-600"/> Flotilla / Vehículos</div></SelectItem>
                                        <SelectItem value="NOMINA"><div className="flex items-center gap-2"><Users className="h-4 w-4 text-green-600"/> Nómina y Extras</div></SelectItem>
                                        <SelectItem value="GASTOS_FIJOS"><div className="flex items-center gap-2"><Home className="h-4 w-4 text-purple-600"/> Gastos Fijos (Local)</div></SelectItem>
                                        <SelectItem value="OTROS"><div className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-gray-600"/> Otros</div></SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Subcategoría (ej: Cambio de Aceite, Luz, Bono)</Label>
                                <Input value={subcategory} onChange={e => setSubcategory(e.target.value)} required />
                            </div>

                            <div className="space-y-2">
                                <Label>Descripción o Detalle</Label>
                                <Input value={description} onChange={e => setDescription(e.target.value)} required />
                            </div>

                            <div className="space-y-2">
                                <Label>Monto (DOP)</Label>
                                <Input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required />
                            </div>

                            {category === 'FLOTILLA' && (
                                <div className="space-y-2">
                                    <Label>Kilometraje (Opcional)</Label>
                                    <Input type="number" min="0" value={mileage} onChange={e => setMileage(e.target.value)} placeholder="Ej: 45000" />
                                </div>
                            )}

                            <div className="space-y-2 pt-2 border-t mt-4">
                                <Label>Comprobante / Factura</Label>
                                <PhotoUploader 
                                    label="Subir Foto"
                                    type="AFTER"
                                    photos={receiptPhotos.map(url => ({ id: '1', url, type: 'AFTER', label: 'Comprobante', createdAt: new Date() as any }))}
                                    onChange={(photos) => setReceiptPhotos(photos.map(p => p.url))}
                                />
                            </div>

                            <Button type="submit" className="w-full" disabled={saving}>
                                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                                Guardar Gasto
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>

            {/* List */}
            <div className="lg:col-span-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Historial OPEX y Nómina</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>
                        ) : expenses.length === 0 ? (
                            <div className="text-center p-8 text-gray-500 border border-dashed rounded">No hay gastos operativos registrados.</div>
                        ) : (
                            <div className="space-y-3">
                                {expenses.map(exp => (
                                    <div key={exp.id} className="flex justify-between items-center bg-white p-4 border rounded-lg shadow-sm">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-slate-100 rounded-full">
                                                {getCategoryIcon(exp.category)}
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-gray-900">{exp.subcategory}</h4>
                                                <p className="text-sm text-gray-500">{exp.description}</p>
                                                <p className="text-xs text-gray-400 mt-1">
                                                    {exp.date?.toDate ? exp.date.toDate().toLocaleDateString() : 'Reciente'}
                                                    {exp.mileage && ` • Km: ${exp.mileage}`}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right flex flex-col items-end gap-2">
                                            <span className="font-bold text-gray-900">{formatMoney(exp.amount)}</span>
                                            {exp.receiptUrl && (
                                                <a href={exp.receiptUrl} target="_blank" className="text-xs text-blue-600 flex items-center hover:underline">
                                                    <ImageIcon className="h-3 w-3 mr-1" /> Ver Factura
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
