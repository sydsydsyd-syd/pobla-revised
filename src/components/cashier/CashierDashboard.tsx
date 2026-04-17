//CashierDashboard
import React, { useState, useEffect } from "react";
import type { Order, OrderStatus } from "@/types";
import { formatCurrency, ORDER_STATUS_LABEL, formatDate, cn } from "@/lib/utils";
import { subscribeToPendingOrders, updateOrderStatus } from "@/lib/orderService";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  BellAlertIcon,
  ClockIcon,
  CheckCircleIcon,
  XMarkIcon,
  ReceiptRefundIcon,
  TruckIcon,
  BuildingStorefrontIcon,
  CreditCardIcon,
  BanknotesIcon,
} from "@heroicons/react/24/outline";
import {
  collection, query, where, onSnapshot, Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

function toOrder(id: string, data: Record<string, unknown>): Order {
  const td = (v: unknown) => v instanceof Timestamp ? v.toDate() : new Date();
  return {
    ...(data as Omit<Order, "id" | "createdAt" | "updatedAt">),
    id,
    createdAt: td(data.createdAt),
    updatedAt: td(data.updatedAt),
  };
}

function PendingOrderCard({ order, onConfirm, onCancel }: {
  order: Order;
  onConfirm: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  const mins = Math.floor((Date.now() - order.createdAt.getTime()) / 60000);
  const isOld = mins > 5;

  return (
    <Card className={cn(
      "overflow-hidden transition-all",
      "ring-2 ring-gray-300/60 border-gray-200",
      isOld && "ring-2 ring-red-300/50 border-red-200"
    )}>
      <div className={cn("h-1.5", isOld ? "bg-red-400" : "bg-amber-400 animate-pulse")} />
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <Badge className="bg-gray-100 text-gray-700 border-gray-200 gap-1 mb-1.5">
              <BellAlertIcon className="w-3 h-3" /> New order
            </Badge>
            <p className="font-display font-black text-sm text-foreground">{order.orderNumber}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <p className="text-xs text-muted-foreground">{order.customerName}</p>
              <span className="text-muted-foreground">·</span>
              <Badge variant={order.orderType === "delivery" ? "info" : "warning"} className="text-[10px] px-1.5 py-0 gap-1">
                {order.orderType === "delivery" ? <TruckIcon className="w-2.5 h-2.5" /> : <BuildingStorefrontIcon className="w-2.5 h-2.5" />}
                {order.orderType}
              </Badge>
            </div>
          </div>
          <div className="text-right">
            <p className="font-display font-black text-brand">{formatCurrency(order.total)}</p>
            <span className={cn("text-xs flex items-center gap-1 mt-0.5 justify-end", isOld ? "text-red-500" : "text-muted-foreground")}>
              <ClockIcon className="w-3 h-3" />
              {mins < 1 ? "Just now" : `${mins}m ago`}
            </span>
          </div>
        </div>

        {/* Items */}
        <div className="bg-muted/40 rounded-xl p-3 mb-3 space-y-1.5">
          {order.items.map(item => (
            <div key={item.menuItemId} className="flex items-start gap-2 text-sm">
              <span className="w-5 h-5 rounded-lg bg-brand text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                {item.quantity}
              </span>
              <div className="flex-1 min-w-0">
                <span className="text-foreground">{item.menuItemName}</span>
                {item.notes && <p className="text-xs text-amber-600 italic">→ {item.notes}</p>}
              </div>
              <span className="text-xs text-muted-foreground shrink-0">{formatCurrency(item.subtotal)}</span>
            </div>
          ))}
        </div>

        {/* Order details */}
        <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
          <div className={cn("flex items-center gap-1.5 p-2 rounded-lg font-semibold",
            order.paymentMethod === "cash" ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700")}>
            {order.paymentMethod === "cash" ? <BanknotesIcon className="w-3.5 h-3.5" /> : <CreditCardIcon className="w-3.5 h-3.5" />}
            {order.paymentMethod === "cash" ? `Cash — ${formatCurrency(order.total)}` : order.paymentMethod.toUpperCase()}
          </div>
          {order.customerAddress && (
            <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/50 text-muted-foreground font-medium truncate">
              {order.customerAddress}
            </div>
          )}
        </div>

        {order.notes && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 mb-3 text-xs text-amber-700">
            {order.notes}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button
            variant="dark" size="sm" className="flex-1" onClick={() => onConfirm(order.id)}
          >
            <CheckCircleIcon className="w-4 h-4" /> Confirm Order
          </Button>
          <Button
            variant="outline" size="sm" className="border-red-300 text-red-600 hover:bg-red-500 hover:text-white hover:border-red-500" onClick={() => onCancel(order.id)}
          >
            <XMarkIcon className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function RecentOrderRow({ order }: { order: Order }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
      <div className="flex-1 min-w-0">
        <p className="font-mono text-xs font-bold text-muted-foreground">{order.orderNumber}</p>
        <p className="text-sm font-medium text-foreground truncate">{order.customerName}</p>
      </div>
      <span className={cn(
        "text-[10px] font-bold px-2 py-1 rounded-full border",
        order.status === "confirmed" ? "bg-blue-100 text-blue-800 border-blue-200" :
          order.status === "cancelled" ? "bg-red-100 text-red-800 border-red-200" :
            "bg-gray-100 text-gray-700 border-gray-200"
      )}>
        {ORDER_STATUS_LABEL[order.status]}
      </span>
      <p className="font-display font-bold text-brand text-sm shrink-0">{formatCurrency(order.total)}</p>
    </div>
  );
}

export default function CashierDashboard() {
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState({ pending: 0, confirmedToday: 0, cancelledToday: 0 });

  // Live pending orders
  useEffect(() => {
    const unsub = subscribeToPendingOrders(orders => {
      setPendingOrders(orders);
      setCount(c => ({ ...c, pending: orders.length }));
      setLoading(false);
    });
    return unsub;
  }, []);

  // Recent confirmed/cancelled today
  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const q = query(
      collection(db, "orders"),
      where("status", "in", ["confirmed", "cancelled"])
    );
    const unsub = onSnapshot(q, snap => {
      const orders = snap.docs.map(d => toOrder(d.id, d.data() as Record<string, unknown>))
        .filter(o => o.updatedAt >= today)
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
        .slice(0, 20);
      setRecentOrders(orders);
      const confirmed = orders.filter(o => o.status === "confirmed").length;
      const cancelled = orders.filter(o => o.status === "cancelled").length;
      setCount(c => ({ ...c, confirmedToday: confirmed, cancelledToday: cancelled }));
    });
    return unsub;
  }, []);

  async function handleConfirm(orderId: string) {
    await updateOrderStatus(orderId, "confirmed");
  }

  async function handleCancel(orderId: string) {
    await updateOrderStatus(orderId, "cancelled");
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="font-display font-bold text-xl text-foreground">Cashier / POS Dashboard</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Review and confirm incoming customer orders</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Awaiting Confirmation", val: count.pending, cls: "bg-amber-50 border-amber-200 text-amber-700" },
          { label: "Confirmed Today", val: count.confirmedToday, cls: "bg-blue-50 border-blue-200 text-blue-700" },
          { label: "Cancelled Today", val: count.cancelledToday, cls: "bg-red-50 border-red-200 text-red-700" },
        ].map(s => (
          <div key={s.label} className={cn("p-4 rounded-2xl border text-center", s.cls)}>
            <p className="font-display font-black text-2xl">{s.val}</p>
            <p className="text-xs font-semibold mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="pending">
        <TabsList className="mb-5 w-full">
          <TabsTrigger value="pending" className="flex-1">
            Pending Orders
            {count.pending > 0 && (
              <span className="ml-1.5 text-xs font-black text-brand animate-pulse">{count.pending}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="recent" className="flex-1">Recent Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading orders...</div>
          ) : pendingOrders.length === 0 ? (
            <div className="text-center py-16">
              <ReceiptRefundIcon className="w-14 h-14 text-muted mx-auto mb-3" />
              <h3 className="font-display font-bold text-foreground">No pending orders</h3>
              <p className="text-sm text-muted-foreground mt-1">New orders will appear here automatically</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingOrders.map(order => (
                <PendingOrderCard key={order.id} order={order} onConfirm={handleConfirm} onCancel={handleCancel} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="recent">
          {recentOrders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">No activity today yet</div>
          ) : (
            <Card>
              <CardContent className="p-4">
                {recentOrders.map(o => <RecentOrderRow key={o.id} order={o} />)}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}