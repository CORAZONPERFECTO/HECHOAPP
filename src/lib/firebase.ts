import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, enableMultiTabIndexedDbPersistence } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

import { getStorage } from "firebase/storage";

function cleanConfigValue(val: string | undefined, fallback: string): string {
  if (!val || val === "undefined" || val === "null" || typeof val !== "string" || val.trim().length < 5) {
    return fallback;
  }
  const cleaned = val.replace(/^["']|["']$/g, "").trim();
  return cleaned.length > 5 ? cleaned : fallback;
}

const firebaseConfig = {
  apiKey: cleanConfigValue(process.env.NEXT_PUBLIC_FIREBASE_API_KEY, "AIzaSyCZKE9ZRLhNJGxf-PNdbR6IjgMCl5xvkbA"),
  authDomain: cleanConfigValue(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, "hecho-srl-free.firebaseapp.com"),
  projectId: cleanConfigValue(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, "hecho-srl-free"),
  storageBucket: cleanConfigValue(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET, "hecho-srl-free.firebasestorage.app"),
  messagingSenderId: cleanConfigValue(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID, "216623683956"),
  appId: cleanConfigValue(process.env.NEXT_PUBLIC_FIREBASE_APP_ID, "1:216623683956:web:7b7de0220203978c6db421"),
  measurementId: cleanConfigValue(process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, "G-XHS77PK8HC")
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true
});
if (typeof window !== "undefined") {
  enableMultiTabIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn("Persistence failed: Multiple tabs open");
    } else if (err.code === 'unimplemented') {
      console.warn("Persistence failed: Browser not supported");
    }
  });
}
const functions = getFunctions(app);
const storage = getStorage(app);

// Connect to Emulators if configured
if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true") {
  console.warn("⚠️ Using Local Firebase Emulators");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { connectAuthEmulator } = require("firebase/auth");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { connectFirestoreEmulator } = require("firebase/firestore");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { connectFunctionsEmulator } = require("firebase/functions");

  connectAuthEmulator(auth, "http://127.0.0.1:9099");
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
}

export { app, auth, db, functions, storage, firebaseConfig };
