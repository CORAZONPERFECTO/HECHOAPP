import { useState, useEffect, useCallback } from "react";
import { doc, updateDoc, serverTimestamp, addDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Ticket, EventType } from "@/types/schema";

interface AutoSaveOptions {
    ticketId?: string;
    onSave?: (lastSaved: Date) => void;
}

export function useTicketAutoSave(data: Partial<Ticket>, options: AutoSaveOptions = {}) {
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);

    // Local Storage Key
    const storageKey = options.ticketId
        ? `ticket_draft_${options.ticketId}`
        : 'ticket_new_draft';

    // Load from local storage on mount
    useEffect(() => {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Logic to merge or notify user could go here
                console.log("Found local draft", parsed);
            } catch (e) {
                console.error("Error parsing draft", e);
            }
        }
    }, [storageKey]);

    // Save to Local Storage on change
    useEffect(() => {
        if (Object.keys(data).length > 0) {
            localStorage.setItem(storageKey, JSON.stringify(data));
            setDirty(true);
        }
    }, [data, storageKey]);

    // Auto-save to Firestore (Debounced or Interval)
    useEffect(() => {
        if (!dirty || !options.ticketId) return;

        const timer = setTimeout(async () => {
            setSaving(true);
            try {
                await updateDoc(doc(db, "tickets", options.ticketId!), {
                    ...data,
                    updatedAt: serverTimestamp(),
                });

                // Log auto-save event (optional, maybe too noisy)
                // await addDoc(collection(db, "ticketEvents"), {
                //   ticketId: options.ticketId,
                //   type: 'AUTOGUARDADO',
                //   description: 'Autoguardado del sistema',
                //   timestamp: serverTimestamp(),
                //   userId: 'SYSTEM'
                // });

                setLastSaved(new Date());
                setDirty(false);
                if (options.onSave) options.onSave(new Date());
            } catch (error) {
                console.error("Auto-save failed", error);
            } finally {
                setSaving(false);
            }
        }, 3000); // 3 seconds debounce

        return () => clearTimeout(timer);
    }, [data, dirty, options.ticketId, options.onSave]);

    return { lastSaved, saving };
}
