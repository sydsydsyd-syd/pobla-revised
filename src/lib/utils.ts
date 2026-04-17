import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { MenuItem, OrderStatus, PaymentMethod } from "@/types";
import { OrderStatus as OrderStatusEnum, PaymentMethod as PaymentMethodEnum } from "@/types";

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

/**
 * Format minutes into a human-readable string
 * @param minutes - Number of minutes
 * @returns Formatted string (e.g., "1h 30m", "45m", "2h")
 * 
 * @example
 * formatMinutes(30) // "30m"
 * formatMinutes(60) // "1h"
 * formatMinutes(90) // "1h 30m"
 * formatMinutes(120) // "2h"
 * formatMinutes(125) // "2h 5m"
 */
export function formatMinutes(minutes: number): string {
  if (minutes <= 0) return "0m";

  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${remainingMinutes}m`;
  }
  return `${minutes}m`;
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

// Updated ORDER_STATUS_LABEL using enums as keys
export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  [OrderStatusEnum.PENDING]: "Pending",
  [OrderStatusEnum.CONFIRMED]: "Confirmed",
  [OrderStatusEnum.PREPARING]: "Preparing",
  [OrderStatusEnum.READY]: "Ready",
  [OrderStatusEnum.PICKED_UP]: "Picked Up",
  [OrderStatusEnum.OUT_FOR_DELIVERY]: "Out for Delivery",
  [OrderStatusEnum.DELIVERED]: "Delivered",
  [OrderStatusEnum.COMPLETED]: "Completed",
  [OrderStatusEnum.CANCELLED]: "Cancelled",
};

// Updated ORDER_STATUS_CLASS using enums as keys
export const ORDER_STATUS_CLASS: Record<OrderStatus, string> = {
  [OrderStatusEnum.PENDING]: "bg-gray-100 text-gray-700 border-gray-200",
  [OrderStatusEnum.CONFIRMED]: "bg-blue-100 text-blue-800 border-blue-200",
  [OrderStatusEnum.PREPARING]: "bg-orange-100 text-orange-800 border-orange-200",
  [OrderStatusEnum.READY]: "bg-purple-100 text-purple-800 border-purple-200",
  [OrderStatusEnum.PICKED_UP]: "bg-indigo-100 text-indigo-800 border-indigo-200",
  [OrderStatusEnum.OUT_FOR_DELIVERY]: "bg-blue-100 text-blue-800 border-blue-200",
  [OrderStatusEnum.DELIVERED]: "bg-green-100 text-green-800 border-green-200",
  [OrderStatusEnum.COMPLETED]: "bg-green-100 text-green-800 border-green-200",
  [OrderStatusEnum.CANCELLED]: "bg-red-100 text-red-800 border-red-200",
};

// Updated ORDER_STATUS_ICON using enums as keys
export const ORDER_STATUS_ICON: Record<OrderStatus, string> = {
  [OrderStatusEnum.PENDING]: "clock",
  [OrderStatusEnum.CONFIRMED]: "check",
  [OrderStatusEnum.PREPARING]: "fire",
  [OrderStatusEnum.READY]: "plate",
  [OrderStatusEnum.PICKED_UP]: "truck",
  [OrderStatusEnum.OUT_FOR_DELIVERY]: "map",
  [OrderStatusEnum.DELIVERED]: "home",
  [OrderStatusEnum.COMPLETED]: "check",
  [OrderStatusEnum.CANCELLED]: "x",
};

// Updated PAYMENT_LABEL using enums as keys
export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  [PaymentMethodEnum.CASH]: "Cash on Delivery",
  [PaymentMethodEnum.CASHPICKUP]: "Cash on Pickup",
  [PaymentMethodEnum.GCASH]: "GCash",
  [PaymentMethodEnum.MAYA]: "Maya",
  [PaymentMethodEnum.CARD]: "Credit/Debit Card",
};