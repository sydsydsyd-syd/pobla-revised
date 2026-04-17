import {
  collection, addDoc, doc, updateDoc, getDoc, query, where,
  onSnapshot, serverTimestamp, Timestamp, orderBy,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Order, OrderStatus, OrderType } from "@/types";
import { OrderStatus as OrderStatusEnum, OrderType as OrderTypeEnum } from "@/types";
import { sendOrderReadyNotification, sendOrderOutForDeliveryNotification, sendOrderDeliveredNotification } from "./emailService";

const COL = "orders";

function toOrder(id: string, data: Record<string, unknown>): Order {
  const toDate = (v: unknown) =>
    v instanceof Timestamp ? v.toDate() : new Date();
  return {
    ...(data as Omit<Order, "id" | "createdAt" | "updatedAt">),
    id,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
    confirmedAt: data.confirmedAt ? toDate(data.confirmedAt) : undefined,
    preparedAt: data.preparedAt ? toDate(data.preparedAt) : undefined,
    pickedUpAt: data.pickedUpAt ? toDate(data.pickedUpAt) : undefined,
    deliveredAt: data.deliveredAt ? toDate(data.deliveredAt) : undefined,
  };
}

/** Save a new order to Firestore (status = "pending") */
export async function saveOrder(order: Order, userId: string): Promise<string> {
  const payload: Record<string, unknown> = {
    orderNumber: order.orderNumber,
    customerId: order.customerId,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    items: order.items.map(item => ({
      menuItemId: item.menuItemId,
      menuItemName: item.menuItemName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.subtotal,
      ...(item.notes ? { notes: item.notes } : {}),
    })),
    status: OrderStatusEnum.PENDING,
    orderType: order.orderType,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    total: order.total,
    estimatedReadyMinutes: order.estimatedReadyMinutes ?? 20,
    estimatedDeliveryMinutes: order.estimatedDeliveryMinutes ?? 45,
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (order.customerAddress) payload.customerAddress = order.customerAddress;
  if (order.customerEmail) payload.customerEmail = order.customerEmail;
  if (order.notes) payload.notes = order.notes;

  const ref = await addDoc(collection(db, COL), payload);
  return ref.id;
}

/** Generic status update with optional extra fields */
export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  extra: Record<string, unknown> = {}
): Promise<void> {
  const tsField: Record<OrderStatus, string | null> = {
    [OrderStatusEnum.PENDING]: null,
    [OrderStatusEnum.CONFIRMED]: "confirmedAt",
    [OrderStatusEnum.PREPARING]: null,
    [OrderStatusEnum.READY]: "preparedAt",
    [OrderStatusEnum.PICKED_UP]: "pickedUpAt",
    [OrderStatusEnum.OUT_FOR_DELIVERY]: null,
    [OrderStatusEnum.DELIVERED]: "deliveredAt",
    [OrderStatusEnum.COMPLETED]: "deliveredAt",
    [OrderStatusEnum.CANCELLED]: null,
  };
  const ts = tsField[status];

  await updateDoc(doc(db, COL, orderId), {
    status,
    ...(ts ? { [ts]: serverTimestamp() } : {}),
    ...extra,
    updatedAt: serverTimestamp(),
  });

  // Fetch order details for email (use a small delay to ensure the update is complete)
  setTimeout(async () => {
    try {
      const orderSnap = await getDoc(doc(db, COL, orderId));
      if (!orderSnap.exists()) return;

      const orderData = orderSnap.data();
      const order = toOrder(orderId, orderData as Record<string, unknown>);

      if (!order.customerEmail) {
        console.warn(`⚠️ No customer email for order ${order.orderNumber}, skipping notification`);
        return;
      }

      // Send email based on status
      switch (status) {
        case OrderStatusEnum.READY:
          await sendOrderReadyNotification(order, order.customerEmail);
          console.log(`✅ Ready notification sent for order ${order.orderNumber}`);
          break;
        case OrderStatusEnum.OUT_FOR_DELIVERY:
          await sendOrderOutForDeliveryNotification(order, order.customerEmail);
          console.log(`✅ Out for delivery notification sent for order ${order.orderNumber}`);
          break;
        case OrderStatusEnum.DELIVERED:
        case OrderStatusEnum.COMPLETED:
          await sendOrderDeliveredNotification(order, order.customerEmail);
          console.log(`✅ Delivered notification sent for order ${order.orderNumber}`);
          break;
        default:
          // No email for other statuses
          break;
      }
    } catch (error) {
      console.error(`❌ Failed to send ${status} notification for order ${orderId}:`, error);
    }
  }, 500);
}

/** Cashier: subscribe to pending orders */
export function subscribeToPendingOrders(
  callback: (orders: Order[]) => void,
  onError?: (err: Error) => void
): () => void {
  const q = query(
    collection(db, COL),
    where("status", "==", OrderStatusEnum.PENDING)
  );
  return onSnapshot(q, snap => {
    const orders = snap.docs
      .map(d => toOrder(d.id, d.data() as Record<string, unknown>))
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    callback(orders);
  }, err => { console.error("[orderService]", err); onError?.(err); });
}

/** Kitchen: subscribe to confirmed, preparing, ready orders */
export function subscribeToKitchenOrders(
  callback: (orders: Order[]) => void,
  onError?: (err: Error) => void
): () => void {
  const q = query(
    collection(db, COL),
    where("status", "in", [
      OrderStatusEnum.CONFIRMED,
      OrderStatusEnum.PREPARING,
      OrderStatusEnum.READY
    ])
  );
  return onSnapshot(q, snap => {
    const orders = snap.docs
      .map(d => toOrder(d.id, d.data() as Record<string, unknown>))
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    callback(orders);
  }, err => { console.error("[orderService]", err); onError?.(err); });
}

/** Delivery: subscribe to ready (unassigned) delivery orders */
export function subscribeToAvailableDeliveries(
  callback: (orders: Order[]) => void,
  onError?: (err: Error) => void
): () => void {
  const q = query(
    collection(db, COL),
    where("status", "==", OrderStatusEnum.READY),
    where("orderType", "==", OrderTypeEnum.DELIVERY)
  );
  return onSnapshot(q, snap => {
    const orders = snap.docs
      .map(d => toOrder(d.id, d.data() as Record<string, unknown>))
      .filter(o => !o.assignedRiderId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    callback(orders);
  }, err => { console.error("[orderService]", err); onError?.(err); });
}

/** Delivery: subscribe to orders assigned to a specific rider */
export function subscribeToRiderOrders(
  riderId: string,
  callback: (orders: Order[]) => void,
  onError?: (err: Error) => void
): () => void {
  const q = query(
    collection(db, COL),
    where("assignedRiderId", "==", riderId),
    where("status", "in", [
      OrderStatusEnum.PICKED_UP,
      OrderStatusEnum.OUT_FOR_DELIVERY
    ])
  );
  return onSnapshot(q, snap => {
    const orders = snap.docs
      .map(d => toOrder(d.id, d.data() as Record<string, unknown>))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    callback(orders);
  }, err => { console.error("[orderService]", err); onError?.(err); });
}

/** Customer: subscribe to a single order for tracking */
export function subscribeToOrder(
  orderId: string,
  callback: (order: Order | null) => void,
  onError?: (err: Error) => void
): () => void {
  return onSnapshot(doc(db, COL, orderId),
    snap => callback(snap.exists() ? toOrder(snap.id, snap.data() as Record<string, unknown>) : null),
    err => { console.error("[orderService]", err); onError?.(err); }
  );
}

/** Customer: all orders for a user (newest first) */
export function subscribeToUserOrders(
  userId: string,
  callback: (orders: Order[]) => void,
  onError?: (err: Error) => void
): () => void {
  const q = query(collection(db, COL), where("userId", "==", userId));
  return onSnapshot(q, snap => {
    const orders = snap.docs
      .map(d => toOrder(d.id, d.data() as Record<string, unknown>))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    callback(orders);
  }, err => { console.error("[orderService]", err); onError?.(err); });
}

/** Rider: all orders ever assigned to this rider (by assignedRiderId) */
export function subscribeToRiderHistory(
  riderId: string,
  callback: (orders: Order[]) => void,
  onError?: (err: Error) => void
): () => void {
  const q = query(
    collection(db, COL),
    where("assignedRiderId", "==", riderId)
  );
  return onSnapshot(q, snap => {
    const orders = snap.docs
      .map(d => toOrder(d.id, d.data() as Record<string, unknown>))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    callback(orders);
  }, err => { console.error("[orderService]", err); onError?.(err); });
}

/** Owner: all orders */
export function subscribeToAllOrders(
  callback: (orders: Order[]) => void,
  onError?: (err: Error) => void
): () => void {
  return onSnapshot(collection(db, COL), snap => {
    const orders = snap.docs
      .map(d => toOrder(d.id, d.data() as Record<string, unknown>))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    callback(orders);
  }, err => { console.error("[orderService]", err); onError?.(err); });
}