import React, { useState, useMemo, useEffect } from "react";
import type { MenuItem, MenuCategory, PaymentMethod, OrderType } from "@/types";
import { MenuCategory as MenuCategoryEnum, PaymentMethod as PaymentMethodEnum, OrderType as OrderTypeEnum } from "@/types";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { formatCurrency, formatMinutes, cn } from "@/lib/utils";
import { cardUrl } from "@/lib/cloudinary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import OrderHistory from "./OrderHistory";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  MinusIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  LockClosedIcon,
  ListBulletIcon,
  Squares2X2Icon,
  ArrowRightStartOnRectangleIcon,
  StarIcon,
  BeakerIcon,
} from "@heroicons/react/24/outline";
import { FireIcon } from "@heroicons/react/24/solid";

const CATEGORIES: MenuCategory[] = [
  MenuCategoryEnum.RICE_MEALS,
  MenuCategoryEnum.ALA_CARTE,
  MenuCategoryEnum.POBLA_SPECIALS,
  MenuCategoryEnum.BURGERS,
  MenuCategoryEnum.SANDWICHES,
  MenuCategoryEnum.CHILLERS,
  MenuCategoryEnum.ADD_ONS,
];

// Heroicons per category
const CAT_ICON: Record<MenuCategory, React.ReactNode> = {
  [MenuCategoryEnum.RICE_MEALS]: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15m-6.75-12.891c-.501-.05-.75-.082-.75-.082M5 14.5l-1.22 1.22a2.25 2.25 0 000 3.182l.696.696a2.25 2.25 0 003.182 0l.696-.696a2.25 2.25 0 000-3.182L5 14.5zm14.8.5l-1.22 1.22a2.25 2.25 0 010 3.182l-.696.696a2.25 2.25 0 01-3.182 0l-.696-.696a2.25 2.25 0 010-3.182L19.8 15z" /></svg>,
  [MenuCategoryEnum.ALA_CARTE]: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0L3 18m0-13.5h18" /></svg>,
  [MenuCategoryEnum.POBLA_SPECIALS]: <StarIcon className="w-4 h-4" />,
  [MenuCategoryEnum.BURGERS]: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" /></svg>,
  [MenuCategoryEnum.SANDWICHES]: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M12 17.25h8.25" /></svg>,
  [MenuCategoryEnum.CHILLERS]: <BeakerIcon className="w-4 h-4" />,
  [MenuCategoryEnum.ADD_ONS]: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>,
};

const CAT_BG: Record<MenuCategory, string> = {
  [MenuCategoryEnum.RICE_MEALS]: "bg-amber-50",
  [MenuCategoryEnum.ALA_CARTE]: "bg-orange-50",
  [MenuCategoryEnum.POBLA_SPECIALS]: "bg-red-50",
  [MenuCategoryEnum.BURGERS]: "bg-yellow-50",
  [MenuCategoryEnum.SANDWICHES]: "bg-lime-50",
  [MenuCategoryEnum.CHILLERS]: "bg-blue-50",
  [MenuCategoryEnum.ADD_ONS]: "bg-purple-50",
};

type PageTab = "menu" | "orders";

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-border overflow-hidden animate-pulse">
      <div className="aspect-video bg-muted" />
      <div className="p-4 space-y-2">
        <div className="h-4 bg-muted rounded w-2/3" />
        <div className="h-3 bg-muted rounded w-full" />
        <div className="h-3 bg-muted rounded w-1/2" />
        <div className="h-8 bg-muted rounded-xl mt-3" />
      </div>
    </div>
  );
}

function MenuItemCard({ item, onGuestClick }: { item: MenuItem; onGuestClick: () => void }) {
  const { state, dispatch } = useApp();
  const { user, isGuest } = useAuth();
  const isLoggedIn = !!user && !isGuest;

  const cartItem = state.cart.items.find((i) => i.menuItem.id === item.id);
  const qty = cartItem?.quantity ?? 0;
  const isBest = item.tags.includes("bestseller");

  const add = () => {
    if (!isLoggedIn) { onGuestClick(); return; }
    dispatch({ type: "ADD_TO_CART", payload: { menuItem: item, quantity: 1 } });
  };
  const inc = () => dispatch({ type: "UPDATE_CART_ITEM", payload: { menuItemId: item.id, quantity: qty + 1 } });
  const dec = () => dispatch({ type: "UPDATE_CART_ITEM", payload: { menuItemId: item.id, quantity: qty - 1 } });

  const displayTags = item.tags.filter(tag => tag !== "bestseller");

  return (
    <Card className={cn(
      "overflow-hidden transition-all duration-200 group flex flex-col",
      !item.available && "opacity-55",
      qty > 0 && "ring-2 ring-brand/30 border-brand/40",
    )}>
      {/* Image */}
      <div className={cn("relative w-full aspect-video overflow-hidden", !item.imageUrl && CAT_BG[item.category])}>
        {item.imageUrl ? (
          <img src={cardUrl(item.imageUrl)} alt={item.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <span className="text-muted-foreground/40 scale-150">{CAT_ICON[item.category]}</span>
            <span className="text-xs text-muted-foreground/60">No photo yet</span>
          </div>
        )}

        {isBest && (
          <div className="absolute top-2 left-2">
            <Badge className="bg-brand text-white border-0 gap-0.5 shadow-md text-[10px]">
              <FireIcon className="w-2.5 h-2.5" /> BESTSELLER
            </Badge>
          </div>
        )}

        {!item.available && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center">
            <Badge variant="secondary" className="font-semibold">Unavailable</Badge>
          </div>
        )}

        <div className="absolute bottom-2 right-2">
          <span className="font-display font-black text-sm bg-brand-dark text-white px-2.5 py-1 rounded-xl shadow-lg">
            {formatCurrency(item.price)}
          </span>
        </div>
      </div>

      <CardContent className="p-4 flex flex-col flex-1">
        <h3 className="font-display font-bold text-sm text-foreground mb-1">{item.name}</h3>
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed flex-1">{item.description}</p>

        {/* Tags display */}
        {displayTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2 mb-2">
            {displayTags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px] capitalize bg-brand/10 text-brand/80 border-0">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3 mt-2 mb-3">
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <ClockIcon className="w-3 h-3" />
            {formatMinutes(item.preparationTime)}
          </span>
          {item.available
            ? <span className="inline-flex items-center gap-1 text-[11px] text-green-600">
              <CheckCircleIcon className="w-3 h-3" />Available
            </span>
            : <span className="inline-flex items-center gap-1 text-[11px] text-destructive">
              <XCircleIcon className="w-3 h-3" />Unavailable
            </span>
          }
        </div>

        {item.available && (
          isLoggedIn ? (
            qty === 0 ? (
              <Button variant="outline" size="sm" onClick={add} className="w-full">
                <PlusIcon className="w-3.5 h-3.5" /> Add to cart
              </Button>
            ) : (
              <div className="flex items-center justify-between bg-brand/5 rounded-xl p-1">
                <button onClick={dec} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-border text-brand hover:bg-brand hover:text-white transition-all active:scale-90">
                  <MinusIcon className="w-4 h-4" />
                </button>
                <span className="font-display font-black text-brand text-sm min-w-[24px] text-center">{qty}</span>
                <button onClick={inc} className="w-8 h-8 flex items-center justify-center rounded-lg bg-brand text-white hover:bg-brand/90 transition-all active:scale-90">
                  <PlusIcon className="w-4 h-4" />
                </button>
              </div>
            )
          ) : (
            <button onClick={onGuestClick}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-muted-foreground border border-dashed border-border hover:border-brand/40 hover:text-brand transition-all">
              <LockClosedIcon className="w-3 h-3" /> Login to order
            </button>
          )
        )}
      </CardContent>
    </Card>
  );
}

export default function CustomerMenu({ onOpenCart, onLoginClick }: { onOpenCart: () => void; onLoginClick?: () => void }) {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<MenuCategory | "All">("All");
  const [activeTab, setActiveTab] = useState<PageTab>("menu");
  const [guestBanner, setGuestBanner] = useState(false);
  const { state, dispatch } = useApp();
  const { user, isGuest, exitGuest } = useAuth();
  const isLoggedIn = !!user && !isGuest;
  const { menuItems, menuLoading, menuError } = state;

  useEffect(() => {
    if (state.cart.orderType === OrderTypeEnum.PICKUP && state.cart.paymentMethod === PaymentMethodEnum.CASHPICKUP) {
      dispatch({ type: "SET_PAYMENT_METHOD", payload: PaymentMethodEnum.CASHPICKUP });
    }
  }, [state.cart.orderType, dispatch]);

  const filtered = useMemo(() =>
    menuItems.filter((item) => {
      if (!query.trim()) {
        return cat === "All" || item.category === cat;
      }

      const searchTerm = query.toLowerCase().trim();
      const nameMatch = item.name.toLowerCase().includes(searchTerm);
      const descMatch = item.description.toLowerCase().includes(searchTerm);
      const tagMatch = item.tags.some((t) => t.toLowerCase().includes(searchTerm));
      const categoryMatch = cat === "All" || item.category === cat;

      return categoryMatch && (nameMatch || descMatch || tagMatch);
    }), [menuItems, query, cat]);

  const grouped = useMemo(() => {
    const g: Partial<Record<MenuCategory, MenuItem[]>> = {};
    (cat === "All" ? CATEGORIES : [cat as MenuCategory]).forEach((c) => {
      const items = filtered.filter((i) => i.category === c);
      if (items.length) g[c] = items;
    });
    return g;
  }, [filtered, cat]);

  function showGuestBanner() {
    setGuestBanner(true);
    setTimeout(() => setGuestBanner(false), 4000);
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl p-6 text-white" style={{ background: "#3b3130" }}>
        <div className="absolute -right-8 -top-8 w-48 h-48 rounded-full" style={{ background: "rgba(188,93,93,0.12)" }} />
        <div className="absolute right-10 -bottom-6 w-28 h-28 rounded-full" style={{ background: "rgba(188,93,93,0.08)" }} />
        <div className="relative z-10">
          <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: "#bc5d5d" }}>
            POBLACION PARES ATBP.
          </p>
          <h1 className="font-display font-black text-3xl leading-tight mb-2">
            Order fresh.<br />Pick your <span style={{ color: "#bc5d5d" }}>pares.</span>
          </h1>
          <p className="text-sm text-white/50">
            {isGuest ? "Browsing as guest — Login to place orders" : "Authentic Filipino cuisine • Free delivery over ₱500"}
          </p>
        </div>
      </div>

      {/* Guest banner */}
      {isGuest && (
        <div className="flex items-center gap-3 p-4 rounded-2xl text-sm"
          style={{ background: "rgba(188,93,93,0.08)", border: "1px solid rgba(188,93,93,0.2)" }}>
          <LockClosedIcon className="w-4 h-4 text-brand shrink-0" />
          <span className="text-foreground flex-1">Browse only mode. Login to add items to cart and place orders.</span>
          <button onClick={onLoginClick ?? exitGuest} className="flex items-center gap-1.5 text-xs font-bold text-brand hover:text-brand/70 whitespace-nowrap">
            <ArrowRightStartOnRectangleIcon className="w-3.5 h-3.5" /> Login now
          </button>
        </div>
      )}

      {/* Click-to-order toast */}
      {guestBanner && (
        <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-2xl text-sm text-amber-700">
          <LockClosedIcon className="w-4 h-4 shrink-0" />
          <span className="flex-1">Login required to place an order.</span>
          <button onClick={onLoginClick ?? exitGuest} className="text-xs font-bold text-brand flex items-center gap-1">
            <ArrowRightStartOnRectangleIcon className="w-3.5 h-3.5" /> Login
          </button>
        </div>
      )}

      {/* Page tabs */}
      {isLoggedIn && (
        <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit">
          {([
            { id: "menu" as PageTab, label: "Menu", icon: <Squares2X2Icon className="w-4 h-4" /> },
            { id: "orders" as PageTab, label: "My Orders", icon: <ListBulletIcon className="w-4 h-4" /> },
          ]).map((t) => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
                activeTab === t.id ? "bg-white text-brand shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>
      )}

      {/* Order History tab */}
      {activeTab === "orders" && isLoggedIn && <OrderHistory onReorder={onOpenCart} />}

      {/* Menu tab */}
      {activeTab === "menu" && (
        <>
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand" />
            <Input
              placeholder="Search dishes by name, description, or tags..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 h-11 rounded-2xl"
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <XCircleIcon className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category filter */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button onClick={() => setCat("All")}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all border",
                cat === "All" ? "bg-brand text-white border-brand shadow-sm" : "bg-white text-foreground border-border hover:border-brand/30"
              )}>
              <Squares2X2Icon className="w-4 h-4" /> All
            </button>
            {CATEGORIES.map((c) => (
              <button key={c} onClick={() => setCat(c)}
                className={cn(
                  "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all border",
                  cat === c ? "bg-brand text-white border-brand shadow-sm" : "bg-white text-foreground border-border hover:border-brand/30"
                )}>
                {CAT_ICON[c]}
                {c === MenuCategoryEnum.RICE_MEALS ? "Rice Meals" :
                  c === MenuCategoryEnum.ALA_CARTE ? "Ala Carte" :
                    c === MenuCategoryEnum.POBLA_SPECIALS ? "Pobla Specials" :
                      c === MenuCategoryEnum.BURGERS ? "Burgers" :
                        c === MenuCategoryEnum.SANDWICHES ? "Sandwiches" :
                          c === MenuCategoryEnum.CHILLERS ? "Chillers" : "Add-ons"}
              </button>
            ))}
          </div>

          {/* Error */}
          {menuError && (
            <div className="flex items-center gap-3 p-4 bg-destructive/5 border border-destructive/20 rounded-2xl text-sm text-destructive">
              Failed to load menu: {menuError}
            </div>
          )}

          {/* Loading skeletons */}
          {menuLoading && (
            <div className="space-y-6">
              {CATEGORIES.slice(0, 2).map((c) => (
                <section key={c}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-4 w-4 bg-muted rounded animate-pulse" />
                    <div className="h-4 bg-muted rounded w-28 animate-pulse" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((n) => <SkeletonCard key={n} />)}
                  </div>
                </section>
              ))}
            </div>
          )}

          {/* Search results count */}
          {!menuLoading && query && (
            <p className="text-sm text-muted-foreground">
              Found {filtered.length} result{filtered.length !== 1 ? "s" : ""} for{" "}
              <strong className="text-foreground">"{query}"</strong>
            </p>
          )}

          {/* Menu grouped by category */}
          {!menuLoading && Object.entries(grouped).length > 0 && Object.entries(grouped).map(([category, items]) => (
            <section key={category}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-brand">{CAT_ICON[category as MenuCategory]}</span>
                <h2 className="font-display font-bold text-base text-foreground">{category}</h2>
                <span className="text-xs text-muted-foreground">({items!.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {items!.map((item) => <MenuItemCard key={item.id} item={item} onGuestClick={showGuestBanner} />)}
              </div>
            </section>
          ))}

          {/* Empty state - No results found */}
          {!menuLoading && !menuError && filtered.length === 0 && (
            <div className="text-center py-16">
              <MagnifyingGlassIcon className="w-12 h-12 text-muted mx-auto mb-3" />
              <h3 className="font-display font-bold text-foreground">
                {menuItems.length === 0 ? "No menu items yet" : "No items found"}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {menuItems.length === 0
                  ? "Add items from the Owner Dashboard"
                  : query
                    ? `No items match "${query}". Try a different search term or clear the search.`
                    : "Try a different category"}
              </p>
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="mt-4 text-sm text-brand hover:text-brand/80 underline"
                >
                  Clear search
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}