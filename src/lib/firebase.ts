import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyCZKE9ZRLhNJGxf-PNdbR6IjgMCl5xvkbA",
  authDomain: "hecho-srl-free.firebaseapp.com",
  projectId: "hecho-srl-free",
  storageBucket: "hecho-srl-free.firebasestorage.app",
  messagingSenderId: "216623683956",
  appId: "1:216623683956:web:7b7de0220203978c6db421",
  measurementId: "G-XHS77PK8HC"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app);

export { app, auth, db, functions };
