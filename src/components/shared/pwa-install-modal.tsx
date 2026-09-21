"use client";

import React, { useState } from "react";
import { usePWAInstall } from "@/context/pwa-context";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
    Smartphone,
    Share,
    PlusSquare,
    Download,
    CheckCircle2,
    Copy,
    Check,
    MoreVertical,
    Layers,
    ExternalLink
} from "lucide-react";

export function PWAInstallModal() {
    const { showModal, setShowModal, isIOS, isSafari, isAndroid, promptInstall, canInstall } = usePWAInstall();
    const [copied, setCopied] = useState(false);

    const handleCopyUrl = async () => {
        if (typeof window !== "undefined") {
            await navigator.clipboard.writeText(window.location.origin);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        }
    };

    return (
        <Dialog open={showModal} onOpenChange={setShowModal}>
            <DialogContent className="max-w-md w-[92vw] sm:w-full rounded-2xl p-6 bg-white dark:bg-slate-900 border shadow-2xl">
                <DialogHeader className="text-center sm:text-center space-y-2">
                    <div className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-blue-500/25">
                        <Smartphone className="w-7 h-7 text-white" />
                    </div>
                    <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
                        Instalar HECHOAPP en tu Celular
                    </DialogTitle>
                    <DialogDescription className="text-xs text-gray-500 dark:text-gray-400">
                        Disfruta de acceso instantáneo sin barras de navegación, soporte sin conexión y carga ultrarrápida.
                    </DialogDescription>
                </DialogHeader>

                <div className="mt-4 space-y-4 text-sm text-gray-700 dark:text-gray-200">
                    {/* Caso 1: iOS Safari */}
                    {isIOS && isSafari && (
                        <div className="space-y-3 bg-blue-50/70 dark:bg-blue-950/40 p-4 rounded-xl border border-blue-100 dark:border-blue-900/50">
                            <div className="flex items-start gap-3">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center mt-0.5">
                                    1
                                </span>
                                <p className="leading-snug">
                                    En la barra inferior de <strong>Safari</strong>, toca el botón de <strong>Compartir</strong>{" "}
                                    <span className="inline-flex items-center justify-center p-1 bg-white dark:bg-slate-800 rounded border border-gray-200 dark:border-gray-700 mx-1">
                                        <Share className="w-3.5 h-3.5 text-blue-600" />
                                    </span>
                                </p>
                            </div>

                            <div className="flex items-start gap-3">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center mt-0.5">
                                    2
                                </span>
                                <p className="leading-snug">
                                    Desplázate por el menú y selecciona{" "}
                                    <strong>"Agregar a pantalla de inicio"</strong>{" "}
                                    <span className="inline-flex items-center justify-center p-1 bg-white dark:bg-slate-800 rounded border border-gray-200 dark:border-gray-700 mx-1">
                                        <PlusSquare className="w-3.5 h-3.5 text-gray-700 dark:text-gray-300" />
                                    </span>
                                </p>
                            </div>

                            <div className="flex items-start gap-3">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center mt-0.5">
                                    3
                                </span>
                                <p className="leading-snug">
                                    Presiona <strong>"Agregar"</strong> en la esquina superior derecha. ¡Listo! Ya tendrás el icono en tu pantalla como una app nativa.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Caso 2: iOS pero en Chrome / otro navegador */}
                    {isIOS && !isSafari && (
                        <div className="space-y-3 bg-amber-50 dark:bg-amber-950/40 p-4 rounded-xl border border-amber-200 dark:border-amber-900/50">
                            <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                                En iPhone / iPad, Apple requiere abrir el enlace en <strong>Safari</strong> para poder agregar la app a la pantalla de inicio.
                            </p>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCopyUrl}
                                className="w-full text-xs font-semibold border-amber-300 dark:border-amber-800 gap-2"
                            >
                                {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                                {copied ? "¡Enlace copiado al portapapeles!" : "Copiar enlace para pegar en Safari"}
                            </Button>
                        </div>
                    )}

                    {/* Caso 3: Android */}
                    {isAndroid && (
                        <div className="space-y-3 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border">
                            <div className="flex items-start gap-3">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center mt-0.5">
                                    1
                                </span>
                                <p className="leading-snug">
                                    Toca el botón de <strong>menú de tres puntos</strong>{" "}
                                    <span className="inline-flex items-center justify-center p-1 bg-white dark:bg-slate-700 rounded border mx-1">
                                        <MoreVertical className="w-3.5 h-3.5 text-gray-700 dark:text-gray-200" />
                                    </span>{" "}
                                    en la esquina superior de Chrome.
                                </p>
                            </div>

                            <div className="flex items-start gap-3">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center mt-0.5">
                                    2
                                </span>
                                <p className="leading-snug">
                                    Selecciona <strong>"Instalar aplicación"</strong> o <strong>"Agregar a la pantalla principal"</strong>.
                                </p>
                            </div>

                            <div className="flex items-start gap-3">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center mt-0.5">
                                    3
                                </span>
                                <p className="leading-snug">
                                    Confirma tocando <strong>"Instalar"</strong>. La aplicación se instalará con su propio icono de acceso directo.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Caso 4: Desktop / Otro */}
                    {!isIOS && !isAndroid && (
                        <div className="space-y-3 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border">
                            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                                Puedes instalar HECHOAPP en tu computadora o laptop haciendo clic en el icono de <strong>Instalar</strong>{" "}
                                <Download className="w-3.5 h-3.5 inline text-blue-600" /> ubicado en la barra de direcciones de tu navegador (Chrome, Edge o Brave).
                            </p>
                        </div>
                    )}

                    {/* Beneficios de la PWA */}
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-300 pt-1">
                        <div className="flex items-center gap-1.5 p-2 bg-gray-50 dark:bg-slate-800/40 rounded-lg">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span>Acceso sin barra de URL</span>
                        </div>
                        <div className="flex items-center gap-1.5 p-2 bg-gray-50 dark:bg-slate-800/40 rounded-lg">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span>Modo Offline activo</span>
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex flex-col gap-2">
                    {canInstall && (
                        <Button
                            onClick={() => {
                                promptInstall();
                                setShowModal(false);
                            }}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold h-11 rounded-xl shadow-lg shadow-blue-500/20 gap-2"
                        >
                            <Download className="w-4 h-4" />
                            Intentar Instalación Automática
                        </Button>
                    )}
                    <Button
                        variant="secondary"
                        onClick={() => setShowModal(false)}
                        className="w-full h-10 rounded-xl"
                    >
                        Entendido
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
