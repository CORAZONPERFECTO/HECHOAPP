"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { LayoutGrid, Lock, Mail } from "lucide-react";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            await signInWithEmailAndPassword(auth, email, password);
            router.push("/");
        } catch (err: any) {
            console.error(err);
            setError(`Error: ${err.message} (${err.code})`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-[#f1f5f9] p-4">
            <Card className="w-full max-w-md shadow-lg border-0">
                <CardHeader className="space-y-1 flex flex-col items-center text-center pb-6">
                    <div className="bg-primary/10 p-3 rounded-full mb-4">
                        <LayoutGrid className="h-10 w-10 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-bold tracking-tight">Bienvenido a HECHO SRL</CardTitle>
                    <CardDescription>
                        Ingrese sus credenciales para acceder al sistema
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Correo Electrónico</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="nombre@empresa.com"
                                    className="pl-9"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Contraseña</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    className="pl-9"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        {error && (
                            <div className="p-3 rounded-md bg-red-50 text-red-500 text-sm font-medium">
                                {error}
                            </div>
                        )}
                        <Button type="submit" className="w-full h-11 text-base" disabled={loading}>
                            {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
                        </Button>
                        <div className="text-center">
                            <button
                                type="button"
                                onClick={async () => {
                                    if (!email) {
                                        setError("Escribe tu correo primero para restablecer la contraseña.");
                                        return;
                                    }
                                    try {
                                        const { sendPasswordResetEmail } = await import("firebase/auth");
                                        await sendPasswordResetEmail(auth, email);
                                        alert("Se ha enviado un correo para restablecer tu contraseña. Revisa tu bandeja de entrada.");
                                    } catch (err: any) {
                                        console.error(err);
                                        if (err.code === 'auth/user-not-found') {
                                            setError("Este correo no está registrado.");
                                        } else {
                                            setError("Error al enviar el correo. Intenta de nuevo.");
                                        }
                                    }
                                }}
                                className="text-sm text-blue-600 hover:underline"
                            >
                                ¿Olvidaste tu contraseña?
                            </button>
                        </div>
                    </form>
                </CardContent>
                <CardFooter className="flex justify-center text-xs text-gray-400">
                    &copy; 2025 Hecho Nexus System
                </CardFooter>
            </Card>
        </div>
    );
}
