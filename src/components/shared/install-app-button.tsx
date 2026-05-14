"use client";

import { useEffect, useState } from "react";
import { Download, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallAppButton() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isInstalled, setIsInstalled] = useState(true); // default true to avoid hydration mismatch blinking
    const [isIOS, setIsIOS] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined") return;

        // Check if already installed
        if (window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone) {
            setIsInstalled(true);
            return;
        } else {
            setIsInstalled(false);
        }

        const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
        setIsIOS(ios);

        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
        };

        window.addEventListener("beforeinstallprompt", handler);
        return () => window.removeEventListener("beforeinstallprompt", handler);
    }, []);

    if (isInstalled) return null;

    if (isIOS) {
        return (
            <Button variant="outline" className="gap-2 bg-blue-50 text-blue-700 border-blue-200" onClick={() => alert("En iPhone/iPad: Toca el botón 'Compartir' y luego selecciona 'Agregar a inicio' para instalar la App.")}>
                <Smartphone className="h-4 w-4" />
                Instalar App
            </Button>
        );
    }

    if (!deferredPrompt) return null;

    return (
        <Button 
            variant="default" 
            className="gap-2 bg-blue-600 hover:bg-blue-700"
            onClick={async () => {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                if (outcome === "accepted") {
                    setIsInstalled(true);
                }
                setDeferredPrompt(null);
            }}
        >
            <Download className="h-4 w-4" />
            Instalar App
        </Button>
    );
}
