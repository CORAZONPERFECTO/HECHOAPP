"use client";

import { useEffect, useState } from "react";
import { Download, X, Smartphone, Share, PlusSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallBanner() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showBanner, setShowBanner] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);
    const [showIOSInstructions, setShowIOSInstructions] = useState(false);

    useEffect(() => {
        // Check if already installed (running as PWA)
        if (window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone) {
            setIsInstalled(true);
            return;
        }

        // Detect iOS
        const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
        setIsIOS(ios);

        // Check if user already dismissed
        const dismissed = localStorage.getItem("pwa-banner-dismissed");
        if (dismissed) return;

        if (ios) {
            // On iOS, show the manual install instructions
            setShowBanner(true);
        }

        // Listen for the Chrome/Android install prompt
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setShowBanner(true);
        };

        window.addEventListener("beforeinstallprompt", handler);
        return () => window.removeEventListener("beforeinstallprompt", handler);
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
            setIsInstalled(true);
        }
        setShowBanner(false);
        setDeferredPrompt(null);
    };

    const handleDismiss = () => {
        setShowBanner(false);
        localStorage.setItem("pwa-banner-dismissed", "1");
    };

    if (isInstalled) return null;

    return (
        <>
            {showBanner && (
                <div
                    className="fixed bottom-0 left-0 right-0 z-[9999] p-3 sm:bottom-4 sm:left-4 sm:right-4 sm:rounded-2xl animate-in slide-in-from-bottom duration-300"
                    style={{
                        background: "linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 100%)",
                        boxShadow: "0 -4px 30px rgba(0,0,0,0.3)",
                    }}
                >
                    <div className="flex items-center gap-3 max-w-lg mx-auto">
                        {/* Icon */}
                        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center animate-pulse">
                            <Smartphone className="w-6 h-6 text-white" />
                        </div>

                        {/* Text */}
                        <div className="flex-1 min-w-0">
                            <p className="text-white font-semibold text-sm leading-tight">
                                Instalar HECHOAPP
                            </p>
                            {isIOS ? (
                                <p className="text-blue-200 text-xs mt-0.5 leading-tight">
                                    Toca para ver cómo agregar a tu pantalla de inicio
                                </p>
                            ) : (
                                <p className="text-blue-200 text-xs mt-0.5 leading-tight">
                                    Accede más rápido desde tu pantalla de inicio
                                </p>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                            {isIOS ? (
                                <Button
                                    onClick={() => setShowIOSInstructions(true)}
                                    size="sm"
                                    className="h-9 px-4 text-xs font-semibold bg-white text-blue-700 hover:bg-blue-50 border-0 rounded-xl transition-all active:scale-95"
                                >
                                    Cómo Instalar
                                </Button>
                            ) : (
                                deferredPrompt && (
                                    <Button
                                        onClick={handleInstall}
                                        size="sm"
                                        className="h-9 px-4 text-xs font-semibold bg-white text-blue-700 hover:bg-blue-50 border-0 rounded-xl transition-all active:scale-95"
                                    >
                                        <Download className="w-3.5 h-3.5 mr-1.5" />
                                        Instalar
                                    </Button>
                                )
                            )}
                            <button
                                onClick={handleDismiss}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 transition-colors"
                                aria-label="Cerrar"
                            >
                                <X className="w-4 h-4 text-white" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* iOS Instructions Modal */}
            {showIOSInstructions && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl relative animate-in fade-in-50 zoom-in-95 duration-200">
                        <button
                            onClick={() => setShowIOSInstructions(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="text-center mb-6">
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Smartphone className="w-6 h-6 text-blue-600 animate-bounce" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Instalar en tu iPhone</h3>
                            <p className="text-sm text-gray-500 mt-1">Sigue estos sencillos pasos para agregar HECHOAPP a tu pantalla de inicio:</p>
                        </div>

                        <div className="space-y-4 text-sm text-gray-700">
                            <div className="flex gap-3 items-start">
                                <span className="flex-shrink-0 w-6 h-6 bg-blue-50 text-blue-600 font-semibold rounded-full flex items-center justify-center text-xs mt-0.5">1</span>
                                <p className="leading-relaxed">
                                    Toca el botón de <strong>Compartir</strong> <span className="inline-flex items-center justify-center p-1 bg-gray-100 rounded border border-gray-200 mx-1"><Share className="w-3.5 h-3.5 text-blue-600 inline" /></span> en la barra inferior de Safari.
                                </p>
                            </div>
                            <div className="flex gap-3 items-start">
                                <span className="flex-shrink-0 w-6 h-6 bg-blue-50 text-blue-600 font-semibold rounded-full flex items-center justify-center text-xs mt-0.5">2</span>
                                <p className="leading-relaxed">
                                    Desplázate hacia abajo y selecciona <strong>"Agregar al inicio"</strong> <span className="inline-flex items-center justify-center p-1 bg-gray-100 rounded border border-gray-200 mx-1"><PlusSquare className="w-3.5 h-3.5 text-gray-600 inline" /></span>.
                                </p>
                            </div>
                            <div className="flex gap-3 items-start">
                                <span className="flex-shrink-0 w-6 h-6 bg-blue-50 text-blue-600 font-semibold rounded-full flex items-center justify-center text-xs mt-0.5">3</span>
                                <p className="leading-relaxed">
                                    Toca <strong>"Agregar"</strong> en la esquina superior derecha para confirmar la instalación.
                                </p>
                            </div>
                        </div>

                        <Button
                            onClick={() => setShowIOSInstructions(false)}
                            className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold h-11 rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-98"
                        >
                            ¡Entendido!
                        </Button>
                    </div>
                </div>
            )}
        </>
    );
}
