//index
export enum UserRole {
  CUSTOMER = "customer",
  KITCHEN = "kitchen",
  DELIVERY = "delivery",
  OWNER = "owner"
}

export enum MenuCategory {
  RICE_MEALS = "Rice Meals",
  ALA_CARTE = "Ala Carte",
  POBLA_SPECIALS = "Pobla Specials",
  BURGERS = "Burgers",
  SANDWICHES = "Sandwiches",
  CHILLERS = "Chillers",
  ADD_ONS = "Add-ons"
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: MenuCategory;
  available: boolean;
  preparationTime: number;
  tags: string[];
  imageUrl?: string;
  imagePublicId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Status flow:
// pending → confirmed (cashier) → preparing (kitchen) → ready
// → picked_up (rider) → out_for_delivery → delivered
// pickup path: ready → completed
export enum OrderStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  PREPARING = "preparing",
  READY = "ready",
  PICKED_UP = "picked_up",
  OUT_FOR_DELIVERY = "out_for_delivery",
  DELIVERED = "delivered",
  COMPLETED = "completed",
  CANCELLED = "cancelled"
}

export enum PaymentMethod {
  CASH = "cash",
  CASHPICKUP = "cashpickup",
  GCASH = "gcash",
  MAYA = "maya",
  CARD = "card"
}

export enum PaymentStatus {
  PENDING = "pending",
  PAID = "paid",
  FAILED = "failed",
  REFUNDED = "refunded"
}

export enum OrderType {
  DELIVERY = "delivery",
  PICKUP = "pickup"
}

export enum VehicleType {
  MOTORCYCLE = "motorcycle",
  BICYCLE = "bicycle",
  CAR = "car"
}

export enum RiderRegistrationStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected"
}

// ADDED: User interface
export interface User {
  uid: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  emailVerified: boolean;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  menuItemId: string;
  menuItemName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  notes?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerAddress?: string;
  items: OrderItem[];
  status: OrderStatus;
  orderType: OrderType;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  subtotal: number;
  deliveryFee: number;
  total: number;
  notes?: string;
  assignedRiderId?: string;
  assignedRiderName?: string;
  assignedRiderPhone?: string;
  photoProofUrl?: string;
  estimatedReadyMinutes?: number;
  estimatedDeliveryMinutes?: number;
  confirmedAt?: Date;
  preparedAt?: Date;
  pickedUpAt?: Date;
  deliveredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  readyNotified?: boolean;
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  notes?: string;
}

export interface Cart {
  items: CartItem[];
  orderType: OrderType;
  deliveryAddress: string;
  paymentMethod: PaymentMethod;
}

export interface RiderRegistration {
  id: string;
  uid: string;
  name: string;
  email: string;
  phone: string;
  vehicleType: VehicleType;
  plateNumber: string;
  status: RiderRegistrationStatus;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}