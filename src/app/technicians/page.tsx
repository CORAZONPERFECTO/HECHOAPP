"use client";

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { User } from "@/types/schema";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft, Mail, Phone } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";

export default function TechniciansPage() {
    const [technicians, setTechnicians] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        // Query for users with role 'TECNICO'
        const q = query(
            collection(db, "users"),
            where("rol", "==", "TECNICO")
            // Note: Composite index might be needed if we add orderBy("createdAt", "desc") here with the where clause
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as User[];
            setTechnicians(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const columns = [
        {
            header: "Nombre",
            accessorKey: "nombre" as keyof User,
            className: "font-medium",
        },
        {
            header: "Email",
            accessorKey: "email" as keyof User,
            cell: (item: User) => (
                <div className="flex items-center gap-2">
                    <Mail className="h-3 w-3 text-gray-400" />
                    {item.email}
                </div>
            )
        },
        {
            header: "Teléfono",
            accessorKey: "telefono" as keyof User,
            cell: (item: User) => item.telefono ? (
                <div className="flex items-center gap-2">
                    <Phone className="h-3 w-3 text-gray-400" />
                    {item.telefono}
                </div>
            ) : "N/A"
        },
        {
            header: "Estado",
            cell: (item: User) => (
                <Badge variant={item.activo ? 'default' : 'secondary'}>
                    {item.activo ? 'Activo' : 'Inactivo'}
                </Badge>
            ),
        },
    ];

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" onClick={() => router.push("/")}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Volver
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Técnicos</h1>
                            <p className="text-gray-500">Gestión del personal técnico</p>
                        </div>
                    </div>
                    <Link href="/technicians/new">
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Nuevo Técnico
                        </Button>
                    </Link>
                </div>

                {loading ? (
                    <div className="text-center py-12">Cargando técnicos...</div>
                ) : (
                    <DataTable
                        data={technicians}
                        columns={columns}
                        searchKey="nombre"
                        searchPlaceholder="Buscar técnico..."
                        onRowClick={(item) => router.push(`/technicians/${item.id}`)}
                    />
                )}
            </div>
        </div>
    );
}
