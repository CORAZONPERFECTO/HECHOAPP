"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { collection, getCountFromServer, doc, getDoc } from "firebase/firestore";
import { AppCard } from "@/components/ui/app-card";
import { LogOut, Ticket, Users, Settings, MessageSquare, FileText, BarChart3, LayoutGrid, Wrench, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { User as UserSchema } from "@/types/schema";
import { DashboardStats } from "@/components/dashboard/dashboard-stats";
import { ActiveTicketCard } from "@/components/dashboard/active-ticket-card";
import { UrgentTicketsList } from "@/components/dashboard/urgent-tickets-list";
import { IncomeChart } from "@/components/dashboard/income-chart";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { AppLayout } from "@/components/layout/app-layout";
import { QuoteChatModal } from "@/components/dashboard/quote-chat-modal";

// DnD Imports
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sortable Item Wrapper
// Sortable Item Wrapper
function SortableItem(props: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: props.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
    touchAction: 'none' as React.CSSProperties['touchAction'], // Important for PointerSensor
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="h-full w-full relative">
      {props.children}
    </div>
  );
}

// Definition of all possible modules
const ALL_MODULES = [
  { id: 'tickets', label: 'Tickets', icon: Ticket, href: '/tickets', color: 'text-purple-600', role: 'ALL' },
  { id: 'clients', label: 'Clientes', icon: Users, href: '/clients', color: 'text-blue-600', role: 'ADMIN' },
  { id: 'technicians', label: 'Técnicos', icon: Wrench, href: '/technicians', color: 'text-orange-600', role: 'ADMIN' },
  { id: 'messages', label: 'Mensajes', icon: MessageSquare, href: '#', color: 'text-green-600', role: 'ALL', onClick: () => alert("Integración WhatsApp en desarrollo") },
  { id: 'reports', label: 'Reportes', icon: BarChart3, href: '#', color: 'text-indigo-600', role: 'ALL', onClick: () => alert("Reportes en desarrollo") },
  { id: 'settings', label: 'Ajustes', icon: Settings, href: '/settings', color: 'text-gray-600', role: 'ADMIN' },
  { id: 'resources', label: 'Recursos', icon: FileText, href: '/resources', color: 'text-teal-600', role: 'ALL' },
  { id: 'income', label: 'Ingresos', icon: BarChart3, href: '/income', color: 'text-emerald-600', role: 'ADMIN' },
  { id: 'quote-chat', label: 'Cotizador IA', icon: Sparkles, href: '#', color: 'text-pink-600', role: 'ALL', isSpecial: true },
];

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  // State for modules order
  const [modules, setModules] = useState(ALL_MODULES);

  // State for Quote Chat Modal
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);

  const router = useRouter();

  useEffect(() => {
    // Load persisted order
    const savedOrder = localStorage.getItem('dashboard-order');
    if (savedOrder) {
      try {
        const orderIds = JSON.parse(savedOrder);
        // Sort ALL_MODULES based on saved order
        const sorted = [...ALL_MODULES].sort((a, b) => {
          // Force Quote Chat to start
          if (a.id === 'quote-chat') return -1;
          if (b.id === 'quote-chat') return 1;

          const indexA = orderIds.indexOf(a.id);
          const indexB = orderIds.indexOf(b.id);
          // If new items exist that aren't in saved order, put them at the end
          if (indexA === -1) return 1;
          if (indexB === -1) return -1;
          return indexA - indexB;
        });
        setModules(sorted);
      } catch (e) { console.error("Error loading dashboard order", e); }
    }
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), // Distance 8px prevents accidental drags on clicks
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setModules((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over?.id);
        const newOrder = arrayMove(items, oldIndex, newIndex);

        // Save to localStorage
        localStorage.setItem('dashboard-order', JSON.stringify(newOrder.map(i => i.id)));

        return newOrder;
      });
    }
  };

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

  if (loading) return <div className="flex items-center justify-center h-screen bg-gray-100">Cargando...</div>;
  if (!user) return null;

  const isTechnician = userProfile?.rol === 'TECNICO';

  // Filter modules based on role
  const visibleModules = modules.filter(m => {
    if (m.role === 'ALL') return true;
    if (m.role === 'ADMIN' && !isTechnician) return true;
    // Adjust tech specific routing if needed
    if (isTechnician && m.id === 'tickets') m.href = "/technician/tickets";
    return false;
  });

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
        )}
      </section>

      {/* 2. Quick Access Grid (Draggable) */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-gray-700 mb-4 px-1 flex justify-between items-center">
          <span>Acceso Rápido ✨</span>
          <span className="text-xs text-gray-400 font-normal hidden md:inline">Arrastra para reordenar</span>
        </h2>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={visibleModules.map(m => m.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
              {visibleModules.map((module) => (
                <SortableItem key={module.id} id={module.id}>
                  {module.id === 'quote-chat' ? (
                    <div className="h-full">
                      {/* Special Render for Quote Chat which triggers Modal */}
                      <div
                        className="h-full bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all cursor-pointer relative overflow-hidden"
                        onClick={() => setIsQuoteModalOpen(true)}
                      >
                        {/* Visual Content */}
                        <div className="p-6 flex flex-col items-center justify-center gap-3 text-center h-full pointer-events-none">
                          <Sparkles className="h-8 w-8 text-pink-500" />
                          <span className="font-medium text-gray-600">Cotizador IA</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <AppCard
                      icon={module.icon}
                      label={module.label}
                      href={module.href}
                      color={module.color}
                      onClick={module.onClick}
                    />
                  )}
                </SortableItem>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </section>

      {/* Modals */}
      <QuoteChatModal open={isQuoteModalOpen} onOpenChange={setIsQuoteModalOpen} />
    </AppLayout >
  );
}
