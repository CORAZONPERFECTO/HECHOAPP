"use client";

import { useState, useEffect } from "react";
import { collection, query, getDocs, orderBy, getDoc, doc, addDoc, Timestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Purchase, ExpenseType } from "@/types/purchase";
import { Ticket } from "@/types/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
    Loader2, 
    Download, 
    ExternalLink, 
    Image as ImageIcon, 
    FileText, 
    Printer, 
    QrCode, 
    Plus, 
    RefreshCw, 
    CheckCircle2, 
    Fuel, 
    Building2, 
    Layers, 
    FileSpreadsheet,
    Zap,
    Send
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CentroCostosTab } from "@/components/finance/centro-costos-tab";
import { ReceiptPrintModal } from "@/components/finance/receipt-print-modal";
import { DgiiQrScanner, DgiiQrParseResult } from "@/components/finance/dgii-qr-scanner";
import { exportFormato606Txt, exportFormato606Excel, buildFormato606 } from "@/lib/dgii-tax-service";

interface PurchaseWithClient extends Purchase {
    clientName?: string;
    userName?: string;
}

export default function GastosPage() {
    const [purchases, setPurchases] = useState<PurchaseWithClient[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [selectedPurchaseForPrint, setSelectedPurchaseForPrint] = useState<PurchaseWithClient | null>(null);
    const [activeTab, setActiveTab] = useState("tickets");

    // QR & New Expense Modal
    const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
    const [isNewExpenseOpen, setIsNewExpenseOpen] = useState(false);
    const [isAlegraSyncing, setIsAlegraSyncing] = useState(false);

    // Form state for creating expense
    const [expenseForm, setExpenseForm] = useState({
        expenseType: "OPEX_TICKET" as ExpenseType,
        providerName: "",
        rnc: "",
        eNcf: "",
        ncf: "",
        buyerRnc: "131947532",
        buyerName: "HECHO SRL",
        subtotal: 0,
        tax: 0,
        total: 0,
        paymentMethod: "CARD" as 'CASH' | 'TRANSFER' | 'CARD',
        ticketId: "",
        ticketNumber: "",
        notes: "",
        assetCategory: "HVAC_EQUIPMENT",
        assetModel: "",
        serialNumber: "",
        estimatedUsefulMonths: 60,
        vehiclePlate: "",
        fuelGallons: 0,
        odometerKm: 0
    });

    useEffect(() => {
        fetchPurchases();
    }, []);

    const fetchPurchases = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, "purchases"), orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(q);
            const fetchedPurchases: PurchaseWithClient[] = [];
            
            for (const docSnap of querySnapshot.docs) {
                const purchaseData = { id: docSnap.id, ...docSnap.data() } as PurchaseWithClient;
                
                if (purchaseData.ticketId) {
                    const ticketDoc = await getDoc(doc(db, "tickets", purchaseData.ticketId));
                    if (ticketDoc.exists()) {
                        const ticketData = ticketDoc.data() as Ticket;
                        purchaseData.clientName = ticketData.clientName;
                        if (!purchaseData.ticketNumber) {
                            purchaseData.ticketNumber = ticketData.ticketNumber || ticketData.id?.slice(0, 8);
                        }
                    }
                }
                
                if (purchaseData.createdByUserId) {
                    const userDoc = await getDoc(doc(db, "users", purchaseData.createdByUserId));
                    if (userDoc.exists()) {
                        purchaseData.userName = userDoc.data().name || userDoc.data().email;
                    }
                }
                
                fetchedPurchases.push(purchaseData);
            }
            
            setPurchases(fetchedPurchases);
        } catch (error) {
            console.error("Error al cargar gastos:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleQrScanSuccess = (result: DgiiQrParseResult) => {
        setIsQrScannerOpen(false);
        setExpenseForm(prev => ({
            ...prev,
            rnc: result.rncEmisor || prev.rnc,
            eNcf: result.eNcf || prev.eNcf,
            ncf: result.ncf || prev.ncf,
            total: result.totalAmount || prev.total,
            tax: result.taxAmount || prev.tax,
            subtotal: (result.totalAmount && result.taxAmount) ? (result.totalAmount - result.taxAmount) : prev.subtotal,
            notes: result.securityCode ? `Código Seguridad e-CF: ${result.securityCode}` : prev.notes
        }));
        setIsNewExpenseOpen(true);
    };

    const handleCreateExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        const user = auth.currentUser;
        if (!user) return;

        try {
            const newPurchaseData: any = {
                expenseType: expenseForm.expenseType,
                providerName: expenseForm.providerName || "Proveedor General",
                rnc: expenseForm.rnc,
                eNcf: expenseForm.eNcf,
                ncf: expenseForm.ncf,
                buyerRnc: expenseForm.buyerRnc || "131947532",
                buyerName: expenseForm.buyerName || "HECHO SRL",
                status: "ACEPTADA",
                date: Timestamp.now(),
                subtotal: Number(expenseForm.subtotal || (expenseForm.total - expenseForm.tax)),
                tax: Number(expenseForm.tax),
                total: Number(expenseForm.total),
                paymentMethod: expenseForm.paymentMethod,
                ticketId: expenseForm.ticketId || "",
                ticketNumber: expenseForm.ticketNumber || "",
                notes: expenseForm.notes,
                evidenceUrls: [],
                createdByUserId: user.uid,
                createdAt: Timestamp.now(),
                items: [
                    {
                        description: expenseForm.providerName ? `Compra ${expenseForm.providerName}` : "Gasto general",
                        quantity: 1,
                        unitPrice: Number(expenseForm.total),
                        total: Number(expenseForm.total),
                        isInventory: expenseForm.expenseType === "OPEX_TICKET"
                    }
                ]
            };

            if (expenseForm.expenseType === "CAPEX_EQUIPO") {
                newPurchaseData.assetDetails = {
                    assetCategory: expenseForm.assetCategory,
                    assetModel: expenseForm.assetModel,
                    serialNumber: expenseForm.serialNumber,
                    estimatedUsefulMonths: Number(expenseForm.estimatedUsefulMonths || 60),
                    monthlyDepreciation: Number(expenseForm.total) / Number(expenseForm.estimatedUsefulMonths || 60)
                };
            }

            if (expenseForm.expenseType === "COMBUSTIBLE") {
                newPurchaseData.vehicleDetails = {
                    vehiclePlate: expenseForm.vehiclePlate,
                    fuelGallons: Number(expenseForm.fuelGallons),
                    odometerKm: Number(expenseForm.odometerKm)
                };
            }

            await addDoc(collection(db, "purchases"), newPurchaseData);
            setIsNewExpenseOpen(false);
            await fetchPurchases();
        } catch (error: any) {
            alert("Error al registrar gasto: " + error.message);
        }
    };

    const handleSyncAlegra = async () => {
        setIsAlegraSyncing(true);
        try {
            const res = await fetch("/api/alegra/sync", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "sync_purchases" })
            });
            const data = await res.json();
            if (data.success) {
                alert("¡Sincronización con Alegra completada exitosamente!");
            } else {
                alert("Aviso de sincronización: " + (data.message || "Verifique credenciales de Alegra"));
            }
        } catch (err: any) {
            alert("Error al sincronizar con Alegra: " + err.message);
        } finally {
            setIsAlegraSyncing(false);
        }
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return "Sin fecha";
        const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
        return new Intl.DateTimeFormat('es-DO', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        }).format(date);
    };

    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('es-DO', {
            style: 'currency',
            currency: 'DOP'
        }).format(amount || 0);
    };

    // Filter by Tab
    const filteredPurchases = purchases.filter(p => {
        if (activeTab === "tickets") return !p.expenseType || p.expenseType === "OPEX_TICKET";
        if (activeTab === "capex") return p.expenseType === "CAPEX_EQUIPO";
        if (activeTab === "combustible") return p.expenseType === "COMBUSTIBLE";
        if (activeTab === "dgii-606") return true;
        return true;
    });

    const totalFiltered = filteredPurchases.reduce((acc, p) => acc + (p.total || 0), 0);
    const totalItbisFiltered = filteredPurchases.reduce((acc, p) => acc + (p.tax || 0), 0);

    return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl shadow-xl">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="px-2.5 py-0.5 bg-indigo-500/30 text-indigo-300 text-[10px] font-black rounded-full uppercase tracking-wider border border-indigo-400/30">
                            Gestión Fiscal & Contable 2026
                        </span>
                        <Badge variant="outline" className="text-emerald-400 border-emerald-500/40 text-[10px]">
                            RNC: 131947532
                        </Badge>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight">Control de Gastos, CAPEX & Formato 606</h1>
                    <p className="text-xs md:text-sm text-slate-300 mt-1">
                        Supervisa compras de tickets, activos depreciables, lectura de QR DGII e-CF y exportación fiscal.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Button 
                        onClick={() => setIsQrScannerOpen(true)} 
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg gap-2 text-xs h-10"
                    >
                        <QrCode className="w-4 h-4" /> Escanear QR DGII
                    </Button>
                    <Button 
                        onClick={() => setIsNewExpenseOpen(true)} 
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-lg gap-2 text-xs h-10"
                    >
                        <Plus className="w-4 h-4" /> Registrar Gasto
                    </Button>
                </div>
            </div>

            {/* Metric KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="rounded-2xl border-slate-200 shadow-sm">
                    <CardContent className="p-4 space-y-1">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                            <Layers className="w-3.5 h-3.5 text-blue-600" /> Total Filtrado
                        </span>
                        <div className="text-xl font-black text-slate-900">{formatMoney(totalFiltered)}</div>
                        <span className="text-[10px] text-slate-400">{filteredPurchases.length} comprobantes</span>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200 shadow-sm">
                    <CardContent className="p-4 space-y-1">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                            <Zap className="w-3.5 h-3.5 text-indigo-600" /> ITBIS Facturado
                        </span>
                        <div className="text-xl font-black text-indigo-600">{formatMoney(totalItbisFiltered)}</div>
                        <span className="text-[10px] text-slate-400">Adelanto fiscal 606</span>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200 shadow-sm">
                    <CardContent className="p-4 space-y-1">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5 text-amber-600" /> CAPEX Activos
                        </span>
                        <div className="text-xl font-black text-amber-700">
                            {formatMoney(purchases.filter(p => p.expenseType === "CAPEX_EQUIPO").reduce((acc, p) => acc + (p.total || 0), 0))}
                        </div>
                        <span className="text-[10px] text-slate-400">Equipos & Herramientas</span>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200 shadow-sm">
                    <CardContent className="p-4 space-y-1">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                            <Fuel className="w-3.5 h-3.5 text-rose-600" /> Combustible
                        </span>
                        <div className="text-xl font-black text-rose-700">
                            {formatMoney(purchases.filter(p => p.expenseType === "COMBUSTIBLE").reduce((acc, p) => acc + (p.total || 0), 0))}
                        </div>
                        <span className="text-[10px] text-slate-400">Control de Flotilla</span>
                    </CardContent>
                </Card>
            </div>

            {/* Main Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
                    <TabsList className="bg-white border rounded-2xl p-1 shadow-sm">
                        <TabsTrigger value="tickets" className="rounded-xl text-xs font-bold">OPEX Tickets (Materiales)</TabsTrigger>
                        <TabsTrigger value="capex" className="rounded-xl text-xs font-bold">CAPEX (Equipos & Activos)</TabsTrigger>
                        <TabsTrigger value="combustible" className="rounded-xl text-xs font-bold">Combustible</TabsTrigger>
                        <TabsTrigger value="dgii-606" className="rounded-xl text-xs font-bold flex items-center gap-1">
                            <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" /> Formato 606 & Fiscal
                        </TabsTrigger>
                        <TabsTrigger value="centro-costos" className="rounded-xl text-xs font-bold">Estructura Fija</TabsTrigger>
                    </TabsList>

                    <div className="flex items-center gap-2">
                        <Button 
                            onClick={() => exportFormato606Txt(purchases, "131947532")} 
                            variant="outline" 
                            size="sm" 
                            className="rounded-xl text-xs font-bold gap-1 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                        >
                            <Download className="w-3.5 h-3.5" /> TXT 606 (DGII)
                        </Button>
                        <Button 
                            onClick={() => exportFormato606Excel(purchases, "131947532")} 
                            variant="outline" 
                            size="sm" 
                            className="rounded-xl text-xs font-bold gap-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                        >
                            <FileSpreadsheet className="w-3.5 h-3.5" /> Excel 606
                        </Button>
                        <Button 
                            onClick={handleSyncAlegra} 
                            disabled={isAlegraSyncing}
                            variant="outline" 
                            size="sm" 
                            className="rounded-xl text-xs font-bold gap-1 border-blue-200 text-blue-700 hover:bg-blue-50"
                        >
                            {isAlegraSyncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} 
                            Alegra Sync
                        </Button>
                    </div>
                </div>

                <TabsContent value="centro-costos">
                    <CentroCostosTab />
                </TabsContent>

                {/* Table for Tickets, CAPEX, Combustible, DGII-606 */}
                {(activeTab === "tickets" || activeTab === "capex" || activeTab === "combustible" || activeTab === "dgii-606") && (
                    <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-50">
                                    <TableRow>
                                        <TableHead>Fecha</TableHead>
                                        <TableHead>Tipo / Comprobante</TableHead>
                                        <TableHead>Ticket / Destino</TableHead>
                                        <TableHead>Proveedor & RNC</TableHead>
                                        <TableHead className="text-right">Subtotal</TableHead>
                                        <TableHead className="text-right">ITBIS</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                        <TableHead className="text-center">Soporte</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="h-48 text-center">
                                                <Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-500" />
                                                <p className="mt-2 text-slate-500 text-xs">Cargando compras y comprobantes fiscales...</p>
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredPurchases.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="h-32 text-center text-slate-500 text-xs">
                                                No hay gastos registrados en esta categoría.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredPurchases.map((purchase) => {
                                            const ncfNumber = purchase.eNcf || purchase.ncf || purchase.dgiiData?.eNcf || purchase.dgiiData?.ncf;
                                            const isElectronic = ncfNumber?.toUpperCase().startsWith("E");

                                            return (
                                                <TableRow key={purchase.id} className="hover:bg-slate-50">
                                                    <TableCell className="whitespace-nowrap font-medium text-xs text-slate-600">
                                                        {formatDate(purchase.date || purchase.createdAt)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col gap-0.5">
                                                            <div className="flex items-center gap-1">
                                                                {isElectronic ? (
                                                                    <Badge className="bg-indigo-100 text-indigo-800 text-[10px] px-1.5 py-0 border-indigo-200">
                                                                        e-CF {ncfNumber}
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                                                        {ncfNumber || "Gasto Menor"}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <span className="text-[10px] text-slate-400 font-semibold">
                                                                {purchase.expenseType === "CAPEX_EQUIPO" ? "CAPEX Activo" : 
                                                                 purchase.expenseType === "COMBUSTIBLE" ? "Combustible" : "OPEX Materiales"}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {purchase.ticketId ? (
                                                            <div>
                                                                <a href={`/tickets/${purchase.ticketId}`} className="text-xs font-bold text-blue-700 hover:underline flex items-center gap-1" target="_blank">
                                                                    #{purchase.ticketNumber || 'Ticket'}
                                                                    <ExternalLink className="h-3 w-3" />
                                                                </a>
                                                                <div className="text-[11px] text-slate-500 truncate max-w-[150px]">
                                                                    {purchase.clientName || 'Cliente'}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-slate-500">Operación Central</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="font-semibold text-xs text-slate-900">{purchase.providerName || 'No especificado'}</div>
                                                        {purchase.rnc && (
                                                            <div className="text-[10px] font-mono text-slate-500">RNC: {purchase.rnc}</div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right text-xs font-mono text-slate-600">
                                                        {formatMoney(purchase.subtotal || (purchase.total - purchase.tax))}
                                                    </TableCell>
                                                    <TableCell className="text-right text-xs font-mono text-indigo-700 font-semibold">
                                                        {formatMoney(purchase.tax || 0)}
                                                    </TableCell>
                                                    <TableCell className="text-right font-bold text-xs text-slate-900 font-mono">
                                                        {formatMoney(purchase.total)}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {purchase.evidenceUrls && purchase.evidenceUrls.length > 0 ? (
                                                            <div className="flex justify-center items-center gap-1">
                                                                <Button 
                                                                    variant="outline" 
                                                                    size="sm" 
                                                                    className="h-7 text-[11px] font-bold text-blue-700 border-blue-200 hover:bg-blue-50 rounded-lg px-2"
                                                                    onClick={() => setSelectedPurchaseForPrint(purchase)}
                                                                >
                                                                    <Printer className="h-3 w-3 mr-1 text-blue-600" /> Limpiar
                                                                </Button>
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="sm" 
                                                                    className="h-7 w-7 p-0 text-slate-500 hover:text-slate-800 rounded-lg"
                                                                    onClick={() => setSelectedImage(purchase.evidenceUrls[0])}
                                                                >
                                                                    <ImageIcon className="h-3.5 w-3.5" />
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <span className="text-[10px] text-slate-400 italic">Sin foto</span>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>
                )}
            </Tabs>

            {/* Modal: Escáner QR DGII */}
            <Dialog open={isQrScannerOpen} onOpenChange={setIsQrScannerOpen}>
                <DialogContent className="sm:max-w-md p-0 overflow-hidden border-0 bg-transparent shadow-none">
                    <DgiiQrScanner 
                        onScanSuccess={handleQrScanSuccess} 
                        onClose={() => setIsQrScannerOpen(false)} 
                    />
                </DialogContent>
            </Dialog>

            {/* Modal: Registrar Nuevo Gasto / Compra */}
            <Dialog open={isNewExpenseOpen} onOpenChange={setIsNewExpenseOpen}>
                <DialogContent className="sm:max-w-lg bg-white rounded-3xl p-6">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                            <Plus className="w-5 h-5 text-emerald-600" /> Registrar Compra o Gasto Fiscal
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            Completa los datos fiscales. Si escaneaste un QR de la DGII, los campos ya fueron autocompletados.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreateExpense} className="space-y-4 pt-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs font-bold">Tipo de Egreso</Label>
                                <select 
                                    className="w-full border rounded-xl p-2 text-xs bg-white h-9"
                                    value={expenseForm.expenseType}
                                    onChange={(e) => setExpenseForm({ ...expenseForm, expenseType: e.target.value as ExpenseType })}
                                >
                                    <option value="OPEX_TICKET">OPEX Ticket (Materiales)</option>
                                    <option value="OPEX_GENERAL">OPEX General (Almacén/Servicios)</option>
                                    <option value="CAPEX_EQUIPO">CAPEX (Equipos HVAC / Activos)</option>
                                    <option value="COMBUSTIBLE">Combustible & Flotilla</option>
                                </select>
                            </div>
                            <div>
                                <Label className="text-xs font-bold">Forma de Pago</Label>
                                <select 
                                    className="w-full border rounded-xl p-2 text-xs bg-white h-9"
                                    value={expenseForm.paymentMethod}
                                    onChange={(e) => setExpenseForm({ ...expenseForm, paymentMethod: e.target.value as any })}
                                >
                                    <option value="CARD">Tarjeta de Crédito / Débito</option>
                                    <option value="TRANSFER">Transferencia Bancaria</option>
                                    <option value="CASH">Efectivo / Caja Chica</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs font-bold">Proveedor / Ferretería</Label>
                                <Input 
                                    className="h-9 text-xs" 
                                    placeholder="Ej: Ferretería Ochoa"
                                    value={expenseForm.providerName}
                                    onChange={(e) => setExpenseForm({ ...expenseForm, providerName: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <Label className="text-xs font-bold">RNC Proveedor</Label>
                                <Input 
                                    className="h-9 text-xs font-mono" 
                                    placeholder="Ej: 101010101"
                                    value={expenseForm.rnc}
                                    onChange={(e) => setExpenseForm({ ...expenseForm, rnc: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs font-bold">e-NCF / NCF</Label>
                                <Input 
                                    className="h-9 text-xs font-mono" 
                                    placeholder="Ej: E3100000001 o B01..."
                                    value={expenseForm.eNcf || expenseForm.ncf}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val.toUpperCase().startsWith("E")) {
                                            setExpenseForm({ ...expenseForm, eNcf: val, ncf: "" });
                                        } else {
                                            setExpenseForm({ ...expenseForm, ncf: val, eNcf: "" });
                                        }
                                    }}
                                />
                            </div>
                            <div>
                                <Label className="text-xs font-bold">Ticket ID (Opcional)</Label>
                                <Input 
                                    className="h-9 text-xs font-mono" 
                                    placeholder="Ej: #12345"
                                    value={expenseForm.ticketNumber}
                                    onChange={(e) => setExpenseForm({ ...expenseForm, ticketNumber: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="p-3 bg-slate-50 border rounded-2xl space-y-2">
                            <div className="font-bold text-xs text-slate-800">Desglose Monetario (RD$)</div>
                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <Label className="text-[11px]">Subtotal</Label>
                                    <Input 
                                        type="number"
                                        className="h-8 text-xs font-mono"
                                        value={expenseForm.subtotal}
                                        onChange={(e) => {
                                            const sub = Number(e.target.value);
                                            setExpenseForm({ ...expenseForm, subtotal: sub, total: sub + expenseForm.tax });
                                        }}
                                    />
                                </div>
                                <div>
                                    <Label className="text-[11px]">ITBIS</Label>
                                    <Input 
                                        type="number"
                                        className="h-8 text-xs font-mono"
                                        value={expenseForm.tax}
                                        onChange={(e) => {
                                            const tx = Number(e.target.value);
                                            setExpenseForm({ ...expenseForm, tax: tx, total: expenseForm.subtotal + tx });
                                        }}
                                    />
                                </div>
                                <div>
                                    <Label className="text-[11px] font-bold text-slate-900">Total</Label>
                                    <Input 
                                        type="number"
                                        className="h-8 text-xs font-mono font-bold"
                                        value={expenseForm.total}
                                        onChange={(e) => {
                                            const tot = Number(e.target.value);
                                            setExpenseForm({ ...expenseForm, total: tot, subtotal: Math.max(0, tot - expenseForm.tax) });
                                        }}
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {expenseForm.expenseType === "CAPEX_EQUIPO" && (
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl space-y-2 text-xs">
                                <div className="font-bold text-amber-900">Datos del Activo (CAPEX / Amortización):</div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <Label className="text-[10px]">Modelo / Capacidad</Label>
                                        <Input 
                                            className="h-8 text-xs bg-white" 
                                            placeholder="Ej: Inverter 18k BTU"
                                            value={expenseForm.assetModel}
                                            onChange={(e) => setExpenseForm({ ...expenseForm, assetModel: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-[10px]">No. Serie</Label>
                                        <Input 
                                            className="h-8 text-xs bg-white font-mono" 
                                            placeholder="SN-123456"
                                            value={expenseForm.serialNumber}
                                            onChange={(e) => setExpenseForm({ ...expenseForm, serialNumber: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {expenseForm.expenseType === "COMBUSTIBLE" && (
                            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl space-y-2 text-xs">
                                <div className="font-bold text-rose-900">Auditoría de Combustible:</div>
                                <div className="grid grid-cols-3 gap-2">
                                    <div>
                                        <Label className="text-[10px]">Placa Vehículo</Label>
                                        <Input 
                                            className="h-8 text-xs bg-white uppercase font-mono" 
                                            placeholder="L-123456"
                                            value={expenseForm.vehiclePlate}
                                            onChange={(e) => setExpenseForm({ ...expenseForm, vehiclePlate: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-[10px]">Galones</Label>
                                        <Input 
                                            type="number"
                                            className="h-8 text-xs bg-white" 
                                            value={expenseForm.fuelGallons}
                                            onChange={(e) => setExpenseForm({ ...expenseForm, fuelGallons: Number(e.target.value) })}
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-[10px]">Kilometraje (Km)</Label>
                                        <Input 
                                            type="number"
                                            className="h-8 text-xs bg-white" 
                                            value={expenseForm.odometerKm}
                                            onChange={(e) => setExpenseForm({ ...expenseForm, odometerKm: Number(e.target.value) })}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-2 pt-3 border-t">
                            <Button type="button" variant="ghost" onClick={() => setIsNewExpenseOpen(false)}>Cancelar</Button>
                            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs">
                                Guardar Comprobante
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal de Foto Original */}
            <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
                <DialogContent className="sm:max-w-3xl border-0 p-0 overflow-hidden bg-black/95">
                    <DialogHeader className="p-4 bg-gradient-to-b from-black/80 to-transparent absolute top-0 w-full z-10">
                        <DialogTitle className="text-white">Factura Original</DialogTitle>
                    </DialogHeader>
                    {selectedImage && (
                        <div className="w-full h-full min-h-[500px] flex items-center justify-center p-4 pt-16">
                            <img 
                                src={selectedImage} 
                                alt="Factura de la compra" 
                                className="max-w-full max-h-[80vh] object-contain rounded-md"
                            />
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Modal de Impresión con Fondo Blanco */}
            <ReceiptPrintModal
                open={!!selectedPurchaseForPrint}
                onOpenChange={(open) => !open && setSelectedPurchaseForPrint(null)}
                purchase={selectedPurchaseForPrint}
                ticketNumber={selectedPurchaseForPrint?.ticketNumber}
                clientName={selectedPurchaseForPrint?.clientName}
            />
        </div>
    );
}
