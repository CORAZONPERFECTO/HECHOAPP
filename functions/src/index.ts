import * as admin from "firebase-admin";
import * as functions from "firebase-functions";

admin.initializeApp();

export * from "./tickets";
export * from "./service-agent";
export * from "./seed";
export * from "./erpnext/triggers";

export const createAdminUser = functions.https.onCall(async (data) => {
    const { email, password } = data.data as { email: string; password: string };
    try {
        const user = await admin.auth().createUser({ email, password });
        return { success: true, uid: user.uid };
    } catch (error: any) {
        return { error: error.message };
    }
});
