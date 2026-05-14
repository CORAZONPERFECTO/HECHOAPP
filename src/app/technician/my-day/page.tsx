"use client";

import { MyDayView } from "@/components/technician/my-day-view";
import { RoleGuard } from "@/components/layout/role-guard";

export default function MyDayPage() {
    return (
        <RoleGuard allowedRoles={["TECNICO", "ADMIN", "CONTRATISTA"]}>
            <MyDayView />
        </RoleGuard>
    );
}
