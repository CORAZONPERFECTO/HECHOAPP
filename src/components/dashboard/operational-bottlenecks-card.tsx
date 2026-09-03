"use client";

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Clock, Wrench, ShieldAlert, CheckCircle2, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Ticket } from "@/types/schema";

export function OperationalBottlenecksCard() {
    const [stagnantTickets, setStagnantTickets] = useState<Ticket[]>([]);
    const [oilWarnings, setOilWarnings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 1. Check Stagnant Tickets (Waiting for Parts or Waiting for Client > 24h)
        const qTickets = query(
            collection(db, "tickets"),
            where("status", "in", ["WAITING_PARTS", "WAITING_CLIENT", "OPEN"])
        );

        const unsubTickets = onSnapshot(qTickets, (snap) => {
            const now = Date.now();
            const list: Ticket[] = [];
            snap.docs.forEach((doc) => {
                const data = { id: doc.id, ...doc.data() } as Ticket;
                const updatedAtMillis = data.updatedAt?.seconds 
                    ? data.updatedAt.seconds * 1000 
                    : (data.createdAt?.seconds ? data.createdAt.seconds * 1000 : now);
                
                const hoursDiff = (now - updatedAtMillis) / (1000 * 60 * 60);
                if (hoursDiff >= 24 || data.priority === "URGENT") {
                    list.push(data);
                }
            });
            // Sort by oldest update first
            list.sort((a, b) => (a.updatedAt?.seconds || 0) - (b.updatedAt?.seconds || 0));
            setStagnantTickets(list.slice(0, 4));
        });

        // 2. Check Vehicle Oil Alerts
        const qUsers = query(collection(db, "users"), where("rol", "==", "TECNICO"));
        const unsubUsers = onSnapshot(qUsers, (snap) => {
            const warns: any[] = [];
            snap.docs.forEach((doc) => {
                const u = doc.data();
                if (u.vehicle) {
                    const oilInt = u.vehicle.oilChangeInterval || 4500;
                    const lastOil = u.vehicle.lastOilChangeMileage || 0;
                    const currMileage = u.vehicle.currentMileage || 0;
                    const diff = currMileage - lastOil;
                    if (diff >= oilInt) {
                        warns.push({
                            techName: u.nombre || "Técnico",
                            plate: u.vehicle.plate || "S/R",
                            model: `${u.vehicle.brand || ""} ${u.vehicle.model || ""}`,
                            overdueKm: diff - oilInt
                        });
                    }
                }
            });
            setOilWarnings(warns);
            setLoading(false);
        });

        return () => {
            unsubTickets();
            unsubUsers();
        };
    }, []);

    const totalAlerts = stagnantTickets.length + oilWarnings.length;

    return (
        <Card className="border-slate-200/80 shadow-sm rounded-2xl overflow-hidden bg-white/95">
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <ShieldAlert className="w-5 h-5 text-amber-500" />
                        Alertas Operativas & Cuellos de Botella
                    </CardTitle>
                    <Badge variant={totalAlerts > 0 ? "destructive" : "outline"} className="text-xs">
                        {totalAlerts} {totalAlerts === 1 ? "atención" : "atenciones"}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
                {totalAlerts === 0 ? (
                    <div className="text-center py-6 text-slate-500 text-xs">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                        Todo en orden. No hay cuellos de botella ni alertas de flota pendientes.
                    </div>
                ) : (
                    <>
                        {/* Oil warnings */}
                        {oilWarnings.map((w, idx) => (
                            <div key={`oil-${idx}`} className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900">
                                <div className="flex items-center gap-2">
                                    <Wrench className="w-4 h-4 text-amber-600 flex-shrink-0" />
                                    <div>
                                        <p className="font-semibold">{w.model} ({w.plate}) - {w.techName}</p>
                                        <p className="text-[11px] text-amber-700">Cambio de aceite vencido por {w.overdueKm} km</p>
                                    </div>
                                </div>
                                <Badge className="bg-amber-200 text-amber-900 hover:bg-amber-300 border-none text-[10px]">
                                    Mantenimiento
                                </Badge>
                            </div>
                        ))}

                        {/* Stagnant tickets */}
                        {stagnantTickets.map((t) => (
                            <Link key={t.id} href={`/tickets/${t.id}`} className="block group">
                                <div className="p-2.5 bg-slate-50 hover:bg-blue-50/60 border border-slate-200 rounded-xl transition-colors flex items-center justify-between text-xs">
                                    <div className="flex items-start gap-2 pr-2">
                                        <Clock className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <p className="font-semibold text-slate-800 group-hover:text-blue-700 transition-colors line-clamp-1">
                                                #{t.ticketNumber || t.id.substring(0, 6)} - {t.clientName}
                                            </p>
                                            <p className="text-[11px] text-slate-500 line-clamp-1">
                                                {t.locationName} • {t.status === 'WAITING_PARTS' ? 'Esperando Piezas' : t.status === 'WAITING_CLIENT' ? 'Esperando Cliente' : 'Abierto sin atender'}
                                            </p>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-transform group-hover:translate-x-0.5" />
                                </div>
                            </Link>
                        ))}
                    </>
                )}
            </CardContent>
        </Card>
    );
}
