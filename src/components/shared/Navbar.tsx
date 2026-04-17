//Navbar
import React, { useState, useEffect, useRef } from "react";
import AccountSettings from "@/components/shared/AccountSettings";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import type { Order, UserRole } from "@/types";
import {
  ShoppingCartIcon, UserIcon, TruckIcon, ChartBarIcon, BellIcon,
  ChevronDownIcon, FireIcon, ArrowRightStartOnRectangleIcon,
  LockClosedIcon, Cog6ToothIcon, CheckCircleIcon, ClockIcon,
  MapPinIcon, ExclamationCircleIcon, XMarkIcon,
} from "@heroicons/react/24/outline";
import { cn, formatCurrency } from "@/lib/utils";
import {
  subscribeToUserOrders,
  subscribeToPendingOrders,
  subscribeToKitchenOrders,
  subscribeToAvailableDeliveries,
  subscribeToRiderOrders,
  subscribeToAllOrders,
} from "@/lib/orderService";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const ROLE_META: Record<string, { label: string; icon: React.ReactNode }> = {
  customer: { label: "Customer", icon: <UserIcon className="w-4 h-4" /> },
  kitchen: { label: "Kitchen Staff", icon: <FireIcon className="w-4 h-4" /> },
  delivery: { label: "Delivery Rider", icon: <TruckIcon className="w-4 h-4" /> },
  owner: { label: "Owner / Manager", icon: <ChartBarIcon className="w-4 h-4" /> },
};

interface Notif {
  id: string;
  title: string;
  body: string;
  time: Date;
  read: boolean;
  icon: "check" | "clock" | "truck" | "pin" | "alert" | "warning";
}

function notifIcon(type: Notif["icon"]) {
  const cls = "w-4 h-4 shrink-0";
  if (type === "check") return <CheckCircleIcon className={cn(cls, "text-green-400")} />;
  if (type === "clock") return <ClockIcon className={cn(cls, "text-amber-400")} />;
  if (type === "truck") return <TruckIcon className={cn(cls, "text-indigo-400")} />;
  if (type === "pin") return <MapPinIcon className={cn(cls, "text-brand")} />;
  if (type === "warning") return <ExclamationCircleIcon className={cn(cls, "text-orange-400")} />;
  return <ExclamationCircleIcon className={cn(cls, "text-red-400")} />;
}

function timeAgo(date: Date): string {
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 60) return "just now";

  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;

  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;

  if (remainingMins === 0) {
    return `${hours}h ago`;
  }
  return `${hours}h ${remainingMins}m ago`;
}

// Helper to format time duration
function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  if (remainingMins === 0) {
    return `${hours} hour${hours !== 1 ? "s" : ""}`;
  }
  return `${hours} hour${hours !== 1 ? "s" : ""} ${remainingMins} minute${remainingMins !== 1 ? "s" : ""}`;
}

// Helper to convert Firestore Timestamp to Date
function toDate(date: any): Date {
  if (!date) return new Date();
  if (date instanceof Date) return date;
  if (date?.toDate) return date.toDate();
  return new Date(date);
}

// Helper to mark order as notified
async function markOrderNotified(orderId: string) {
  try {
    const orderRef = doc(db, "orders", orderId);
    await updateDoc(orderRef, { readyNotified: true });
  } catch (error) {
    console.error("Failed to mark order as notified:", error);
  }
}

/** Build notifications from orders depending on role */
function buildNotifs(role: string | null, orders: Order[], riderId?: string): Notif[] {
  const notifs: Notif[] = [];

  if (role === "customer") {
    orders.slice(0, 20).forEach(o => {
      const confirmedAt = toDate(o.confirmedAt);
      const updatedAt = toDate(o.updatedAt);
      const pickedUpAt = toDate(o.pickedUpAt);
      const deliveredAt = toDate(o.deliveredAt);

      if (o.status === "confirmed")
        notifs.push({ id: `${o.id}-confirmed`, title: "Order Confirmed", body: `${o.orderNumber} is confirmed and going to kitchen.`, time: confirmedAt, read: false, icon: "check" });
      if (o.status === "preparing")
        notifs.push({ id: `${o.id}-preparing`, title: "Order Being Prepared", body: `Kitchen is now preparing ${o.orderNumber}.`, time: updatedAt, read: false, icon: "clock" });
      if (o.status === "ready")
        notifs.push({ id: `${o.id}-ready`, title: "Order Ready", body: `${o.orderNumber} is ready${o.orderType === "pickup" ? " for pickup!" : " — waiting for rider."}`, time: updatedAt, read: false, icon: "check" });
      if (o.status === "picked_up")
        notifs.push({ id: `${o.id}-picked`, title: "Rider Picked Up", body: `${o.assignedRiderName ?? "Your rider"} picked up ${o.orderNumber}.`, time: pickedUpAt, read: false, icon: "truck" });
      if (o.status === "out_for_delivery")
        notifs.push({ id: `${o.id}-ofd`, title: "Out for Delivery", body: `${o.orderNumber} is on the way to you!`, time: updatedAt, read: false, icon: "pin" });
      if (o.status === "delivered")
        notifs.push({ id: `${o.id}-delivered`, title: "Order Delivered", body: `${o.orderNumber} has been delivered. Enjoy!`, time: deliveredAt, read: false, icon: "check" });
      if (o.status === "cancelled")
        notifs.push({ id: `${o.id}-cancelled`, title: "Order Cancelled", body: `${o.orderNumber} was cancelled.`, time: updatedAt, read: false, icon: "alert" });

      // Check for preparation time violations for customers
      if ((o.status === "confirmed" || o.status === "preparing") && !o.readyNotified) {
        const createdAt = toDate(o.createdAt);
        const minsElapsed = Math.floor((Date.now() - createdAt.getTime()) / 60000);
        const estimatedMins = o.estimatedReadyMinutes || 20;

        if (minsElapsed > estimatedMins) {
          const minutesOver = minsElapsed - estimatedMins;
          const delayDuration = formatDuration(minutesOver);

          // Notify customer at 5, 10, and 15+ minute intervals
          const shouldNotify =
            (minutesOver >= 5 && minutesOver < 10) ||
            (minutesOver >= 10 && minutesOver < 15) ||
            minutesOver >= 15;

          // Track last notification time to avoid spam
          const hasRecentNotif = notifs.some(n => n.id.includes(o.id) && n.id.includes("delay-customer"));

          if (shouldNotify && !hasRecentNotif) {
            // Mark order as notified to prevent future notifications
            markOrderNotified(o.id);

            if (minutesOver >= 15) {
              notifs.push({
                id: `${o.id}-delay-customer-critical-${Date.now()}`,
                title: "⚠️ Order Delay Notice",
                body: `Your order ${o.orderNumber} is experiencing a significant delay (${delayDuration} past estimated time). We apologize for the inconvenience and are working to complete it as soon as possible.`,
                time: new Date(),
                read: false,
                icon: "warning"
              });
            } else if (minutesOver >= 10) {
              notifs.push({
                id: `${o.id}-delay-customer-10-${Date.now()}`,
                title: "Order Update",
                body: `Your order ${o.orderNumber} is taking a bit longer than expected (${delayDuration} delay). Thank you for your patience!`,
                time: new Date(),
                read: false,
                icon: "clock"
              });
            } else if (minutesOver >= 5) {
              notifs.push({
                id: `${o.id}-delay-customer-5-${Date.now()}`,
                title: "Order Status Update",
                body: `Your order ${o.orderNumber} is being prepared and will be ready soon. Estimated time: ${delayDuration} beyond original estimate.`,
                time: new Date(),
                read: false,
                icon: "clock"
              });
            }
          }
        }
      }
    });
  }

  if (role === "kitchen") {
    orders.forEach(o => {
      const confirmedAt = toDate(o.confirmedAt);
      const updatedAt = toDate(o.updatedAt);

      if (o.status === "confirmed") {
        notifs.push({ id: `${o.id}-confirmed`, title: "New Order to Prepare", body: `${o.orderNumber} — ${o.items.length} item(s) · ${formatCurrency(o.total)}`, time: confirmedAt, read: false, icon: "clock" });
      }

      // Check for preparation time violations
      if (o.status === "confirmed" || o.status === "preparing") {
        const createdAt = toDate(o.createdAt);
        const minsElapsed = Math.floor((Date.now() - createdAt.getTime()) / 60000);
        const estimatedMins = o.estimatedReadyMinutes || 20;

        if (minsElapsed > estimatedMins) {
          const isCritical = minsElapsed > estimatedMins + 10;
          const minutesOver = minsElapsed - estimatedMins;

          // Only add notification if it's a new violation (check if we already have one in the last hour)
          const hasRecentNotif = notifs.some(n => n.id.includes(o.id) && n.id.includes("delay"));

          if (!hasRecentNotif) {
            const timeOverDisplay = formatDuration(minutesOver);

            if (isCritical) {
              notifs.push({
                id: `${o.id}-critical-delay-${Date.now()}`,
                title: "⚠️ CRITICAL DELAY",
                body: `${o.orderNumber} is ${timeOverDisplay} past estimated time (${estimatedMins}m target)! Please prioritize immediately.`,
                time: new Date(),
                read: false,
                icon: "warning"
              });
            } else {
              notifs.push({
                id: `${o.id}-delay-${Date.now()}`,
                title: "Preparation Time Alert",
                body: `${o.orderNumber} is ${timeOverDisplay} past estimated time (${estimatedMins}m target).`,
                time: new Date(),
                read: false,
                icon: "warning"
              });
            }
          }
        }
      }

      // Notification when order is taking too long to start
      if (o.status === "confirmed") {
        const startTime = o.confirmedAt ? toDate(o.confirmedAt) : toDate(o.createdAt);
        const minsElapsed = Math.floor((Date.now() - startTime.getTime()) / 60000);
        if (minsElapsed > 10 && minsElapsed % 5 === 0) {
          const timeDisplay = formatDuration(minsElapsed);

          notifs.push({
            id: `${o.id}-not-started-${Date.now()}`,
            title: "Order Not Started",
            body: `${o.orderNumber} has been confirmed for ${timeDisplay} but not yet started.`,
            time: new Date(),
            read: false,
            icon: "alert"
          });
        }
      }
    });
  }

  if (role === "delivery") {
    orders.forEach(o => {
      const updatedAt = toDate(o.updatedAt);
      if (!o.assignedRiderId)
        notifs.push({ id: `${o.id}-avail`, title: "New Delivery Available", body: `${o.orderNumber} · ${o.customerName} · ${formatCurrency(o.total)}`, time: updatedAt, read: false, icon: "truck" });
    });
    // active orders for this rider
    if (riderId) {
      orders.filter(o => o.assignedRiderId === riderId).forEach(o => {
        const pickedUpAt = toDate(o.pickedUpAt);
        const deliveredAt = toDate(o.deliveredAt);
        if (o.status === "picked_up")
          notifs.push({ id: `${o.id}-picked`, title: "Order Picked Up", body: `You picked up ${o.orderNumber}. Head to ${o.customerAddress ?? "customer"}.`, time: pickedUpAt, read: false, icon: "pin" });
        if (o.status === "delivered")
          notifs.push({ id: `${o.id}-done`, title: "Delivery Complete", body: `${o.orderNumber} delivered successfully!`, time: deliveredAt, read: false, icon: "check" });
      });
    }
  }

  if (role === "owner") {
    const pending = orders.filter(o => o.status === "pending").length;
    const cancelled = orders.filter(o => o.status === "cancelled");

    // Kitchen performance alerts for owner
    const delayedOrders = orders.filter(o => {
      if (o.status === "confirmed" || o.status === "preparing") {
        const createdAt = toDate(o.createdAt);
        const minsElapsed = Math.floor((Date.now() - createdAt.getTime()) / 60000);
        const estimatedMins = o.estimatedReadyMinutes || 20;
        return minsElapsed > estimatedMins;
      }
      return false;
    });

    if (delayedOrders.length > 0) {
      notifs.push({
        id: `owner-delays-${Date.now()}`,
        title: `${delayedOrders.length} Order${delayedOrders.length > 1 ? "s" : ""} Delayed`,
        body: `${delayedOrders.length} order${delayedOrders.length > 1 ? "s are" : " is"} past estimated preparation time.`,
        time: new Date(),
        read: false,
        icon: "warning"
      });
    }

    if (pending > 0)
      notifs.push({ id: "owner-pending", title: `${pending} Pending Order${pending > 1 ? "s" : ""}`, body: "Waiting for cashier confirmation.", time: new Date(), read: false, icon: "clock" });

    cancelled.slice(0, 5).forEach(o => {
      const updatedAt = toDate(o.updatedAt);
      notifs.push({ id: `${o.id}-cancel`, title: "Order Cancelled", body: `${o.orderNumber} by ${o.customerName} was cancelled.`, time: updatedAt, read: false, icon: "alert" });
    });

    const recent = orders.filter(o => o.status === "delivered" || o.status === "completed").slice(0, 3);
    recent.forEach(o => {
      const deliveredAt = toDate(o.deliveredAt);
      notifs.push({ id: `${o.id}-done`, title: "Order Fulfilled", body: `${o.orderNumber} · ${formatCurrency(o.total)}`, time: deliveredAt, read: false, icon: "check" });
    });
  }

  return notifs.sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 20);
}

export default function Navbar({ onCartClick, onLoginClick }: { onCartClick: () => void; onLoginClick?: () => void }) {
  const { state, cartItemCount } = useApp();
  const { user, userRole, isGuest, logout, exitGuest } = useAuth();
  const [userOpen, setUserOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [orders, setOrders] = useState<Order[]>([]);
  const bellRef = useRef<HTMLDivElement>(null);

  const roleMeta = ROLE_META[userRole ?? state.currentRole] ?? ROLE_META["customer"];
  const displayName = user?.displayName || user?.email?.split("@")[0] || "User";
  const initials = displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
  const riderId = user?.uid;

  // Subscribe to relevant orders based on role
  useEffect(() => {
    if (!user || isGuest) return;
    const role = userRole ?? "customer";

    if (role === "customer")
      return subscribeToUserOrders(user.uid, setOrders);
    if (role === "kitchen")
      return subscribeToKitchenOrders(setOrders);
    if (role === "delivery") {
      // merge available + rider's active orders
      const unsub1 = subscribeToAvailableDeliveries(avail => {
        setOrders(prev => {
          const activeIds = new Set(prev.filter(o => o.assignedRiderId === riderId).map(o => o.id));
          const active = prev.filter(o => activeIds.has(o.id));
          return [...avail, ...active];
        });
      });
      const unsub2 = subscribeToRiderOrders(user.uid, active => {
        setOrders(prev => {
          const availIds = new Set(prev.filter(o => !o.assignedRiderId).map(o => o.id));
          const avail = prev.filter(o => availIds.has(o.id));
          return [...avail, ...active];
        });
      });
      return () => { unsub1(); unsub2(); };
    }
    if (role === "owner")
      return subscribeToAllOrders(setOrders);
  }, [user, userRole, isGuest]);

  // Auto-refresh notifications every minute to check for delays
  useEffect(() => {
    if (!user || isGuest) return;
    const interval = setInterval(() => {
      // Force re-render to check for new delays
      setOrders(prev => [...prev]);
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [user, isGuest]);

  // Build notifs
  const allNotifs = buildNotifs(userRole ?? "customer", orders, riderId);
  const notifs = allNotifs.map(n => ({ ...n, read: readIds.has(n.id) }));
  const unread = notifs.filter(n => !n.read).length;

  function openBell() {
    setBellOpen(v => !v);
  }

  function markAllRead() {
    setReadIds(new Set(notifs.map(n => n.id)));
  }

  function markRead(id: string) {
    setReadIds(prev => new Set([...prev, id]));
  }

  async function handleLogout() {
    setUserOpen(false);
    if (isGuest) { exitGuest(); return; }
    await logout();
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/10" style={{ background: "#3b3130" }}>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">

          {/* Logo */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-10 h-10 rounded-full overflow-hidden shrink-0">
              <img src="/logo.png" alt="Pobla logo" className="w-full h-full object-cover" />
            </div>
            <div className="hidden sm:block">
              <p className="font-display font-black text-sm leading-none tracking-tight text-white">POBLA</p>
              <p className="text-[10px] font-bold tracking-widest leading-none mt-0.5" style={{ color: "#bc5d5d" }}>ORDER HUB</p>
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-2">

            {/* Notification Bell */}
            {user && !isGuest && (
              <div className="relative" ref={bellRef}>
                <button
                  onClick={openBell}
                  className="relative p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all"
                >
                  <BellIcon className="w-5 h-5" />
                  {unread > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black bg-red-500 text-white">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </button>

                {bellOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setBellOpen(false)} />
                    <div
                      className="absolute top-full right-0 mt-2 rounded-2xl shadow-2xl z-50 w-80 overflow-hidden"
                      style={{ background: "#2e2726", border: "1px solid rgba(188,93,93,0.2)" }}
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                        <div className="flex items-center gap-2">
                          <BellIcon className="w-4 h-4 text-brand" />
                          <p className="text-sm font-bold text-white">Notifications</p>
                          {unread > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-red-500 text-white">{unread}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {unread > 0 && (
                            <button onClick={markAllRead} className="text-[11px] text-white/40 hover:text-white/70 transition-colors">
                              Mark all read
                            </button>
                          )}
                          <button onClick={() => setBellOpen(false)} className="text-white/40 hover:text-white/70 transition-colors">
                            <XMarkIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Notification list */}
                      <div className="max-h-96 overflow-y-auto">
                        {notifs.length === 0 ? (
                          <div className="py-12 text-center">
                            <BellIcon className="w-10 h-10 text-white/10 mx-auto mb-2" />
                            <p className="text-sm text-white/30 font-semibold">No notifications yet</p>
                          </div>
                        ) : (
                          notifs.map(n => (
                            <button
                              key={n.id}
                              onClick={() => markRead(n.id)}
                              className={cn(
                                "w-full text-left flex items-start gap-3 px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-all",
                                !n.read && "bg-white/[0.03]",
                                n.icon === "warning" && !n.read && "bg-orange-500/10"
                              )}
                            >
                              <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                                style={{ background: n.icon === "warning" ? "rgba(249,115,22,0.15)" : "rgba(188,93,93,0.15)" }}>
                                {notifIcon(n.icon)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <p className={cn("text-xs font-bold truncate",
                                    n.read ? "text-white/50" : n.icon === "warning" ? "text-orange-400" : "text-white"
                                  )}>
                                    {n.title}
                                  </p>
                                  {!n.read && (
                                    <span className={cn("w-1.5 h-1.5 rounded-full shrink-0 mt-1",
                                      n.icon === "warning" ? "bg-orange-500 animate-pulse" : "bg-brand"
                                    )} />
                                  )}
                                </div>
                                <p className="text-[11px] text-white/40 mt-0.5 line-clamp-2">{n.body}</p>
                                <p className="text-[10px] text-white/25 mt-1">{timeAgo(n.time)}</p>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Cart — customers only */}
            {(userRole === "customer" || (!userRole && !isGuest)) && !isGuest && (
              <button onClick={onCartClick}
                className="relative flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold text-white transition-all active:scale-95" style={{ background: "#bc5d5d" }}>
                <ShoppingCartIcon className="w-4 h-4" />
                <span className="hidden sm:inline font-display">Cart</span>
                {cartItemCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black bg-white text-brand-dark">
                    {cartItemCount}
                  </span>
                )}
              </button>
            )}

            {/* Not logged in */}
            {!user && !isGuest && (
              <button onClick={onLoginClick}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all"
                style={{ background: "#bc5d5d" }}>
                Login / Sign Up
              </button>
            )}

            {/* Guest */}
            {isGuest && (
              <div className="flex items-center gap-2">
                <span className="hidden sm:flex items-center gap-1 text-xs text-white/40 font-semibold">
                  <LockClosedIcon className="w-3 h-3" /> Guest
                </span>
                <button onClick={exitGuest}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white transition-all" style={{ background: "rgba(188,93,93,0.8)" }}>
                  Login to Order
                </button>
              </div>
            )}

            {/* User avatar dropdown */}
            {user && !isGuest && (
              <div className="relative">
                <button onClick={() => setUserOpen(!userOpen)}
                  className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl transition-all hover:bg-white/5">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0" style={{ background: "#bc5d5d" }}>
                    {initials}
                  </div>
                  <span className="hidden sm:block text-xs font-semibold text-white/80 max-w-[80px] truncate">{displayName}</span>
                  <ChevronDownIcon className="w-3 h-3 text-white/40" />
                </button>

                {userOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setUserOpen(false)} />
                    <div className="absolute top-full right-0 mt-2 rounded-2xl shadow-2xl p-2 min-w-[180px] z-50" style={{ background: "#2e2726", border: "1px solid rgba(188,93,93,0.2)" }}>
                      <div className="px-3 py-2 border-b border-white/5 mb-1">
                        <p className="text-sm font-bold text-white truncate">{displayName}</p>
                        <p className="text-[11px] text-white/40 truncate">{user.email}</p>
                        <p className="text-[10px] text-brand/60 mt-0.5 capitalize">{roleMeta.label}</p>
                      </div>
                      <button onClick={() => { setUserOpen(false); setSettingsOpen(true); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-white/70 hover:bg-white/5 transition-all">
                        <Cog6ToothIcon className="w-4 h-4" /> Settings
                      </button>
                      <div className="h-px mx-2 my-1" style={{ background: "rgba(255,255,255,0.06)" }} />
                      <button onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-400 hover:bg-red-500/10 transition-all">
                        <ArrowRightStartOnRectangleIcon className="w-4 h-4" /> Log Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>
      <AccountSettings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}