import React, { useState, useMemo, useEffect, useCallback } from "react";
import type { MenuItem, MenuCategory, OrderStatus, RiderRegistration } from "@/types";
import { MenuCategory as MenuCategoryEnum, OrderStatus as OrderStatusEnum } from "@/types";
import { useApp } from "@/context/AppContext";
import { subscribeToRiderRegistrations, reviewRegistration } from "@/lib/riderService";
import { formatCurrency, ORDER_STATUS_LABEL, cn } from "@/lib/utils";
import { thumbUrl } from "@/lib/cloudinary";
import {
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleAvailability,
} from "@/lib/menuService";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AppRole } from "@/lib/authService";
import ImageUpload from "@/components/ui/image-upload";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  PhotoIcon,
  ShoppingBagIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  CheckCircleIcon,
  TagIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
  UsersIcon,
  UserCircleIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  TruckIcon,
  XMarkIcon,
  InboxIcon,
} from "@heroicons/react/24/outline";
import OwnerOrderHistory from "./OwnerOrderHistory";
import { sendRiderApprovalEmail, sendRiderRejectionEmail } from "@/lib/emailService";

const CATEGORIES: MenuCategory[] = [
  MenuCategoryEnum.RICE_MEALS,
  MenuCategoryEnum.ALA_CARTE,
  MenuCategoryEnum.POBLA_SPECIALS,
  MenuCategoryEnum.BURGERS,
  MenuCategoryEnum.SANDWICHES,
  MenuCategoryEnum.CHILLERS,
  MenuCategoryEnum.ADD_ONS,
];

// ─── Tags Input Component ────────────────────────────────────────────────────

function TagsInput({
  tags,
  onChange,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
}) {
  const [input, setInput] = React.useState("");

  function addTag() {
    const val = input.trim();
    if (!val) return;
    const newTags = val
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t && !tags.includes(t));
    if (newTags.length) onChange([...tags, ...newTags]);
    setInput("");
  }

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    } else if (e.key === "Backspace" && !input && tags.length) {
      onChange(tags.slice(0, -1));
    }
  }

  return (
    <div className="space-y-1.5">
      <Label>Tags</Label>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-brand/10 text-brand border border-brand/20"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="hover:text-destructive transition-colors ml-0.5"
              >
                <XMarkIcon className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Input
          placeholder="e.g. bestseller, spicy, new"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1"
        />
        <button
          type="button"
          onClick={addTag}
          disabled={!input.trim()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: "#bc5d5d" }}
        >
          <PlusIcon className="w-3.5 h-3.5" />
          Add
        </button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Press <kbd className="px-1 py-0.5 rounded bg-muted border text-[10px]">Enter</kbd> or click Add. Separate multiple with commas.
      </p>
    </div>
  );
}

// ─── Menu Management ──────────────────────────────────────────────────────────

function MenuManagement() {
  const { state } = useApp();
  const items = state.menuItems;

  const [filterCat, setFilterCat] = useState<MenuCategory | "All">("All");
  const [editItem, setEditItem] = useState<Partial<MenuItem> | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const filtered = filterCat === "All" ? items : items.filter((i) => i.category === filterCat);

  function openNew() {
    setSaveError(null);
    setEditItem({
      name: "",
      description: "",
      price: 0,
      category: MenuCategoryEnum.RICE_MEALS,
      available: true,
      preparationTime: 15,
      tags: [],
      imageUrl: "",
      imagePublicId: "",
    });
    setDialogOpen(true);
  }

  function openEdit(item: MenuItem) {
    setSaveError(null);
    setEditItem({ ...item });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!editItem?.name?.trim() || !editItem.price) {
      setSaveError("Please fill in the name and price.");
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      if (editItem.id) {
        const { id, createdAt, ...updates } = editItem as MenuItem;
        await updateMenuItem(id, updates);
      } else {
        await addMenuItem({
          name: editItem.name!,
          description: editItem.description || "",
          price: editItem.price!,
          category: editItem.category || MenuCategoryEnum.RICE_MEALS,
          available: editItem.available ?? true,
          preparationTime: editItem.preparationTime || 15,
          tags: editItem.tags || [],
          imageUrl: editItem.imageUrl || "",
          imagePublicId: editItem.imagePublicId || "",
        });
      }
      setDialogOpen(false);
    } catch (err) {
      setSaveError((err as Error).message || "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleAvailable(item: MenuItem) {
    try {
      await toggleAvailability(item.id, !item.available);
    } catch (err) {
      console.error("[OwnerDashboard] toggleAvailability:", err);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this menu item? This cannot be undone.")) return;
    try {
      await deleteMenuItem(id);
    } catch (err) {
      alert("Failed to delete: " + (err as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {state.menuLoading
            ? "Loading..."
            : `${items.length} items · ${items.filter((i) => i.available).length} available`}
        </p>
        <Button size="sm" onClick={openNew}>
          <PlusIcon className="w-4 h-4" />
          Add Item
        </Button>
      </div>

      {state.menuError && (
        <div className="flex items-center gap-2 p-3 bg-destructive/5 border border-destructive/20 rounded-xl text-sm text-destructive">
          <ExclamationTriangleIcon className="w-4 h-4 shrink-0" />
          {state.menuError}
        </div>
      )}

      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {(["All", ...CATEGORIES] as (MenuCategory | "All")[]).map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCat(cat)}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border",
              filterCat === cat
                ? "bg-brand text-white border-brand"
                : "bg-white text-foreground border-border hover:border-brand/30"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                {["Photo", "Item", "Category", "Price", "Available", ""].map((h) => (
                  <th
                    key={h}
                    className={cn(
                      "px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider",
                      h === "" ? "text-right" : "text-left"
                    )}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {state.menuLoading && (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-sm text-muted-foreground">
                    Loading menu from Firebase…
                  </td>
                </tr>
              )}
              {!state.menuLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-sm text-muted-foreground">
                    No items yet. Add a menu item to get started.
                  </td>
                </tr>
              )}
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-muted/20 transition-colors group">
                  <td className="px-4 py-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-muted flex items-center justify-center shrink-0">
                      {item.imageUrl ? (
                        <img
                          src={thumbUrl(item.imageUrl)}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <PhotoIcon className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary" className="text-xs">
                      {item.category}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-display font-bold text-brand">
                    {formatCurrency(item.price)}
                  </td>
                  <td className="px-4 py-3">
                    <Switch checked={item.available} onCheckedChange={() => handleToggleAvailable(item)} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEdit(item)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-brand hover:bg-brand/5 transition-all"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editItem?.id ? "Edit Menu Item" : "Add Menu Item"}
            </DialogTitle>
          </DialogHeader>
          {editItem && (
            <div className="space-y-4">
              <ImageUpload
                label="Food Photo" value={editItem.imageUrl || ""}
                onChange={(url) => setEditItem((p) => ({ ...p, imageUrl: url }))}
                onPublicId={(id) => setEditItem((p) => ({ ...p, imagePublicId: id }))}
                folder="pobla-menu" aspectRatio="landscape"
              />
              <div className="space-y-1.5">
                <Label>Item Name</Label>
                <Input
                  placeholder="e.g. Adobo sa Gata" value={editItem.name || ""}
                  onChange={(e) => setEditItem((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea
                  placeholder="Brief description of the dish..." value={editItem.description || ""}
                  onChange={(e) => setEditItem((p) => ({ ...p, description: e.target.value }))}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Price (₱)</Label>
                  <Input
                    type="number" min={0}
                    value={editItem.price || ""}
                    onChange={(e) => setEditItem((p) => ({ ...p, price: parseFloat(e.target.value) }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Prep Time (min)</Label>
                  <Input
                    type="number" min={1}
                    value={editItem.preparationTime || ""}
                    onChange={(e) => setEditItem((p) => ({ ...p, preparationTime: parseInt(e.target.value) }))}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select
                  value={editItem.category || MenuCategoryEnum.RICE_MEALS}
                  onValueChange={(v) => setEditItem((p) => ({ ...p, category: v as MenuCategory }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <TagsInput tags={editItem.tags || []} onChange={(tags) => setEditItem((p) => ({ ...p, tags }))} />
              <div className="flex items-center justify-between p-3 bg-muted/40 rounded-xl">
                <div>
                  <p className="text-sm font-semibold text-foreground">Available</p>
                  <p className="text-xs text-muted-foreground">Show item on the menu</p>
                </div>
                <Switch
                  checked={editItem.available ?? true}
                  onCheckedChange={(v) => setEditItem((p) => ({ ...p, available: v }))}
                />
              </div>
              {saveError && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                  {saveError}
                </p>
              )}
              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleSave} disabled={saving}>
                  {saving ? "Sine-save…" : editItem.id ? "Save Changes" : "Add Item"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Reports ──────────────────────────────────────────────────────────────────

function Reports() {
  const [orders, setOrders] = useState<import("@/types").Order[]>([]);
  const [loading, setLoading] = useState(true);

  const getDisplayStatus = (order: import("@/types").Order): string => {
    if (order.status === OrderStatusEnum.COMPLETED) {
      return order.orderType === "pickup" ? "Picked Up" : "Completed";
    }
    return ORDER_STATUS_LABEL[order.status];
  };

  const getStatusVariant = (order: import("@/types").Order): "success" | "destructive" | "secondary" => {
    if (order.status === OrderStatusEnum.DELIVERED || (order.status === OrderStatusEnum.COMPLETED && order.orderType === "delivery")) return "success";
    if (order.status === OrderStatusEnum.COMPLETED && order.orderType === "pickup") return "success";
    if (order.status === OrderStatusEnum.CANCELLED) return "destructive";
    return "secondary";
  };

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "orders"),
      (snap) => {
        const list = snap.docs.map((d) => {
          const data = d.data();
          return {
            ...(data as Omit<import("@/types").Order, "id" | "createdAt" | "updatedAt">),
            id: d.id,
            createdAt: data.createdAt?.toDate?.() ?? new Date(),
            updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
          } as import("@/types").Order;
        });
        list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setOrders(list);
        setLoading(false);
      },
      (err) => {
        console.error("[Reports] fetch error:", err);
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  const stats = useMemo(() => {
    // FIXED: Only include delivered and completed orders for revenue (matches OwnerOrderHistory)
    const deliveredAndCompleted = orders.filter(o =>
      o.status === OrderStatusEnum.DELIVERED || o.status === OrderStatusEnum.COMPLETED
    );

    const revenue = deliveredAndCompleted.reduce((s, o) => s + o.total, 0);
    const delivered = orders.filter(o => o.status === OrderStatusEnum.DELIVERED).length;
    const completed = orders.filter(o => o.status === OrderStatusEnum.COMPLETED).length;
    const avg = deliveredAndCompleted.length > 0 ? revenue / deliveredAndCompleted.length : 0;

    const itemMap: Record<string, { name: string; qty: number; rev: number }> = {};
    orders.forEach((o) =>
      o.items.forEach((i) => {
        if (!itemMap[i.menuItemId])
          itemMap[i.menuItemId] = { name: i.menuItemName, qty: 0, rev: 0 };
        itemMap[i.menuItemId].qty += i.quantity;
        itemMap[i.menuItemId].rev += i.subtotal;
      })
    );
    const topItems = Object.values(itemMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    const pickupCompleted = orders.filter(o => o.status === OrderStatusEnum.COMPLETED && o.orderType === "pickup").length;
    const deliveryCompleted = orders.filter(o => o.status === OrderStatusEnum.COMPLETED && o.orderType === "delivery").length;

    const byStatus: Partial<Record<string, number>> = {};
    orders.forEach((o) => {
      if (o.status === OrderStatusEnum.COMPLETED) {
        return;
      }
      byStatus[o.status] = (byStatus[o.status] || 0) + 1;
    });

    if (pickupCompleted > 0) byStatus["picked_up"] = pickupCompleted;
    if (deliveryCompleted > 0) byStatus["completed"] = deliveryCompleted;

    return {
      total: orders.length,
      revenue,
      delivered,
      completed,
      avg,
      topItems,
      byStatus,
      pickupCompleted,
      deliveryCompleted
    };
  }, [orders]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(n => (
          <div key={n} className="rounded-2xl border border-border p-4 h-24 animate-pulse bg-muted/30" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Orders", val: stats.total.toString(), icon: <ShoppingBagIcon className="w-5 h-5" />, cls: "bg-blue-50 text-blue-600" },
          { label: "Total Revenue", val: formatCurrency(stats.revenue), icon: <CurrencyDollarIcon className="w-5 h-5" />, cls: "bg-green-50 text-green-600" },
          { label: "Fulfilled", val: (stats.delivered + stats.completed).toString(), icon: <CheckCircleIcon className="w-5 h-5" />, cls: "bg-brand/5 text-brand" },
          { label: "Avg Order Value", val: formatCurrency(stats.avg), icon: <ArrowTrendingUpIcon className="w-5 h-5" />, cls: "bg-purple-50 text-purple-600" },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-4">
              <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center mb-2", kpi.cls)}>
                {kpi.icon}
              </div>
              <p className="font-display font-black text-xl text-foreground">{kpi.val}</p>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <TagIcon className="w-4 h-4 text-brand" />
              Top Selling Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.topItems.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No orders yet</p>
            ) : (
              stats.topItems.map((item, i) => (
                <div key={item.name} className="flex items-center gap-2 py-2 border-b border-border last:border-0">
                  <span className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0",
                    i === 0 ? "bg-yellow-400 text-yellow-900" : i === 1 ? "bg-muted text-muted-foreground" : "bg-brand/10 text-brand"
                  )}>
                    {i + 1}
                  </span>
                  <span className="flex-1 text-xs font-medium text-foreground truncate">{item.name}</span>
                  <span className="text-xs text-muted-foreground">{item.qty} sold</span>
                  <span className="text-xs font-bold text-green-600">{formatCurrency(item.rev)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <ChartBarIcon className="w-4 h-4 text-brand" />
              Orders by Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.entries(stats.byStatus).length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No orders yet</p>
            ) : (
              Object.entries(stats.byStatus).map(([status, count]) => {
                const pct = stats.total > 0 ? Math.round((count! / stats.total) * 100) : 0;
                let displayLabel = "";
                if (status === "picked_up") {
                  displayLabel = "Picked Up";
                } else if (status === "completed") {
                  displayLabel = "Completed (Delivery)";
                } else {
                  displayLabel = ORDER_STATUS_LABEL[status as OrderStatus] || status;
                }
                const barColor = "bg-brand";
                return (
                  <div key={status} className="mb-3 last:mb-0">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">{displayLabel}</span>
                      <span className="font-semibold text-foreground">{count}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all", barColor)} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <ClipboardDocumentListIcon className="w-4 h-4 text-brand" />
            Recent Orders
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No orders placed yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    {["Order #", "Customer", "Status", "Type", "Total"].map((h) => (
                      <th key={h} className={cn("px-4 py-3 text-xs font-bold text-muted-foreground", h === "Total" ? "text-right" : "text-left")}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {orders.slice(0, 10).map((order) => (
                    <tr key={order.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3 font-mono text-xs font-bold text-muted-foreground">{order.orderNumber}</td>
                      <td className="px-4 py-3 text-foreground">{order.customerName}</td>
                      <td className="px-4 py-3">
                        <Badge variant={getStatusVariant(order)} className="text-[10px]">{getDisplayStatus(order)}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground capitalize">{order.orderType}</td>
                      <td className="px-4 py-3 text-right font-display font-bold text-brand">{formatCurrency(order.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Add User Dialog ─────────────────────────────────────────────────────────

const STAFF_ROLES: AppRole[] = ["kitchen", "owner"];

interface AddUserDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (user: UserDoc) => void;
}

function AddUserDialog({ open, onClose, onSuccess }: AddUserDialogProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AppRole>("kitchen");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showPass, setShowPass] = useState(false);

  function reset() {
    setName(""); setEmail(""); setPassword(""); setRole("kitchen");
    setError(null); setSaving(false);
  }

  function handleClose() { reset(); onClose(); }

  async function handleSubmit() {
    if (!name.trim() || !email.trim() || !password) {
      return setError("Please fill in all fields.");
    }
    if (password.length < 6) {
      return setError("Password must be at least 6 characters.");
    }
    setSaving(true); setError(null);
    try {
      const { createUserWithEmailAndPassword: createUser, updateProfile, signOut: signOutSecondary } = await import("firebase/auth");
      const { secondaryAuth, db: firestoreDb } = await import("@/lib/firebase");
      const { doc: firestoreDoc, setDoc, serverTimestamp } = await import("firebase/firestore");

      const cred = await createUser(secondaryAuth, email.trim(), password);
      await updateProfile(cred.user, { displayName: name.trim() });
      await signOutSecondary(secondaryAuth);
      await setDoc(firestoreDoc(firestoreDb, "users", cred.user.uid), {
        uid: cred.user.uid,
        name: name.trim(),
        email: email.trim(),
        role,
        createdAt: serverTimestamp(),
      });

      onSuccess({
        uid: cred.user.uid,
        name: name.trim(),
        email: email.trim(),
        role,
      });
      handleClose();
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      const msg = (err as { message?: string }).message ?? "";
      const map: Record<string, string> = {
        "auth/email-already-in-use": "Email already in use.",
        "auth/invalid-email": "Invalid email address.",
        "auth/weak-password": "Password is too weak.",
        "auth/network-request-failed": "Network error. Check your connection.",
      };
      setError(map[code] ?? msg ?? "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCircleIcon className="w-5 h-5 text-brand" />
            Add Staff / Manager
          </DialogTitle>
          <DialogDescription>
            Create a new Kitchen Staff or Owner account. Riders should register via the Rider Registration page.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl text-xs bg-red-50 border border-red-200 text-red-700">
              <ExclamationTriangleIcon className="w-4 h-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="au-name">Full Name</Label>
            <Input id="au-name" placeholder="Juan dela Cruz" value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="au-email">Email</Label>
            <Input id="au-email" type="email" placeholder="juan@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="au-password">Password</Label>
            <div className="relative">
              <Input id="au-password" type={showPass ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="rounded-xl pr-10" />
              <button type="button" onClick={() => setShowPass((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                {showPass ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" /></svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                )}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STAFF_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    <div className="flex items-center gap-2">
                      <span className={cn("w-2 h-2 rounded-full inline-block", r === "kitchen" ? "bg-orange-400" : "bg-purple-400")} />
                      {ROLE_LABELS[r]}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={handleClose} disabled={saving}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving} style={{ background: "#bc5d5d" }} className="text-white">
              {saving ? <span className="flex items-center gap-2"><ArrowPathIcon className="w-4 h-4 animate-spin" /> Creating…</span> : "Create Account"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── User Management ──────────────────────────────────────────────────────────

interface UserDoc {
  uid: string;
  name: string;
  email: string;
  role: AppRole;
  createdAt?: { seconds?: number };
}

const ROLE_LABELS: Record<AppRole, string> = {
  customer: "Customer",
  kitchen: "Kitchen Staff",
  delivery: "Delivery Rider",
  owner: "Owner / Manager",
  delivery_pending: "Rider (Pending)",
  rejected: "Rejected",
};

const ROLE_COLORS: Record<AppRole, string> = {
  customer: "bg-blue-100 text-blue-700 border-blue-200",
  kitchen: "bg-orange-100 text-orange-700 border-orange-200",
  delivery: "bg-green-100 text-green-700 border-green-200",
  owner: "bg-purple-100 text-purple-700 border-purple-200",
  delivery_pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
};

function UserManagement() {
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<AppRole | "all">("all");
  const [saving, setSaving] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserDoc | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [addUserOpen, setAddUserOpen] = useState(false);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "users"));
      const list = snap.docs.map((d) => ({ uid: d.id, ...d.data() } as UserDoc));
      list.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      setUsers(list);
    } catch (e) {
      console.error("[UserManagement] fetchUsers error:", e);
      showToast("Failed to load users. Check Firestore rules.", false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  async function handleRoleChange(uid: string, newRole: AppRole) {
    setSaving(uid);
    try {
      await updateDoc(doc(db, "users", uid), { role: newRole });
      setUsers((prev) => prev.map((u) => u.uid === uid ? { ...u, role: newRole } : u));
      showToast("Role updated successfully.");
    } catch {
      showToast("Failed to update role.", false);
    } finally {
      setSaving(null);
    }
  }

  async function handleDelete(user: UserDoc) {
    setSaving(user.uid);
    try {
      await deleteDoc(doc(db, "users", user.uid));
      setUsers((prev) => prev.filter((u) => u.uid !== user.uid));
      showToast(`${user.name} removed.`);
    } catch {
      showToast("Failed to remove user.", false);
    } finally {
      setSaving(null);
      setDeleteTarget(null);
    }
  }

  const filtered = useMemo(() =>
    users.filter((u) => {
      const matchSearch = !search ||
        u.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase());
      const matchRole = filterRole === "all" || u.role === filterRole;
      return matchSearch && matchRole;
    }),
    [users, search, filterRole]
  );

  const counts = useMemo(() => ({
    all: users.length,
    customer: users.filter((u) => u.role === "customer").length,
    kitchen: users.filter((u) => u.role === "kitchen").length,
    delivery: users.filter((u) => u.role === "delivery").length,
    owner: users.filter((u) => u.role === "owner").length,
    delivery_pending: users.filter((u) => u.role === "delivery_pending").length,
    rejected: users.filter((u) => u.role === "rejected").length,
  }), [users]);

  return (
    <div className="space-y-5">
      {toast && (
        <div className={cn("flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border", toast.ok ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200")}>
          <CheckCircleIcon className="w-4 h-4 shrink-0" />
          {toast.msg}
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {(["customer", "kitchen", "delivery", "owner", "delivery_pending", "rejected"] as AppRole[]).map((r) => (
          <button key={r} onClick={() => setFilterRole(filterRole === r ? "all" : r)} className={cn("p-3 rounded-2xl border text-left transition-all", filterRole === r ? "border-brand bg-brand/5" : "border-border bg-white hover:border-brand/30")}>
            <p className="text-xl font-black font-display text-foreground">{counts[r]}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{ROLE_LABELS[r]}</p>
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by name or email…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 rounded-xl" />
        </div>
        <Button onClick={() => setAddUserOpen(true)} className="rounded-xl shrink-0 text-white font-semibold flex items-center gap-1.5" style={{ background: "#bc5d5d" }}>
          <PlusIcon className="w-4 h-4" /><span className="hidden sm:inline">Add User</span>
        </Button>
        <Button variant="outline" size="icon" onClick={fetchUsers} className="rounded-xl shrink-0">
          <ArrowPathIcon className={cn("w-4 h-4", loading && "animate-spin")} />
        </Button>
      </div>
      <AddUserDialog open={addUserOpen} onClose={() => setAddUserOpen(false)} onSuccess={(newUser) => { setUsers((prev) => [newUser, ...prev]); showToast(`${newUser.name} (${ROLE_LABELS[newUser.role]}) created!`); }} />
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(n => (
            <div key={n} className="rounded-2xl border border-border p-4 animate-pulse flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted shrink-0" />
              <div className="flex-1 space-y-2"><div className="h-3 bg-muted rounded w-1/3" /><div className="h-3 bg-muted rounded w-1/2" /></div>
              <div className="h-8 bg-muted rounded-lg w-32" />
            </div>
          ))}
        </div>
      )}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-16">
          <UsersIcon className="w-12 h-12 text-muted mx-auto mb-3" />
          <p className="font-display font-bold text-foreground">No users found</p>
          <p className="text-sm text-muted-foreground mt-1">Try a different search or filter</p>
        </div>
      )}
      {!loading && filtered.map((user) => (
        <div key={user.uid} className="bg-white rounded-2xl border border-border p-4 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-black text-sm text-white" style={{ background: "#bc5d5d" }}>
            {user.name?.charAt(0)?.toUpperCase() ?? "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-foreground truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={cn("hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold border", ROLE_COLORS[user.role])}>
              <ShieldCheckIcon className="w-3 h-3" /> {ROLE_LABELS[user.role]}
            </span>
            <Select value={user.role} onValueChange={(v) => handleRoleChange(user.uid, v as AppRole)} disabled={saving === user.uid}>
              <SelectTrigger className="w-36 h-8 text-xs rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(ROLE_LABELS) as AppRole[]).map((r) => <SelectItem key={r} value={r} className="text-xs">{ROLE_LABELS[r]}</SelectItem>)}
              </SelectContent>
            </Select>
            {saving === user.uid && <ArrowPathIcon className="w-4 h-4 animate-spin text-brand shrink-0" />}
            <button onClick={() => setDeleteTarget(user)} disabled={saving === user.uid} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all">
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove User</DialogTitle>
            <DialogDescription>This action removes the user's profile from the system.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">Are you sure you want to remove <strong className="text-foreground">{deleteTarget?.name}</strong>? This only removes their Firestore profile — their Firebase Auth account remains.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => deleteTarget && handleDelete(deleteTarget)} disabled={saving === deleteTarget?.uid}>
                {saving === deleteTarget?.uid ? "Removing…" : "Remove"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Rider Approvals with Email Notifications ─────────────────────────────────

function RiderApprovals() {
  const [regs, setRegs] = React.useState<RiderRegistration[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [rejReason, setRejReason] = React.useState<Record<string, string>>({});
  const [processingId, setProcessingId] = React.useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  React.useEffect(() => {
    return subscribeToRiderRegistrations(r => { setRegs(r); setLoading(false); });
  }, []);

  async function handleApprove(reg: RiderRegistration) {
    setProcessingId(reg.id);
    try {
      await reviewRegistration(reg.id, reg.uid, "approved");
      await sendRiderApprovalEmail(reg.email, reg.name);
      showToast(`✅ ${reg.name} approved and email sent!`, true);
    } catch (error) {
      console.error("Error approving rider:", error);
      showToast(`Failed to approve ${reg.name}. Please try again.`, false);
    } finally {
      setProcessingId(null);
    }
  }

  async function handleReject(reg: RiderRegistration) {
    setProcessingId(reg.id);
    const reason = rejReason[reg.id] || "Does not meet requirements";
    try {
      await reviewRegistration(reg.id, reg.uid, "rejected", reason);
      await sendRiderRejectionEmail(reg.email, reg.name, reason);
      showToast(`❌ ${reg.name} rejected and email sent.`, true);
    } catch (error) {
      console.error("Error rejecting rider:", error);
      showToast(`Failed to reject ${reg.name}. Please try again.`, false);
    } finally {
      setProcessingId(null);
    }
  }

  const pending = regs.filter(r => r.status === "pending");
  const reviewed = regs.filter(r => r.status !== "pending");

  return (
    <div className="space-y-5">
      {toast && (
        <div className={cn("flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border", toast.ok ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200")}>
          <CheckCircleIcon className="w-4 h-4 shrink-0" />
          {toast.msg}
        </div>
      )}
      <div className="flex items-center gap-2">
        <h3 className="font-display font-bold text-foreground">Rider Registrations</h3>
        {pending.length > 0 && <span className="text-xs font-black text-white bg-brand px-2 py-0.5 rounded-full">{pending.length} pending</span>}
      </div>
      {loading && <p className="text-sm text-muted-foreground">Loading registrations...</p>}
      {!loading && pending.length === 0 && reviewed.length === 0 && <div className="text-center py-12 text-muted-foreground text-sm">No rider registrations yet</div>}
      {pending.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Awaiting Review</p>
          {pending.map(reg => (
            <div key={reg.id} className="bg-white border border-border rounded-2xl p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-foreground">{reg.name}</p>
                  <p className="text-xs text-muted-foreground">{reg.email} · {reg.phone}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs bg-muted px-2 py-0.5 rounded-full capitalize">{reg.vehicleType}</span>
                    <span className="text-xs bg-muted px-2 py-0.5 rounded-full font-mono">{reg.plateNumber}</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold bg-gray-100 text-gray-700 px-2 py-1 rounded-full border">Pending</span>
              </div>
              <input type="text" placeholder="Rejection reason (if rejecting)..." value={rejReason[reg.id] || ""} onChange={e => setRejReason(r => ({ ...r, [reg.id]: e.target.value }))} className="w-full text-xs border border-border rounded-xl px-3 py-2 bg-muted/40 focus:outline-none focus:ring-1 focus:ring-brand" />
              <div className="flex gap-2">
                <button onClick={() => handleApprove(reg)} disabled={processingId === reg.id} className="flex-1 py-2 rounded-xl text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed" style={{ background: "#bc5d5d" }}>
                  {processingId === reg.id ? <span className="flex items-center justify-center gap-2"><ArrowPathIcon className="w-4 h-4 animate-spin" /> Processing...</span> : "Approve & Send Email"}
                </button>
                <button onClick={() => handleReject(reg)} disabled={processingId === reg.id} className="flex-1 py-2 rounded-xl text-sm font-bold border border-red-300 text-red-600 hover:bg-red-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  {processingId === reg.id ? "Processing..." : "Reject & Send Email"}
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground text-center">{processingId === reg.id ? "Sending email notification..." : "Email will be sent automatically"}</p>
            </div>
          ))}
        </div>
      )}
      {reviewed.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Reviewed</p>
          {reviewed.map(reg => (
            <div key={reg.id} className="flex items-center gap-3 p-3 bg-white border border-border rounded-xl">
              <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-foreground truncate">{reg.name}</p><p className="text-xs text-muted-foreground truncate">{reg.email}</p></div>
              <span className={cn("text-[10px] font-bold px-2 py-1 rounded-full border", reg.status === "approved" ? "bg-green-100 text-green-700 border-green-200" : "bg-red-100 text-red-600 border-red-200")}>
                {reg.status === "approved" ? "✓ Approved" : "✗ Rejected"}
              </span>
              {reg.status === "approved" && <span className="text-[10px] text-green-600">📧 Email sent</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function OwnerDashboard() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h2 className="font-display font-bold text-xl text-foreground">Owner Dashboard</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your menu, monitor sales, and control user roles</p>
      </div>
      <Tabs defaultValue="reports">
        <TabsList className="mb-6">
          <TabsTrigger value="reports" className="flex items-center gap-1.5"><ChartBarIcon className="w-4 h-4" /> Sales Reports</TabsTrigger>
          <TabsTrigger value="menu" className="flex items-center gap-1.5"><ClipboardDocumentListIcon className="w-4 h-4" /> Menu Management</TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-1.5"><UsersIcon className="w-4 h-4" /> User Management</TabsTrigger>
          <TabsTrigger value="riders" className="flex items-center gap-1.5"><TruckIcon className="w-4 h-4" /> Rider Approvals</TabsTrigger>
          <TabsTrigger value="orders" className="flex items-center gap-1.5"><InboxIcon className="w-4 h-4" /> Order History</TabsTrigger>
        </TabsList>
        <TabsContent value="reports"><Reports /></TabsContent>
        <TabsContent value="menu"><MenuManagement /></TabsContent>
        <TabsContent value="users"><UserManagement /></TabsContent>
        <TabsContent value="riders"><RiderApprovals /></TabsContent>
        <TabsContent value="orders"><OwnerOrderHistory /></TabsContent>
      </Tabs>
    </div>
  );
}