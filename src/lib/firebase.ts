import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyCFPClK5hsLLERlZmH1vH3WsSMGv1NyioQ",
  authDomain: "hecho-nexus-v3.firebaseapp.com",
  projectId: "hecho-nexus-v3",
  storageBucket: "hecho-nexus-v3.firebasestorage.app",
  messagingSenderId: "811068710360",
  appId: "1:811068710360:web:fbc17fb7e11fa116f726ad",
  measurementId: "G-R2DG4QH73R"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app);

export { app, auth, db, functions };
