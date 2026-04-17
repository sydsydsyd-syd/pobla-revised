import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { auth } from "./firebase";

export interface UserProfile {
    uid: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    role: string;
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
        const userDoc = await getDoc(doc(db, "users", uid));
        if (userDoc.exists()) {
            return userDoc.data() as UserProfile;
        }
        return null;
    } catch (error) {
        console.error("Error fetching user profile:", error);
        return null;
    }
}

export async function getCurrentUserProfile(): Promise<UserProfile | null> {
    const user = auth.currentUser;
    if (!user) return null;
    return getUserProfile(user.uid);
}