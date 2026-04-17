import React, {
  createContext, useContext, useReducer, useEffect, type ReactNode,
} from "react";
import type {
  Cart, MenuItem, Order, OrderType, PaymentMethod, UserRole,
} from "@/types";
import { OrderType as OrderTypeEnum, PaymentMethod as PaymentMethodEnum, UserRole as UserRoleEnum } from "@/types";
import { calcDeliveryFee } from "@/lib/utils";
import { subscribeToMenuItems } from "@/lib/menuService";

interface AppState {
  currentRole: UserRole;
  cart: Cart;
  orders: Order[];
  menuItems: MenuItem[];
  menuLoading: boolean;
  menuError: string | null;
}

const initCart: Cart = {
  items: [],
  orderType: OrderTypeEnum.DELIVERY,
  deliveryAddress: "",
  paymentMethod: PaymentMethodEnum.CASH,
};

const initialState: AppState = {
  currentRole: UserRoleEnum.CUSTOMER,
  cart: initCart,
  orders: [],
  menuItems: [],
  menuLoading: true,
  menuError: null,
};

type Action =
  | { type: "SET_ROLE"; payload: UserRole }
  | { type: "ADD_TO_CART"; payload: { menuItem: MenuItem; quantity: number; notes?: string } }
  | { type: "REMOVE_FROM_CART"; payload: string }
  | { type: "UPDATE_CART_ITEM"; payload: { menuItemId: string; quantity: number } }
  | { type: "UPDATE_CART_ITEM_NOTE"; payload: { menuItemId: string; notes: string } }
  | { type: "SET_ORDER_TYPE"; payload: OrderType }
  | { type: "SET_DELIVERY_ADDRESS"; payload: string }
  | { type: "SET_PAYMENT_METHOD"; payload: PaymentMethod }
  | { type: "CLEAR_CART" }
  | { type: "ADD_ORDER"; payload: Order }
  | { type: "UPDATE_ORDER"; payload: Order }
  | { type: "SET_ORDERS"; payload: Order[] }
  | { type: "SET_MENU_ITEMS"; payload: MenuItem[] }
  | { type: "UPDATE_MENU_ITEM"; payload: MenuItem }
  | { type: "SET_MENU_LOADING"; payload: boolean }
  | { type: "SET_MENU_ERROR"; payload: string | null };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_ROLE":
      return { ...state, currentRole: action.payload };

    case "ADD_TO_CART": {
      const { menuItem, quantity, notes } = action.payload;
      const existing = state.cart.items.find(i => i.menuItem.id === menuItem.id);
      const items = existing
        ? state.cart.items.map(i =>
          i.menuItem.id === menuItem.id
            ? { ...i, quantity: i.quantity + quantity }
            : i
        )
        : [...state.cart.items, { menuItem, quantity, notes }];
      return { ...state, cart: { ...state.cart, items } };
    }

    case "REMOVE_FROM_CART":
      return {
        ...state,
        cart: { ...state.cart, items: state.cart.items.filter(i => i.menuItem.id !== action.payload) },
      };

    case "UPDATE_CART_ITEM":
      return {
        ...state,
        cart: {
          ...state.cart,
          items: action.payload.quantity <= 0
            ? state.cart.items.filter(i => i.menuItem.id !== action.payload.menuItemId)
            : state.cart.items.map(i =>
              i.menuItem.id === action.payload.menuItemId
                ? { ...i, quantity: action.payload.quantity }
                : i
            ),
        },
      };

    case "UPDATE_CART_ITEM_NOTE":
      return {
        ...state,
        cart: {
          ...state.cart,
          items: state.cart.items.map(i =>
            i.menuItem.id === action.payload.menuItemId
              ? { ...i, notes: action.payload.notes }
              : i
          ),
        },
      };

    case "SET_ORDER_TYPE":
      return { ...state, cart: { ...state.cart, orderType: action.payload } };

    case "SET_DELIVERY_ADDRESS":
      return { ...state, cart: { ...state.cart, deliveryAddress: action.payload } };

    case "SET_PAYMENT_METHOD":
      return { ...state, cart: { ...state.cart, paymentMethod: action.payload } };

    case "CLEAR_CART":
      return { ...state, cart: { ...initCart, orderType: state.cart.orderType } };

    case "ADD_ORDER":
      return { ...state, orders: [action.payload, ...state.orders] };

    case "UPDATE_ORDER":
      return {
        ...state,
        orders: state.orders.map(o => o.id === action.payload.id ? action.payload : o),
      };

    case "SET_ORDERS":
      return { ...state, orders: action.payload };

    case "SET_MENU_ITEMS":
      return { ...state, menuItems: action.payload, menuLoading: false, menuError: null };

    case "UPDATE_MENU_ITEM":
      return {
        ...state,
        menuItems: state.menuItems.map(m => m.id === action.payload.id ? action.payload : m),
      };

    case "SET_MENU_LOADING":
      return { ...state, menuLoading: action.payload };

    case "SET_MENU_ERROR":
      return { ...state, menuError: action.payload, menuLoading: false };

    default:
      return state;
  }
}

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  cartSubtotal: number;
  cartDeliveryFee: number;
  cartTotal: number;
  cartItemCount: number;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Real-time Firestore menu subscription
  useEffect(() => {
    dispatch({ type: "SET_MENU_LOADING", payload: true });
    return subscribeToMenuItems(
      items => dispatch({ type: "SET_MENU_ITEMS", payload: items }),
      err => dispatch({ type: "SET_MENU_ERROR", payload: err.message })
    );
  }, []);

  const cartSubtotal = state.cart.items.reduce((s, i) => s + i.menuItem.price * i.quantity, 0);
  const cartDeliveryFee = calcDeliveryFee(cartSubtotal, state.cart.orderType);
  const cartTotal = cartSubtotal + cartDeliveryFee;
  const cartItemCount = state.cart.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <AppContext.Provider value={{ state, dispatch, cartSubtotal, cartDeliveryFee, cartTotal, cartItemCount }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}