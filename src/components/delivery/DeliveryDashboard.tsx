//DeliveryDashboard
import React, { useState, useEffect, useRef } from "react";
import type { Order } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { formatCurrency, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  MapPinIcon, PhoneIcon, CheckCircleIcon, TruckIcon,
  BanknotesIcon, CreditCardIcon, PowerIcon, CameraIcon,
  XMarkIcon, ArrowPathIcon, ClockIcon,
} from "@heroicons/react/24/outline";
import RiderOrderHistory from "./RiderOrderHistory";
import {
  subscribeToAvailableDeliveries,
  subscribeToRiderOrders,
  subscribeToRiderHistory,
  updateOrderStatus,
} from "@/lib/orderService";
import {
  setRiderOnlineStatus,
  getRiderOnlineStatus,
  incrementRiderDeliveries,
} from "@/lib/riderService";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

function DeliveryCard({ order, onPickup, onOutForDelivery, onDeliver, riderId }: {
  order: Order;
  onPickup: (id: string) => void;
  onOutForDelivery: (id: string) => void;
  onDeliver: (id: string, photoUrl?: string) => void;
  riderId: string;
}) {
  const isAvail = order.status === "ready" && !order.assignedRiderId;
  const isPickedUp = order.status === "picked_up" && order.assignedRiderId === riderId;
  const isOutForDel = order.status === "out_for_delivery" && order.assignedRiderId === riderId;
  const isDone = order.status === "delivered";
  const [uploading, setUploading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadToCloudinary(file, "pobla-delivery-proof");
      onDeliver(order.id, result.secure_url);
      setShowCamera(false);
      setCapturedPhoto(null);
    } catch { onDeliver(order.id); }
    finally { setUploading(false); }
  }

  async function startCamera() {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error("Camera access error:", err);
      // Fallback to file upload
      fileRef.current?.click();
      setShowCamera(false);
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
    setCapturedPhoto(null);
  }

  function capturePhoto() {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d");
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
        const photoData = canvasRef.current.toDataURL("image/jpeg", 0.8);
        setCapturedPhoto(photoData);
        stopCamera();
      }
    }
  }

  async function uploadCapturedPhoto() {
    if (!capturedPhoto) return;
    setUploading(true);
    try {
      // Convert base64 to blob
      const blob = await fetch(capturedPhoto).then(res => res.blob());
      const file = new File([blob], `delivery-proof-${order.orderNumber}.jpg`, { type: "image/jpeg" });
      const result = await uploadToCloudinary(file, "pobla-delivery-proof");
      onDeliver(order.id, result.secure_url);
      setCapturedPhoto(null);
      setShowCamera(false);
    } catch {
      onDeliver(order.id);
    } finally {
      setUploading(false);
    }
  }

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <Card className={cn(
      "overflow-hidden transition-all",
      isPickedUp && "ring-2 ring-indigo-400/40 border-indigo-300",
      isOutForDel && "ring-2 ring-brand/30 border-brand/40",
      isDone && "opacity-70"
    )}>
      <div className={cn(
        "h-1.5",
        isAvail ? "bg-amber-400" :
          isPickedUp ? "bg-indigo-400" :
            isOutForDel ? "bg-brand" :
              isDone ? "bg-green-500" : "bg-muted"
      )} />
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-display font-black text-sm text-foreground">{order.orderNumber}</p>
            <Badge variant={isPickedUp ? "info" : isOutForDel ? "default" : isDone ? "success" : "warning"} className="text-[10px] mt-1">
              {isAvail ? "Ready for Pickup" : isPickedUp ? "Picked Up" : isOutForDel ? "Out for Delivery" : "Delivered"}
            </Badge>
          </div>
          <p className="font-display font-black text-brand">{formatCurrency(order.total)}</p>
        </div>

        {/* Customer */}
        <div className="p-3 bg-muted/40 rounded-xl space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-brand/10 text-brand flex items-center justify-center font-black text-sm shrink-0">
              {order.customerName[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{order.customerName}</p>
              <p className="text-xs text-muted-foreground">{order.customerPhone}</p>
            </div>
            <a href={`tel:${order.customerPhone}`}
              className="p-1.5 rounded-lg bg-white border border-border text-green-600 hover:bg-green-50 transition-all">
              <PhoneIcon className="w-3.5 h-3.5" />
            </a>
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
          order.paymentMethod === "cash" ? "bg-green-50 text-green-700" : "bg-brand/5 text-brand"
        )}>
          {order.paymentMethod === "cash" ? <BanknotesIcon className="w-4 h-4" /> : <CreditCardIcon className="w-4 h-4" />}
          {order.paymentMethod === "cash" ? `Collect ${formatCurrency(order.total)} cash` : "Payment already made"}
        </div>

        {/* Camera Modal */}
        {showCamera && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 p-4">
            <div className="relative w-full max-w-md bg-black rounded-2xl overflow-hidden">
              <button
                onClick={stopCamera}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-all"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
              <div className="relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-auto"
                />
                <canvas ref={canvasRef} className="hidden" />
              </div>
              <div className="p-4 flex gap-2">
                <Button
                  onClick={capturePhoto}
                  className="flex-1 bg-brand hover:bg-brand/90"
                >
                  <CameraIcon className="w-4 h-4 mr-2" />
                  Capture Photo
                </Button>
                <Button
                  onClick={() => fileRef.current?.click()}
                  variant="outline"
                  className="flex-1"
                >
                  Upload from Gallery
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Captured Photo Preview */}
        {capturedPhoto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 p-4">
            <div className="relative w-full max-w-md bg-white rounded-2xl overflow-hidden">
              <button
                onClick={() => setCapturedPhoto(null)}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-all"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
              <img src={capturedPhoto} alt="Captured" className="w-full h-auto" />
              <div className="p-4 flex gap-2">
                <Button
                  onClick={uploadCapturedPhoto}
                  className="flex-1 bg-brand hover:bg-brand/90"
                  disabled={uploading}
                >
                  {uploading ? "Uploading..." : "Confirm & Upload"}
                </Button>
                <Button
                  onClick={startCamera}
                  variant="outline"
                  className="flex-1"
                >
                  Retake
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Hidden file input for fallback */}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} capture="environment" />

        {/* Actions */}
        {isAvail && (
          <div className="flex gap-2">
            <Button variant="dark" size="sm" className="flex-1" onClick={() => onPickup(order.id)}>
              <TruckIcon className="w-4 h-4" /> Accept & Pick Up
            </Button>
          </div>
        )}
        {isPickedUp && (
          <Button variant="default" size="sm" className="w-full" onClick={() => onOutForDelivery(order.id)}>
            <MapPinIcon className="w-4 h-4" /> Out for Delivery
          </Button>
        )}
        {isOutForDel && (
          <div className="space-y-2">
            <Button
              variant="default" size="sm" className="w-full" onClick={startCamera}
              loading={uploading}
            >
              <CameraIcon className="w-4 h-4" />
              {uploading ? "Uploading proof..." : "Take Photo as Proof"}
            </Button>
            <button
              onClick={() => onDeliver(order.id)}
              className="w-full text-xs text-muted-foreground hover:text-foreground text-center underline transition-colors"
            >
              Mark delivered without photo
            </button>
          </div>
        )}
        {isDone && (
          <div className="w-full py-2 rounded-xl text-sm font-semibold text-center bg-green-50 text-green-700 border border-green-200">
            Delivered
          </div>
        )}
        {/* Show proof photo if exists */}
        {order.photoProofUrl && (
          <div>
            <p className="text-xs text-muted-foreground mb-1 font-semibold">Delivery proof</p>
            <img src={order.photoProofUrl} alt="Proof" className="w-full rounded-xl object-cover max-h-32" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function DeliveryDashboard() {
  const { user } = useAuth();
  const riderId = user?.uid ?? "";
  const riderName = user?.displayName ?? "Rider";

  const [isOnline, setIsOnline] = useState(false);
  const [available, setAvailable] = useState<Order[]>([]);
  const [active, setActive] = useState<Order[]>([]);
  const [done, setDone] = useState<Order[]>([]);
  const [togglingOnline, setTogglingOnline] = useState(false);

  // Load online status
  useEffect(() => {
    if (!riderId) return;
    getRiderOnlineStatus(riderId).then(setIsOnline);
  }, [riderId]);

  // Subscribe to available deliveries (ready, delivery, unassigned)
  useEffect(() => {
    if (!riderId) return;
    return subscribeToAvailableDeliveries(setAvailable);
  }, [riderId]);

  // Subscribe to rider's active orders
  useEffect(() => {
    if (!riderId) return;
    return subscribeToRiderOrders(riderId, setActive);
  }, [riderId]);

  // Subscribe to rider's completed orders
  useEffect(() => {
    if (!riderId) return;
    return subscribeToRiderHistory(riderId, orders => {
      setDone(orders.filter(o => o.status === "delivered"));
    });
  }, [riderId]);

  async function toggleOnline() {
    setTogglingOnline(true);
    const newStatus = !isOnline;
    await setRiderOnlineStatus(riderId, newStatus);
    setIsOnline(newStatus);
    setTogglingOnline(false);
  }

  // Accept delivery → status: picked_up
  async function handlePickup(orderId: string) {
    await updateOrderStatus(orderId, "picked_up", {
      assignedRiderId: riderId,
      assignedRiderName: riderName,
      assignedRiderPhone: user?.email ?? "",
    });
  }

  // Rider leaves restaurant → status: out_for_delivery + notify customer
  async function handleOutForDelivery(orderId: string) {
    await updateOrderStatus(orderId, "out_for_delivery");
  }

  // Complete delivery with optional photo proof
  async function handleDeliver(orderId: string, photoProofUrl?: string) {
    await updateOrderStatus(orderId, "delivered", {
      ...(photoProofUrl ? { photoProofUrl } : {}),
    });
    await incrementRiderDeliveries(riderId);
  }

  const todayEarnings = done.length * 49; // approximate tip per delivery

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="font-display font-bold text-xl text-foreground">Rider Dashboard</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Hello, {riderName}!</p>
        </div>
        {/* Online/Offline toggle — Diagram 3 */}
        <button
          onClick={toggleOnline}
          disabled={togglingOnline}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all border-2",
            isOnline
              ? "bg-green-500 border-green-500 text-white hover:bg-green-600"
              : "bg-white border-gray-300 text-gray-500 hover:border-brand hover:text-brand"
          )}
        >
          <div className={cn("w-2.5 h-2.5 rounded-full", isOnline ? "bg-white animate-pulse" : "bg-gray-400")} />
          {togglingOnline ? "Updating..." : isOnline ? "Online" : "Offline"}
        </button>
      </div>

      {!isOnline && (
        <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm text-gray-600 mb-6">
          <PowerIcon className="w-5 h-5 shrink-0" />
          <span>You are <strong>offline</strong>. Go online to see and accept delivery assignments.</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Available", val: isOnline ? available.length : 0, cls: "bg-amber-50 border-amber-200 text-amber-700" },
          { label: "Active", val: active.length, cls: "bg-brand/5 border-brand/20 text-brand" },
          { label: "Completed", val: done.length, cls: "bg-green-50 border-green-200 text-green-700" },
        ].map(s => (
          <div key={s.label} className={cn("p-4 rounded-2xl border text-center", s.cls)}>
            <p className="font-display font-black text-xl">{s.val}</p>
            <p className="text-xs font-semibold mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="available">
        <TabsList className="mb-5 w-full">
          <TabsTrigger value="available" className="flex-1">
            Available {isOnline && available.length > 0 && <span className="ml-1 text-xs font-black text-brand">{available.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="active" className="flex-1">
            Active {active.length > 0 && <span className="ml-1 text-xs font-black text-brand">{active.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="done" className="flex-1">Completed</TabsTrigger>
          <TabsTrigger value="history" className="flex-1">History</TabsTrigger>
        </TabsList>

        <TabsContent value="available">
          {!isOnline ? (
            <div className="text-center py-16">
              <PowerIcon className="w-14 h-14 text-muted mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Go online to see available deliveries</p>
            </div>
          ) : available.length === 0 ? (
            <div className="text-center py-16">
              <TruckIcon className="w-14 h-14 text-muted mx-auto mb-3" />
              <h3 className="font-display font-bold text-foreground">No available orders</h3>
              <p className="text-sm text-muted-foreground mt-1">New delivery orders will appear here when ready</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {available.map(o => (
                <DeliveryCard key={o.id} order={o} riderId={riderId}
                  onPickup={handlePickup} onOutForDelivery={handleOutForDelivery} onDeliver={handleDeliver} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="active">
          {active.length === 0 ? (
            <div className="text-center py-16">
              <TruckIcon className="w-14 h-14 text-muted mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No active deliveries. Accept one from Available tab.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {active.map(o => (
                <DeliveryCard key={o.id} order={o} riderId={riderId}
                  onPickup={handlePickup} onOutForDelivery={handleOutForDelivery} onDeliver={handleDeliver} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="done">
          {done.length === 0 ? (
            <div className="text-center py-16">
              <CheckCircleIcon className="w-14 h-14 text-muted mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No completed deliveries yet today.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {done.slice(0, 20).map(o => (
                <DeliveryCard key={o.id} order={o} riderId={riderId}
                  onPickup={handlePickup} onOutForDelivery={handleOutForDelivery} onDeliver={handleDeliver} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history">
          <RiderOrderHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}