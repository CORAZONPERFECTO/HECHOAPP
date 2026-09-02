"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, doc, deleteDoc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Invoice } from "@/types/schema";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/income/status-badge";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft, Download, MoreHorizontal, Eye, Edit, Trash2, CheckCircle, Send, FileText } from "lucide-react";
import { exportToExcel, formatInvoiceForExport } from "@/lib/excel-utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/app-layout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

export default function InvoicesPage() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>("ALL");
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "invoices"), (snapshot) => {
            const data = snapshot.docs.map((docSnap) => ({
                id: docSnap.id,
                ...docSnap.data(),
            })) as Invoice[];

            // Sort newest first
            data.sort((a: any, b: any) => {
                const getMillis = (item: any) => {
                    if (item.issueDate?.toDate) return item.issueDate.toDate().getTime();
                    if (item.issueDate?.seconds) return item.issueDate.seconds * 1000;
                    if (item.createdAt?.toDate) return item.createdAt.toDate().getTime();
                    if (item.createdAt?.seconds) return item.createdAt.seconds * 1000;
                    if (item.date) return new Date(item.date).getTime();
                    return 0;
                };
                return getMillis(b) - getMillis(a);
            });

            setInvoices(data);
            setLoading(false);
        }, (error) => {
            console.error("Error subscribing to invoices:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleExport = () => {
        exportToExcel(formatInvoiceForExport(filteredInvoices), "Reporte_Facturas_Nexus");
    };

    // Filter invoices by status
    const filteredInvoices = invoices.filter((inv: any) => {
        if (statusFilter === "ALL") return true;
        return (inv.status || "DRAFT").toUpperCase() === statusFilter.toUpperCase();
    });

    // Delete Invoice Handler
    const handleConfirmDelete = async () => {
        if (!deleteId) return;
        setDeleting(true);
        try {
            await deleteDoc(doc(db, "invoices", deleteId));
            toast({
                title: "🗑️ Factura eliminada",
                description: "La factura ha sido eliminada del sistema con éxito.",
            });
            setDeleteId(null);
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error al eliminar", description: error.message });
        } finally {
            setDeleting(false);
        }
    };

    // Update Status Handler
    const handleUpdateStatus = async (invoiceId: string, newStatus: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await updateDoc(doc(db, "invoices", invoiceId), {
                status: newStatus,
                updatedAt: Timestamp.now()
            });
            toast({
                title: `✅ Estado actualizado a ${newStatus}`,
                description: "El cambio se ha registrado en tiempo real."
            });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error al actualizar estado", description: error.message });
        }
    };

    const columns = [
        {
            header: "Número",
            accessorKey: "number" as keyof Invoice,
            className: "font-bold text-gray-900",
            cell: (item: any) => item.number || `FAC-${item.id.slice(0, 6).toUpperCase()}`,
        },
        {
            header: "Cliente",
            accessorKey: "clientName" as keyof Invoice,
            cell: (item: any) => item.clientName || item.customer_name || item.party_name || "Cliente General",
        },
        {
            header: "Fecha",
            cell: (item: any) => {
                if (item.issueDate?.toDate) return item.issueDate.toDate().toLocaleDateString('es-DO');
                if (item.issueDate?.seconds) return new Date(item.issueDate.seconds * 1000).toLocaleDateString('es-DO');
                if (item.createdAt?.toDate) return item.createdAt.toDate().toLocaleDateString('es-DO');
                if (item.createdAt?.seconds) return new Date(item.createdAt.seconds * 1000).toLocaleDateString('es-DO');
                if (item.date) return new Date(item.date).toLocaleDateString('es-DO');
                return new Date().toLocaleDateString('es-DO');
            },
        },
        {
            header: "Total",
            cell: (item: any) => `${item.currency === 'USD' ? 'US$' : 'RD$'} ${(item.total ?? item.grand_total ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        },
        {
            header: "Balance",
            cell: (item: any) => `${item.currency === 'USD' ? 'US$' : 'RD$'} ${(item.balance ?? item.total ?? item.grand_total ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        },
        {
            header: "Estado",
            cell: (item: any) => <StatusBadge status={item.status || "DRAFT"} />,
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
                        <DropdownMenuContent align="end" className="w-52 bg-white shadow-lg">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => router.push(`/income/invoices/${item.id}`)} className="cursor-pointer">
                                <Eye className="mr-2 h-4 w-4 text-blue-500" />
                                Ver Detalle / Imprimir
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/income/invoices/${item.id}`)} className="cursor-pointer">
                                <Edit className="mr-2 h-4 w-4 text-amber-500" />
                                Editar Factura
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel className="text-xs text-gray-400 font-semibold uppercase">Cambiar Estado</DropdownMenuLabel>
                            <DropdownMenuItem onClick={(e) => handleUpdateStatus(item.id, "DRAFT", e)} className="cursor-pointer">
                                📝 Marcar como Borrador
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => handleUpdateStatus(item.id, "SENT", e)} className="cursor-pointer">
                                <Send className="mr-2 h-3.5 w-3.5 text-blue-500" /> Marcar como Enviada
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => handleUpdateStatus(item.id, "PAID", e)} className="cursor-pointer">
                                <CheckCircle className="mr-2 h-3.5 w-3.5 text-emerald-500" /> Marcar como Pagada
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => handleUpdateStatus(item.id, "CANCELLED", e)} className="cursor-pointer">
                                🚫 Marcar como Cancelada
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => setDeleteId(item.id)}
                                className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                            >
                                <Trash2 className="mr-2 h-4 w-4 text-red-500" />
                                Eliminar Factura
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
                            <h1 className="text-2xl font-bold text-gray-900">Facturas de Venta</h1>
                            <p className="text-gray-500">Gestiona tus facturas, estados de cobro y exportaciones</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Filtrar por Estado" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Todos los Estados</SelectItem>
                                <SelectItem value="DRAFT">Borrador</SelectItem>
                                <SelectItem value="SENT">Enviada</SelectItem>
                                <SelectItem value="PAID">Pagada</SelectItem>
                                <SelectItem value="OVERDUE">Vencida</SelectItem>
                                <SelectItem value="CANCELLED">Cancelada</SelectItem>
                            </SelectContent>
                        </Select>

                        <Button variant="outline" onClick={handleExport} className="gap-2">
                            <Download className="h-4 w-4" />
                            Exportar Excel
                        </Button>
                        <Link href="/income/invoices/new">
                            <Button className="bg-slate-900 hover:bg-slate-800 text-white shadow-md gap-2">
                                <Plus className="h-4 w-4" />
                                Nueva Factura
                            </Button>
                        </Link>
                    </div>
                </div>

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
                            data={filteredInvoices}
                            columns={columns}
                            searchKey="clientName"
                            searchPlaceholder="Buscar por cliente o número..."
                            onRowClick={(item) => router.push(`/income/invoices/${item.id}`)}
                        />
                    </div>
                )}
            </div>

            {/* Confirm Delete Dialog */}
            <Dialog open={!!deleteId} onOpenChange={(open: boolean) => !open && setDeleteId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>¿Eliminar factura?</DialogTitle>
                        <DialogDescription>
                            Esta acción no se puede deshacer. Se eliminará la factura de forma permanente de la base de datos.
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
