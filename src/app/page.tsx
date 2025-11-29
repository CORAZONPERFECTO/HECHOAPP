"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { collection, getCountFromServer } from "firebase/firestore";
import {
  Ticket,
  Users,
  Settings,
  LogOut,
  LayoutGrid,
  Wrench,
  MessageSquare,
  BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface AppCardProps {
  icon: React.ElementType;
  label: string;
  href: string;
  color?: string;
  onClick?: () => void;
}

function AppCard({ icon: Icon, label, href, color = "text-gray-700", onClick }: AppCardProps) {
  const router = useRouter();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      router.push(href);
    }
  };

  return (
    <div
      onClick={handleClick}
      className="flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer hover:bg-gray-50 aspect-square border border-gray-100"
    >
      <Icon className={`h-12 w-12 mb-3 ${color}`} />
      <span className="text-sm font-medium text-gray-700">{label}</span>
    </div>
  );
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
            href="#"
            color="text-blue-600"
            onClick={() => alert("Módulo de Clientes en desarrollo")}
          />

          <AppCard
            icon={Wrench}
            label="Técnicos"
            href="#"
            color="text-orange-600"
            onClick={() => alert("Módulo de Técnicos en desarrollo")}
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
            href="#"
            color="text-gray-600"
            onClick={() => alert("Configuración en desarrollo")}
          />

        </div>
      </main>

      <footer className="fixed bottom-4 w-full text-center text-xs text-gray-400">
        Hecho Nexus v4.0 &copy; 2025
      </footer>
    </div>
  );
}
