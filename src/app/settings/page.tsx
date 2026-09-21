
"use client";

import { CompanyProfile } from "@/components/resources/company-profile";
import { AppLayout } from "@/components/layout/app-layout";


import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LocationManager } from "@/components/inventory/location-manager";
import { PendingProductsManager } from "@/components/inventory/pending-products-manager";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { InstallAppButton } from "@/components/shared/install-app-button";
import { Smartphone } from "lucide-react";

export default function SettingsPage() {
    return (
        <AppLayout>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
                        <p className="text-muted-foreground">
                            Administra los datos de tu empresa, preferencias y acceso móvil.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <InstallAppButton variant="outline" size="sm" showWhenInstalled />
                    </div>
                </div>

                <Card className="border-blue-100 dark:border-blue-900/50 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-white dark:from-slate-900 dark:to-blue-950/20">
                    <CardHeader className="py-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/25">
                                    <Smartphone className="w-5 h-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-base font-semibold">
                                        Acceso Móvil e Instalación (PWA)
                                    </CardTitle>
                                    <CardDescription className="text-xs mt-0.5">
                                        Usa HECHOAPP desde la pantalla de inicio de tu celular (iOS / Android) con modo offline y lectura rápida de QR.
                                    </CardDescription>
                                </div>
                            </div>
                            <div className="shrink-0">
                                <InstallAppButton variant="default" size="sm" showWhenInstalled />
                            </div>
                        </div>
                    </CardHeader>
                </Card>

                <Tabs defaultValue="general" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="general">General</TabsTrigger>
                        <TabsTrigger value="inventory">Inventario</TabsTrigger>
                    </TabsList>
                    <TabsContent value="general" className="space-y-4">
                        <CompanyProfile />
                    </TabsContent>
                    <TabsContent value="inventory" className="space-y-8">
                        <LocationManager />
                        <hr className="border-gray-200" />
                        <PendingProductsManager />
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    );
}
