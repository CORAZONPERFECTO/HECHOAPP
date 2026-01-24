"use client";

import { AppLayout } from "@/components/layout/app-layout";
import { ReportsDashboard } from "@/components/reports/reports-dashboard";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Download } from "lucide-react";

import { useState } from "react";
import { DateRange } from "react-day-picker";

export default function ReportsPage() {
    const [dateRange, setDateRange] = useState<DateRange | undefined>();

    return (
        <AppLayout>
            <div className="flex flex-col space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Reportes y Métricas</h1>
                    <div className="flex items-center gap-2">
                        <DateRangePicker date={dateRange} setDate={setDateRange} />
                        <Button variant="outline" size="sm">
                            <Download className="mr-2 h-4 w-4" />
                            Exportar
                        </Button>
                    </div>
                </div>

                <ReportsDashboard />
            </div>
        </AppLayout>
    );
}
