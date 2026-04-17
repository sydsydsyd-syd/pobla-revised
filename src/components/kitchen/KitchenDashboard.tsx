import React, { useState, useEffect } from "react";
import type { Order, OrderStatus } from "@/types";
import { OrderStatus as OrderStatusEnum } from "@/types";
import { formatCurrency, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  CheckCircleIcon, ClockIcon, BellAlertIcon, ArrowPathIcon, XMarkIcon,
} from "@heroicons/react/24/outline";
import { FireIcon } from "@heroicons/react/24/solid";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  subscribeToPendingOrders,
  subscribeToKitchenOrders,
  updateOrderStatus,
} from "@/lib/orderService";
import { sendOrderReadyNotification } from "@/lib/emailService";

function PendingCard({ order, onConfirm, onCancel }: {
  order: Order;
  onConfirm: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  const mins = Math.floor((Date.now() - order.createdAt.getTime()) / 60000);
  const isOld = mins > 5;

  return (
    <Card className={cn(
      "overflow-hidden transition-all",
      isOld ? "ring-2 ring-red-300/50 border-red-200" : "ring-2 ring-amber-300/60 border-amber-200"
    )}>
      <div className={cn("h-1.5 animate-pulse", isOld ? "bg-red-400" : "bg-amber-400")} />
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <Badge className="bg-amber-100 text-amber-800 border-amber-200 gap-1 mb-1.5 animate-pulse">
              <BellAlertIcon className="w-3 h-3" /> New Order
            </Badge>
            <p className="font-display font-black text-sm text-foreground">{order.orderNumber}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {order.customerName} &middot;{" "}
              <Badge variant={order.orderType === "delivery" ? "info" : "warning"} className="text-[10px] px-1.5 py-0">
                {order.orderType}
              </Badge>
            </p>
          </div>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <ClockIcon className="w-3.5 h-3.5" />
            {mins < 1 ? "Just now" : `${mins}m ago`}
          </span>
        </div>

        <div className="space-y-1.5 p-3 bg-muted/40 rounded-xl mb-3">
          {order.items.map(item => (
            <div key={item.menuItemId}>
              <div className="flex items-center gap-2 text-sm">
                <span className="w-5 h-5 rounded-lg bg-amber-500 text-white flex items-center justify-center text-[10px] font-black shrink-0">
                  {item.quantity}
                </span>
                <span className="text-foreground">{item.menuItemName}</span>
                <span className="ml-auto text-xs text-muted-foreground">{formatCurrency(item.subtotal)}</span>
              </div>
              {item.notes && <p className="text-xs text-amber-600 italic ml-7">→ {item.notes}</p>}
            </div>
          ))}
        </div>

        {order.notes && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 mb-3 text-xs text-amber-700">
            {order.notes}
          </div>
        )}

        <div className="text-xs text-muted-foreground mb-3 flex justify-between">
          <span className="font-semibold">
            {order.paymentMethod === "cash" ? "Cash on Delivery" :
              order.paymentMethod === "cashpickup" ? "Cash on Pickup" :
                order.paymentMethod === "gcash" ? "GCash" :
                  order.paymentMethod === "maya" ? "Maya" : "Card"}
          </span>
          <span className="font-black text-foreground">{formatCurrency(order.total)}</span>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
            onClick={() => onCancel(order.id)}>
            <XMarkIcon className="w-3.5 h-3.5" /> Cancel
          </Button>
          <Button size="sm" className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
            onClick={() => onConfirm(order.id)}>
            <CheckCircleIcon className="w-3.5 h-3.5" /> Confirm
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function KitchenCard({ order, onStatus }: {
  order: Order;
  onStatus: (id: string, s: OrderStatus) => void;
}) {
  const isConfirmed = order.status === OrderStatusEnum.CONFIRMED;
  const isPreparing = order.status === OrderStatusEnum.PREPARING;
  const isReady = order.status === OrderStatusEnum.READY;
  const isCompleted = order.status === OrderStatusEnum.COMPLETED;
  const mins = Math.floor((Date.now() - order.createdAt.getTime()) / 60000);

  return (
    <Card className={cn(
      "overflow-hidden transition-all",
      isConfirmed && "ring-2 ring-yellow-400/40 border-yellow-300",
      isPreparing && "ring-2 ring-brand/30 border-brand/40",
      isReady && "ring-2 ring-green-400/30 border-green-300",
    )}>
      <div className={cn("h-1.5",
        isConfirmed ? "bg-yellow-400" : isPreparing ? "bg-brand" : "bg-green-500"
      )} />
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            {isConfirmed && (
              <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 gap-1 mb-1.5 animate-pulse">
                <BellAlertIcon className="w-3 h-3" /> Start Cooking
              </Badge>
            )}
            <p className="font-display font-black text-sm text-foreground">{order.orderNumber}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {order.customerName} &middot;{" "}
              <Badge variant={order.orderType === "delivery" ? "info" : "warning"} className="text-[10px] px-1.5 py-0">
                {order.orderType}
              </Badge>
            </p>
          </div>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <ClockIcon className="w-3.5 h-3.5" />
            {mins < 1 ? "Just now" : `${mins}m ago`}
          </span>
        </div>

        <div className="space-y-1.5 p-3 bg-muted/40 rounded-xl mb-3">
          {order.items.map(item => (
            <div key={item.menuItemId}>
              <div className="flex items-center gap-2 text-sm">
                <span className="w-5 h-5 rounded-lg bg-brand text-white flex items-center justify-center text-[10px] font-black shrink-0">
                  {item.quantity}
                </span>
                <span className="text-foreground">{item.menuItemName}</span>
              </div>
              {item.notes && <p className="text-xs text-amber-600 italic ml-7">→ {item.notes}</p>}
            </div>
          ))}
        </div>

        {order.notes && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 mb-3 text-xs text-amber-700">
            {order.notes}
          </div>
        )}

        {order.estimatedReadyMinutes && (
          <div className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
            <ClockIcon className="w-3 h-3" />
            Target ready in {order.estimatedReadyMinutes}m from order time
          </div>
        )}

        {isConfirmed && (
          <Button variant="dark" className="w-full" size="sm" onClick={() => onStatus(order.id, OrderStatusEnum.PREPARING)}>
            <FireIcon className="w-3.5 h-3.5" /> Start Cooking
          </Button>
        )}
        {isPreparing && (
          <Button variant="default" className="w-full" size="sm" onClick={() => onStatus(order.id, OrderStatusEnum.READY)}>
            <CheckCircleIcon className="w-3.5 h-3.5" /> Mark Ready
          </Button>
        )}
        {isReady && (
          order.orderType === "pickup" ? (
            <Button variant="default" className="w-full" size="sm" onClick={() => onStatus(order.id, OrderStatusEnum.COMPLETED)}>
              ✅ Customer Picked Up
            </Button>
          ) : (
            <div className="w-full py-2 rounded-xl text-sm font-semibold text-center bg-green-50 text-green-700 border border-green-200">
              Ready — Awaiting rider
            </div>
          )
        )}
        {isCompleted && (
          <div className="w-full py-2 rounded-xl text-sm font-semibold text-center bg-gray-50 text-gray-700 border border-gray-200">
            ✅ Picked Up!
          </div>
        )}
      </CardContent>
    </Card>
  );
}

type TabView = "pending" | "kitchen";

export default function KitchenDashboard() {
  const [pending, setPending] = useState<Order[]>([]);
  const [kitchen, setKitchen] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabView>("pending");
  const [filter, setFilter] = useState<OrderStatus | "all">("all");

  useEffect(() => {
    let pendingLoaded = false;
    let kitchenLoaded = false;
    function checkDone() { if (pendingLoaded && kitchenLoaded) setLoading(false); }
    const unsubPending = subscribeToPendingOrders(o => { setPending(o); pendingLoaded = true; checkDone(); });
    const unsubKitchen = subscribeToKitchenOrders(o => { setKitchen(o); kitchenLoaded = true; checkDone(); });
    return () => { unsubPending(); unsubKitchen(); };
  }, []);

  async function handleConfirm(id: string) {
    await updateOrderStatus(id, OrderStatusEnum.CONFIRMED);
  }

  async function handleCancel(id: string) {
    await updateOrderStatus(id, OrderStatusEnum.CANCELLED);
  }

  async function handleKitchenStatus(id: string, status: OrderStatus) {
    if (status === OrderStatusEnum.READY) {
      try {
        const snap = await getDoc(doc(db, "orders", id));
        if (snap.exists()) {
          const data = snap.data();
          const email = data.customerEmail as string | undefined;
          const order = {
            ...data, id,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
            updatedAt: new Date(),
          } as Order;
          if (email) sendOrderReadyNotification(order, email).catch(console.error);
        }
      } catch { /* non-blocking */ }
    }
    await updateOrderStatus(id, status);
  }

  const kitchenFiltered = filter === "all" ? kitchen : kitchen.filter(o => o.status === filter);
  const counts = {
    pending: pending.length,
    confirmed: kitchen.filter(o => o.status === OrderStatusEnum.CONFIRMED).length,
    preparing: kitchen.filter(o => o.status === OrderStatusEnum.PREPARING).length,
    ready: kitchen.filter(o => o.status === OrderStatusEnum.READY).length,
  };

  // Sort order for statuses
  const getStatusOrder = (status: OrderStatus): number => {
    if (status === OrderStatusEnum.CONFIRMED) return 0;
    if (status === OrderStatusEnum.PREPARING) return 1;
    if (status === OrderStatusEnum.READY) return 2;
    return 3;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h2 className="font-display font-bold text-xl text-foreground">Kitchen Dashboard</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Confirm incoming orders and manage food preparation</p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl mb-6 w-fit">
        <button onClick={() => setTab("pending")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
            tab === "pending" ? "bg-white text-brand shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}>
          <BellAlertIcon className="w-4 h-4" />
          Incoming Orders
          {counts.pending > 0 && (
            <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-black flex items-center justify-center">
              {counts.pending}
            </span>
          )}
        </button>
        <button onClick={() => setTab("kitchen")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
            tab === "kitchen" ? "bg-white text-brand shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}>
          <FireIcon className="w-4 h-4" />
          Kitchen Display
          {(counts.confirmed + counts.preparing) > 0 && (
            <span className="w-5 h-5 rounded-full bg-brand text-white text-[10px] font-black flex items-center justify-center">
              {counts.confirmed + counts.preparing}
            </span>
          )}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-muted-foreground">
          <ArrowPathIcon className="w-6 h-6 animate-spin mx-auto mb-2" />
          Loading orders...
        </div>
      ) : (
        <>
          {tab === "pending" && (
            pending.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-6xl mb-4">🎉</p>
                <h3 className="font-display font-bold text-xl text-foreground mb-2">No Pending Orders</h3>
                <p className="text-sm text-muted-foreground">New orders will appear here automatically</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {pending.map(o => (
                  <PendingCard key={o.id} order={o} onConfirm={handleConfirm} onCancel={handleCancel} />
                ))}
              </div>
            )
          )}

          {tab === "kitchen" && (
            <>
              <div className="grid grid-cols-3 gap-3 mb-6">
                {([
                  { key: "confirmed" as const, label: "Queue", cls: "bg-yellow-50 border-yellow-200 text-yellow-700" },
                  { key: "preparing" as const, label: "Cooking", cls: "bg-brand/5 border-brand/20 text-brand" },
                  { key: "ready" as const, label: "Ready", cls: "bg-green-50 border-green-200 text-green-700" },
                ]).map(s => (
                  <button key={s.key}
                    onClick={() => setFilter(filter === s.key ? "all" : s.key as OrderStatus)}
                    className={cn(
                      "p-4 rounded-2xl border-2 text-center transition-all hover:shadow-sm", s.cls,
                      filter === s.key && "ring-2 ring-offset-1 ring-current/30 shadow-sm"
                    )}>
                    <div className="font-display font-black text-2xl">
                      {s.key === "confirmed" ? counts.confirmed :
                        s.key === "preparing" ? counts.preparing : counts.ready}
                    </div>
                    <div className="text-xs font-semibold">{s.label}</div>
                  </button>
                ))}
              </div>

              {kitchenFiltered.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-6xl mb-4">🍳</p>
                  <h3 className="font-display font-bold text-xl text-foreground mb-2">
                    {kitchen.length === 0 ? "No active orders" : "No orders in this filter"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {kitchen.length === 0 ? "Confirmed orders will appear here for preparation" : "Try a different filter"}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {kitchenFiltered
                    .sort((a, b) => getStatusOrder(a.status) - getStatusOrder(b.status))
                    .map(o => <KitchenCard key={o.id} order={o} onStatus={handleKitchenStatus} />)}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}