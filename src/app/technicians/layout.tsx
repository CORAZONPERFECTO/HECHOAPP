"use client";

import { RoleGuard } from "@/components/auth/role-guard";
import { UserRole } from "@/types/schema";

// Only ADMINs (and maybe Supervisors/Gerentes?) should manage technicians.
// For now, restricting to ADMIN.
const ALLOWED_ROLES: UserRole[] = ['ADMIN'];

export default function TechniciansLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <RoleGuard allowedRoles={ALLOWED_ROLES}>
            {children}
        </RoleGuard>
    );
}
