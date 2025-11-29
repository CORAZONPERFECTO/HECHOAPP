import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyCZKE9ZRLhNJGxf-PNdbR6IjgMCl5xvkbA",
  authDomain: "hecho-srl-free.firebaseapp.com",
  databaseURL: "https://hecho-srl-free.firebaseio.com",
  projectId: "hecho-srl-free",
  storageBucket: "hecho-srl-free.firebasestorage.app",
  messagingSenderId: "216623683956",
  appId: "1:63203392566:web:e685fc33618e273225ec97",
  measurementId: "G-XHS77PK8HC"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app);

export { app, auth, db, functions };
