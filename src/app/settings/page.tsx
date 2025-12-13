
"use client";

import { CompanyProfile } from "@/components/resources/company-profile";
import { AppLayout } from "@/components/layout/app-layout";


import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LocationManager } from "@/components/inventory/location-manager";

export default function SettingsPage() {
    return (
        <AppLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
                    <p className="text-muted-foreground">
                        Administra los datos de tu empresa y preferencias generales.
                    </p>
                </div>

                <Tabs defaultValue="general" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="general">General</TabsTrigger>
                        <TabsTrigger value="inventory">Inventario</TabsTrigger>
                    </TabsList>
                    <TabsContent value="general" className="space-y-4">
                        <CompanyProfile />
                    </TabsContent>
                    <TabsContent value="inventory" className="space-y-4">
                        <LocationManager />
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    );
}
