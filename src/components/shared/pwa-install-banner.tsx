"use client";

import React from "react";
import { usePWAInstall } from "@/context/pwa-context";
import { PWAInstallModal } from "./pwa-install-modal";
import { Download, X, Smartphone, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PWAInstallBanner() {
    const {
        isInstalled,
        showBanner,
        dismissBanner,
        promptInstall,
        setShowModal,
        isIOS,
    } = usePWAInstall();

    if (isInstalled || !showBanner) {
        return <PWAInstallModal />;
    }

    return (
        <>
            <div
                className="fixed bottom-0 left-0 right-0 z-[9990] p-3 pb-safe sm:bottom-4 sm:left-4 sm:right-4 sm:rounded-2xl animate-in slide-in-from-bottom duration-300"
                style={{
                    background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)",
                    boxShadow: "0 -4px 30px rgba(0, 0, 0, 0.4)",
                    borderTop: "1px solid rgba(255, 255, 255, 0.15)",
                }}
            >
                <div className="flex items-center gap-3 max-w-lg mx-auto">
                    {/* App Icon */}
                    <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-md shadow-blue-500/30">
                        <Smartphone className="w-5 h-5 text-white" />
                    </div>

                    {/* Text info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                            <p className="text-white font-semibold text-sm leading-tight truncate">
                                Instalar HECHOAPP
                            </p>
                            <span className="bg-blue-500/30 text-blue-200 border border-blue-400/30 text-[10px] px-1.5 py-0.2 rounded font-medium">
                                App Móvil
                            </span>
                        </div>
                        <p className="text-blue-200/90 text-xs mt-0.5 leading-tight truncate">
                            {isIOS
                                ? "Toca para agregar a tu pantalla de inicio"
                                : "Acceso rápido y modo sin conexión"}
                        </p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                            onClick={() => {
                                if (isIOS) {
                                    setShowModal(true);
                                } else {
                                    promptInstall();
                                }
                            }}
                            size="sm"
                            className="h-8 px-3.5 text-xs font-semibold bg-white text-blue-900 hover:bg-blue-50 border-0 rounded-lg shadow-sm transition-all active:scale-95"
                        >
                            <Download className="w-3.5 h-3.5 mr-1 text-blue-700" />
                            {isIOS ? "Ver pasos" : "Instalar"}
                        </Button>

                        <button
                            onClick={dismissBanner}
                            className="w-7 h-7 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
                            aria-label="Cerrar banner de instalación"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Modal dialog for step-by-step instructions */}
            <PWAInstallModal />
        </>
    );
}
