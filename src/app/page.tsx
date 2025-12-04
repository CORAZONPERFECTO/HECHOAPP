"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { collection, getCountFromServer, doc, getDoc } from "firebase/firestore";
import { AppCard } from "@/components/ui/app-card";
import { LogOut, Ticket, Users, Settings, MessageSquare, FileText, BarChart3, LayoutGrid, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { User as UserSchema } from "@/types/schema";
import { DashboardStats } from "@/components/dashboard/dashboard-stats";
import { ActiveTicketCard } from "@/components/dashboard/active-ticket-card";
import { UrgentTicketsList } from "@/components/dashboard/urgent-tickets-list";

interface AppCardProps {
  icon: React.ElementType;
  label: string;
  href: string;
  color?: string;
  onClick?: () => void;
}



export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push("/login");
      } else {
        setUser(currentUser);
        try {
          const docRef = doc(db, "users", currentUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setUserProfile(docSnap.data() as UserSchema);
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
        }
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

  const isTechnician = userProfile?.rol === 'TECNICO';

  return (
    <div className="min-h-screen bg-[#f1f5f9] p-4 md:p-8">
      {/* Header */}
      <header className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-6 w-6 text-gray-400" />
          <h1 className="text-xl font-semibold text-gray-700">HECHO SRL</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-gray-900">{userProfile?.nombre || "Usuario"}</p>
            <p className="text-xs text-gray-500">{userProfile?.rol || "Invitado"}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-5 w-5 text-gray-400 hover:text-red-500" />
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto space-y-8">

        {/* 1. Command Center Layer */}
        <section>
          {isTechnician ? (
            <ActiveTicketCard />
          ) : (
            <div className="space-y-6">
              <DashboardStats />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                  {/* Placeholder for a chart or recent activity list in future */}
                  <div className="bg-white p-6 rounded-xl border shadow-sm h-full flex items-center justify-center text-gray-400 text-sm">
                    Gráfico de Rendimiento (Próximamente)
                  </div>
                </div>
                <div>
                  <UrgentTicketsList />
                </div>
              </div>
            </div>
          )}
        </section>

        {/* 2. Quick Access Grid */}
        <section>
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Acceso Rápido</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">

            <AppCard
              icon={Ticket}
              label="Tickets"
              href={isTechnician ? "/technician/tickets" : "/tickets"}
              color="text-purple-600"
            />

            {!isTechnician && (
              <>
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
              </>
            )}

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

            {!isTechnician && (
              <AppCard
                icon={Settings}
                label="Ajustes"
                href="/settings"
                color="text-gray-600"
              />
            )}

            <AppCard
              icon={FileText}
              label="Recursos"
              href="/resources"
              color="text-teal-600"
            />

          </div>
        </section>
      </main>

      <footer className="mt-12 text-center text-xs text-gray-400">
        Hecho Nexus v4.0 &copy; 2025
      </footer>
    </div>
  );
}
