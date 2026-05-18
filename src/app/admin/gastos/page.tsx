"use client";

import { useState, useEffect } from "react";
import { collection, query, getDocs, orderBy, getDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Purchase } from "@/types/purchase";
import { Ticket } from "@/types/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Download, ExternalLink, Image as ImageIcon, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CentroCostosTab } from "@/components/finance/centro-costos-tab";

// Interfaz extendida para mostrar los datos en la tabla
interface PurchaseWithClient extends Purchase {
    clientName?: string;
    userName?: string;
}

export default function GastosPage() {
    const [purchases, setPurchases] = useState<PurchaseWithClient[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState("centro-costos");

    useEffect(() => {
        fetchPurchases();
    }, []);

    const fetchPurchases = async () => {
        setLoading(true);
        try {
            // Obtener todas las compras, ordenadas por fecha de creación
            const q = query(collection(db, "purchases"), orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(q);
            
            const fetchedPurchases: PurchaseWithClient[] = [];
            
            for (const docSnap of querySnapshot.docs) {
                const purchaseData = { id: docSnap.id, ...docSnap.data() } as PurchaseWithClient;
                
                // Obtener datos del ticket para el nombre del cliente
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
                
                // Obtener datos del usuario
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

    const handleDownloadImage = async (url: string, ticketNumber: string, date: string) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `Factura_Ticket_${ticketNumber || 'S-N'}_${date.replace(/[^a-zA-Z0-9]/g, '_')}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error("Error al descargar la imagen", error);
            // Si falla el CORS (Firebase Storage), abrimos en nueva pestaña
            window.open(url, '_blank');
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Control de Gastos (Técnicos)</h1>
                    <p className="text-gray-500 mt-1">Supervisa todas las compras y facturas registradas en la calle.</p>
                </div>
                <Button onClick={fetchPurchases} variant="outline" className="gap-2">
                    <FileText className="h-4 w-4" />
                    Exportar Excel
                </Button>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4 bg-white border">
                    <TabsTrigger value="centro-costos">Centro de Costos (OPEX)</TabsTrigger>
                    <TabsTrigger value="tickets">Compras de Tickets (Técnicos)</TabsTrigger>
                </TabsList>

                <TabsContent value="centro-costos">
                    <CentroCostosTab />
                </TabsContent>

                <TabsContent value="tickets">
                    <Card className="border-slate-200 shadow-sm rounded-xl overflow-hidden">
                        <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Ticket / Cliente</TableHead>
                                <TableHead>Técnico</TableHead>
                                <TableHead>Proveedor / Concepto</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                                <TableHead className="text-center">Factura</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-48 text-center">
                                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500" />
                                        <p className="mt-2 text-gray-500">Cargando registros de gastos...</p>
                                    </TableCell>
                                </TableRow>
                            ) : purchases.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center text-gray-500">
                                        No hay gastos registrados.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                purchases.map((purchase) => (
                                    <TableRow key={purchase.id} className="hover:bg-slate-50">
                                        <TableCell className="whitespace-nowrap font-medium text-sm text-gray-600">
                                            {formatDate(purchase.date || purchase.createdAt)}
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-semibold text-blue-700">
                                                <a href={`/tickets/${purchase.ticketId}`} className="hover:underline flex items-center gap-1" target="_blank">
                                                    #{purchase.ticketNumber || 'S/N'}
                                                    <ExternalLink className="h-3 w-3" />
                                                </a>
                                            </div>
                                            <div className="text-xs text-gray-500 truncate max-w-[200px]" title={purchase.clientName}>
                                                {purchase.clientName || 'Cliente no encontrado'}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-200">
                                                {purchase.userName || 'Usuario Oculto'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">{purchase.providerName || 'No especificado'}</div>
                                            <div className="text-xs text-gray-500">
                                                {purchase.items?.length || 0} artículo(s)
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-gray-900">
                                            {formatMoney(purchase.total)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {purchase.evidenceUrls && purchase.evidenceUrls.length > 0 ? (
                                                <div className="flex justify-center gap-2">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                                        onClick={() => setSelectedImage(purchase.evidenceUrls[0])}
                                                        title="Ver Imagen"
                                                    >
                                                        <ImageIcon className="h-4 w-4" />
                                                    </Button>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        className="h-8 w-8 p-0 text-green-600 hover:text-green-800 hover:bg-green-50"
                                                        onClick={() => handleDownloadImage(
                                                            purchase.evidenceUrls[0], 
                                                            purchase.ticketNumber || '', 
                                                            formatDate(purchase.createdAt)
                                                        )}
                                                        title="Descargar"
                                                    >
                                                        <Download className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-400 italic">Sin foto</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>
            </TabsContent>
        </Tabs>

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
        </div>
    );
}
