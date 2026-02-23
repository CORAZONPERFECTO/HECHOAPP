import * as admin from "firebase-admin";

const db = admin.firestore();

// ---------------------------------------------------------------------------
// ERPNext Catalog Cache
//
// Stores rarely-changing ERP data in Firestore so the app doesn't query
// ERPNext on every screen load. Each entry has a TTL (time-to-live).
//
// Firestore path:  erpCache/{cacheKey}
//   - data:        the cached payload
//   - cachedAt:    server timestamp
//   - expiresAt:   millisecond epoch when the entry is stale
//   - source:      which ERPNext endpoint it came from
// ---------------------------------------------------------------------------

export type CacheKey =
    | "items"            // All active Items (products/services)
    | "item_prices"      // Standard Selling price list
    | "territories"      // Territory list
    | "customer_groups"  // Customer group list
    | "payment_terms";   // Payment terms

// TTL per key type (in milliseconds)
const TTL_MS: Record<CacheKey, number> = {
    items: 6 * 60 * 60 * 1000, // 6 hours
    item_prices: 6 * 60 * 60 * 1000, // 6 hours
    territories: 24 * 60 * 60 * 1000, // 24 hours
    customer_groups: 24 * 60 * 60 * 1000, // 24 hours
    payment_terms: 24 * 60 * 60 * 1000, // 24 hours
};

// ERPNext endpoints for each cache key
const ERP_ENDPOINTS: Record<CacheKey, string> = {
    items: `Item?fields=["name","item_name","item_group","description","standard_rate","stock_uom"]&filters=[["disabled","=",0]]&limit_page_length=200`,
    item_prices: `Item Price?fields=["item_code","price_list_rate","uom"]&filters=[["price_list","=","Standard Selling"]]&limit_page_length=200`,
    territories: `Territory?fields=["name","parent_territory"]&limit_page_length=100`,
    customer_groups: `Customer Group?fields=["name","parent_customer_group"]&limit_page_length=100`,
    payment_terms: `Payment Terms?fields=["name","due_date_based_on","credit_days"]&limit_page_length=50`,
};

/**
 * Reads a catalog from Firestore cache. Returns null if missing or expired.
 */
async function readCache<T>(key: CacheKey): Promise<T[] | null> {
    const doc = await db.collection("erpCache").doc(key).get();
    if (!doc.exists) return null;

    const entry = doc.data()!;
    if (Date.now() > entry.expiresAt) {
        console.log(`Cache EXPIRED for "${key}"`);
        return null;
    }

    console.log(`Cache HIT for "${key}" (${(entry.data as T[]).length} items)`);
    return entry.data as T[];
}

/**
 * Writes catalog data to Firestore cache with a TTL.
 */
async function writeCache<T>(key: CacheKey, data: T[]): Promise<void> {
    const ttl = TTL_MS[key];
    await db.collection("erpCache").doc(key).set({
        data,
        cachedAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: Date.now() + ttl,
        source: ERP_ENDPOINTS[key],
        count: data.length,
    });
    console.log(`Cache WRITTEN for "${key}" — ${data.length} items, TTL: ${ttl / 3600000}h`);
}

/**
 * Main: returns data from cache if fresh, otherwise fetches from ERPNext
 * and populates the cache before returning.
 */
export async function getCatalog<T = any>(
    key: CacheKey,
    erpService: { request: (endpoint: string, method?: string) => Promise<T[]> }
): Promise<T[]> {
    // 1. Try cache first
    const cached = await readCache<T>(key);
    if (cached !== null) return cached;

    // 2. Cache miss — fetch from ERPNext
    console.log(`Cache MISS for "${key}" — fetching from ERPNext...`);
    const endpoint = ERP_ENDPOINTS[key];
    const freshData = await erpService.request(endpoint, "GET");

    // 3. Store in Firestore (fire-and-forget, don't block response)
    writeCache(key, freshData).catch((err) =>
        console.error(`Failed to write cache for "${key}":`, err)
    );

    return freshData;
}

/**
 * Force-refreshes a specific cache key (or all keys if omitted).
 * Useful to call from an admin endpoint or after updating ERP catalog data.
 */
export async function invalidateCache(key?: CacheKey): Promise<void> {
    if (key) {
        await db.collection("erpCache").doc(key).delete();
        console.log(`Cache INVALIDATED: "${key}"`);
    } else {
        const snapshot = await db.collection("erpCache").get();
        const batch = db.batch();
        snapshot.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
        console.log(`Cache INVALIDATED: all ${snapshot.size} keys`);
    }
}

/**
 * Returns cache status for all known keys — useful for an admin dashboard.
 */
export async function getCacheStatus(): Promise<Record<string, {
    exists: boolean;
    count?: number;
    cachedAt?: FirebaseFirestore.Timestamp;
    expiresAt?: number;
    isExpired?: boolean;
}>> {
    const result: Record<string, any> = {};
    const keys: CacheKey[] = ["items", "item_prices", "territories", "customer_groups", "payment_terms"];

    for (const key of keys) {
        const doc = await db.collection("erpCache").doc(key).get();
        if (!doc.exists) {
            result[key] = { exists: false };
        } else {
            const e = doc.data()!;
            result[key] = {
                exists: true,
                count: e.count,
                cachedAt: e.cachedAt,
                expiresAt: e.expiresAt,
                isExpired: Date.now() > e.expiresAt,
            };
        }
    }
    return result;
}
