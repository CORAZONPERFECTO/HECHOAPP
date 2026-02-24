"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAdminUser = exports.getErpCacheStatus = exports.refreshErpCache = void 0;
const admin = require("firebase-admin");
const https_1 = require("firebase-functions/v2/https");
const cache_1 = require("./erpnext/cache");
const service_1 = require("./erpnext/service");
admin.initializeApp();
__exportStar(require("./tickets"), exports);
__exportStar(require("./service-agent"), exports);
__exportStar(require("./seed"), exports);
__exportStar(require("./erpnext/triggers"), exports);
__exportStar(require("./erpnext/quotes"), exports);
/** Admin-only: force-refresh one or all ERP catalog cache keys. */
exports.refreshErpCache = (0, https_1.onCall)(async (req) => {
    if (!req.auth)
        throw new https_1.HttpsError("unauthenticated", "Must be logged in.");
    const { key } = req.data;
    await (0, cache_1.invalidateCache)(key);
    // Pre-warm the requested key immediately (fire-and-forget the others)
    if (key)
        await (0, cache_1.getCatalog)(key, service_1.erpNextService);
    return { success: true, refreshed: key !== null && key !== void 0 ? key : "all" };
});
/** Returns current freshness status of every ERP cache key. */
exports.getErpCacheStatus = (0, https_1.onCall)(async (req) => {
    if (!req.auth)
        throw new https_1.HttpsError("unauthenticated", "Must be logged in.");
    return (0, cache_1.getCacheStatus)();
});
exports.createAdminUser = (0, https_1.onCall)(async (data) => {
    const { email, password } = data.data;
    try {
        const user = await admin.auth().createUser({ email, password });
        return { success: true, uid: user.uid };
    }
    catch (error) {
        return { error: error.message };
    }
});
//# sourceMappingURL=index.js.map