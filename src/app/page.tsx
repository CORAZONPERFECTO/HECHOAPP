"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { collection, getCountFromServer } from "firebase/firestore";
import { AppCard } from "@/components/ui/app-card";
import { LogOut, Ticket, Users, Settings, MessageSquare, FileText, BarChart3, LayoutGrid, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AppCardProps {
  icon: React.ElementType;
  label: string;
  href: string;
  color?: string;
  onClick?: () => void;
}



export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push("/login");
      } else {
        setUser(currentUser);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  if (loading) return <div className="flex items-center justify-center h-screen bg-gray-100">Cargando...</div>;

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#f1f5f9] p-8">
      {/* Header */}
      <header className="flex justify-between items-center mb-12">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-6 w-6 text-gray-400" />
          <h1 className="text-xl font-semibold text-gray-700">HECHO SRL</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{user.email}</span>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-5 w-5 text-gray-400 hover:text-red-500" />
          </Button>
        </div>
      </header>

      {/* App Grid */}
      <main className="max-w-5xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">

          <AppCard
            icon={Ticket}
            label="Tickets"
            href="/tickets"
            color="text-purple-600"
          />

          <AppCard
            icon={Users}
            label="Clientes"
            href="/clients"
            color="text-blue-600"
          />

          <AppCard
            icon={Wrench}
            label="Técnicos"
            href="/technicians"
            color="text-orange-600"
          />

          <AppCard
            icon={MessageSquare}
            label="Mensajes"
            href="#"
            color="text-green-600"
            onClick={() => alert("Integración WhatsApp en desarrollo")}
          />

          <AppCard
            icon={BarChart3}
            label="Reportes"
            href="#"
            color="text-indigo-600"
            onClick={() => alert("Reportes en desarrollo")}
          />

          <AppCard
            icon={Settings}
            label="Ajustes"
            href="/settings"
            color="text-gray-600"
          />

        </div>
      </main>

      <footer className="fixed bottom-4 w-full text-center text-xs text-gray-400">
        Hecho Nexus v4.0 &copy; 2025
      </footer>
    </div>
  );
}
