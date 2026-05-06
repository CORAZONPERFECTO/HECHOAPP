import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SyncStatusIndicator } from "@/components/shared/sync-status-indicator";
import { NotificationBell } from "@/components/notifications/notification-bell";

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
  description: "Plataforma de gestión de operaciones y mantenimiento",
  manifest: "/manifest.json",
};

import { Toaster } from "@/components/ui/toaster";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
          <SyncStatusIndicator />
          <NotificationBell />
        </div>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
