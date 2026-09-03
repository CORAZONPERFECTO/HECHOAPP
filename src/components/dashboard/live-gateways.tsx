"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, query, where, onSnapshot, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { 
    Smartphone, 
    Wrench, 
    Ticket, 
    Kanban, 
    Briefcase, 
    BarChart3, 
    ArrowUpRight, 
    Car, 
    AlertTriangle, 
    CheckCircle2, 
    Clock, 
    DollarSign,
    Sparkles
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function LiveGateways() {
    // 1. Field Ops State
    const [techStats, setTechStats] = useState({
        totalTechs: 0,
        activeToday: 0,
        vehiclesWithWarning: 0,
    });

    // 2. Control Tower State
    const [ticketStats, setTicketStats] = useState({
        active: 0,
        urgent: 0,
        completedToday: 0,
        inProgress: 0,
    });

    // 3. Treasury / Finance State
    const [financeStats, setFinanceStats] = useState({
        collectedMonth: 0,
        pendingReceivables: 0,
        pendingQuotesCount: 0,
    });

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const todayStr = new Date().toISOString().split("T")[0];
        const startMonth = new Date();
        startMonth.setDate(1);
        startMonth.setHours(0, 0, 0, 0);

        // --- 1. Query Technicians & Fleet ---
        const qUsers = query(collection(db, "users"), where("rol", "==", "TECNICO"));
        const unsubUsers = onSnapshot(qUsers, (snap) => {
            let active = 0;
            let warnVehicles = 0;
            snap.docs.forEach((d) => {
                const u = d.data();
                if (u.vehicle) {
                    if (u.vehicle.todayStartDate === todayStr || u.vehicle.lastMileageUpdateDate === todayStr) {
                        active++;
                    }
                    const oilInt = u.vehicle.oilChangeInterval || 4500;
                    const lastOil = u.vehicle.lastOilChangeMileage || 0;
                    const currMileage = u.vehicle.currentMileage || 0;
                    if (currMileage - lastOil >= oilInt || (oilInt - (currMileage - lastOil)) <= 500) {
                        warnVehicles++;
                    }
                }
            });
            setTechStats({
                totalTechs: snap.docs.length,
                activeToday: active,
                vehiclesWithWarning: warnVehicles,
            });
        });

        // --- 2. Query Tickets ---
        const qTickets = query(collection(db, "tickets"));
        const unsubTickets = onSnapshot(qTickets, (snap) => {
            let active = 0;
            let urgent = 0;
            let inProgress = 0;
            let completedToday = 0;

            snap.docs.forEach((d) => {
                const t = d.data();
                if (["OPEN", "IN_PROGRESS", "WAITING_CLIENT", "WAITING_PARTS"].includes(t.status)) {
                    active++;
                    if (t.status === "IN_PROGRESS") inProgress++;
                    if (t.priority === "URGENT" || t.priority === "HIGH") urgent++;
                }

                if (t.status === "COMPLETED") {
                    const dt = t.closedAt || t.resolvedAt || t.updatedAt;
                    if (dt) {
                        const dateStr = dt.toDate 
                            ? dt.toDate().toISOString().split("T")[0] 
                            : new Date(dt.seconds * 1000).toISOString().split("T")[0];
                        if (dateStr === todayStr) completedToday++;
                    }
                }
            });

            setTicketStats({
                active,
                urgent,
                completedToday,
                inProgress,
            });
        });

        // --- 3. Query Finance (Payments & Invoices & Quotes) ---
        const qPayments = query(
            collection(db, "payments"),
            where("date", ">=", Timestamp.fromDate(startMonth))
        );
        const unsubPayments = onSnapshot(qPayments, (snap) => {
            const totalCobrado = snap.docs.reduce((acc, d) => acc + (d.data().amount || 0), 0);
            setFinanceStats((prev) => ({ ...prev, collectedMonth: totalCobrado }));
        });

        const qInvoices = query(collection(db, "invoices"));
        const unsubInvoices = onSnapshot(qInvoices, (snap) => {
            let totalPending = 0;
            snap.docs.forEach((d) => {
                const inv = d.data();
                if (inv.status !== "PAID" && inv.status !== "CANCELLED") {
                    const balance = (inv.total || 0) - (inv.paidAmount || 0);
                    if (balance > 0) totalPending += balance;
                }
            });
            setFinanceStats((prev) => ({ ...prev, pendingReceivables: totalPending }));
        });

        const qQuotes = query(collection(db, "quotes"));
        const unsubQuotes = onSnapshot(qQuotes, (snap) => {
            const pending = snap.docs.filter((d) => ["DRAFT", "SENT"].includes(d.data().status)).length;
            setFinanceStats((prev) => ({ ...prev, pendingQuotesCount: pending }));
            setLoading(false);
        });

        return () => {
            unsubUsers();
            unsubTickets();
            unsubPayments();
            unsubInvoices();
            unsubQuotes();
        };
    }, []);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Gateway 1: Servicio de Campo & Flotilla */}
            <Link href="/technician/my-day" className="group block">
                <div className="bg-gradient-to-br from-cyan-600 via-blue-600 to-blue-700 rounded-3xl text-white shadow-xl shadow-blue-500/20 hover:shadow-2xl hover:shadow-blue-500/35 transition-all duration-300 hover:-translate-y-1.5 border border-white/10 relative overflow-hidden flex flex-col justify-between p-6 min-h-[220px]">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                        <Smartphone className="w-32 h-32" />
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-4 relative z-10">
                            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md border border-white/15 shadow-inner">
                                <Wrench className="w-6 h-6 text-white" />
                            </div>
                            <Badge className="bg-white/20 hover:bg-white/30 text-white border-white/20 backdrop-blur-sm text-xs py-1">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
                                {techStats.activeToday} en turno
                            </Badge>
                        </div>

                        <h3 className="text-xl font-bold mb-1 tracking-tight flex items-center justify-between">
                            <span>Servicio de Campo</span>
                            <ArrowUpRight className="w-5 h-5 text-white/70 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                        </h3>
                        <p className="text-blue-100 text-xs font-medium">Flotilla y app celular para técnicos</p>
                    </div>

                    {/* Live Telemetry Bar */}
                    <div className="mt-4 pt-3 border-t border-white/15 grid grid-cols-2 gap-2 text-xs relative z-10 bg-black/10 rounded-xl p-2.5 backdrop-blur-sm">
                        <div>
                            <span className="text-blue-200 block text-[10px] uppercase tracking-wider font-semibold">Técnicos Activos</span>
                            <span className="font-bold text-sm text-white">{techStats.activeToday} / {techStats.totalTechs || 1}</span>
                        </div>
                        <div>
                            <span className="text-blue-200 block text-[10px] uppercase tracking-wider font-semibold">Flota / Mantenimiento</span>
                            {techStats.vehiclesWithWarning > 0 ? (
                                <span className="font-bold text-sm text-amber-300 flex items-center gap-1">
                                    <AlertTriangle className="w-3.5 h-3.5" /> {techStats.vehiclesWithWarning} aviso(s)
                                </span>
                            ) : (
                                <span className="font-bold text-sm text-emerald-300 flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Óptima
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </Link>

            {/* Gateway 2: Torre de Control (Tickets & Operaciones) */}
            <Link href="/tickets" className="group block">
                <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-purple-800 rounded-3xl text-white shadow-xl shadow-purple-500/20 hover:shadow-2xl hover:shadow-purple-500/35 transition-all duration-300 hover:-translate-y-1.5 border border-white/10 relative overflow-hidden flex flex-col justify-between p-6 min-h-[220px]">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                        <Kanban className="w-32 h-32" />
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-4 relative z-10">
                            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md border border-white/15 shadow-inner">
                                <Ticket className="w-6 h-6 text-white" />
                            </div>
                            <Badge className="bg-white/20 hover:bg-white/30 text-white border-white/20 backdrop-blur-sm text-xs py-1">
                                {ticketStats.active} Activos
                            </Badge>
                        </div>

                        <h3 className="text-xl font-bold mb-1 tracking-tight flex items-center justify-between">
                            <span>Torre de Control</span>
                            <ArrowUpRight className="w-5 h-5 text-white/70 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                        </h3>
                        <p className="text-purple-100 text-xs font-medium">Kanban operativo y asignación</p>
                    </div>

                    {/* Live Telemetry Bar */}
                    <div className="mt-4 pt-3 border-t border-white/15 grid grid-cols-3 gap-1 text-xs relative z-10 bg-black/10 rounded-xl p-2.5 backdrop-blur-sm text-center">
                        <div>
                            <span className="text-purple-200 block text-[9px] uppercase tracking-wider font-semibold">En Proceso</span>
                            <span className="font-bold text-sm text-white">{ticketStats.inProgress}</span>
                        </div>
                        <div>
                            <span className="text-purple-200 block text-[9px] uppercase tracking-wider font-semibold">Listos Hoy</span>
                            <span className="font-bold text-sm text-emerald-300 font-mono">+{ticketStats.completedToday}</span>
                        </div>
                        <div>
                            <span className="text-purple-200 block text-[9px] uppercase tracking-wider font-semibold">Urgencias</span>
                            <span className={`font-bold text-sm ${ticketStats.urgent > 0 ? "text-rose-300 animate-pulse" : "text-purple-200"}`}>
                                {ticketStats.urgent}
                            </span>
                        </div>
                    </div>
                </div>
            </Link>

            {/* Gateway 3: Tesorería Financiera (Cobrado vs Por Cobrar) */}
            <Link href="/admin/dashboard-financiero" className="group block">
                <div className="bg-gradient-to-br from-emerald-600 via-teal-700 to-emerald-800 rounded-3xl text-white shadow-xl shadow-emerald-500/20 hover:shadow-2xl hover:shadow-emerald-500/35 transition-all duration-300 hover:-translate-y-1.5 border border-white/10 relative overflow-hidden flex flex-col justify-between p-6 min-h-[220px]">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                        <Briefcase className="w-32 h-32" />
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-4 relative z-10">
                            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md border border-white/15 shadow-inner">
                                <DollarSign className="w-6 h-6 text-white" />
                            </div>
                            <Badge className="bg-emerald-400/20 hover:bg-emerald-400/30 text-emerald-100 border-emerald-300/30 backdrop-blur-sm text-xs py-1">
                                Ver Facturación & Cobros →
                            </Badge>
                        </div>

                        <h3 className="text-xl font-bold mb-1 tracking-tight flex items-center justify-between">
                            <span>Tesorería Financiera</span>
                            <ArrowUpRight className="w-5 h-5 text-white/70 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                        </h3>
                        <p className="text-emerald-100 text-xs font-medium">Control de cobros, facturas y pendientes</p>
                    </div>

                    {/* Live Financial Highlights */}
                    <div className="mt-4 pt-3 border-t border-white/15 grid grid-cols-2 gap-2 text-xs relative z-10 bg-black/15 rounded-xl p-2.5 backdrop-blur-sm">
                        <div>
                            <span className="text-emerald-200 block text-[10px] uppercase tracking-wider font-semibold">Cobrado (Mes)</span>
                            <span className="font-bold text-sm text-white font-mono">
                                RD$ {financeStats.collectedMonth.toLocaleString()}
                            </span>
                        </div>
                        <div>
                            <span className="text-emerald-200 block text-[10px] uppercase tracking-wider font-semibold">Por Cobrar</span>
                            <span className="font-bold text-sm text-amber-300 font-mono">
                                RD$ {financeStats.pendingReceivables.toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>
            </Link>
        </div>
    );
}
