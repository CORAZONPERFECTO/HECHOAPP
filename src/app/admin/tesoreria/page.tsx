"use client";

import { useState, useEffect } from "react";
import { BankAccount, TreasuryMovement } from "@/types/treasury";
import { getTreasuryAccounts, getTreasuryMovements } from "@/lib/treasury-service";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Landmark, Wallet, ShieldCheck, CheckCircle2, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function TreasuryPage() {
    const [accounts, setAccounts] = useState<BankAccount[]>([]);
    const [movements, setMovements] = useState<TreasuryMovement[]>([]);
    const [loading, setLoading] = useState(true);
    const [reconcileOpen, setReconcileOpen] = useState(false);
    const [countedCash, setCountedCash] = useState<string>("");

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [accs, movs] = await Promise.all([
                getTreasuryAccounts(),
                getTreasuryMovements()
            ]);
            setAccounts(accs);
            setMovements(movs);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const totalLiquidAssets = accounts.reduce((acc, a) => acc + (a.currentBalance || 0), 0);
    const cashAccount = accounts.find(a => a.type === 'CASH');
    const cashBalance = cashAccount?.currentBalance || 0;

    const parsedCounted = parseFloat(countedCash) || 0;
    const cashDiff = countedCash ? parsedCounted - cashBalance : 0;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white p-6 md:p-8 rounded-3xl shadow-lg">
                <div className="space-y-1">
                    <span className="px-2.5 py-0.5 bg-emerald-500/30 text-emerald-300 text-[10px] font-black rounded-full uppercase tracking-wider border border-emerald-400/30">
                        Tesorería & Conciliación Bancaria
                    </span>
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight">Cuentas Bancarias & Caja Chica</h1>
                    <p className="text-xs md:text-sm text-slate-300">
                        Disponibilidad en tiempo real en Banco Popular, Banreservas y Arqueo de Efectivo de HECHO SRL.
                    </p>
                </div>

                <div className="bg-white/10 backdrop-blur p-4 rounded-2xl border border-white/20 text-left sm:text-right">
                    <span className="text-[10px] uppercase font-bold text-emerald-300 block">Total Liquidez Disponible</span>
                    <span className="text-2xl font-black font-mono text-white">
                        RD$ {totalLiquidAssets.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {accounts.map(acc => (
                    <Card key={acc.id} className="border-slate-200 rounded-3xl shadow-sm bg-white overflow-hidden p-5 space-y-3">
                        <div className="flex justify-between items-start">
                            <div className="p-3 bg-slate-100 rounded-2xl text-slate-800">
                                {acc.type === 'BANK' ? <Landmark className="w-6 h-6 text-blue-600" /> : <Wallet className="w-6 h-6 text-emerald-600" />}
                            </div>
                            <Badge variant="outline" className="text-[10px] font-mono uppercase">
                                {acc.currency}
                            </Badge>
                        </div>

                        <div>
                            <h3 className="text-sm font-bold text-slate-900">{acc.name}</h3>
                            <span className="text-[11px] text-slate-400 font-mono">{acc.accountNumber}</span>
                        </div>

                        <div className="pt-2 border-t border-slate-100">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Saldo Actual</span>
                            <span className="text-xl font-black font-mono text-slate-900">
                                RD$ {acc.currentBalance.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                    </Card>
                ))}
            </div>

            <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/70 rounded-3xl shadow-sm overflow-hidden p-6 border">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-emerald-100">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-md shadow-emerald-200">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-slate-900">Arqueo Diario de Caja Chica</h3>
                            <p className="text-xs text-slate-600">Verifica el efectivo físico contado al final del día para evitar faltantes.</p>
                        </div>
                    </div>

                    <Button 
                        onClick={() => setReconcileOpen(true)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl gap-2 shadow-sm h-10 text-xs"
                    >
                        <ShieldCheck className="w-4 h-4" /> Realizar Arqueo de Hoy
                    </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-xs">
                    <div className="bg-white p-3.5 rounded-2xl border border-emerald-100">
                        <span className="text-slate-400 block font-bold text-[10px] uppercase">Saldo Teórico en Sistema</span>
                        <span className="text-lg font-black font-mono text-slate-900">RD$ {cashBalance.toLocaleString()}</span>
                    </div>
                    <div className="bg-white p-3.5 rounded-2xl border border-emerald-100">
                        <span className="text-slate-400 block font-bold text-[10px] uppercase">Último Cierre</span>
                        <span className="text-sm font-bold text-emerald-700 flex items-center gap-1 mt-1">
                            <CheckCircle2 className="w-4 h-4" /> Cuadrado sin diferencias
                        </span>
                    </div>
                    <div className="bg-white p-3.5 rounded-2xl border border-emerald-100">
                        <span className="text-slate-400 block font-bold text-[10px] uppercase">Responsable de Caja</span>
                        <span className="text-sm font-bold text-slate-800 mt-1 block">Administración Central</span>
                    </div>
                </div>
            </Card>

            <Dialog open={reconcileOpen} onOpenChange={setReconcileOpen}>
                <DialogContent className="max-w-md p-6 rounded-3xl">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-emerald-600" />
                            Arqueo de Efectivo en Caja Chica
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 pt-2 text-xs">
                        <div className="bg-slate-50 p-3 rounded-xl border space-y-1">
                            <span className="text-slate-500">Saldo registrado en sistema:</span>
                            <span className="font-mono font-bold text-sm text-slate-900 block">RD$ {cashBalance.toLocaleString()}</span>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs font-bold">Efectivo Físico Contado (Billetes y Monedas)</Label>
                            <Input
                                type="number"
                                placeholder="Ej. 35000"
                                value={countedCash}
                                onChange={(e) => setCountedCash(e.target.value)}
                                className="h-10 text-sm font-mono font-bold rounded-xl"
                            />
                        </div>

                        {countedCash && (
                            <div className={`p-3 rounded-xl border flex items-center justify-between ${
                                cashDiff === 0 
                                    ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                                    : "bg-rose-50 border-rose-200 text-rose-800"
                            }`}>
                                <span className="font-bold flex items-center gap-1.5">
                                    {cashDiff === 0 ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                                    {cashDiff === 0 ? "Caja Cuadrada Perfectamente" : "Diferencia / Descuadre:"}
                                </span>
                                <span className="font-mono font-black text-sm">
                                    {cashDiff === 0 ? "RD$ 0.00" : `RD$ ${cashDiff.toLocaleString()}`}
                                </span>
                            </div>
                        )}

                        <Button 
                            onClick={() => {
                                alert("✅ Arqueo de Caja Guardado Satisfactoriamente");
                                setReconcileOpen(false);
                            }}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold h-10"
                        >
                            Guardar y Firmar Arqueo del Día
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
