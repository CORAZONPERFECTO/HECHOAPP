import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { invalidateCache, getCacheStatus, getCatalog } from "./erpnext/cache";
import { erpNextService } from "./erpnext/service";

admin.initializeApp();

export * from "./tickets";
export * from "./service-agent";
export * from "./seed";
export * from "./erpnext/triggers";
export * from "./erpnext/quotes";

/** Admin-only: force-refresh one or all ERP catalog cache keys. */
export const refreshErpCache = onCall(async (req) => {
    if (!req.auth) throw new HttpsError("unauthenticated", "Must be logged in.");
    const { key } = req.data as { key?: string };
    await invalidateCache(key as any);
    // Pre-warm the requested key immediately (fire-and-forget the others)
    if (key) await getCatalog(key as any, erpNextService);
    return { success: true, refreshed: key ?? "all" };
});

/** Returns current freshness status of every ERP cache key. */
export const getErpCacheStatus = onCall(async (req) => {
    if (!req.auth) throw new HttpsError("unauthenticated", "Must be logged in.");
    return getCacheStatus();
});

export const createAdminUser = onCall(async (data) => {
    const { email, password } = data.data as { email: string; password: string };
    try {
        const user = await admin.auth().createUser({ email, password });
        return { success: true, uid: user.uid };
    } catch (error: any) {
        return { error: error.message };
    }
});
