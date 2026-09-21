"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

interface PWAContextType {
    isInstalled: boolean;
    canInstall: boolean;
    isIOS: boolean;
    isSafari: boolean;
    isAndroid: boolean;
    showModal: boolean;
    setShowModal: (show: boolean) => void;
    showBanner: boolean;
    setShowBanner: (show: boolean) => void;
    dismissBanner: () => void;
    promptInstall: () => Promise<void>;
}

const PWAContext = createContext<PWAContextType | undefined>(undefined);

const BANNER_DISMISSED_STORAGE_KEY = "hechoapp_pwa_banner_dismissed";

export function PWAProvider({ children }: { children: React.ReactNode }) {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isInstalled, setIsInstalled] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isSafari, setIsSafari] = useState(false);
    const [isAndroid, setIsAndroid] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [showBanner, setShowBanner] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined") return;

        // 1. Detect if running inside standalone PWA
        const checkStandalone = () => {
            const isStandaloneMedia = window.matchMedia("(display-mode: standalone)").matches;
            const isStandaloneNav = (window.navigator as any).standalone === true;
            return isStandaloneMedia || isStandaloneNav;
        };

        const standalone = checkStandalone();
        setIsInstalled(standalone);
        if (standalone) return;

        // 2. Detect platform
        const ua = window.navigator.userAgent.toLowerCase();
        const ios = /iphone|ipad|ipod/.test(ua);
        const android = /android/.test(ua);
        const safari = ios && /safari/.test(ua) && !/crios|fxios|opios/.test(ua);

        setIsIOS(ios);
        setIsSafari(safari);
        setIsAndroid(android);

        // 3. Check banner dismissal
        const dismissed = localStorage.getItem(BANNER_DISMISSED_STORAGE_KEY);

        // 4. Capture native Chromium install prompt
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            if (!dismissed) {
                setShowBanner(true);
            }
        };

        // 5. Track when user successfully installs
        const handleAppInstalled = () => {
            setIsInstalled(true);
            setShowBanner(false);
            setShowModal(false);
            setDeferredPrompt(null);
            localStorage.setItem(BANNER_DISMISSED_STORAGE_KEY, "installed");
        };

        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        window.addEventListener("appinstalled", handleAppInstalled);

        // On iOS, if not dismissed, offer banner to explain Add to Home Screen
        if (ios && !dismissed) {
            setShowBanner(true);
        }

        return () => {
            window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
            window.removeEventListener("appinstalled", handleAppInstalled);
        };
    }, []);

    const dismissBanner = useCallback(() => {
        setShowBanner(false);
        try {
            localStorage.setItem(BANNER_DISMISSED_STORAGE_KEY, "dismissed");
        } catch {
            // ignore localStorage quota/privacy errors
        }
    }, []);

    const promptInstall = useCallback(async () => {
        // If native Chromium prompt is ready, trigger it
        if (deferredPrompt) {
            try {
                await deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                if (outcome === "accepted") {
                    setIsInstalled(true);
                    setShowBanner(false);
                }
                setDeferredPrompt(null);
            } catch (err) {
                console.error("Error prompting PWA install:", err);
                setShowModal(true);
            }
            return;
        }

        // If iOS or if deferredPrompt is not available, show interactive instructions modal
        setShowModal(true);
    }, [deferredPrompt]);

    const canInstall = !isInstalled && (!!deferredPrompt || isIOS || isAndroid);

    return (
        <PWAContext.Provider
            value={{
                isInstalled,
                canInstall,
                isIOS,
                isSafari,
                isAndroid,
                showModal,
                setShowModal,
                showBanner,
                setShowBanner,
                dismissBanner,
                promptInstall,
            }}
        >
            {children}
        </PWAContext.Provider>
    );
}

export function usePWAInstall() {
    const context = useContext(PWAContext);
    if (!context) {
        throw new Error("usePWAInstall must be used within a PWAProvider");
    }
    return context;
}
