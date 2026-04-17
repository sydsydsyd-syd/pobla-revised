//menuService
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, serverTimestamp, Timestamp, query, orderBy,
} from "firebase/firestore";
import { db } from "./firebase";
import type { MenuItem } from "@/types";
import { logError, logInfo } from "./errorLogger";

const COL = "menuItems";

function toMenuItem(id: string, data: Record<string, unknown>): MenuItem {
  return {
    ...(data as Omit<MenuItem, "id" | "createdAt" | "updatedAt">),
    id,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
  };
}

export function subscribeToMenuItems(
  callback: (items: MenuItem[]) => void,
  onError?: (err: Error) => void
): () => void {
  const q = query(collection(db, COL), orderBy("createdAt", "asc"));
  return onSnapshot(q,
    (snap) => {
      const items = snap.docs.map((d) => toMenuItem(d.id, d.data() as Record<string, unknown>));
      callback(items);
    },
    (err) => {
      logError({ message: err.message, error: err, component: "menuService", action: "subscribeToMenuItems" });
      onError?.(err);
    }
  );
}

export async function addMenuItem(item: Omit<MenuItem, "id" | "createdAt" | "updatedAt">): Promise<string> {
  try {
    const ref = await addDoc(collection(db, COL), { ...item, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    await logInfo("Menu item added", { component: "menuService", action: "addMenuItem", metadata: { id: ref.id, name: item.name } });
    return ref.id;
  } catch (err: any) {
    await logError({ message: err.message, error: err, component: "menuService", action: "addMenuItem" });
    throw err;
  }
}

export async function updateMenuItem(id: string, updates: Partial<Omit<MenuItem, "id" | "createdAt">>): Promise<void> {
  try {
    await updateDoc(doc(db, COL, id), { ...updates, updatedAt: serverTimestamp() });
  } catch (err: any) {
    await logError({ message: err.message, error: err, component: "menuService", action: "updateMenuItem", metadata: { id } });
    throw err;
  }
}

export async function deleteMenuItem(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COL, id));
    await logInfo("Menu item deleted", { component: "menuService", action: "deleteMenuItem", metadata: { id } });
  } catch (err: any) {
    await logError({ message: err.message, error: err, component: "menuService", action: "deleteMenuItem", metadata: { id } });
    throw err;
  }
}

export async function toggleAvailability(id: string, available: boolean): Promise<void> {
  try {
    await updateDoc(doc(db, COL, id), { available, updatedAt: serverTimestamp() });
  } catch (err: any) {
    await logError({ message: err.message, error: err, component: "menuService", action: "toggleAvailability", metadata: { id, available } });
    throw err;
  }
}
