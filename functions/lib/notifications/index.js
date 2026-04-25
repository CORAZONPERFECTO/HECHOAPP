"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationService = void 0;
const admin = require("firebase-admin");
const db = admin.firestore();
exports.notificationService = {
    /**
     * Sends an In-App notification (Firestore) and optionally Push (FCM).
     */
    async send(payload) {
        try {
            // 1. In-App Notification (Firestore)
            // Stores in users/{userId}/notifications/{notificationId}
            await db.collection(`users/${payload.userId}/notifications`).add({
                title: payload.title,
                body: payload.body,
                type: payload.type,
                link: payload.link || null,
                metadata: payload.metadata || {},
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            console.log(`Notification sent to ${payload.userId}: ${payload.title}`);
            // 2. Push Notification (FCM) - Placeholder
            // const userToken = await getUserDeviceToken(payload.userId);
            // if (userToken) {
            //   await admin.messaging().send({ ... });
            // }
        }
        catch (error) {
            console.error("Error sending notification:", error);
        }
    },
    /**
     * Broadcasts to a role (e.g. all ADMINs).
     */
    async broadcastToRole(role, payload) {
        try {
            // Find users with role
            // Assuming a 'users' collection with 'role' field
            const snapshot = await db.collection("users").where("role", "==", role).get();
            const promises = snapshot.docs.map(doc => this.send(Object.assign(Object.assign({}, payload), { userId: doc.id })));
            await Promise.all(promises);
            console.log(`Broadcast to ${role} completed. Count: ${snapshot.size}`);
        }
        catch (error) {
            console.error("Error broadcasting notification:", error);
        }
    }
};
//# sourceMappingURL=index.js.map