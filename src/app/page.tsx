"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { collection, getCountFromServer, doc, getDoc, query, orderBy, onSnapshot, limit } from "firebase/firestore";
import { AppCard } from "@/components/ui/app-card";
import { LogOut, Ticket, Users, Settings, MessageSquare, FileText, BarChart3, LayoutGrid, Wrench, Sparkles, BrainCircuit } from "lucide-react";
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
import { SLAMetricsCard } from "@/components/tickets/sla-metrics-card";


// ... imports
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  TouchSensor,
  MouseSensor
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowDownWideNarrow } from "lucide-react";

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
    // translate is safer than transform for simple list reordering to avoid scaling artifacts
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    scale: isDragging ? 1.05 : 1,
    zIndex: isDragging ? 1000 : 1,
    touchAction: 'none' as React.CSSProperties['touchAction'],
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="h-full w-full relative touch-none">
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
  { id: 'reports', label: 'Reportes', icon: BarChart3, href: '/reports', color: 'text-indigo-600', role: 'ALL' },
  { id: 'settings', label: 'Ajustes', icon: Settings, href: '/settings', color: 'text-gray-600', role: 'ADMIN' },
  { id: 'resources', label: 'Recursos', icon: FileText, href: '/resources', color: 'text-teal-600', role: 'ALL' },
  { id: 'income', label: 'Ingresos', icon: BarChart3, href: '/income', color: 'text-emerald-600', role: 'ADMIN' },
  { id: 'ai-diagnostics', label: 'Diagnóstico IA', icon: BrainCircuit, href: '/resources?tab=errors', color: 'text-violet-600', role: 'ALL' },
  { id: 'quote-chat', label: 'Cotizador IA', icon: Sparkles, href: '#', color: 'text-pink-600', role: 'ALL', isSpecial: true },
];

const USAGE_KEY = 'dashboard-usage-stats';

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  // State for modules order
  const [modules, setModules] = useState(ALL_MODULES);

  // State for Quote Chat Modal
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);

  // State for tickets (for SLA widget)
  const [tickets, setTickets] = useState<any[]>([]);

  const router = useRouter();

  useEffect(() => {
    // Load persisted order
    const savedOrder = localStorage.getItem('dashboard-order-v2');
    if (savedOrder) {
      try {
        const orderIds = JSON.parse(savedOrder);
        // Sort ALL_MODULES based on saved order
        const sorted = [...ALL_MODULES].sort((a, b) => {
          // Force Quote Chat to start IF desired, but user might want to reorder it too. 
          // Let's allow complete reordering properly.
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
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
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
        localStorage.setItem('dashboard-order-v2', JSON.stringify(newOrder.map(i => i.id)));

        return newOrder;
      });
    }
  };

  const trackUsage = (moduleId: string) => {
    try {
      const currentStatsRaw = localStorage.getItem(USAGE_KEY);
      const stats: Record<string, number> = currentStatsRaw ? JSON.parse(currentStatsRaw) : {};
      stats[moduleId] = (stats[moduleId] || 0) + 1;
      localStorage.setItem(USAGE_KEY, JSON.stringify(stats));
    } catch (e) {
      console.error("Error tracking usage", e);
    }
  };

  const sortByUsage = () => {
    try {
      const currentStatsRaw = localStorage.getItem(USAGE_KEY);
      // If no stats yet, don't do anything or just stay same
      if (!currentStatsRaw) {
        alert("Aún no hay suficientes datos de uso para ordenar.");
        return;
      }
      const stats: Record<string, number> = JSON.parse(currentStatsRaw);

      setModules((currentModules) => {
        const sorted = [...currentModules].sort((a, b) => {
          const countA = stats[a.id] || 0;
          const countB = stats[b.id] || 0;
          // Descending order (higher usage first)
          return countB - countA;
        });

        // Save new order
        localStorage.setItem('dashboard-order-v2', JSON.stringify(sorted.map(i => i.id)));
        return sorted;
      });

    } catch (e) {
      console.error("Error sorting by usage", e);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      // ... same auth logic as before ...
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

  const isTechnician = userProfile?.rol === 'TECNICO';

  // Load tickets for SLA metrics
  useEffect(() => {
    if (user && !isTechnician) {
      const q = query(
        collection(db, "tickets"),
        orderBy("createdAt", "desc"),
        limit(100)
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setTickets(data);
      });
      return () => unsubscribe();
    }
  }, [user, isTechnician]);

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
                <SLAMetricsCard tickets={tickets} />
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
          <div className="flex items-center gap-2">
            <span>Acceso Rápido ✨</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              onClick={sortByUsage}
            >
              <ArrowDownWideNarrow className="h-3 w-3 mr-1" />
              Ordenar por uso
            </Button>
          </div>
          <span className="text-xs text-gray-400 font-normal hidden md:inline">Arrastra para reordenar</span>
        </h2>

        <DndContext
          id="dashboard-dnd-context"
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
                        onClick={() => {
                          trackUsage(module.id);
                          setIsQuoteModalOpen(true);
                        }}
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
                      onClick={() => {
                        // Track usage first
                        trackUsage(module.id);
                        // If module has specific onClick (like alerts), invoke it
                        if (module.onClick) {
                          module.onClick();
                        }
                        // Note: Navigation links (with valid href) will still propagate to Link 
                        // if we didn't prevent default. 
                        // Our updated AppCard allows onClick propagation.
                      }}
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

