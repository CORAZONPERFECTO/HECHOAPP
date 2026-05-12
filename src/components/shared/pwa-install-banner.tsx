"use client";

import { useEffect, useState } from "react";
import { Download, X, Smartphone } from "lucide-react";
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

    useEffect(() => {
        // Check if already installed (running as PWA)
        if (window.matchMedia("(display-mode: standalone)").matches) {
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

    if (!showBanner || isInstalled) return null;

    return (
        <div
            className="fixed bottom-0 left-0 right-0 z-[9999] p-3 sm:bottom-4 sm:left-4 sm:right-4 sm:rounded-2xl"
            style={{
                background: "linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 100%)",
                boxShadow: "0 -4px 30px rgba(0,0,0,0.3)",
            }}
        >
            <div className="flex items-center gap-3 max-w-lg mx-auto">
                {/* Icon */}
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center">
                    <Smartphone className="w-6 h-6 text-white" />
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm leading-tight">
                        Instalar HECHOAPP
                    </p>
                    {isIOS ? (
                        <p className="text-blue-200 text-xs mt-0.5 leading-tight">
                            Toca <strong>Compartir</strong> → <strong>"Agregar a inicio"</strong> para instalar
                        </p>
                    ) : (
                        <p className="text-blue-200 text-xs mt-0.5 leading-tight">
                            Accede más rápido desde tu pantalla de inicio
                        </p>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    {!isIOS && deferredPrompt && (
                        <Button
                            onClick={handleInstall}
                            size="sm"
                            className="h-9 px-4 text-xs font-semibold bg-white text-blue-700 hover:bg-blue-50 border-0 rounded-xl"
                        >
                            <Download className="w-3.5 h-3.5 mr-1.5" />
                            Instalar
                        </Button>
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
    );
}
