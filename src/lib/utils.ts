//utils
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { MenuItem, OrderStatus, PaymentMethod } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function generateOrderNumber(): string {
  const ts = Date.now().toString(36).toUpperCase().slice(-4);
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `PB-${ts}-${rand}`;
}

export const DELIVERY_FEE = 49;
export const FREE_DELIVERY_THRESHOLD = 500;
export const DELIVERY_ETA_MINUTES = 25; // extra minutes after ready for delivery

export function calcDeliveryFee(subtotal: number, type: string): number {
  if (type === "pickup") return 0;
  return subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
}

/** Calculate estimated ready time in minutes from order items */
export function calcEstimatedReadyMinutes(items: { preparationTime?: number; quantity: number }[]): number {
  if (!items.length) return 15;
  // Max prep time of all items (kitchen prepares in parallel)
  const maxPrep = Math.max(...items.map(i => (i.preparationTime ?? 15)));
  return maxPrep + 5; // +5 min buffer
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready",
  picked_up: "Picked Up",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const ORDER_STATUS_CLASS: Record<OrderStatus, string> = {
  pending: "bg-gray-100 text-gray-700 border-gray-200",
  confirmed: "bg-blue-100 text-blue-800 border-blue-200",
  preparing: "bg-orange-100 text-orange-800 border-orange-200",
  ready: "bg-purple-100 text-purple-800 border-purple-200",
  picked_up: "bg-indigo-100 text-indigo-800 border-indigo-200",
  out_for_delivery: "bg-blue-100 text-blue-800 border-blue-200",
  delivered: "bg-green-100 text-green-800 border-green-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

export const ORDER_STATUS_ICON: Record<OrderStatus, string> = {
  pending: "clock",
  confirmed: "check",
  preparing: "fire",
  ready: "plate",
  picked_up: "truck",
  out_for_delivery: "map",
  delivered: "home",
  completed: "check",
  cancelled: "x",
};

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  cash: "Cash on Delivery",
  cashpickup: "Cash on Pickup",
  gcash: "GCash",
  maya: "Maya",
  card: "Credit/Debit Card",
};

