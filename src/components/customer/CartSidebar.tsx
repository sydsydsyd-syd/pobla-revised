import React, { useState, useEffect } from "react";
import type { Order, OrderItem, OrderType, PaymentMethod } from "@/types";
import { OrderStatus, PaymentStatus } from "@/types";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { saveOrder } from "@/lib/orderService";
import { sendOrderConfirmation } from "@/lib/emailService";
import {
  formatCurrency, formatMinutes, generateOrderNumber, PAYMENT_LABEL,
  FREE_DELIVERY_THRESHOLD, calcEstimatedReadyMinutes, DELIVERY_ETA_MINUTES, cn,
} from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  ShoppingCartIcon, XMarkIcon, TrashIcon, PlusIcon, MinusIcon,
  TruckIcon, BuildingStorefrontIcon, ArrowLeftIcon, CheckCircleIcon,
  BanknotesIcon, CreditCardIcon, HomeIcon, PhoneIcon, UserIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";

type Step = "cart" | "delivery" | "payment" | "confirm" | "receipt";
const STEPS: Step[] = ["cart", "delivery", "payment", "confirm"];
const STEP_LABEL: Record<Step, string> = { cart: "Cart", delivery: "Delivery", payment: "Payment", confirm: "Confirm", receipt: "Done" };
const PREV: Partial<Record<Step, Step>> = { delivery: "cart", payment: "delivery", confirm: "payment" };

function StepBar({ step, orderType }: { step: Step; orderType: OrderType }) {
  if (step === "receipt") return null;
  const current = STEPS.indexOf(step);

  const getStepLabel = (s: Step) => {
    if (s === "delivery") {
      return orderType === "pickup" ? "Pickup" : "Delivery";
    }
    return STEP_LABEL[s];
  };

  return (
    <div className="flex items-center justify-center gap-1 py-3 px-4 border-b border-border">
      {STEPS.map((s, i) => (
        <React.Fragment key={s}>
          <div className="flex items-center gap-1">
            <div className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border-2 transition-all",
              i < current ? "bg-brand border-brand text-white" :
                i === current ? "border-brand text-brand bg-brand/5" :
                  "border-border text-muted-foreground"
            )}>
              {i < current ? <CheckCircleIcon className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <span className={cn("text-[10px] font-semibold hidden sm:inline", i <= current ? "text-brand" : "text-muted-foreground")}>
              {getStepLabel(s)}
            </span>
          </div>
          {i < STEPS.length - 1 && <div className={cn("h-px w-5 transition-all", i < current ? "bg-brand" : "bg-border")} />}
        </React.Fragment>
      ))}
    </div>
  );
}

const getAvailablePaymentMethods = (orderType: OrderType) => {
  if (orderType === "delivery") {
    return [
      { id: "cash" as PaymentMethod, label: "Cash on Delivery", desc: "Pay when your order arrives", icon: <BanknotesIcon className="w-5 h-5" /> },
    ];
  } else {
    return [
      { id: "cashpickup" as PaymentMethod, label: "Cash on Pickup", desc: "Pay when you pickup your order", icon: <BuildingStorefrontIcon className="w-5 h-5" /> },
    ];
  }
};

function ItemNoteEditor({ itemId, value, onChange }: { itemId: string; value?: string; onChange: (id: string, note: string) => void }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState(value ?? "");

  return (
    <div className="mt-1">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className={cn(
            "text-xs flex items-center gap-1 transition-colors",
            note ? "text-amber-600 font-medium" : "text-muted-foreground hover:text-brand"
          )}
        >
          <PencilSquareIcon className="w-3 h-3" />
          {note ? `Note: ${note}` : "Add customization"}
        </button>
      ) : (
        <div className="space-y-1">
          <input
            autoFocus
            type="text" value={note}
            onChange={e => setNote(e.target.value)}
            onBlur={() => { onChange(itemId, note); setOpen(false); }}
            onKeyDown={e => { if (e.key === "Enter") { onChange(itemId, note); setOpen(false); } }}
            placeholder="e.g. Extra sauce, Less spicy..."
            className="w-full text-xs border border-amber-300 rounded-lg px-2 py-1 bg-amber-50 focus:outline-none focus:ring-1 focus:ring-amber-400"
          />
          <p className="text-[10px] text-muted-foreground">Press Enter to save</p>
        </div>
      )}
    </div>
  );
}

export default function CartSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, dispatch, cartSubtotal, cartDeliveryFee, cartTotal } = useApp();
  const { user, userProfile, isGuest } = useAuth();

  const [step, setStep] = useState<Step>("cart");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [phoneError, setPhoneError] = useState("");

  const { cart } = state;

  // Auto-fill name from user displayName
  useEffect(() => {
    if (user?.displayName) setName(user.displayName);
  }, [user]);

  // AUTO-FILL NAME, PHONE AND ADDRESS FROM USER PROFILE
  useEffect(() => {
    if (userProfile && !isGuest) {
      // Auto-fill name from profile
      if (userProfile.name) {
        setName(userProfile.name);
      }
      // Auto-fill phone
      if (userProfile.phone) {
        setPhone(userProfile.phone);
        validatePhoneNumber(userProfile.phone);
      }
      // Auto-fill address
      if (userProfile.address) {
        setAddress(userProfile.address);
      }
    }
  }, [userProfile, isGuest]);

  // Auto-select appropriate payment method when order type changes
  useEffect(() => {
    const availableMethods = getAvailablePaymentMethods(cart.orderType);
    const currentMethodIsAvailable = availableMethods.some(m => m.id === cart.paymentMethod);

    if (!currentMethodIsAvailable && availableMethods.length > 0) {
      dispatch({ type: "SET_PAYMENT_METHOD", payload: availableMethods[0].id });
    }
  }, [cart.orderType, cart.paymentMethod, dispatch]);

  function reset() {
    setStep("cart");
    setOrder(null);
  }

  function handleClose() {
    onClose();
    if (step === "receipt") setTimeout(reset, 300);
  }

  function handleItemNote(menuItemId: string, note: string) {
    const item = cart.items.find(i => i.menuItem.id === menuItemId);
    if (!item) return;
    dispatch({
      type: "UPDATE_CART_ITEM_NOTE",
      payload: { menuItemId, notes: note },
    } as any);
  }

  const validatePhoneNumber = (phoneNum: string): boolean => {
    const cleanPhone = phoneNum.replace(/[\s\-\(\)]/g, "");

    if (!cleanPhone) {
      setPhoneError("Phone number is required");
      return false;
    }
    if (!/^\d+$/.test(cleanPhone)) {
      setPhoneError("Phone number must contain only digits");
      return false;
    }
    if (cleanPhone.length !== 11) {
      setPhoneError(`Phone number must be exactly 11 digits (currently ${cleanPhone.length})`);
      return false;
    }
    if (!cleanPhone.startsWith("09")) {
      setPhoneError("Phone number must start with 09");
      return false;
    }

    setPhoneError("");
    return true;
  };

  const getHeaderTitle = () => {
    if (step === "cart") return "Your Cart";
    if (step === "delivery") return cart.orderType === "pickup" ? "Pickup Info" : "Delivery Info";
    if (step === "payment") return "Payment Method";
    if (step === "confirm") return "Confirm Order";
    if (step === "receipt") return "Order Placed!";
    return "";
  };

  const getContinueButtonText = () => {
    if (step === "cart") return `Continue to ${cart.orderType === "pickup" ? "Pickup Info" : "Delivery Info"}`;
    if (step === "delivery") return "Continue to Payment";
    if (step === "payment") return "Review Order";
    return "";
  };

  async function placeOrder() {
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));

    const items: OrderItem[] = cart.items.map(ci => ({
      menuItemId: ci.menuItem.id,
      menuItemName: ci.menuItem.name,
      quantity: ci.quantity,
      unitPrice: ci.menuItem.price,
      subtotal: ci.menuItem.price * ci.quantity,
      ...(ci.notes ? { notes: ci.notes } : {}),
    }));

    const readyMins = calcEstimatedReadyMinutes(
      cart.items.map(ci => ({ preparationTime: ci.menuItem.preparationTime, quantity: ci.quantity }))
    );
    const deliveryMins = readyMins + DELIVERY_ETA_MINUTES;

    const newOrder: Order = {
      id: `order_${Date.now()}`,
      orderNumber: generateOrderNumber(),
      customerId: user?.uid ?? `guest_${Date.now()}`,
      customerName: name || user?.displayName || "Customer",
      customerPhone: phone,
      customerEmail: user?.email ?? undefined,
      ...(address ? { customerAddress: address } : {}),
      items,
      status: OrderStatus.PENDING,
      orderType: cart.orderType,
      paymentMethod: cart.paymentMethod,
      paymentStatus: PaymentStatus.PENDING,
      subtotal: cartSubtotal,
      deliveryFee: cartDeliveryFee,
      total: cartTotal,
      ...(notes ? { notes } : {}),
      estimatedReadyMinutes: readyMins,
      estimatedDeliveryMinutes: deliveryMins,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (user) {
      try {
        const firestoreId = await saveOrder(newOrder, user.uid);
        newOrder.id = firestoreId;
      } catch (err) {
        console.error("[CartSidebar] saveOrder:", err);
      }
      if (user.email) {
        sendOrderConfirmation(newOrder, user.email).catch(e => console.error("[CartSidebar] email:", e));
      }
    }

    dispatch({ type: "ADD_ORDER", payload: newOrder });
    dispatch({ type: "CLEAR_CART" });
    setOrder(newOrder);
    setLoading(false);
    setStep("receipt");
  }

  if (!open) return null;

  const availablePaymentMethods = getAvailablePaymentMethods(cart.orderType);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-brand-dark/50 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative ml-auto w-full max-w-md bg-white h-full flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            {(step !== "cart" && step !== "receipt") && (
              <button onClick={() => setStep(PREV[step]!)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground mr-1">
                <ArrowLeftIcon className="w-4 h-4" />
              </button>
            )}
            <ShoppingCartIcon className="w-5 h-5 text-brand" />
            <h2 className="font-display font-bold text-foreground">
              {getHeaderTitle()}
            </h2>
          </div>
          <button onClick={handleClose} className="p-2 rounded-xl hover:bg-muted text-muted-foreground">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <StepBar step={step} orderType={cart.orderType} />

        <div className="flex-1 overflow-y-auto">

          {/* ── CART ── */}
          {step === "cart" && (
            <div className="p-4 space-y-4">
              {cart.items.length === 0 ? (
                <div className="text-center py-16">
                  <ShoppingCartIcon className="w-16 h-16 text-muted mx-auto mb-3" />
                  <h3 className="font-display font-bold text-foreground mb-1">Cart is empty</h3>
                  <p className="text-sm text-muted-foreground mb-4">Add items from the menu first</p>
                  <Button variant="outline" size="sm" onClick={handleClose}>Browse Menu</Button>
                </div>
              ) : (
                <>
                  <div className="flex gap-1 p-1 bg-muted rounded-xl">
                    {([
                      { v: "delivery", label: "Delivery", icon: <TruckIcon className="w-4 h-4" /> },
                      { v: "pickup", label: "Pickup", icon: <BuildingStorefrontIcon className="w-4 h-4" /> },
                    ] as { v: OrderType; label: string; icon: React.ReactNode }[]).map(o => (
                      <button key={o.v} onClick={() => dispatch({ type: "SET_ORDER_TYPE", payload: o.v })}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-all",
                          cart.orderType === o.v ? "bg-white text-brand shadow-sm" : "text-muted-foreground hover:text-foreground"
                        )}>
                        {o.icon}{o.label}
                      </button>
                    ))}
                  </div>

                  {cart.items.map(ci => (
                    <div key={ci.menuItem.id} className="flex items-start gap-3 p-3 bg-muted/40 rounded-xl">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">{ci.menuItem.name}</p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(ci.menuItem.price)} each</p>
                        <ItemNoteEditor
                          itemId={ci.menuItem.id}
                          value={ci.notes}
                          onChange={handleItemNote}
                        />
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                        <button onClick={() => dispatch({ type: "UPDATE_CART_ITEM", payload: { menuItemId: ci.menuItem.id, quantity: ci.quantity - 1 } })}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-border text-muted-foreground hover:text-brand hover:border-brand/30 transition-all">
                          <MinusIcon className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-sm font-bold text-foreground min-w-[16px] text-center">{ci.quantity}</span>
                        <button onClick={() => dispatch({ type: "UPDATE_CART_ITEM", payload: { menuItemId: ci.menuItem.id, quantity: ci.quantity + 1 } })}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-brand text-white hover:bg-brand/90 transition-all">
                          <PlusIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-bold text-brand">{formatCurrency(ci.menuItem.price * ci.quantity)}</p>
                        <button onClick={() => dispatch({ type: "REMOVE_FROM_CART", payload: ci.menuItem.id })}
                          className="text-muted-foreground hover:text-destructive transition-colors mt-1">
                          <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {cart.orderType === "delivery" && (
                    <div className={cn("rounded-xl p-3 text-xs font-medium",
                      cartSubtotal >= FREE_DELIVERY_THRESHOLD ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700")}>
                      {cartSubtotal >= FREE_DELIVERY_THRESHOLD
                        ? " You qualify for free delivery!"
                        : `Add ${formatCurrency(FREE_DELIVERY_THRESHOLD - cartSubtotal)} more for free delivery`}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── DELIVERY INFO / PICKUP INFO ── */}
          {step === "delivery" && (
            <div className="p-4 space-y-4">
              <div className="space-y-1.5">
                <Label>Full Name</Label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Juan dela Cruz"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {userProfile?.name && !isGuest && name === userProfile.name && (
                  <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                    <CheckCircleIcon className="w-3 h-3" />
                    Auto-filled from your profile
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Phone Number</Label>
                <div className="relative">
                  <PhoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="tel"
                    placeholder="09123456789"
                    value={phone}
                    onChange={e => {
                      const value = e.target.value.replace(/\D/g, "");
                      const limited = value.slice(0, 11);
                      setPhone(limited);
                      if (limited) {
                        validatePhoneNumber(limited);
                      } else {
                        setPhoneError("");
                      }
                    }}
                    className={cn("pl-9", phoneError && "border-red-500 focus:ring-red-500")}
                  />
                </div>
                {userProfile?.phone && !isGuest && phone === userProfile.phone && (
                  <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                    <CheckCircleIcon className="w-3 h-3" />
                    Auto-filled from your profile
                  </p>
                )}
                {phoneError && (
                  <p className="text-xs text-red-500 mt-1">{phoneError}</p>
                )}
                <p className="text-xs text-muted-foreground">Enter 11-digit mobile number (e.g., 09123456789)</p>
              </div>

              {cart.orderType === "delivery" && (
                <div className="space-y-1.5">
                  <Label>Delivery Address</Label>
                  <div className="relative">
                    <HomeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Block/Lot, Street, Barangay, City"
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  {userProfile?.address && !isGuest && address === userProfile.address && (
                    <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                      <CheckCircleIcon className="w-3 h-3" />
                      Auto-filled from your profile
                    </p>
                  )}
                </div>
              )}

              {cart.orderType === "pickup" && (
                <div className="space-y-1.5">
                  <Label>Pickup Location</Label>
                  <div className="relative">
                    <BuildingStorefrontIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value="Poblacion Pares ATBP. - Olaveria St., Mogpog, Marinduque"
                      disabled
                      className="pl-9 bg-muted/40 text-muted-foreground"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">We'll notify you when your order is ready for pickup.</p>
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Special Instructions (optional)</Label>
                <Textarea
                  placeholder={cart.orderType === "pickup" ? "Any notes for the kitchen..." : "Any notes for the kitchen or rider..."}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* ── PAYMENT ── */}
          {step === "payment" && (
            <div className="p-4 space-y-3">
              <p className="text-sm font-semibold text-foreground mb-2">Select Payment Method</p>
              {availablePaymentMethods.map(pm => (
                <button key={pm.id}
                  onClick={() => dispatch({ type: "SET_PAYMENT_METHOD", payload: pm.id })}
                  className={cn(
                    "w-full flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all",
                    cart.paymentMethod === pm.id ? "border-brand bg-brand/5" : "border-border hover:border-border/60"
                  )}>
                  <span className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    cart.paymentMethod === pm.id ? "bg-brand/10 text-brand" : "bg-muted text-muted-foreground"
                  )}>
                    {pm.icon}
                  </span>
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-foreground">{pm.label}</p>
                    <p className="text-xs text-muted-foreground">{pm.desc}</p>
                  </div>
                  {cart.paymentMethod === pm.id && <CheckCircleIcon className="w-5 h-5 text-brand" />}
                </button>
              ))}

              {cart.orderType === "delivery" && (
                <div className="mt-3 text-xs text-center text-muted-foreground bg-blue-50 p-2 rounded-lg">
                  💡 Cash on Delivery is available for delivery orders
                </div>
              )}
              {cart.orderType === "pickup" && (
                <div className="mt-3 text-xs text-center text-muted-foreground bg-blue-50 p-2 rounded-lg">
                  💡 Cash on Pickup is available for pickup orders
                </div>
              )}
            </div>
          )}

          {/* ── CONFIRM ── */}
          {step === "confirm" && (
            <div className="p-4 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs font-medium text-amber-700">
                Please review your order before placing it.
              </div>
              <div className="space-y-2">
                <Label>Order Items</Label>
                {cart.items.map(ci => (
                  <div key={ci.menuItem.id}>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{ci.menuItem.name} × {ci.quantity}</span>
                      <span className="font-semibold text-foreground">{formatCurrency(ci.menuItem.price * ci.quantity)}</span>
                    </div>
                    {ci.notes && <p className="text-xs text-amber-600 italic ml-2">→ {ci.notes}</p>}
                  </div>
                ))}
              </div>
              <Separator />
              <div className="space-y-1.5 text-sm">
                {name && <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span className="font-medium">{name}</span></div>}
                {phone && <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span className="font-medium">{phone}</span></div>}
                {cart.orderType === "delivery" && address && <div className="flex justify-between"><span className="text-muted-foreground">Address</span><span className="font-medium text-right max-w-[55%]">{address}</span></div>}
                {cart.orderType === "pickup" && <div className="flex justify-between"><span className="text-muted-foreground">Pickup Location</span><span className="font-medium text-right max-w-[55%]">Poblacion Pares ATBP. Restaurant</span></div>}
                <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="font-medium capitalize">{cart.orderType}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Payment</span><span className="font-medium">{PAYMENT_LABEL[cart.paymentMethod]}</span></div>
              </div>
              {notes && (
                <div className="bg-muted/40 rounded-xl p-2 text-xs text-muted-foreground"> {notes}</div>
              )}
            </div>
          )}

          {/* ── RECEIPT ── */}
          {step === "receipt" && order && (
            <div className="p-4 space-y-4">
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                  <CheckCircleIcon className="w-9 h-9 text-green-600" />
                </div>
                <h3 className="font-display font-black text-xl text-foreground">Order Placed!</h3>
                <p className="text-sm text-muted-foreground mt-1">Awaiting cashier confirmation</p>
              </div>

              <div className="bg-muted/40 rounded-2xl p-4 border border-dashed border-border space-y-3 font-mono">
                <div className="text-center pb-3 border-b border-dashed border-border">
                  <p className="font-display font-black text-foreground">POBLA ORDER HUB</p>
                  <p className="text-[11px] text-muted-foreground">Official Receipt</p>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Order #</span><span className="font-bold text-foreground">{order.orderNumber}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Status</span><span className="font-bold text-amber-600">Pending Confirmation</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>ETA</span>
                  <span>{order.orderType === "pickup"
                    ? `~${formatMinutes(order.estimatedReadyMinutes || 20)} for pickup`
                    : `~${formatMinutes(order.estimatedDeliveryMinutes || 45)} for delivery`}
                  </span>
                </div>
                <Separator />
                {order.items.map(item => (
                  <div key={item.menuItemId}>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{item.menuItemName} ×{item.quantity}</span>
                      <span className="text-foreground">{formatCurrency(item.subtotal)}</span>
                    </div>
                    {item.notes && <p className="text-xs text-amber-600 italic ml-2">→ {item.notes}</p>}
                  </div>
                ))}
                {order.deliveryFee > 0 && (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Delivery fee</span><span>{formatCurrency(order.deliveryFee)}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-base border-t border-dashed border-border pt-2">
                  <span className="font-display">TOTAL</span>
                  <span className="text-brand">{formatCurrency(order.total)}</span>
                </div>
                <p className="text-center text-xs text-muted-foreground pt-1">Thank you for your order! </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
                <p className="font-semibold mb-0.5"> Order submitted</p>
                <p>Check "My Orders" to track your order status in real time.</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {(cart.items.length > 0 || step === "receipt") && (
          <div className="p-4 border-t border-border space-y-3 bg-white">
            {step !== "receipt" && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Subtotal</span><span>{formatCurrency(cartSubtotal)}</span>
                </div>
                {cart.orderType === "delivery" && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Delivery fee</span>
                    <span>{cartDeliveryFee === 0 ? <span className="text-green-600 font-semibold">FREE</span> : formatCurrency(cartDeliveryFee)}</span>
                  </div>
                )}
                <div className="flex justify-between font-display font-black text-base">
                  <span>Total</span><span className="text-brand">{formatCurrency(cartTotal)}</span>
                </div>
              </div>
            )}
            {step === "cart" && (
              <Button
                className="w-full"
                onClick={() => setStep("delivery")}
                disabled={cart.items.length === 0}
              >
                {getContinueButtonText()}
              </Button>
            )}
            {step === "delivery" && (
              <Button
                className="w-full"
                onClick={() => {
                  if (validatePhoneNumber(phone)) {
                    setStep("payment");
                  }
                }}
                disabled={!name || !phone || (cart.orderType === "delivery" && !address) || !!phoneError}
              >
                {getContinueButtonText()}
              </Button>
            )}
            {step === "payment" && (
              <Button className="w-full" onClick={() => setStep("confirm")}>
                {getContinueButtonText()}
              </Button>
            )}
            {step === "confirm" && <Button className="w-full" size="lg" onClick={placeOrder} loading={loading}>{loading ? "Placing Order..." : `Place Order • ${formatCurrency(cartTotal)}`}</Button>}
            {step === "receipt" && <Button variant="outline" className="w-full" onClick={handleClose}>Back to Menu</Button>}
          </div>
        )}
      </div>
    </div>
  );
}