import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import {
  loginWithEmail,
  registerWithEmail,
  logoutUser,
  ensureUserProfile,
  resendVerificationEmail,
  type User,
  type AppRole,
} from "@/lib/authService";

export interface UserProfileData {
  phone: string;
  address: string;
  name: string;
  email: string;
}

interface AuthContextValue {
  user: User | null;
  userRole: AppRole | null;
  userProfile: UserProfileData | null;
  isGuest: boolean;
  authLoading: boolean;
  login: (email: string, password: string) => Promise<AppRole | null>; // CHANGED: returns role
  register: (name: string, email: string, password: string, phone: string, address: string) => Promise<void>;
  logout: () => Promise<void>;
  continueAsGuest: () => void;
  exitGuest: () => void;
  resendVerificationEmail: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // Function to fetch user profile from Firestore
  const fetchUserProfile = async (uid: string) => {
    try {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        const role = data.role as AppRole;
        setUserRole(role);
        setUserProfile({
          phone: data.phone || "",
          address: data.address || "",
          name: data.name || "",
          email: data.email || "",
        });
        return role;
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
    return null;
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        setIsGuest(false);
        try {
          const role = await ensureUserProfile(u);
          setUserRole(role);
          await fetchUserProfile(u.uid);
        } catch (err) {
          console.error("Error getting user role:", err);
          setUserRole("customer");
        }
      } else {
        setUserRole(null);
        setUserProfile(null);
      }
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  async function login(email: string, password: string): Promise<AppRole | null> {
    try {
      const user = await loginWithEmail(email, password);
      const role = await ensureUserProfile(user);
      const fetchedRole = await fetchUserProfile(user.uid);
      setUserRole(role);
      return fetchedRole || role;
    } catch (err: any) {
      throw err;
    }
  }

  async function register(name: string, email: string, password: string, phone: string, address: string) {
    try {
      await registerWithEmail(name, email, password, phone, address);
    } catch (error) {
      throw error;
    }
  }

  async function refreshUserProfile() {
    if (user) {
      await fetchUserProfile(user.uid);
    }
  }

  async function logout() {
    await logoutUser();
    setUserRole(null);
    setUserProfile(null);
    setIsGuest(false);
  }

  function continueAsGuest() { setIsGuest(true); }
  function exitGuest() { setIsGuest(false); }

  return (
    <AuthContext.Provider
      value={{
        user,
        userRole,
        userProfile,
        isGuest,
        authLoading,
        login,
        register,
        logout,
        continueAsGuest,
        exitGuest,
        resendVerificationEmail,
        refreshUserProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}