//OrderHistory
import React, { useEffect, useState } from "react";
import type { Order, OrderItem } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import { subscribeToUserOrders } from "@/lib/orderService";
import { formatCurrency, ORDER_STATUS_LABEL, ORDER_STATUS_CLASS, formatDate, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import OrderTracking from "./OrderTracking";
import {
  ClockIcon, ArrowPathIcon, InboxIcon,
  CheckCircleIcon, XCircleIcon, MapPinIcon, CameraIcon,
} from "@heroicons/react/24/outline";

const ACTIVE_STATUSES = ["pending", "confirmed", "preparing", "ready", "picked_up", "out_for_delivery"];

// Helper function to get the display status based on order type and status
const getDisplayStatus = (order: Order): { label: string; className: string } => {
  // For pickup orders that are completed or picked_up
  if (order.orderType === "pickup") {
    if (order.status === "completed" || order.status === "picked_up" || order.status === "delivered") {
      return {
        label: "Picked Up",
        className: "bg-green-50 text-green-700 border-green-200"
      };
    }
  }

  // For delivery orders that are delivered
  if (order.orderType === "delivery" && order.status === "delivered") {
    return {
      label: "Delivered",
      className: ORDER_STATUS_CLASS[order.status] || "bg-green-50 text-green-700 border-green-200"
    };
  }

  // For completed delivery orders (if needed)
  if (order.orderType === "delivery" && order.status === "completed") {
    return {
      label: "Delivered",
      className: ORDER_STATUS_CLASS.completed || "bg-green-50 text-green-700 border-green-200"
    };
  }

  // For all other statuses, use the original mapping
  return {
    label: ORDER_STATUS_LABEL[order.status] || order.status,
    className: ORDER_STATUS_CLASS[order.status] || ""
  };
};

export default function OrderHistory({ onReorder }: { onReorder: () => void }) {
  const { user } = useAuth();
  const { state, dispatch } = useApp();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [trackingId, setTrackingId] = useState<string | null>(null);
  const [reorderMsg, setReorderMsg] = useState<string | null>(null);
  const [reorderErr, setReorderErr] = useState<string | null>(null);
  const [proofUrl, setProofUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    return subscribeToUserOrders(user.uid, orders => {
      setOrders(orders);
      setLoading(false);
    }, () => setLoading(false));
  }, [user]);

  function handleReorder(order: Order) {
    const added: string[] = [], skipped: string[] = [];
    order.items.forEach((item: OrderItem) => {
      const mi = state.menuItems.find(m => m.id === item.menuItemId);
      if (mi && mi.available) {
        dispatch({ type: "ADD_TO_CART", payload: { menuItem: mi, quantity: item.quantity } });
        added.push(item.menuItemName);
      } else {
        skipped.push(item.menuItemName);
      }
    });
    if (added.length > 0) {
      let msg = `${added.length} item${added.length > 1 ? "s" : ""} added to Cart.`;
      if (skipped.length) msg += ` (${skipped.join(", ")} unavailable — skipped)`;
      setReorderMsg(msg);
      setReorderErr(null);
      setTimeout(() => setReorderMsg(null), 4000);
      onReorder();
    } else {
      setReorderErr("All items from this order are currently unavailable.");
      setReorderMsg(null);
      setTimeout(() => setReorderErr(null), 4000);
    }
  }

  if (!user) return null;

  // Show tracking view
  if (trackingId) {
    return <OrderTracking orderId={trackingId} onBack={() => setTrackingId(null)} />;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      {/* Proof of Delivery Modal */}
      {proofUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setProofUrl(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <p className="font-display font-bold text-sm text-foreground flex items-center gap-2">
                <CheckCircleIcon className="w-4 h-4 text-green-500" /> Delivery Photo Proof
              </p>
              <button
                onClick={() => setProofUrl(null)}
                className="p-1 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                <XCircleIcon className="w-5 h-5" />
              </button>
            </div>
            <img src={proofUrl} alt="Delivery proof" className="w-full object-cover max-h-80" />
            <div className="p-3 bg-green-50 border-t border-green-100">
              <p className="text-xs text-green-700 text-center font-semibold flex items-center justify-center gap-1.5">
                <CheckCircleIcon className="w-4 h-4 text-green-500" /> Delivery confirmed by rider
              </p>
            </div>
          </div>
        </div>
      )}
      <div className="flex items-center gap-2">
        <h2 className="font-display font-bold text-lg text-foreground">My Orders</h2>
        {orders.length > 0 && (
          <span className="text-xs text-muted-foreground">({orders.length} order{orders.length !== 1 ? "s" : ""})</span>
        )}
      </div>

      {reorderMsg && (
        <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-2xl text-sm text-green-700">
          <CheckCircleIcon className="w-4 h-4 shrink-0 mt-0.5 text-green-600" />
          <div><p className="font-semibold">Cart repopulated</p><p className="text-xs mt-0.5">{reorderMsg}</p></div>
        </div>
      )}
      {reorderErr && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700">
          <XCircleIcon className="w-4 h-4 shrink-0 mt-0.5 text-red-500" /><p>{reorderErr}</p>
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          {[1, 2].map(n => (
            <div key={n} className="rounded-2xl border border-border p-4 animate-pulse space-y-3">
              <div className="flex justify-between"><div className="h-4 bg-muted rounded w-28" /><div className="h-4 bg-muted rounded w-20" /></div>
              <div className="h-3 bg-muted rounded w-2/3" />
            </div>
          ))}
        </div>
      )}

      {!loading && orders.length === 0 && (
        <div className="text-center py-16">
          <InboxIcon className="w-14 h-14 text-muted mx-auto mb-3" />
          <h3 className="font-display font-bold text-foreground">No orders yet</h3>
          <p className="text-sm text-muted-foreground mt-1">Place your first order from the menu!</p>
        </div>
      )}

      {/* Most recent first */}
      {!loading && orders.map(order => {
        const isActive = ACTIVE_STATUSES.includes(order.status);
        const displayStatus = getDisplayStatus(order);

        return (
          <div key={order.id} className={cn(
            "bg-white rounded-2xl border overflow-hidden shadow-sm hover:shadow-md transition-shadow",
            isActive && "border-brand/30 ring-1 ring-brand/20"
          )}>
            {/* Active indicator */}
            {isActive && (
              <div className="h-1 bg-gradient-to-r from-brand to-brand-muted animate-pulse" />
            )}

            <div className="flex items-start justify-between px-4 pt-4 pb-3 border-b border-border">
              <div>
                <p className="font-mono text-xs font-bold text-muted-foreground">{order.orderNumber}</p>
                <p className="font-display font-bold text-foreground text-sm mt-0.5">{formatCurrency(order.total)}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <ClockIcon className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[11px] text-muted-foreground">{formatDate(order.createdAt)}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1", displayStatus.className)}>
                  {displayStatus.label}
                </span>
                <Badge variant="secondary" className="text-[10px] capitalize">{order.orderType}</Badge>
              </div>
            </div>

            <div className="px-4 py-3 space-y-1">
              {order.items.map(item => (
                <div key={item.menuItemId} className="flex justify-between text-xs">
                  <div>
                    <span className="text-muted-foreground">{item.menuItemName}</span>
                    <span className="font-semibold text-foreground"> × {item.quantity}</span>
                    {item.notes && <p className="text-amber-600 italic">→ {item.notes}</p>}
                  </div>
                  <span className="font-semibold text-foreground">{formatCurrency(item.subtotal)}</span>
                </div>
              ))}
            </div>

            <div className="px-4 pb-4 flex items-center justify-between gap-2">
              <span className="text-[11px] text-muted-foreground capitalize">
                {order.paymentMethod === "cashpickup" ? "Cash on Pickup" : "Cash on Delivery"}
              </span>
              <div className="flex items-center gap-2">
                {/* Track active orders */}
                {isActive && (
                  <button
                    onClick={() => setTrackingId(order.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-brand text-white hover:bg-brand/90 transition-all active:scale-95"
                  >
                    <MapPinIcon className="w-3.5 h-3.5" /> Track Order
                  </button>
                )}
                {/* View proof for delivered orders (delivery only) */}
                {(order.status === "delivered" || order.status === "completed") && order.orderType === "delivery" && order.photoProofUrl && (
                  <button
                    onClick={() => setProofUrl(order.photoProofUrl!)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-green-700 border border-green-300 bg-green-50 hover:bg-green-500 hover:text-white transition-all active:scale-95"
                  >
                    <CameraIcon className="w-3.5 h-3.5" /> View Proof
                  </button>
                )}
                <button
                  onClick={() => handleReorder(order)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-brand border border-brand/30 hover:bg-brand hover:text-white transition-all active:scale-95"
                >
                  <ArrowPathIcon className="w-3.5 h-3.5" /> Reorder
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}