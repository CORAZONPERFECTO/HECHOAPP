import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SyncStatusIndicator } from "@/components/shared/sync-status-indicator";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { PWAInstallBanner } from "@/components/shared/pwa-install-banner";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { PWAProvider } from "@/context/pwa-context";
import { Toaster } from "@/components/ui/toaster";

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
  description: "Plataforma de gestión de operaciones, villas, equipos y mantenimiento técnico",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "HECHOAPP",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }
    ]
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

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
        <PWAProvider>
          <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
            <SyncStatusIndicator />
            <NotificationBell />
          </div>
          {children}
          <MobileBottomNav />
          <Toaster />
          <PWAInstallBanner />
        </PWAProvider>
      </body>
    </html>
  );
}
