//OrderTracking
import React, { useEffect, useState } from "react";
import type { Order } from "@/types";
import { subscribeToOrder } from "@/lib/orderService";
import {
  formatCurrency, ORDER_STATUS_LABEL,
  formatTime, DELIVERY_ETA_MINUTES, cn,
} from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  TruckIcon,
  BuildingStorefrontIcon,
  ClockIcon,
  CheckCircleIcon,
  PhoneIcon,
  XMarkIcon,
  ArrowLeftIcon,
  QrCodeIcon,
  MapPinIcon,
} from "@heroicons/react/24/outline";

const STATUS_STEPS_DELIVERY = [
  "pending", "confirmed", "preparing", "ready", "picked_up", "out_for_delivery", "delivered",
] as const;

const STATUS_STEPS_PICKUP = [
  "pending", "confirmed", "preparing", "ready", "completed",
] as const;

const ORDER_STATUS_EMOJI: Record<string, string> = {
  pending: "⏳",
  confirmed: "✅",
  preparing: "🍳",
  ready: "🍽️",
  picked_up: "🛵",
  out_for_delivery: "📍",
  delivered: "🏠",
  completed: "✅",
  cancelled: "❌",
};

function ProgressStepper({ order }: { order: Order }) {
  const steps = order.orderType === "delivery" ? STATUS_STEPS_DELIVERY : STATUS_STEPS_PICKUP;
  const currentIdx = (steps as readonly string[]).indexOf(order.status);

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-border" />
      <div
        className="absolute left-4 top-4 w-0.5 bg-brand transition-all duration-500" style={{ height: `${Math.min(100, (currentIdx / (steps.length - 1)) * 100)}%` }}
      />

      <div className="space-y-4">
        {steps.map((status, i) => {
          const isDone = i < currentIdx;
          const isCurrent = i === currentIdx;
          const isPending = i > currentIdx;
          return (
            <div key={status} className="flex items-start gap-4 relative">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 z-10 transition-all",
                isDone ? "bg-brand text-white" :
                  isCurrent ? "bg-brand text-white ring-4 ring-brand/20 animate-pulse" :
                    "bg-white border-2 border-border text-muted-foreground"
              )}>
                {isDone ? "✓" : ORDER_STATUS_EMOJI[status as keyof typeof ORDER_STATUS_EMOJI]}
              </div>
              <div className="pt-1 flex-1">
                <p className={cn(
                  "text-sm font-semibold transition-all",
                  isCurrent ? "text-brand" : isDone ? "text-foreground" : "text-muted-foreground"
                )}>
                  {ORDER_STATUS_LABEL[status as keyof typeof ORDER_STATUS_LABEL]}
                </p>
                {isCurrent && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {status === "pending" && "Waiting for cashier to confirm your order"}
                    {status === "confirmed" && "Your order is in the kitchen queue"}
                    {status === "preparing" && "Kitchen is preparing your food"}
                    {status === "ready" && (order.orderType === "delivery" ? "Waiting for rider" : "Ready for your pickup!")}
                    {status === "picked_up" && "Rider picked up your order from the restaurant"}
                    {status === "out_for_delivery" && "Your order is on the way to you!"}
                    {status === "delivered" && "Order delivered. Enjoy your meal!"}
                    {status === "completed" && "Order completed. Enjoy your meal!"}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ETACard({ order }: { order: Order }) {
  const [eta, setEta] = useState<string | null>(null);

  useEffect(() => {
    const readyMins = order.estimatedReadyMinutes ?? 20;
    const deliveryMins = order.estimatedDeliveryMinutes ?? 45;
    const elapsed = (Date.now() - order.createdAt.getTime()) / 60000;

    if (["delivered", "completed", "cancelled"].includes(order.status)) {
      setEta(null);
      return;
    }

    let remaining = 0;
    if (order.orderType === "pickup") {
      remaining = Math.max(0, readyMins - elapsed);
      setEta(remaining <= 0 ? "Ready for pickup!" : `~${Math.ceil(remaining)} min until ready`);
    } else {
      remaining = Math.max(0, deliveryMins - elapsed);
      setEta(`~${Math.ceil(remaining)} min until delivery`);
    }
  }, [order]);

  if (!eta) return null;

  return (
    <div className="flex items-center gap-3 p-4 rounded-2xl bg-brand/5 border border-brand/20">
      <div className="w-10 h-10 rounded-xl bg-brand text-white flex items-center justify-center shrink-0">
        <ClockIcon className="w-5 h-5" />
      </div>
      <div>
        <p className="font-display font-bold text-foreground">{eta}</p>
        <p className="text-xs text-muted-foreground">
          {order.orderType === "pickup" ? "Estimated completion time" : "Estimated delivery time"}
        </p>
      </div>
    </div>
  );
}

function RiderCard({ order }: { order: Order }) {
  if (!order.assignedRiderName) return null;
  if (!["picked_up", "out_for_delivery"].includes(order.status)) return null;

  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Your Rider</p>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-brand/10 text-brand flex items-center justify-center text-lg font-black shrink-0">
            {order.assignedRiderName[0]}
          </div>
          <div className="flex-1">
            <p className="font-semibold text-foreground">{order.assignedRiderName}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <TruckIcon className="w-3 h-3" /> Out for delivery
            </p>
          </div>
          {order.assignedRiderPhone && (
            <a
              href={`tel:${order.assignedRiderPhone}`}
              className="w-10 h-10 rounded-xl bg-green-50 border border-green-200 text-green-600 flex items-center justify-center hover:bg-green-500 hover:text-white transition-all"
            >
              <PhoneIcon className="w-4 h-4" />
            </a>
          )}
        </div>

        {/* Delivery instructions */}
        <div className="mt-3 p-3 bg-muted/40 rounded-xl">
          <p className="text-xs font-semibold text-foreground mb-1 flex items-center gap-1">
            <MapPinIcon className="w-3.5 h-3.5 text-brand" /> Delivery Address
          </p>
          <p className="text-xs text-muted-foreground">
            {order.customerAddress || "Your registered delivery address"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Order: <strong className="text-foreground">{order.orderNumber}</strong>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function QRCodeCard({ order }: { order: Order }) {
  // Only show QR code for delivery orders
  if (order.orderType !== "delivery") return null;

  const trackingUrl = `${window.location.origin}/#/track/${order.id}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(trackingUrl)}&size=150x150&color=3b3130&bgcolor=f7f0ef&margin=10`;

  return (
    <Card>
      <CardContent className="p-4 text-center">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Order QR Code</p>
        <div className="inline-block p-2 bg-brand-light rounded-2xl border border-border">
          <img src={qrUrl} alt="Order QR Code" className="w-32 h-32 rounded-xl" />
        </div>
        <p className="text-xs text-muted-foreground mt-2">Scan to view live tracking</p>
        <p className="font-mono text-xs font-bold text-brand mt-1">{order.orderNumber}</p>
      </CardContent>
    </Card>
  );
}

interface Props {
  orderId: string;
  onBack: () => void;
}

export default function OrderTracking({ orderId, onBack }: Props) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToOrder(orderId, o => {
      setOrder(o);
      setLoading(false);
    });
    return unsub;
  }, [orderId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-brand/30 border-t-brand rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading order...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-20">
        <XMarkIcon className="w-12 h-12 text-muted mx-auto mb-3" />
        <h3 className="font-display font-bold text-foreground">Order not found</h3>
        <button onClick={onBack} className="mt-4 text-sm text-brand hover:underline">← Go back</button>
      </div>
    );
  }

  const isDone = ["delivered", "completed", "cancelled"].includes(order.status);
  const pickupAddress = "Poblacion Pares ATBP. - Olaveria St. Mogpog, Marinduque";

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      {/* Back button */}
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeftIcon className="w-4 h-4" /> Back to My Orders
      </button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-display font-bold text-xl text-foreground">Order Tracking</h2>
          <p className="font-mono text-sm text-brand font-bold mt-0.5">{order.orderNumber}</p>
          {isDone && order.status === "completed" && (
            <div className="flex items-center gap-1 px-3 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded-full mt-1">
              <CheckCircleIcon className="w-3.5 h-3.5" />
              Pickup completed!
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={order.orderType === "delivery" ? "info" : "warning"} className="gap-1">
            {order.orderType === "delivery" ? <TruckIcon className="w-3 h-3" /> : <BuildingStorefrontIcon className="w-3 h-3" />}
            {order.orderType}
          </Badge>
        </div>
      </div>

      {/* ETA */}
      {!isDone && <ETACard order={order} />}

      {/* Status progress */}
      <Card>
        <CardContent className="p-5">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Order Status</p>
          <ProgressStepper order={order} />
        </CardContent>
      </Card>

      {/* Rider details (when out for delivery) */}
      <RiderCard order={order} />

      {/* Order summary */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Order Summary</p>
          {order.items.map(item => (
            <div key={item.menuItemId} className="flex justify-between text-sm">
              <div>
                <span className="text-foreground">{item.menuItemName} ×{item.quantity}</span>
                {item.notes && <p className="text-xs text-amber-600 italic">→ {item.notes}</p>}
              </div>
              <span className="text-muted-foreground">{formatCurrency(item.subtotal)}</span>
            </div>
          ))}
          <Separator />
          {order.deliveryFee > 0 && (
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Delivery fee</span><span>{formatCurrency(order.deliveryFee)}</span>
            </div>
          )}
          <div className="flex justify-between font-display font-black text-base">
            <span>Total</span>
            <span className="text-brand">{formatCurrency(order.total)}</span>
          </div>

          {/* Address section - shows different address based on order type */}
          {order.orderType === "delivery" && order.customerAddress && (
            <div className="flex items-start gap-1.5 text-xs text-muted-foreground pt-1">
              <MapPinIcon className="w-3.5 h-3.5 shrink-0 mt-0.5 text-brand" />
              <div>
                <p className="font-semibold text-foreground text-xs mb-0.5">Delivery Address</p>
                <p>{order.customerAddress}</p>
              </div>
            </div>
          )}

          {order.orderType === "pickup" && (
            <div className="flex items-start gap-1.5 text-xs text-muted-foreground pt-1">
              <BuildingStorefrontIcon className="w-3.5 h-3.5 shrink-0 mt-0.5 text-brand" />
              <div>
                <p className="font-semibold text-foreground text-xs mb-0.5">Pickup Location</p>
                <p>{pickupAddress}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* QR Code - Only for delivery orders */}
      <QRCodeCard order={order} />

      {/* Proof of delivery - Only for delivery orders */}
      {order.photoProofUrl && order.orderType === "delivery" && (
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1">
              <CheckCircleIcon className="w-4 h-4 text-green-500" /> Delivery Photo Proof
            </p>
            <img src={order.photoProofUrl} alt="Delivery proof" className="w-full rounded-xl object-cover max-h-48" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}