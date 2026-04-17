import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  sendEmailVerification,
  type User,
} from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";
import { logError, logInfo } from "./errorLogger";

export type { User };
export type AppRole = "customer" | "kitchen" | "delivery" | "delivery_pending" | "rejected" | "owner";

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  role: AppRole;
  emailVerified?: boolean;
  createdAt?: unknown;
}

export async function getUserRole(uid: string): Promise<AppRole> {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return "customer";
    return (snap.data().role as AppRole) ?? "customer";
  } catch (err: any) {
    await logError({ message: err.message, error: err, component: "authService", action: "getUserRole", userId: uid });
    return "customer";
  }
}

export async function ensureUserProfile(user: User): Promise<AppRole> {
  try {
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      return (snap.data().role as AppRole) ?? "customer";
    }

    const profile: UserProfile = {
      uid: user.uid,
      name: user.displayName ?? "Customer",
      email: user.email ?? "",
      phone: "",
      address: "",
      role: "customer",
      emailVerified: user.emailVerified || false,
    };

    await setDoc(ref, { ...profile, createdAt: serverTimestamp() });
    await logInfo("User profile created", { component: "authService", action: "ensureUserProfile", userId: user.uid });
    return "customer";
  } catch (err: any) {
    await logError({ message: err.message, error: err, component: "authService", action: "ensureUserProfile", userId: user.uid });
    return "customer";
  }
}

export async function registerWithEmail(
  name: string,
  email: string,
  password: string,
  phone: string,
  address: string
): Promise<User> {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    await sendEmailVerification(cred.user);
    await cred.user.getIdToken(true);
    await setDoc(doc(db, "users", cred.user.uid), {
      uid: cred.user.uid,
      name: name.trim(),
      email,
      phone: phone,
      address: address,
      emailVerified: false,
      role: "customer",
      createdAt: serverTimestamp(),
    });
    await logInfo("User registered - email verification sent", {
      component: "authService",
      action: "registerWithEmail",
      userId: cred.user.uid,
      userEmail: email
    });
    return cred.user;
  } catch (err: any) {
    await logError({ message: err.message, error: err, component: "authService", action: "registerWithEmail", userEmail: email });
    throw err;
  }
}

// FIXED: Login with conditional email verification - SKIP for admin/owner accounts
export async function loginWithEmail(email: string, password: string): Promise<User> {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const user = cred.user;

    // Refresh to get latest emailVerified status
    await user.reload();

    // Get user role from Firestore first
    let userRole: AppRole = "customer";
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        userRole = (userDoc.data().role as AppRole) ?? "customer";
      }
    } catch (err) {
      console.log("Could not fetch user role, defaulting to customer");
    }

    // Only check email verification for customers
    // Admins (owner), kitchen, and delivery staff can login without email verification
    if (!user.emailVerified && userRole === "customer") {
      await signOut(auth);
      throw new Error("email-not-verified");
    }

    // Sync verification status to Firestore
    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, {
      emailVerified: user.emailVerified || userRole !== "customer", // Auto-verify staff accounts
      updatedAt: serverTimestamp(),
    }).catch(() => {
      console.log("User document not ready for update");
    });

    await logInfo("User logged in", {
      component: "authService",
      action: "loginWithEmail",
      userId: user.uid,
    });
    return user;
  } catch (err: any) {
    await logError({ message: err.message, error: err, component: "authService", action: "loginWithEmail", userEmail: email });
    throw err;
  }
}

export async function logoutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (err: any) {
    await logError({ message: err.message, error: err, component: "authService", action: "logoutUser" });
    throw err;
  }
}

export async function resendVerificationEmail(): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("No user logged in");
  if (user.emailVerified) throw new Error("Email already verified");
  await sendEmailVerification(user);
}