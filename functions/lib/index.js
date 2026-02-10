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
exports.createAdminUser = void 0;
const admin = require("firebase-admin");
const functions = require("firebase-functions");
admin.initializeApp();
__exportStar(require("./tickets"), exports);
__exportStar(require("./service-agent"), exports);
__exportStar(require("./seed"), exports);
// export * from "./notifications"; 
__exportStar(require("./erpnext/triggers"), exports);
__exportStar(require("./seed"), exports);
__exportStar(require("./service-agent"), exports);
exports.createAdminUser = functions.https.onCall(async (data, context) => {
    try {
        const user = await admin.auth().createUser({
            email: data.email,
            password: data.password,
        });
        return { success: true, uid: user.uid };
    }
    catch (error) {
        return { error: error.message };
    }
});
//# sourceMappingURL=index.js.map