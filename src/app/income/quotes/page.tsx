
"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, doc, deleteDoc, updateDoc, arrayUnion, Timestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Quote } from "@/types/schema";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/income/status-badge";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft, MoreHorizontal, Eye, Edit, Trash2, FileText, Sparkles, Mic } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/app-layout";
import { QuoteStats } from "@/components/income/quotes/quote-stats";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRange } from "react-day-picker";
import { addDays, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { VoiceQuoteModal } from "@/components/income/quotes/voice-quote-modal";
import { formatDocumentNumber } from "@/lib/document-generator";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

export default function QuotesPage() {
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [loading, setLoading] = useState(true);
    const [voiceModalOpen, setVoiceModalOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);
    const router = useRouter();
    const { toast } = useToast();

    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [statusFilter, setStatusFilter] = useState<string>("ALL");

    // Real-time Firestore subscription with robust sorting and fallback
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "quotes"), (snapshot) => {
            const data = snapshot.docs.map((d) => ({
                id: d.id,
                ...d.data(),
            })) as Quote[];

            // Sort newest first
            data.sort((a: any, b: any) => {
                const getMillis = (item: any) => {
                    if (item.createdAt?.toDate) return item.createdAt.toDate().getTime();
                    if (item.createdAt?.seconds) return item.createdAt.seconds * 1000;
                    if (item.transaction_date) return new Date(item.transaction_date).getTime();
                    return 0;
                };
                return getMillis(b) - getMillis(a);
            });

            setQuotes(data);
            setLoading(false);
        }, (error) => {
            console.error("Error subscribing to quotes:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Filter quotes
    const filteredQuotes = quotes.filter(quote => {
        const q = quote as any;
        const isPO = q.documentType === "PURCHASE_ORDER" || q.isPurchaseOrder;
        const isPF = !isPO && (q.documentType === "PROFORMA" || q.isProforma);
        const isPresupuesto = !isPO && !isPF;

        // 1. Status / Type Filter
        if (statusFilter !== "ALL") {
            if (statusFilter === "QUOTE" && !isPresupuesto) return false;
            if (statusFilter === "PROFORMA" && !isPF) return false;
            if (statusFilter === "PURCHASE_ORDER" && !isPO) return false;
            if (!["QUOTE", "PROFORMA", "PURCHASE_ORDER"].includes(statusFilter)) {
                if (quote.status?.toUpperCase() !== statusFilter.toUpperCase()) return false;
            }
        }

        // 2. Date Filter
        if (!dateRange?.from) return true;
        let quoteDate: Date;
        if (q.createdAt?.toDate) quoteDate = q.createdAt.toDate();
        else if (q.createdAt?.seconds) quoteDate = new Date(q.createdAt.seconds * 1000);
        else if (q.transaction_date) quoteDate = new Date(q.transaction_date);
        else quoteDate = new Date();

        const start = startOfDay(dateRange.from);
        const end = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);

        return isWithinInterval(quoteDate, { start, end });
    });

    // Delete Quote Handler
    const handleConfirmDelete = async () => {
        if (!deleteId) return;
        setDeleting(true);
        try {
            await deleteDoc(doc(db, "quotes", deleteId));
            toast({
                title: "🗑️ Cotización eliminada",
                description: "El registro ha sido eliminado exitosamente.",
            });
            setDeleteId(null);
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error al eliminar", description: error.message });
        } finally {
            setDeleting(false);
        }
    };

    // Change document type on a row
    const handleChangeTypeRow = async (quoteItem: any, newType: 'QUOTE' | 'PROFORMA' | 'PURCHASE_ORDER', e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const isProforma = newType === 'PROFORMA';
            const isPurchaseOrder = newType === 'PURCHASE_ORDER';
            const typeLabel = newType === 'PROFORMA' ? 'Factura Proforma' : (newType === 'PURCHASE_ORDER' ? 'Orden de Compra' : 'Presupuesto');

            await updateDoc(doc(db, "quotes", quoteItem.id), {
                documentType: newType,
                isProforma,
                isPurchaseOrder,
                timeline: arrayUnion({
                    status: newType,
                    timestamp: Timestamp.now(),
                    userId: auth.currentUser?.uid || "system",
                    userName: auth.currentUser?.displayName || "Usuario",
                    note: `Tipo de documento cambiado a ${typeLabel}`
                })
            });

            toast({
                title: `📄 Tipo cambiado a ${typeLabel}`,
                description: `Documento ${quoteItem.number || quoteItem.name} actualizado con éxito.`
            });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error al cambiar tipo", description: error.message });
        }
    };

    const columns = [
        {
            header: "Número",
            accessorKey: "number" as keyof Quote,
            className: "font-bold text-gray-900",
            cell: (item: any) => {
                const docType = item.documentType === 'PURCHASE_ORDER' || item.isPurchaseOrder
                    ? 'OC'
                    : (item.documentType === 'PROFORMA' || item.isProforma ? 'FP' : 'CT');
                return formatDocumentNumber(item.number || item.name, item.transaction_date, item.id, docType);
            },
        },
        {
            header: "Tipo",
            cell: (item: any) => {
                if (item.documentType === "PURCHASE_ORDER" || item.isPurchaseOrder) {
                    return (
                        <span className="text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300 px-2 py-0.5 rounded-full">
                            ORDEN DE COMPRA
                        </span>
                    );
                }
                if (item.documentType === "PROFORMA" || item.isProforma) {
                    return (
                        <span className="text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-300 px-2 py-0.5 rounded-full">
                            PROFORMA
                        </span>
                    );
                }
                return (
                    <span className="text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
                        PRESUPUESTO
                    </span>
                );
            }
        },
        {
            header: "Cliente",
            accessorKey: "party_name" as keyof Quote,
            cell: (item: any) => item.party_name || item.clientName || item.customer_name || 'Cliente General',
        },
        {
            header: "Fecha",
            cell: (item: any) => {
                if (item.createdAt?.toDate) return item.createdAt.toDate().toLocaleDateString('es-DO');
                if (item.createdAt?.seconds) return new Date(item.createdAt.seconds * 1000).toLocaleDateString('es-DO');
                if (item.transaction_date) return new Date(item.transaction_date).toLocaleDateString('es-DO');
                return new Date().toLocaleDateString('es-DO');
            },
        },
        {
            header: "Total",
            cell: (item: Quote) => `${item.currency === 'USD' ? 'US$' : 'RD$'} ${(item.grand_total ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        },
        {
            header: "Estado",
            cell: (item: Quote) => <StatusBadge status={item.status} type="quote" />,
        },
        {
            header: "Vence",
            cell: (item: Quote) => item.valid_till ? new Date(item.valid_till).toLocaleDateString('es-DO') : '15 días',
        },
        {
            header: "Acciones",
            cell: (item: any) => (
                <div onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4 text-gray-500" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 bg-white shadow-xl">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => router.push(`/income/quotes/${item.id}`)} className="cursor-pointer font-medium">
                                <Eye className="mr-2 h-4 w-4 text-blue-500" />
                                Ver Detalle / PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/income/quotes/${item.id}/edit`)} className="cursor-pointer font-medium">
                                <Edit className="mr-2 h-4 w-4 text-amber-500" />
                                Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel className="text-xs text-gray-400 font-semibold uppercase">Cambiar Tipo</DropdownMenuLabel>
                            <DropdownMenuItem onClick={(e) => handleChangeTypeRow(item, 'QUOTE', e)} className="cursor-pointer">
                                📋 Cambiar a Presupuesto
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => handleChangeTypeRow(item, 'PROFORMA', e)} className="cursor-pointer text-purple-700">
                                📑 Cambiar a Factura Proforma
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => handleChangeTypeRow(item, 'PURCHASE_ORDER', e)} className="cursor-pointer text-blue-700">
                                📦 Cambiar a Orden de Compra
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => setDeleteId(item.id)}
                                className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                            >
                                <Trash2 className="mr-2 h-4 w-4 text-red-500" />
                                Eliminar
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            )
        }
    ];

    return (
        <AppLayout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" onClick={() => router.push("/income")}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Volver
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Cotizaciones y Documentos</h1>
                            <p className="text-gray-500">Gestiona presupuestos, facturas proforma y órdenes de compra</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Estado o Tipo" />
                            </SelectTrigger>
                            <SelectContent className="bg-white shadow-xl">
                                <SelectItem value="ALL">Todos los Documentos</SelectItem>
                                <SelectItem value="QUOTE">📋 Solo Presupuestos</SelectItem>
                                <SelectItem value="PROFORMA">📑 Solo Proformas</SelectItem>
                                <SelectItem value="PURCHASE_ORDER">📦 Solo Órdenes de Compra</SelectItem>
                                <SelectItem value="Draft">Borradores</SelectItem>
                                <SelectItem value="SENT">Enviadas</SelectItem>
                                <SelectItem value="ACCEPTED">Aceptadas</SelectItem>
                                <SelectItem value="CONVERTED">Facturadas</SelectItem>
                                <SelectItem value="Cancelled">Canceladas</SelectItem>
                            </SelectContent>
                        </Select>

                        <DateRangePicker
                            date={dateRange}
                            setDate={setDateRange}
                        />

                        <Button
                            type="button"
                            onClick={() => setVoiceModalOpen(true)}
                            className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-md font-bold gap-2"
                        >
                            <Mic className="h-4 w-4 text-blue-200" />
                            <Sparkles className="h-4 w-4 text-amber-300" />
                            Cotizar por Voz (IA)
                        </Button>
                        <Button asChild className="bg-slate-900 hover:bg-slate-800 text-white shadow-md">
                            <Link href="/income/quotes/new">
                                <Plus className="mr-2 h-4 w-4" />
                                Nueva Cotización
                            </Link>
                        </Button>
                    </div>
                </div>

                <QuoteStats quotes={filteredQuotes} />

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-pulse flex flex-col items-center">
                            <div className="h-12 w-12 bg-gray-200 rounded-full mb-4"></div>
                            <div className="h-4 w-48 bg-gray-200 rounded"></div>
                        </div>
                    </div>
                ) : (
                    <div className="glass-card rounded-xl overflow-hidden border border-gray-100 shadow-sm">
                        <DataTable
                            data={filteredQuotes}
                            columns={columns}
                            searchKey="party_name"
                            searchPlaceholder="Buscar por cliente o número..."
                            onRowClick={(item) => router.push(`/income/quotes/${item.id}`)}
                        />
                    </div>
                )}
            </div>

            <VoiceQuoteModal
                open={voiceModalOpen}
                onOpenChange={setVoiceModalOpen}
            />

            {/* Confirm Delete Dialog */}
            <Dialog open={!!deleteId} onOpenChange={(open: boolean) => !open && setDeleteId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>¿Eliminar cotización?</DialogTitle>
                        <DialogDescription>
                            Esta acción no se puede deshacer. Se eliminará el registro de la cotización de forma permanente.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteId(null)} disabled={deleting}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleConfirmDelete}
                            disabled={deleting}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            {deleting ? "Eliminando..." : "Eliminar"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
