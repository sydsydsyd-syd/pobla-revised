// components/ui/ItemDetailsModal.tsx
import React from "react";
import type { MenuItem } from "@/types";
import { formatCurrency, formatMinutes, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ClockIcon, CheckCircleIcon, XCircleIcon, FireIcon } from "@heroicons/react/24/outline";
import { cardUrl } from "@/lib/cloudinary";

interface ItemDetailsModalProps {
    item: MenuItem | null;
    open: boolean;
    onClose: () => void;
    onAddToCart: (item: MenuItem) => void;
}

export default function ItemDetailsModal({ item, open, onClose, onAddToCart }: ItemDetailsModalProps) {
    if (!item) return null;

    const isBest = item.tags.includes("bestseller");
    const displayTags = item.tags.filter(tag => tag !== "bestseller");

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-md p-0 overflow-hidden rounded-3xl border-0 shadow-2xl">
                <DialogTitle className="sr-only">{item.name}</DialogTitle>

                {/* Image */}
                <div className="relative w-full aspect-video bg-muted overflow-hidden">
                    {item.imageUrl ? (
                        <img
                            src={cardUrl(item.imageUrl)}
                            alt={item.name}
                            className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                        />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-muted gap-2">
                            <span className="text-muted-foreground/40 text-4xl">🍽️</span>
                            <span className="text-xs text-muted-foreground/60">No image available</span>
                        </div>
                    )}
                    {isBest && (
                        <div className="absolute top-3 left-3">
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
                </div>

                {/* Content */}
                <div className="p-5 space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <h3 className="font-display font-bold text-lg text-foreground">{item.name}</h3>
                            <p className="font-display font-black text-2xl text-brand mt-1">{formatCurrency(item.price)}</p>
                        </div>
                    </div>

                    {/* Description */}
                    {item.description && (
                        <div>
                            <h4 className="font-display text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Description</h4>
                            <p className="text-sm text-muted-foreground leading-relaxed font-['DM Sans']">{item.description}</p>
                        </div>
                    )}

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <div className="flex items-center gap-2 text-sm font-['DM Sans']">
                            <ClockIcon className="w-4 h-4 text-muted-foreground" />
                            <span className="text-foreground">{formatMinutes(item.preparationTime)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm font-['DM Sans']">
                            {item.available ? (
                                <>
                                    <CheckCircleIcon className="w-4 h-4 text-green-600" />
                                    <span className="text-green-600">Available</span>
                                </>
                            ) : (
                                <>
                                    <XCircleIcon className="w-4 h-4 text-destructive" />
                                    <span className="text-destructive">Unavailable</span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Category */}
                    <div>
                        <h4 className="font-display text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Category</h4>
                        <Badge variant="secondary" className="text-xs font-['DM Sans'] bg-muted/40 text-foreground border-border">
                            {item.category}
                        </Badge>
                    </div>

                    {/* Tags */}
                    {displayTags.length > 0 && (
                        <div>
                            <h4 className="font-display text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Tags</h4>
                            <div className="flex flex-wrap gap-1.5">
                                {displayTags.map((tag) => (
                                    <span
                                        key={tag}
                                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-brand/10 text-brand/80 border-0"
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Add to Cart Button */}
                    <Button
                        onClick={() => {
                            onAddToCart(item);
                            onClose();
                        }}
                        disabled={!item.available}
                        className={cn(
                            "w-full font-['DM Sans'] text-sm font-bold transition-all active:scale-95",
                            item.available
                                ? "bg-brand text-white hover:bg-brand/90 shadow-md shadow-brand/20"
                                : "bg-muted text-muted-foreground cursor-not-allowed"
                        )}
                        size="lg"
                    >
                        {item.available ? `Add to Cart • ${formatCurrency(item.price)}` : "Currently Unavailable"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}