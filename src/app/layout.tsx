import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SyncStatusIndicator } from "@/components/shared/sync-status-indicator";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { PWAInstallBanner } from "@/components/shared/pwa-install-banner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HECHOAPP | Gestión Inteligente",
  description: "Plataforma de gestión de operaciones y mantenimiento técnico",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "HECHOAPP",
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

import { Toaster } from "@/components/ui/toaster";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
          <SyncStatusIndicator />
          <NotificationBell />
        </div>
        {children}
        <Toaster />
        <PWAInstallBanner />
      </body>
    </html>
  );
}
