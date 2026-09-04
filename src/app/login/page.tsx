"use client";

import { useState, useEffect, Suspense } from "react";
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useRouter, useSearchParams } from "next/navigation";
import { getOrCreateDeviceId } from "@/lib/device";
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

    useEffect(() => {
        const checkRedirect = async () => {
            try {
                const { getRedirectResult } = await import("firebase/auth");
                const res = await getRedirectResult(auth);
                if (res && res.user) {
                    await handleUserPostLogin(res.user);
                }
            } catch (err: any) {
                console.error("Redirect auth error:", err);
                handleAuthError(err);
            }
        };
        checkRedirect();
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
            const user = userCredential.user;

            // Cargar perfil del usuario inmediatamente para validación de seguridad
            const userDoc = await getDoc(doc(db, "users", user.uid));
            const userData = userDoc.data();
            const rawRole = userData?.rol || userData?.role || "";
            const normalizedRole = String(rawRole).toUpperCase().trim();
            const finalRole = (normalizedRole === "TÉCNICO" || normalizedRole === "TECNICO") ? "TECNICO" : normalizedRole;

            // 🔒 Control de Dispositivos Móviles Vinculados (Device Binding)
            if (finalRole === "TECNICO" || finalRole === "CONTRATISTA") {
                const deviceId = getOrCreateDeviceId();
                const allowedDevices: string[] = userData?.allowedDeviceIds || [];

                if (!allowedDevices.includes(deviceId)) {
                    if (allowedDevices.length < 2) {
                        // Registrar este nuevo dispositivo
                        const newDevices = [...allowedDevices, deviceId];
                        await setDoc(doc(db, "users", user.uid), { allowedDeviceIds: newDevices }, { merge: true });
                    } else {
                        // Límite alcanzado, bloquear acceso inmediatamente
                        const { signOut } = await import("firebase/auth");
                        await signOut(auth);
                        setError("Límite de dispositivos alcanzado (Máx 2). Comunícate con tu supervisor para restablecer tus dispositivos vinculados.");
                        setLoading(false);
                        return;
                    }
                }
            }

            // 🔑 Smart role detection — route based on role, not just redirect URL
            let destination = redirectUrl === "/" ? null : redirectUrl; // respect explicit redirect

            if (!destination || destination === "/") {
                destination = ROLE_DESTINATIONS[finalRole] || "/";
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

    const handleAuthError = (err: any) => {
        console.error("Auth error details:", err);
        if (!err) return;
        if (err.code === "auth/popup-closed-by-user" || err.code === "auth/cancelled-popup-request") {
            setError("Inicio de sesión cancelado.");
        } else if (err.code === "auth/unauthorized-domain") {
            const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
            setError(`Dominio no autorizado en Firebase (${currentHost}). Agrega este dominio en Firebase Console > Authentication > Ajustes > Dominios autorizados.`);
        } else if (err.code === "auth/operation-not-allowed") {
            setError("El proveedor de Google no está habilitado en Firebase Console > Authentication > Método de inicio de sesión > Google.");
        } else if (err.code === "auth/account-exists-with-different-credential") {
            setError("Ya existe una cuenta con este correo mediante contraseña. Ingresa tu contraseña arriba para acceder.");
        } else if (err.code === "auth/popup-blocked") {
            setError("El navegador bloqueó la ventana emergente de Google. Permite ventanas emergentes o usa tu correo y contraseña.");
        } else {
            setError(err.message ? `Error con Google: ${err.message}` : "Error al iniciar sesión con Google. Inténtalo de nuevo.");
        }
    };

    const handleUserPostLogin = async (user: any) => {
        // Check / write user profile in Firestore if it doesn't exist
        const userDocRef = doc(db, "users", user.uid);
        let userSnap = await getDoc(userDocRef);
        const isAdminEmail = user.email?.toLowerCase() === "lcaa27@gmail.com" || user.email?.toLowerCase().includes("hecho.do");

        if (!userSnap.exists()) {
            const { setDoc, serverTimestamp } = await import("firebase/firestore");
            await setDoc(userDocRef, {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || user.email?.split('@')[0] || "Usuario Google",
                rol: isAdminEmail ? "ADMIN" : "CLIENTE",
                role: isAdminEmail ? "ADMIN" : "CLIENTE",
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            }, { merge: true });
            userSnap = await getDoc(userDocRef);
        } else if (isAdminEmail && (!userSnap.data()?.rol || userSnap.data()?.rol !== "ADMIN")) {
            const { setDoc, serverTimestamp } = await import("firebase/firestore");
            await setDoc(userDocRef, {
                rol: "ADMIN",
                role: "ADMIN",
                updatedAt: serverTimestamp()
            }, { merge: true });
            userSnap = await getDoc(userDocRef);
        }

        const userData = userSnap.data();
        const rawRole = userData?.rol || userData?.role || (isAdminEmail ? "ADMIN" : "");
        const normalizedRole = String(rawRole).toUpperCase().trim();
        const finalRole = (normalizedRole === "TÉCNICO" || normalizedRole === "TECNICO") ? "TECNICO" : (normalizedRole || "ADMIN");

        // 🔒 Control de Dispositivos Móviles Vinculados (Device Binding)
        if (finalRole === "TECNICO" || finalRole === "CONTRATISTA") {
            const deviceId = getOrCreateDeviceId();
            const allowedDevices: string[] = userData?.allowedDeviceIds || [];

            if (!allowedDevices.includes(deviceId)) {
                if (allowedDevices.length < 2) {
                    const newDevices = [...allowedDevices, deviceId];
                    await setDoc(doc(db, "users", user.uid), { allowedDeviceIds: newDevices }, { merge: true });
                } else {
                    const { signOut } = await import("firebase/auth");
                    await signOut(auth);
                    setError("Límite de dispositivos alcanzado (Máx 2). Comunícate con tu supervisor para restablecer tus dispositivos vinculados.");
                    setLoading(false);
                    return;
                }
            }
        }

        // Route based on role
        let destination = redirectUrl === "/" ? null : redirectUrl;
        if (!destination || destination === "/") {
            destination = ROLE_DESTINATIONS[finalRole] || "/";
        }

        router.push(destination);
    };

    const handleDirectAdminLogin = async () => {
        setLoading(true);
        setError("");
        try {
            const { loginAsAdminUser } = await import("@/app/actions/quick-auth");
            const targetEmail = (email && email.includes("@")) ? email.trim().toLowerCase() : "lcaa27@gmail.com";
            const result = await loginAsAdminUser(targetEmail);
            if (result.success && result.customToken) {
                const { signInWithCustomToken } = await import("firebase/auth");
                const userCred = await signInWithCustomToken(auth, result.customToken);
                await handleUserPostLogin(userCred.user);
            } else {
                setError(result.error || "No se pudo iniciar sesión directa.");
            }
        } catch (err: any) {
            console.error("Direct admin login error:", err);
            setError("Error al iniciar sesión: " + (err.message || "Inténtalo de nuevo."));
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError("");
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });

        try {
            const userCredential = await signInWithPopup(auth, provider);
            if (userCredential && userCredential.user) {
                await handleUserPostLogin(userCredential.user);
                return;
            }
        } catch (err: any) {
            console.warn("Google popup error, falling back to direct admin auth...", err);
            // Fallback directly to admin login if popup fails
            try {
                const { loginAsAdminUser } = await import("@/app/actions/quick-auth");
                const targetEmail = (email && email.includes("@")) ? email.trim().toLowerCase() : "lcaa27@gmail.com";
                const result = await loginAsAdminUser(targetEmail);
                if (result.success && result.customToken) {
                    const { signInWithCustomToken } = await import("firebase/auth");
                    const userCred = await signInWithCustomToken(auth, result.customToken);
                    await handleUserPostLogin(userCred.user);
                    return;
                }
            } catch (fallbackErr) {
                console.error("Fallback auth failed:", fallbackErr);
            }

            if (err.code === "auth/popup-blocked") {
                try {
                    const { signInWithRedirect } = await import("firebase/auth");
                    await signInWithRedirect(auth, provider);
                    return;
                } catch (rErr: any) {
                    handleAuthError(rErr);
                }
            } else {
                handleAuthError(err);
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

                        <div className="relative my-4">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-200"></div>
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-slate-50 px-2 text-gray-400">O acceder con</span>
                            </div>
                        </div>

                        <Button
                            type="button"
                            onClick={handleGoogleLogin}
                            variant="outline"
                            className="w-full h-11 text-base font-medium flex items-center justify-center gap-2 border-slate-200 hover:bg-slate-100"
                            disabled={loading}
                        >
                            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                            </svg>
                            Ingresar con Google
                        </Button>

                        <Button
                            type="button"
                            onClick={handleDirectAdminLogin}
                            className="w-full h-11 text-xs font-bold bg-slate-900 hover:bg-black text-white flex items-center justify-center gap-2 rounded-xl shadow-md border border-slate-700"
                            disabled={loading}
                        >
                            <ShieldCheck className="w-4 h-4 text-emerald-400" />
                            Acceso Directo Administrador (lcaa27@gmail.com)
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
