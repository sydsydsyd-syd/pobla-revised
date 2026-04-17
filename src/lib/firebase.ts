//firebase
import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// ── Secondary app ──────────────────────────────────────────────────────────
// Used ONLY by the owner's "Add User" flow so that createUserWithEmailAndPassword
// does NOT sign-in the newly-created account in the main session (which would
// kick out the owner and trigger onAuthStateChanged for the new user).
const secondaryApp =
  getApps().find((a) => a.name === "secondary") ??
  initializeApp(firebaseConfig, "secondary");
export const secondaryAuth = getAuth(secondaryApp);
// secondaryDb uses secondaryAuth's token for Firestore writes
export const secondaryDb = getFirestore(secondaryApp);

export default app;
