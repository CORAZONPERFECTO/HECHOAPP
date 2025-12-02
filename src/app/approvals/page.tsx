"use client";

import { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp, where } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { ApprovalRequest } from "@/types/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, Clock, DollarSign, AlertTriangle, ArrowLeft, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ApprovalsPage() {
    const [requests, setRequests] = useState<ApprovalRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string>("");
    const [currentUserName, setCurrentUserName] = useState<string>("");
    const [activeTab, setActiveTab] = useState("pending");
    const router = useRouter();

    useEffect(() => {
        const unsubAuth = auth.onAuthStateChanged((user) => {
            if (user) {
                setCurrentUserId(user.uid);
                setCurrentUserName(user.displayName || user.email || "Admin");
            }
        });

        const q = query(collection(db, "approvalRequests"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as ApprovalRequest[];
            setRequests(data);
            setLoading(false);
        });

        return () => {
            unsubAuth();
            unsubscribe();
        };
    }, []);

    const handleApprove = async (requestId: string) => {
        if (!currentUserId) return;

        try {
            await updateDoc(doc(db, "approvalRequests", requestId), {
                status: "APPROVED",
                reviewedBy: currentUserId,
                reviewedByName: currentUserName,
                reviewedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
        } catch (error) {
            console.error("Error approving request:", error);
            alert("Error al aprobar solicitud");
        }
    };

    const handleReject = async (requestId: string, notes?: string) => {
        if (!currentUserId) return;

        try {
            await updateDoc(doc(db, "approvalRequests", requestId), {
                status: "REJECTED",
                reviewedBy: currentUserId,
                reviewedByName: currentUserName,
                reviewedAt: serverTimestamp(),
                reviewNotes: notes || undefined,
                updatedAt: serverTimestamp(),
            });
        } catch (error) {
            console.error("Error rejecting request:", error);
            alert("Error al rechazar solicitud");
        }
    };

    const getTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            MATERIAL_PURCHASE: "Compra de Material",
            PRICE_CHANGE: "Cambio de Precio",
            SCOPE_CHANGE: "Cambio de Alcance",
            OVERTIME: "Horas Extra",
            OTHER: "Otro",
        };
        return labels[type] || type;
    };

    const getUrgencyColor = (urgency: string) => {
        switch (urgency) {
            case "HIGH":
                return "bg-red-100 text-red-800";
            case "MEDIUM":
                return "bg-yellow-100 text-yellow-800";
            case "LOW":
                return "bg-green-100 text-green-800";
            default:
                return "bg-gray-100 text-gray-800";
        }
    };

    const pendingRequests = requests.filter((r) => r.status === "PENDING");
    const approvedRequests = requests.filter((r) => r.status === "APPROVED");
    const rejectedRequests = requests.filter((r) => r.status === "REJECTED");

    const RequestCard = ({ request }: { request: ApprovalRequest }) => {
        const [rejectNotes, setRejectNotes] = useState("");
        const [showRejectForm, setShowRejectForm] = useState(false);

        return (
            <Card className="mb-4">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <CardTitle className="text-lg">{request.title}</CardTitle>
                                <Badge className={getUrgencyColor(request.urgency)}>
                                    {request.urgency === "HIGH" ? "Alta" : request.urgency === "MEDIUM" ? "Media" : "Baja"}
                                </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                                <span>Ticket: {request.ticketNumber}</span>
                                <span>•</span>
                                <span>Solicitado por: {request.requestedByName}</span>
                                <span>•</span>
                                <span>{new Date(request.createdAt.seconds * 1000).toLocaleString()}</span>
                            </div>
                        </div>
                        <Badge variant="outline">{getTypeLabel(request.type)}</Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-gray-700">{request.description}</p>

                    {request.amount && (
                        <div className="flex items-center gap-2 text-lg font-semibold text-green-700">
                            <DollarSign className="h-5 w-5" />
                            RD$ {request.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                    )}

                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/tickets/${request.ticketId}`)}
                            className="text-blue-600"
                        >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Ver Ticket
                        </Button>
                    </div>

                    {request.status === "PENDING" && (
                        <div className="flex gap-2 pt-2 border-t">
                            <Button onClick={() => handleApprove(request.id)} className="flex-1 bg-green-600 hover:bg-green-700">
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Aprobar
                            </Button>
                            <Button
                                onClick={() => setShowRejectForm(!showRejectForm)}
                                variant="destructive"
                                className="flex-1"
                            >
                                <XCircle className="mr-2 h-4 w-4" />
                                Rechazar
                            </Button>
                        </div>
                    )}

                    {showRejectForm && (
                        <div className="space-y-2 pt-2 border-t">
                            <Textarea
                                placeholder="Razón del rechazo (opcional)..."
                                value={rejectNotes}
                                onChange={(e) => setRejectNotes(e.target.value)}
                                className="min-h-[80px]"
                            />
                            <div className="flex gap-2">
                                <Button
                                    onClick={() => {
                                        handleReject(request.id, rejectNotes);
                                        setShowRejectForm(false);
                                        setRejectNotes("");
                                    }}
                                    variant="destructive"
                                    size="sm"
                                >
                                    Confirmar Rechazo
                                </Button>
                                <Button onClick={() => setShowRejectForm(false)} variant="outline" size="sm">
                                    Cancelar
                                </Button>
                            </div>
                        </div>
                    )}

                    {request.status !== "PENDING" && (
                        <div className="pt-2 border-t text-sm text-gray-600">
                            <p>
                                <strong>{request.status === "APPROVED" ? "Aprobado" : "Rechazado"}</strong> por{" "}
                                {request.reviewedByName} el{" "}
                                {request.reviewedAt && new Date(request.reviewedAt.seconds * 1000).toLocaleString()}
                            </p>
                            {request.reviewNotes && <p className="mt-1 italic">Notas: {request.reviewNotes}</p>}
                        </div>
                    )}
                </CardContent>
            </Card>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-5xl mx-auto space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => router.push("/")}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Volver
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Centro de Aprobaciones</h1>
                        <p className="text-gray-500">Revisa y gestiona solicitudes de los técnicos</p>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-12">Cargando solicitudes...</div>
                ) : (
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="grid w-full grid-cols-3 mb-6">
                            <TabsTrigger value="pending" className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                Pendientes ({pendingRequests.length})
                            </TabsTrigger>
                            <TabsTrigger value="approved" className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4" />
                                Aprobadas ({approvedRequests.length})
                            </TabsTrigger>
                            <TabsTrigger value="rejected" className="flex items-center gap-2">
                                <XCircle className="h-4 w-4" />
                                Rechazadas ({rejectedRequests.length})
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="pending">
                            {pendingRequests.length === 0 ? (
                                <Card>
                                    <CardContent className="py-12 text-center text-gray-500">
                                        <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                        <p>No hay solicitudes pendientes</p>
                                    </CardContent>
                                </Card>
                            ) : (
                                pendingRequests.map((request) => <RequestCard key={request.id} request={request} />)
                            )}
                        </TabsContent>

                        <TabsContent value="approved">
                            {approvedRequests.length === 0 ? (
                                <Card>
                                    <CardContent className="py-12 text-center text-gray-500">
                                        <p>No hay solicitudes aprobadas</p>
                                    </CardContent>
                                </Card>
                            ) : (
                                approvedRequests.map((request) => <RequestCard key={request.id} request={request} />)
                            )}
                        </TabsContent>

                        <TabsContent value="rejected">
                            {rejectedRequests.length === 0 ? (
                                <Card>
                                    <CardContent className="py-12 text-center text-gray-500">
                                        <p>No hay solicitudes rechazadas</p>
                                    </CardContent>
                                </Card>
                            ) : (
                                rejectedRequests.map((request) => <RequestCard key={request.id} request={request} />)
                            )}
                        </TabsContent>
                    </Tabs>
                )}
            </div>
        </div>
    );
}
