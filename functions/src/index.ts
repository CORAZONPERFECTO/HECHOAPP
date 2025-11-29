import * as admin from "firebase-admin";
import * as functions from "firebase-functions";

admin.initializeApp();

export * from "./tickets";
export * from "./seed";

export const createAdminUser = functions.https.onCall(async (data, context) => {
    try {
        const user = await admin.auth().createUser({
            email: data.email,
            password: data.password,
        });
        return { success: true, uid: user.uid };
    } catch (error: any) {
        return { error: error.message };
    }
});
