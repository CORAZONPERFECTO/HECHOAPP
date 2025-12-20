"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { collection, query, where, getDocs, updateDoc, doc, serverTimestamp, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ServiceTicket } from "@/types/service";
import { TicketToken } from "@/types/tickets";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, FileSignature } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function ClientApprovalPage() {
    const params = useParams();
    const router = useRouter();
    const tokenStr = params.token as string;
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [tokenData, setTokenData] = useState<TicketToken | null>(null);
    const [ticket, setTicket] = useState<ServiceTicket | null>(null);
    const [accepted, setAccepted] = useState(false);
    const [signature, setSignature] = useState(""); // Simple text signature for MVP
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        validateToken();
    }, [tokenStr]);

    const validateToken = async () => {
        setLoading(true);
        try {
            // 1. Find Token (assuming globally unique or collection group)
            // For MVP, query collection 'ticket_tokens' (if root) or find where?
            // "TicketToken" interface exists. Let's assume root `ticket_tokens` collection for lookup.
            const q = query(collection(db, "ticket_tokens"), where("token", "==", tokenStr));
            const snap = await getDocs(q);

            if (snap.empty) {
                throw new Error("Invalid Token");
            }

            const tokenDoc = snap.docs[0].data() as TicketToken;

            // Check expiry if exists
            if (tokenDoc.status !== 'ACTIVE') {
                throw new Error("Token expired or used");
            }

            setTokenData({ ...tokenDoc, id: snap.docs[0].id });

            // 2. Fetch Ticket
            if (tokenDoc.ticketId) {
                const ticketSnap = await getDoc(doc(db, "tickets", tokenDoc.ticketId)); // Root tickets?
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

    const handleAccept = async () => {
        if (!accepted || !signature || signature.length < 3) {
            toast({ title: "Validation", description: "Please accept terms and sign with your full name.", variant: "destructive" });
            return;
        }
        if (!tokenData || !ticket) return;

        setSubmitting(true);
        try {
            // 1. Update Ticket
            await updateDoc(doc(db, "tickets", ticket.id), {
                serviceStatus: 'CLIENT_ACCEPTED',
                clientSignature: signature,
                updatedAt: serverTimestamp()
            });

            // 2. Invalidate Token
            if (tokenData.id) {
                await updateDoc(doc(db, "ticket_tokens", tokenData.id), {
                    status: 'USED'
                });
            }

            // 3. Log Acceptance Metadata (Audit)
            // Ideally we get IP via Cloud Function or server component, client side is limited.
            // Storing timestamp and signature is key.
            await addDoc(collection(db, "tickets", ticket.id, "timeline"), {
                type: 'STATUS_CHANGE',
                description: `Client accepted quote. Signed by: ${signature}`,
                timestamp: serverTimestamp(),
                userId: 'CLIENT'
            });

            toast({ title: "Success", description: "Quote accepted! Technician will be notified." });

            // Redirect to success or payment?
            // If payment is required upfront? Logic engine decides. 
            // For now, simple success screen.
            router.refresh();

        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Submission failed", variant: "destructive" });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="flex justify-center h-screen items-center"><Loader2 className="animate-spin" /></div>;
    if (!ticket) return <div className="p-10 text-center text-red-500 font-bold">Invalid Link or Expired</div>;

    // Check if already accepted to show Success State
    if (ticket.serviceStatus === 'CLIENT_ACCEPTED' || ticket.serviceStatus === 'WORK_AUTHORIZED') {
        return (
            <div className="flex flex-col items-center justify-center p-10 space-y-4">
                <CheckCircle className="h-16 w-16 text-green-500" />
                <h1 className="text-2xl font-bold">Servicio Aprobado</h1>
                <p className="text-gray-500">Gracias por su confirmación. El técnico procederá con el trabajo.</p>
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto p-4 py-10 space-y-6">
            <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold">Review & Approve</h1>
                <p className="text-gray-500">Service Request #{ticket.ticketNumber}</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Service Quote</CardTitle>
                    <CardDescription>Please review the details below</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Mock Quote Display - In real app, fetch Quote details */}
                    <div className="bg-slate-50 p-4 rounded text-sm space-y-2">
                        <div className="flex justify-between font-semibold">
                            <span>Service Total:</span>
                            <span>RD$ {ticket.totalCost ? ticket.totalCost.toLocaleString() : 'Pending'}</span>
                            {/* Assuming ticket has cost synced or we fetch quote */}
                        </div>
                        <p className="text-xs text-gray-500">Includes diagnosis, labor, and parts if listed.</p>
                    </div>

                    {ticket.currentQuoteUrl && (
                        <div className="text-center">
                            <a href={ticket.currentQuoteUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-sm">
                                View Full PDF Quote
                            </a>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Acceptance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-start space-x-2">
                        <Checkbox id="terms" checked={accepted} onCheckedChange={(c) => setAccepted(c as boolean)} />
                        <div className="grid gap-1.5 leading-none">
                            <Label htmlFor="terms" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                I accept the service terms and conditions
                            </Label>
                            <p className="text-sm text-muted-foreground">
                                By checking this box, you authorize the work described above.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="signature">Full Name (Signature)</Label>
                        <div className="relative">
                            <FileSignature className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                            <Input
                                id="signature"
                                placeholder="Type your full name"
                                className="pl-10"
                                value={signature}
                                onChange={(e) => setSignature(e.target.value)}
                            />
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700" onClick={handleAccept} disabled={submitting}>
                        {submitting ? <Loader2 className="animate-spin mr-2" /> : "Approve & Start Work"}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
