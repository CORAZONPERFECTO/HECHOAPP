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
import { IncomeChart } from "@/components/dashboard/income-chart";

import { RecentActivity } from "@/components/dashboard/recent-activity";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";

interface AppCardProps {
  icon: React.ElementType;
  label: string;
  href: string;
  color?: string;
  onClick?: () => void;
}



import { AppLayout } from "@/components/layout/app-layout";

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
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
    <AppLayout>
      {/* 1. Command Center Layer */}
      <section>
        {isTechnician ? (
          <ActiveTicketCard />
        ) : (

          <div className="space-y-6">
            <div className="flex justify-end">
              <DateRangePicker date={dateRange} setDate={setDateRange} />
            </div>
            <DashboardStats dateRange={dateRange} />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <IncomeChart dateRange={dateRange} />
              <div className="space-y-6">
                <RecentActivity />
                <UrgentTicketsList />
              </div>
            </div>
          </div>
        )
        }
      </section >

      {/* 2. Quick Access Grid */}
      < section >
        <h2 className="text-lg font-semibold text-gray-700 mb-4 px-1">Acceso Rápido</h2>
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

          {!isTechnician && (
            <AppCard
              icon={BarChart3}
              label="Ingresos"
              href="/income"
              color="text-emerald-600"
            />
          )}

        </div>
      </section >
    </AppLayout >
  );
}
