"use client";

import React from "react";
import { Download, Smartphone, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePWAInstall } from "@/context/pwa-context";
import { cn } from "@/lib/utils";

interface InstallAppButtonProps {
    variant?: "default" | "outline" | "secondary" | "ghost";
    size?: "default" | "sm" | "lg" | "icon";
    className?: string;
    showWhenInstalled?: boolean;
}

export function InstallAppButton({
    variant = "default",
    size = "default",
    className,
    showWhenInstalled = false,
}: InstallAppButtonProps) {
    const { isInstalled, promptInstall, isIOS } = usePWAInstall();

    if (isInstalled && !showWhenInstalled) {
        return null;
    }

    if (isInstalled && showWhenInstalled) {
        return (
            <Button
                variant="ghost"
                size={size}
                disabled
                className={cn("gap-2 text-emerald-600 dark:text-emerald-400 opacity-80", className)}
            >
                <Check className="h-4 w-4" />
                <span>App Instalada</span>
            </Button>
        );
    }

    return (
        <Button
            variant={variant}
            size={size}
            onClick={() => promptInstall()}
            className={cn(
                "gap-2 font-medium transition-all active:scale-95 shadow-sm",
                variant === "default" && "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20",
                variant === "outline" && "border-blue-200 text-blue-700 dark:border-blue-800 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40",
                className
            )}
        >
            {isIOS ? <Smartphone className="h-4 w-4 text-current" /> : <Download className="h-4 w-4 text-current" />}
            <span>Instalar App</span>
        </Button>
    );
}
