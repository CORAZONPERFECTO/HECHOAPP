"use client";

import { useEffect, useState } from "react";
import { Bell, Check } from "lucide-react";
import { collection, query, where, orderBy, onSnapshot, limit, doc, updateDoc, Timestamp } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Notification {
    id: string;
    title: string;
    body: string;
    type: "INFO" | "SUCCESS" | "WARNING" | "ERROR";
    link?: string;
    read: boolean;
    createdAt: Timestamp;
}

export function NotificationBell() {
    const [user, setUser] = useState<User | null>(null);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribeAuth();
    }, []);

    useEffect(() => {
        if (!user) {
            setNotifications([]);
            setUnreadCount(0);
            return;
        }

        const q = query(
            collection(db, "users", user.uid, "notifications"),
            orderBy("createdAt", "desc"),
            limit(20)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Notification[];

            setNotifications(items);
            setUnreadCount(items.filter((n) => !n.read).length);
        });

        return () => unsubscribe();
    }, [user]);

    const markAsRead = async (id: string) => {
        if (!user) return;
        await updateDoc(doc(db, "users", user.uid, "notifications", id), {
            read: true
        });
    };

    const markAllRead = async () => {
        if (!user) return;
        const unread = notifications.filter(n => !n.read);
        const promises = unread.map(n => markAsRead(n.id));
        await Promise.all(promises);
    };

    if (!user) return null;

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" size="icon" className="relative rounded-full h-10 w-10 bg-background/80 backdrop-blur-sm shadow-sm border-muted">
                    <Bell className="h-5 w-5 text-muted-foreground" />
                    {unreadCount > 0 && (
                        <Badge
                            variant="destructive"
                            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs rounded-full animate-in zoom-in"
                        >
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </Badge>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 mr-4" align="end">
                <div className="flex items-center justify-between p-4 border-b">
                    <h4 className="font-semibold text-sm">Notificaciones</h4>
                    {unreadCount > 0 && (
                        <Button variant="ghost" size="xs" onClick={markAllRead} className="h-6 text-xs text-muted-foreground">
                            <Check className="mr-1 h-3 w-3" />
                            Marcar leídas
                        </Button>
                    )}
                </div>
                <ScrollArea className="h-[300px]">
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full p-8 text-center text-muted-foreground">
                            <Bell className="h-8 w-8 mb-2 opacity-20" />
                            <p className="text-sm">No tienes notificaciones</p>
                        </div>
                    ) : (
                        <div className="grid gap-1 p-1">
                            {notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={cn(
                                        "flex flex-col gap-1 p-3 rounded-md transition-colors hover:bg-muted/50 text-left cursor-pointer relative",
                                        !notification.read && "bg-blue-50/50 dark:bg-blue-900/10"
                                    )}
                                    onClick={() => markAsRead(notification.id)}
                                >
                                    <div className="flex justify-between items-start gap-2">
                                        <span className={cn(
                                            "text-sm font-medium leading-none",
                                            !notification.read && "text-primary"
                                        )}>
                                            {notification.title}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground shrink-0">
                                            {notification.createdAt?.toDate ? notification.createdAt.toDate().toLocaleDateString() : 'Justo ahora'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground line-clamp-2">
                                        {notification.body}
                                    </p>
                                    {!notification.read && (
                                        <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-full" />
                                    )}
                                    {notification.link && (
                                        <Link
                                            href={notification.link}
                                            className="absolute inset-0"
                                            onClick={() => setIsOpen(false)}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
}
