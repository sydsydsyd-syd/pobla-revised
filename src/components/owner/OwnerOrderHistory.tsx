//OwnerOrderHistory
import React, { useEffect, useState } from "react";
import type { Order, OrderStatus } from "@/types";
import { subscribeToAllOrders } from "@/lib/orderService";
import { formatCurrency, ORDER_STATUS_LABEL, ORDER_STATUS_CLASS, formatDate, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  ClockIcon,
  InboxIcon,
  CheckCircleIcon,
  TruckIcon,
  MapPinIcon,
  BanknotesIcon,
  BuildingStorefrontIcon,
  CreditCardIcon,
  CameraIcon,
  XMarkIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  UserCircleIcon,
  PhoneIcon,
} from "@heroicons/react/24/outline";

type FilterStatus = "all" | "delivered" | "completed" | "cancelled" | "pending" | "confirmed" | "preparing";

const FILTER_OPTIONS: { label: string; value: FilterStatus }[] = [
  { label: "All", value: "all" },
  { label: "Delivered", value: "delivered" },
  { label: "Picked Up", value: "completed" },
  { label: "Pending", value: "pending" },
  { label: "Confirmed", value: "confirmed" },
  { label: "Preparing", value: "preparing" },
  { label: "Cancelled", value: "cancelled" },
];

// Helper function to get display status label based on order type
function getDisplayStatus(order: Order): string {
  if (order.status === "completed") {
    return order.orderType === "pickup" ? "Picked Up" : "Completed";
  }
  return ORDER_STATUS_LABEL[order.status];
}

// Helper function to get status class
function getStatusClass(order: Order): string {
  if (order.status === "completed") {
    return order.orderType === "pickup"
      ? "bg-green-100 text-green-800 border-green-200"
      : ORDER_STATUS_CLASS.completed;
  }
  return ORDER_STATUS_CLASS[order.status];
}

export default function OwnerOrderHistory() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [search, setSearch] = useState("");
  const [proofUrl, setProofUrl] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    return subscribeToAllOrders(all => {
      setOrders(all);
      setLoading(false);
    }, () => setLoading(false));
  }, []);

  const filtered = orders.filter(o => {
    const matchStatus = filter === "all" || o.status === filter;
    const matchSearch =
      search === "" ||
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.customerName.toLowerCase().includes(search.toLowerCase()) ||
      (o.assignedRiderName ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (o.customerAddress ?? "").toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  // Summary stats
  const totalOrders = orders.length;
  const totalDelivered = orders.filter(o => o.status === "delivered" || o.status === "completed").length;
  const totalRevenue = orders
    .filter(o => o.status === "delivered" || o.status === "completed")
    .reduce((sum, o) => sum + o.total, 0);
  const totalCancelled = orders.filter(o => o.status === "cancelled").length;

  return (
    <div className="space-y-5">
      {/* Proof Modal */}
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
                <CameraIcon className="w-4 h-4 text-brand" /> Delivery Photo Proof
              </p>
              <button
                onClick={() => setProofUrl(null)}
                className="p-1 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <img src={proofUrl} alt="Delivery proof" className="w-full object-cover max-h-80" />
            <div className="p-3 bg-green-50 border-t border-green-100 flex items-center justify-center gap-1.5">
              <CheckCircleIcon className="w-4 h-4 text-green-500" />
              <p className="text-xs text-green-700 font-semibold">Delivery confirmed by rider</p>
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Orders", val: totalOrders, cls: "bg-muted/40 border-border text-foreground" },
          { label: "Fulfilled", val: totalDelivered, cls: "bg-green-50 border-green-200 text-green-700" },
          { label: "Revenue", val: formatCurrency(totalRevenue), cls: "bg-brand/5 border-brand/20 text-brand" },
          { label: "Cancelled", val: totalCancelled, cls: "bg-red-50 border-red-200 text-red-600" },
        ].map(s => (
          <div key={s.label} className={cn("p-4 rounded-2xl border text-center", s.cls)}>
            <p className="font-display font-black text-xl">{s.val}</p>
            <p className="text-xs font-semibold mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by order #, customer, rider, or address..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand/30"
        />
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <FunnelIcon className="w-4 h-4 text-muted-foreground shrink-0" />
        {FILTER_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold border transition-all",
              filter === opt.value
                ? "bg-brand text-white border-brand"
                : "bg-white text-muted-foreground border-border hover:border-brand hover:text-brand"
            )}
          >
            {opt.label}
            {opt.value !== "all" && (
              <span className="ml-1 opacity-70">
                ({orders.filter(o => o.status === opt.value).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Results count */}
      {!loading && (
        <p className="text-xs text-muted-foreground">
          Showing <strong>{filtered.length}</strong> of <strong>{orders.length}</strong> orders
        </p>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(n => (
            <div key={n} className="rounded-2xl border border-border p-4 animate-pulse space-y-3">
              <div className="flex justify-between">
                <div className="h-4 bg-muted rounded w-28" />
                <div className="h-4 bg-muted rounded w-20" />
              </div>
              <div className="h-3 bg-muted rounded w-2/3" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-16">
          <InboxIcon className="w-14 h-14 text-muted mx-auto mb-3" />
          <h3 className="font-display font-bold text-foreground">No orders found</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {orders.length === 0 ? "No orders have been placed yet." : "No orders match your filter."}
          </p>
        </div>
      )}

      {/* Order cards */}
      {!loading && filtered.map(order => (
        <Card key={order.id} className="overflow-hidden shadow-sm hover:shadow-md transition-shadow">
          <div className={cn(
            "h-1.5",
            order.status === "delivered" ? "bg-green-500" :
              order.status === "completed" ? (order.orderType === "pickup" ? "bg-green-500" : "bg-green-500") :
                order.status === "picked_up" ? "bg-purple-400" :
                  order.status === "cancelled" ? "bg-red-400" :
                    order.status === "out_for_delivery" ? "bg-brand" :
                      order.status === "preparing" ? "bg-amber-400" :
                        order.status === "confirmed" ? "bg-blue-400" : "bg-muted"
          )} />
          <CardContent className="p-4 space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono text-xs font-bold text-muted-foreground">{order.orderNumber}</p>
                <p className="font-display font-black text-brand mt-0.5">{formatCurrency(order.total)}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <span className={cn(
                  "px-2.5 py-1 rounded-full text-[10px] font-bold border",
                  getStatusClass(order)
                )}>
                  {getDisplayStatus(order)}
                </span>
                <Badge variant="secondary" className="text-[10px] capitalize">{order.orderType}</Badge>
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <ClockIcon className="w-3 h-3" />
                  {formatDate(order.createdAt)}
                </div>
              </div>
            </div>

            {/* Customer + Rider row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="p-3 bg-muted/40 rounded-xl space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Customer</p>
                <div className="flex items-center gap-2">
                  <UserCircleIcon className="w-4 h-4 text-brand shrink-0" />
                  <p className="text-sm font-semibold text-foreground">{order.customerName}</p>
                </div>
                {order.customerAddress && (
                  <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <MapPinIcon className="w-3.5 h-3.5 text-brand shrink-0 mt-0.5" />
                    {order.customerAddress}
                  </div>
                )}
                {order.customerPhone && (
                  <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <PhoneIcon className="w-3.5 h-3.5 text-brand shrink-0 mt-0.5" />
                    {order.customerPhone}
                  </div>
                )}
              </div>

              {order.assignedRiderName && (
                <div className="p-3 bg-indigo-50 rounded-xl space-y-1 border border-indigo-100">
                  <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide">Rider</p>
                  <div className="flex items-center gap-2">
                    <TruckIcon className="w-4 h-4 text-indigo-500 shrink-0" />
                    <p className="text-sm font-semibold text-foreground">{order.assignedRiderName}</p>
                  </div>
                  {order.assignedRiderPhone && (
                    <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <PhoneIcon className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                      {order.assignedRiderPhone}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Items */}
            <div className="space-y-0.5">
              {order.items.map(item => (
                <div key={item.menuItemId}>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{item.menuItemName} ×{item.quantity}</span>
                    <span>{formatCurrency(item.subtotal)}</span>
                  </div>
                  {item.notes && <p className="text-xs text-amber-600 italic ml-2">→ {item.notes}</p>}
                </div>
              ))}
            </div>

            {/* Payment */}
            <div className={cn(
              "flex items-center gap-2 text-xs font-semibold p-2 rounded-lg",
              (order.paymentMethod === "cash" || order.paymentMethod === "cashpickup")
                ? "bg-green-50 text-green-700"
                : "bg-brand/5 text-brand"
            )}>
              {(order.paymentMethod === "cash" || order.paymentMethod === "cashpickup")
                ? <BanknotesIcon className="w-4 h-4" />
                : <CreditCardIcon className="w-4 h-4" />}
              {order.paymentMethod === "cash" ? "Cash on Delivery" :
                order.paymentMethod === "cashpickup" ? "Cash on Pickup" :
                  order.paymentMethod.toUpperCase()}
              <span className="ml-auto">{formatCurrency(order.total)}</span>
            </div>

            {/* Notes */}
            {order.notes && (
              <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                📝 {order.notes}
              </div>
            )}

            {/* Proof - Only show for delivery orders */}
            {(order.status === "delivered" || (order.status === "completed" && order.orderType === "delivery")) && (
              <div className="flex items-center justify-between">
                {order.photoProofUrl ? (
                  <button
                    onClick={() => setProofUrl(order.photoProofUrl!)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-green-700 border border-green-300 bg-green-50 hover:bg-green-500 hover:text-white transition-all"
                  >
                    <CameraIcon className="w-3.5 h-3.5" /> View Proof Photo
                  </button>
                ) : (
                  <span className="text-xs text-muted-foreground italic flex items-center gap-1">
                    <CameraIcon className="w-3.5 h-3.5" /> No photo proof
                  </span>
                )}
                <div className="flex items-center gap-1 text-xs text-green-600 font-semibold">
                  <CheckCircleIcon className="w-4 h-4" />
                  Delivered
                </div>
              </div>
            )}

            {/* Pickup completed without photo */}
            {order.status === "completed" && order.orderType === "pickup" && (
              <div className="flex items-center justify-end">
                <div className="flex items-center gap-1 text-xs text-green-600 font-semibold">
                  <CheckCircleIcon className="w-4 h-4" /> Picked Up
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}