import * as admin from "firebase-admin";

const db = admin.firestore();

export type NotificationType = "INFO" | "SUCCESS" | "WARNING" | "ERROR";

export interface NotificationPayload {
    userId: string;
    title: string;
    body: string;
    type: NotificationType;
    link?: string;
    metadata?: any;
}

export const notificationService = {
    /**
     * Sends an In-App notification (Firestore) and optionally Push (FCM).
     */
    async send(payload: NotificationPayload) {
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

        } catch (error) {
            console.error("Error sending notification:", error);
        }
    },

    /**
     * Broadcasts to a role (e.g. all ADMINs).
     */
    async broadcastToRole(role: string, payload: Omit<NotificationPayload, "userId">) {
        try {
            // Find users with role
            // Assuming a 'users' collection with 'role' field
            const snapshot = await db.collection("users").where("role", "==", role).get();

            const promises = snapshot.docs.map(doc =>
                this.send({ ...payload, userId: doc.id })
            );

            await Promise.all(promises);
            console.log(`Broadcast to ${role} completed. Count: ${snapshot.size}`);
        } catch (error) {
            console.error("Error broadcasting notification:", error);
        }
    }
};
