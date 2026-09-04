import admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config({ path: "d:/06_PROYECTOS_Y_DESARROLLO/HECHOAPP/.env.local" });

const privateKey = process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "hecho-srl-free",
            clientEmail: process.env.GCP_CLIENT_EMAIL,
            privateKey: privateKey,
        }),
    });
}

const db = admin.firestore();
const auth = admin.auth();

async function run() {
    const email = "lcaa27@gmail.com";
    const newPassword = "Admin123456*";

    console.log("Setting up user " + email + "...");
    let user;
    try {
        user = await auth.getUserByEmail(email);
        console.log("Existing Auth user found UID:", user.uid);
        await auth.updateUser(user.uid, {
            password: newPassword,
            emailVerified: true
        });
        console.log("Password successfully updated to: " + newPassword);
    } catch (e) {
        if (e.code === "auth/user-not-found") {
            console.log("User not found in Auth, creating new user...");
            user = await auth.createUser({
                email,
                password: newPassword,
                displayName: "Luis Albertis (Admin)",
                emailVerified: true
            });
            console.log("User created with UID:", user.uid);
        } else {
            console.error("Auth error:", e);
            return;
        }
    }

    await db.collection("users").doc(user.uid).set({
        uid: user.uid,
        email: email,
        displayName: "Luis Albertis",
        nombre: "Luis Albertis",
        rol: "ADMIN",
        role: "ADMIN",
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    console.log("Firestore doc updated with ADMIN role!");
    console.log("==========================================");
    console.log("CREDENTIALS FOR LOGIN:");
    console.log("Email: " + email);
    console.log("Password: " + newPassword);
    console.log("==========================================");
}

run();
