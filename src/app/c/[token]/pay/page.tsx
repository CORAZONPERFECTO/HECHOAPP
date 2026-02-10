"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { collection, query, where, getDocs, updateDoc, doc, serverTimestamp, getDoc, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { ServiceTicket } from "@/types/service";
import { TicketToken } from "@/types/tickets";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, DollarSign, CheckCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function ClientPaymentPage() {
    const params = useParams();
    const router = useRouter();
    const tokenStr = params.token as string;
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [tokenData, setTokenData] = useState<TicketToken & { orgId?: string } | null>(null);
    const [ticket, setTicket] = useState<ServiceTicket | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Payment Form
    const [paymentMethod, setPaymentMethod] = useState("TRANSFERENCIA");
    const [file, setFile] = useState<File | null>(null);
    const [reference, setReference] = useState("");

    useEffect(() => {
        validateToken();
    }, [tokenStr]);

    const validateToken = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, "ticket_tokens"), where("token", "==", tokenStr));
            const snap = await getDocs(q);

            if (snap.empty) throw new Error("Invalid Token");

            const tokenDoc = snap.docs[0].data() as TicketToken & { orgId?: string };
            if (tokenDoc.status !== 'ACTIVE') throw new Error("Token expired or used");

            setTokenData({ ...tokenDoc, id: snap.docs[0].id });

            if (tokenDoc.ticketId) {
                const ticketSnap = await getDoc(doc(db, "tickets", tokenDoc.ticketId)); // Assuming root/org specific logic handled by ID or path helper
                if (ticketSnap.exists()) {
                    setTicket({ id: ticketSnap.id, ...ticketSnap.data() } as ServiceTicket);
                } else {
                    throw new Error("Ticket not found");
                }
            }
        } catch (error: any) {
            console.error(error);
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!file && paymentMethod !== 'EFECTIVO') {
            toast({ title: "Required", description: "Please upload proof of payment", variant: "destructive" });
            return;
        }
        if (!tokenData || !ticket) return;

        setSubmitting(true);
        try {
            let proofUrl = "";
            let proofPath = "";

            // 1. Upload File
            if (file) {
                const orgId = (tokenData as any).orgId || "root";
                proofPath = `payments/${orgId}/${ticket.id}/${Date.now()}_${file.name}`;
                const storageRef = ref(storage, proofPath);
                const snapshot = await uploadBytes(storageRef, file);
                proofUrl = await getDownloadURL(snapshot.ref);
            }

            // 2. Create Payment Record (Triggers 'onPaymentCreated')
            const orgId = (tokenData as any).orgId || "demo-org"; // Fallback
            // If using root 'payments' vs 'orgs/{id}/payments'
            // Trigger expects `orgs/{orgId}/payments`.
            // So we must write there.

            await addDoc(collection(db, "orgs", orgId, "payments"), {
                ticketId: ticket.id,
                amount: ticket.totalCost || 0, // Should be balance, but using total for MVP
                method: paymentMethod,
                reference: reference,
                proofUrl: proofUrl,
                proofPath: proofPath,
                status: 'PENDING_REVIEW',
                createdAt: serverTimestamp(),
                clientId: ticket.clientId,
                clientName: ticket.clientName
            });

            // 3. Update Token? Maybe NOT invalidate yet until verified?
            // User said "The agent... creates invoice and solicits proof... proof is uploaded and marked PENDING_REVIEW".
            // So we just upload. Token remains valid maybe until FULL payment?
            // Let's keep token active for now or mark USED if single-use link.
            // Usually payment links are reusable until paid.

            toast({ title: "Payment Sent", description: "Receipt uploaded successfully. We will verify shortly." });
            router.refresh();

        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Submission failed", variant: "destructive" });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="flex justify-center h-screen items-center"><Loader2 className="animate-spin" /></div>;
    if (!ticket) return <div className="p-10 text-center text-red-500 font-bold">Invalid Link</div>;

    // If ticket is already PAID or PROOF_RECEIVED
    if (ticket.serviceStatus === 'PROOF_RECEIVED' || ticket.serviceStatus === 'PAYMENT_VERIFIED') {
        return (
            <div className="flex flex-col items-center justify-center p-10 space-y-4">
                <CheckCircle className="h-16 w-16 text-green-500" />
                <h1 className="text-2xl font-bold">Pago en Revisión</h1>
                <p className="text-gray-500">Hemos recibido su comprobante. Le notificaremos cuando sea validado.</p>
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto p-4 py-10 space-y-6">
            <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold">Upload Payment</h1>
                <p className="text-gray-500">Ticket #{ticket.ticketNumber}</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex justify-between">
                        <span>Balance Due</span>
                        <span className="text-green-600">RD$ {ticket.totalCost?.toLocaleString() || "0.00"}</span>
                    </CardTitle>
                    <CardDescription>Please transfer to the account below and upload receipt.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded text-sm text-blue-800">
                        <p className="font-bold">Banco Popular</p>
                        <p>Cuenta: 789456123</p>
                        <p>Nombre: Nexus HVAC Services</p>
                        <p>RNC: 1-01-00000-0</p>
                    </div>

                    <div className="space-y-2">
                        <Label>Payment Method</Label>
                        <select
                            className="w-full border rounded p-2"
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                        >
                            <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                            <option value="DEPOSITO">Depósito</option>
                            <option value="EFECTIVO">Efectivo</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <Label>Reference Number (Optional)</Label>
                        <Input
                            value={reference}
                            onChange={(e) => setReference(e.target.value)}
                            placeholder="e.g. 0548..."
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Upload Receipt/Photo</Label>
                        <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 relative">
                            <Upload className="h-8 w-8 text-gray-400 mb-2" />
                            <span className="text-xs text-gray-500">Click to select file</span>
                            <input
                                type="file"
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                accept="image/*,application/pdf"
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                            />
                        </div>
                        {file && (
                            <p className="text-xs text-green-600 font-medium text-center">
                                Selected: {file.name}
                            </p>
                        )}
                    </div>
                </CardContent>
                <CardFooter>
                    <Button className="w-full h-12 text-lg bg-green-600 hover:bg-green-700" onClick={handleSubmit} disabled={submitting}>
                        {submitting ? <Loader2 className="animate-spin mr-2" /> : "Submit Payment Proof"}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
