"use client";

import { useState, Suspense } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Mail, Loader2, ClipboardList, Wrench, ShieldCheck } from "lucide-react";

// Role → destination mapping
const ROLE_DESTINATIONS: Record<string, string> = {
    ADMIN:           "/",
    SUPERVISOR:      "/tickets",
    GERENTE_TICKETS: "/tickets",
    TECNICO:         "/technician/my-day",
    GERENTE:         "/",
    ASISTENTE:       "/tickets",
};

// Detect the "portal mode" from the redirect URL to style the login
function detectPortal(redirect: string): "gerente" | "tecnico" | "admin" {
    if (redirect.includes("technician") || redirect.includes("tecnico")) return "tecnico";
    if (redirect.includes("tickets") || redirect.includes("gerente")) return "gerente";
    return "admin";
}

const PORTAL_CONFIG = {
    gerente: {
        title: "Portal del Gerente",
        subtitle: "Gestión de Tickets y Operaciones",
        icon: <ClipboardList className="h-8 w-8 text-white" />,
        gradient: "from-blue-700 to-blue-900",
        accent: "bg-blue-600",
        button: "bg-blue-600 hover:bg-blue-700",
        badge: "Gerente de Tickets",
        badgeColor: "bg-blue-100 text-blue-800",
    },
    tecnico: {
        title: "Portal del Técnico",
        subtitle: "Accede a tus tickets del día",
        icon: <Wrench className="h-8 w-8 text-white" />,
        gradient: "from-emerald-700 to-emerald-900",
        accent: "bg-emerald-600",
        button: "bg-emerald-600 hover:bg-emerald-700",
        badge: "Técnico de Campo",
        badgeColor: "bg-emerald-100 text-emerald-800",
    },
    admin: {
        title: "HECHOAPP",
        subtitle: "Sistema de Gestión Inteligente",
        icon: <ShieldCheck className="h-8 w-8 text-white" />,
        gradient: "from-slate-700 to-slate-900",
        accent: "bg-slate-600",
        button: "bg-slate-700 hover:bg-slate-800",
        badge: "Administración",
        badgeColor: "bg-slate-100 text-slate-700",
    },
};

function LoginForm() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectUrl = searchParams.get('redirect') || '/';
    const portal = detectPortal(redirectUrl);
    const config = PORTAL_CONFIG[portal];

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
            const user = userCredential.user;

            // 🔑 Smart role detection — route based on role, not just redirect URL
            let destination = redirectUrl === "/" ? null : redirectUrl; // respect explicit redirect

            if (!destination || destination === "/") {
                // No specific redirect — detect from role
                try {
                    const userDoc = await getDoc(doc(db, "users", user.uid));
                    const userData = userDoc.data();
                    const rawRole = userData?.rol || userData?.role || "";
                    const normalizedRole = String(rawRole).toUpperCase().trim();
                    
                    // Asegurar que si de alguna forma se guardó como "Técnico" o "TECNICO", vaya al mismo lado
                    const finalRole = normalizedRole === "TÉCNICO" || normalizedRole === "TECNICO" ? "TECNICO" : normalizedRole;
                    
                    destination = ROLE_DESTINATIONS[finalRole] || "/";
                } catch {
                    // Admin super user fallback
                    if (user.email?.toLowerCase() === "lcaa27@gmail.com") {
                        destination = "/";
                    } else {
                        destination = redirectUrl || "/";
                    }
                }
            }

            router.push(destination);
        } catch (err: any) {
            console.error(err);
            if (err.code === "auth/user-not-found" || err.code === "auth/invalid-credential" || err.code === "auth/wrong-password") {
                setError("Correo o contraseña incorrectos.");
            } else if (err.code === "auth/too-many-requests") {
                setError("Demasiados intentos. Espera unos minutos e intenta de nuevo.");
            } else {
                setError("Error al iniciar sesión. Verifica tu conexión.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!email) {
            setError("Escribe tu correo primero para restablecer la contraseña.");
            return;
        }
        try {
            const { sendPasswordResetEmail } = await import("firebase/auth");
            await sendPasswordResetEmail(auth, email.toLowerCase().trim());
            setError("");
            alert("📧 Se ha enviado un correo para restablecer tu contraseña. Revisa tu bandeja de entrada.");
        } catch (err: any) {
            setError(err.code === "auth/user-not-found" ? "Este correo no está registrado." : `Error: ${err.message}`);
        }
    };

    return (
        <div className="min-h-screen flex flex-col md:flex-row">

            {/* Left panel — branding */}
            <div className={`bg-gradient-to-br ${config.gradient} flex flex-col items-center justify-center p-10 md:w-2/5 text-white`}>
                <div className="max-w-xs text-center space-y-5">
                    <div className={`${config.accent} w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-xl`}>
                        {config.icon}
                    </div>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight">{config.title}</h1>
                        <p className="text-white/70 mt-1 text-sm">{config.subtitle}</p>
                    </div>
                    <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full ${config.badgeColor}`}>
                        {config.badge}
                    </span>

                    {/* Features list depending on portal */}
                    <div className="text-left space-y-3 mt-4 text-sm text-white/80">
                        {portal === "gerente" && (
                            <>
                                <div className="flex items-center gap-2">✅ Gestión completa de tickets</div>
                                <div className="flex items-center gap-2">📍 Ubicaciones y rutas en tiempo real</div>
                                <div className="flex items-center gap-2">💬 Envío directo a técnicos por WhatsApp</div>
                                <div className="flex items-center gap-2">📊 Panel SLA y analítica operativa</div>
                            </>
                        )}
                        {portal === "tecnico" && (
                            <>
                                <div className="flex items-center gap-2">📋 Tus tickets del día</div>
                                <div className="flex items-center gap-2">📸 Subir fotos de evidencia</div>
                                <div className="flex items-center gap-2">🎙️ Notas de voz con IA</div>
                                <div className="flex items-center gap-2">🗺️ Navegación a la ubicación del cliente</div>
                            </>
                        )}
                        {portal === "admin" && (
                            <>
                                <div className="flex items-center gap-2">🏢 Administración completa del sistema</div>
                                <div className="flex items-center gap-2">👥 Gestión de usuarios y roles</div>
                                <div className="flex items-center gap-2">💰 Finanzas y cotizaciones</div>
                                <div className="flex items-center gap-2">📈 Analítica avanzada</div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Right panel — form */}
            <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
                <div className="w-full max-w-sm space-y-6">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Iniciar Sesión</h2>
                        <p className="text-gray-500 text-sm mt-1">Ingresa tus credenciales para continuar</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="email">Correo Electrónico</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="nombre@empresa.com"
                                    className="pl-9"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="password">Contraseña</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    className="pl-9"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    autoComplete="current-password"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm flex items-start gap-2">
                                <span>⚠️</span>
                                <span>{error}</span>
                            </div>
                        )}

                        <Button
                            type="submit"
                            className={`w-full h-11 text-base font-semibold ${config.button} text-white`}
                            disabled={loading}
                        >
                            {loading ? (
                                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Verificando...</>
                            ) : (
                                "Ingresar al Sistema"
                            )}
                        </Button>

                        <button
                            type="button"
                            onClick={handleForgotPassword}
                            className="w-full text-sm text-gray-500 hover:text-gray-700 hover:underline text-center"
                        >
                            ¿Olvidaste tu contraseña?
                        </button>
                    </form>

                    <p className="text-center text-xs text-gray-400">© 2025 Hecho Nexus System</p>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        }>
            <LoginForm />
        </Suspense>
    );
}
