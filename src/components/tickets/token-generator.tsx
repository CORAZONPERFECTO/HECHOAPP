"use client";

import { useState } from "react";
import { setDoc, doc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link as LinkIcon, Copy, Check, Loader2, ShieldCheck } from "lucide-react";

export function TokenGenerator() {
    const [loading, setLoading] = useState(false);
    const [generatedLink, setGeneratedLink] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const generateToken = async () => {
        setLoading(true);
        setCopied(false);
        try {
            // Generate a secure random token (UUID)
            const token = crypto.randomUUID();

            // Use the token as the document ID for O(1) reads
            await setDoc(doc(db, "ticketTokens", token), {
                token: token,
                status: 'ACTIVE',
                ticketId: null,
                createdAt: serverTimestamp(),
                createdBy: auth.currentUser?.uid || 'unknown',
                // Optional: expiresAt could be set here
            });

            // Construct the full URL
            const origin = window.location.origin;
            const link = `${origin}/ticket/form/${token}`;
            setGeneratedLink(link);

        } catch (error) {
            console.error("Error generating token:", error);
            alert("Error al generar el enlace seguro.");
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        if (generatedLink) {
            navigator.clipboard.writeText(generatedLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-blue-600" />
                    Generador de Enlaces Seguros
                </CardTitle>
                <CardDescription>
                    Crea un enlace único para que un cliente registre un ticket. El enlace caducará una vez usado o cuando el ticket se cierre.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {!generatedLink ? (
                    <Button onClick={generateToken} disabled={loading} className="w-full">
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Generando...
                            </>
                        ) : (
                            <>
                                <LinkIcon className="mr-2 h-4 w-4" />
                                Generar Nuevo Enlace
                            </>
                        )}
                    </Button>
                ) : (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Enlace Generado</Label>
                            <div className="flex gap-2">
                                <Input value={generatedLink} readOnly className="font-mono text-sm bg-slate-50" />
                                <Button size="icon" variant="outline" onClick={copyToClipboard}>
                                    {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Este enlace es de un solo uso. Compártelo con el cliente.
                            </p>
                        </div>
                        <Button variant="ghost" onClick={() => setGeneratedLink(null)} className="w-full text-sm">
                            Generar otro
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
