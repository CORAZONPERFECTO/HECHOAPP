"use client";

import { useEffect, useState } from "react";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

export function LocationTracker() {
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [role, setRole] = useState<string | null>(null);

    // 1. Fetch user role
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    const docSnap = await getDoc(doc(db, "users", user.uid));
                    if (docSnap.exists()) {
                        setRole(docSnap.data().rol || null);
                    }
                } catch (e) {
                    console.error("Error fetching role:", e);
                }
            } else {
                setRole(null);
            }
        });
        return () => unsubscribe();
    }, []);

    // 2. Track location if user is TECNICO
    useEffect(() => {
        if (!role || role !== "TECNICO") return;
        
        const updateLocation = () => {
            if ("geolocation" in navigator) {
                navigator.geolocation.getCurrentPosition(
                    async (position) => {
                        setHasPermission(true);
                        const user = auth.currentUser;
                        if (!user) return;
                        
                        try {
                            await setDoc(doc(db, "users", user.uid), {
                                lastLocation: {
                                    lat: position.coords.latitude,
                                    lng: position.coords.longitude,
                                    timestamp: serverTimestamp(),
                                    accuracy: position.coords.accuracy,
                                }
                            }, { merge: true });
                        } catch (e) {
                            console.error("Error updating location:", e);
                        }
                    },
                    (error) => {
                        console.error("Geolocation error:", error);
                        if (error.code === error.PERMISSION_DENIED) {
                            setHasPermission(false);
                        }
                    },
                    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
                );
            }
        };

        // Update immediately
        updateLocation();
        
        // Then every 5 minutes (300000 ms)
        const interval = setInterval(updateLocation, 300000);
        
        return () => clearInterval(interval);
    }, [role]);

    // Show warning if permission denied
    if (hasPermission === false && role === "TECNICO") {
        return (
            <div className="fixed bottom-4 left-4 right-4 bg-red-100 border border-red-300 text-red-800 p-3 rounded-lg text-sm z-50 shadow-lg">
                ⚠️ <strong>Permiso de ubicación denegado.</strong> Para recibir tickets, debes permitir el acceso a tu ubicación en el navegador.
            </div>
        );
    }

    return null;
}
