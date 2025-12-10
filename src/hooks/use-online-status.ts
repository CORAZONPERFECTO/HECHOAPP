"use client";

import { useState, useEffect } from 'react';

export function useOnlineStatus() {
    const [isOnline, setIsOnline] = useState(true);

    useEffect(() => {
        // Check initial status
        setIsOnline(navigator.onLine);

        // Listen for online/offline events
        const handleOnline = () => {
            console.log('🟢 Connection restored');
            setIsOnline(true);
        };

        const handleOffline = () => {
            console.log('🔴 Connection lost');
            setIsOnline(false);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return isOnline;
}
