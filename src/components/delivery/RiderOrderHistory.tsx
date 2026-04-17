//RiderOrderHistory
import React, { useEffect, useState } from "react";
import type { Order } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { subscribeToRiderHistory } from "@/lib/orderService";
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
  CreditCardIcon,
  CameraIcon,
  XMarkIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";

type FilterStatus = "all" | "delivered" | "out_for_delivery" | "picked_up";

export default function RiderOrderHistory() {
  const { user } = useAuth();
  const riderId = user?.uid ?? "";

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [search, setSearch] = useState("");
  const [proofUrl, setProofUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!riderId) return;
    setLoading(true);
    return subscribeToRiderHistory(riderId, (all) => {
      setOrders(all);
      setLoading(false);
    }, () => setLoading(false));
  }, [riderId]);

  const riderOrders = orders; // already filtered by assignedRiderId in Firestore query

  const filtered = riderOrders.filter(o => {
    const matchStatus = filter === "all" || o.status === filter;
    const matchSearch =
      search === "" ||
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.customerName.toLowerCase().includes(search.toLowerCase()) ||
      (o.customerAddress ?? "").toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const totalDelivered = riderOrders.filter(o => o.status === "delivered").length;
  const totalEarnings = totalDelivered * 49; // delivery fee per order

  const FILTER_OPTIONS: { label: string; value: FilterStatus }[] = [
    { label: "All", value: "all" },
    { label: "Delivered", value: "delivered" },
    { label: "Out for Delivery", value: "out_for_delivery" },
    { label: "Picked Up", value: "picked_up" },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
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
              <p className="text-xs text-green-700 font-semibold">Delivery confirmed</p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <h2 className="font-display font-bold text-xl text-foreground">Delivery History</h2>
        <p className="text-sm text-muted-foreground mt-0.5">All your assigned deliveries</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-2xl bg-green-50 border border-green-200 text-center">
          <p className="font-display font-black text-2xl text-green-700">{totalDelivered}</p>
          <p className="text-xs font-semibold text-green-600 mt-0.5 flex items-center justify-center gap-1">
            <CheckCircleIcon className="w-3.5 h-3.5" /> Total Delivered
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-brand/5 border border-brand/20 text-center">
          <p className="font-display font-black text-2xl text-brand">{formatCurrency(totalEarnings)}</p>
          <p className="text-xs font-semibold text-brand/70 mt-0.5 flex items-center justify-center gap-1">
            <BanknotesIcon className="w-3.5 h-3.5" /> Est. Earnings
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by order #, customer, or address..."
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
          </button>
        ))}
      </div>

      {/* Loading */}
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
          <h3 className="font-display font-bold text-foreground">No deliveries found</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {riderOrders.length === 0
              ? "You haven't been assigned any deliveries yet."
              : "No orders match your current filter."}
          </p>
        </div>
      )}

      {/* Order Cards */}
      {!loading && filtered.map(order => (
        <Card key={order.id} className="overflow-hidden shadow-sm hover:shadow-md transition-shadow">
          {/* Status bar */}
          <div className={cn(
            "h-1.5",
            order.status === "delivered" ? "bg-green-500" :
              order.status === "out_for_delivery" ? "bg-brand" :
                order.status === "picked_up" ? "bg-indigo-400" : "bg-muted"
          )} />

          <CardContent className="p-4 space-y-3">
            {/* Header row */}
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono text-xs font-bold text-muted-foreground">{order.orderNumber}</p>
                <p className="font-display font-black text-brand mt-0.5">{formatCurrency(order.total)}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <span className={cn(
                  "px-2.5 py-1 rounded-full text-[10px] font-bold border",
                  ORDER_STATUS_CLASS[order.status]
                )}>
                  {ORDER_STATUS_LABEL[order.status]}
                </span>
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <ClockIcon className="w-3 h-3" />
                  {formatDate(order.createdAt)}
                </div>
              </div>
            </div>

            {/* Customer info */}
            <div className="p-3 bg-muted/40 rounded-xl space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-brand/10 text-brand flex items-center justify-center font-black text-xs shrink-0">
                  {order.customerName[0]}
                </div>
                <p className="text-sm font-semibold text-foreground">{order.customerName}</p>
              </div>
              {order.customerAddress && (
                <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <MapPinIcon className="w-3.5 h-3.5 text-brand shrink-0 mt-0.5" />
                  {order.customerAddress}
                </div>
              )}
            </div>

            {/* Items */}
            <div className="space-y-0.5">
              {order.items.map(item => (
                <div key={item.menuItemId} className="flex justify-between text-xs text-muted-foreground">
                  <span>{item.menuItemName} ×{item.quantity}</span>
                  <span>{formatCurrency(item.subtotal)}</span>
                </div>
              ))}
            </div>

            {/* Payment */}
            <div className={cn(
              "flex items-center gap-2 text-xs font-semibold p-2 rounded-lg",
              (order.paymentMethod === "cash" || order.paymentMethod === "cashpickup")
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-brand/5 text-brand border border-brand/20"
            )}>
              <BanknotesIcon className="w-4 h-4" />
              {order.paymentMethod === "cashpickup" ? "Cash on Pickup" :
                order.paymentMethod === "cash" ? `Cash collected: ${formatCurrency(order.total)}` :
                  "Paid online"}
            </div>

            {/* Proof of delivery */}
            {order.status === "delivered" && (
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
                    <CameraIcon className="w-3.5 h-3.5" /> No photo proof uploaded
                  </span>
                )}
                <div className="flex items-center gap-1 text-xs text-green-600 font-semibold">
                  <CheckCircleIcon className="w-4 h-4" /> Delivered
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}