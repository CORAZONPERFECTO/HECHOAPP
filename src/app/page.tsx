"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, getCountFromServer } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [ticketCount, setTicketCount] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push("/login");
      } else {
        setUser(currentUser);
        fetchStats();
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const fetchStats = async () => {
    try {
      const coll = collection(db, "tickets");
      const snapshot = await getCountFromServer(coll);
      setTicketCount(snapshot.data().count);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  if (loading) return <div className="p-8">Cargando...</div>;

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Sistema de Tickets HECHO SRL</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{user.email}</span>
          <Button variant="outline" onClick={handleLogout}>
            Cerrar Sesión
          </Button>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tickets Totales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ticketCount !== null ? ticketCount : "..."}</div>
            <p className="text-xs text-muted-foreground">Registrados en el sistema</p>
          </CardContent>
        </Card>
        {/* Placeholder for more stats */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tickets Abiertos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">Pendientes de atención</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mis Asignaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">Tickets asignados a mí</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
