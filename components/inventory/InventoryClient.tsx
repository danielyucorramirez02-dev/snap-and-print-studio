"use client";

import { useState, useMemo, useTransition } from "react";
import { Plus, Search, Pencil, Trash2, AlertTriangle, TrendingUp, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPeso, formatDate } from "@/lib/utils/formatters";
import { updateQuantity, deleteInventoryItem } from "@/app/(dashboard)/inventory/actions";
import InventoryModal from "@/components/inventory/InventoryModal";
import type { InventoryItem, UserRole } from "@/types";

interface InventoryClientProps {
  items: InventoryItem[];
  userRole: UserRole;
}

function MarginBadge({ cost, price }: { cost: number; price: number }) {
  if (price === 0) return null;
  const margin = ((price - cost) / price) * 100;
  const color = margin >= 40 ? "text-green-400" : margin >= 20 ? "text-amber-400" : "text-red-400";
  return <span className={`text-xs font-medium ${color}`}>{margin.toFixed(0)}% margin</span>;
}

interface QuantityEditorProps {
  item: InventoryItem;
}

function QuantityEditor({ item }: QuantityEditorProps) {
  const [qty, setQty] = useState(item.quantity);
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isLow = qty <= item.low_stock_threshold;

  const commit = (newQty: number) => {
    const clamped = Math.max(0, newQty);
    setQty(clamped);
    startTransition(async () => {
      await updateQuantity(item.id, clamped);
    });
  };

  if (editing) {
    return (
      <input
        type="number"
        autoFocus
        min={0}
        value={qty}
        onChange={(e) => setQty(Number(e.target.value))}
        onBlur={() => { commit(qty); setEditing(false); }}
        onKeyDown={(e) => {
          if (e.key === "Enter") { commit(qty); setEditing(false); }
          if (e.key === "Escape") { setQty(item.quantity); setEditing(false); }
        }}
        className="w-16 text-center bg-charcoal-800 border border-brand-500 rounded text-white text-sm px-1 py-0.5 focus:outline-none"
      />
    );
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => commit(qty - 1)}
        disabled={isPending || qty <= 0}
        className="w-5 h-5 flex items-center justify-center rounded text-charcoal-500 hover:text-white hover:bg-charcoal-700 transition-colors disabled:opacity-30"
      >
        <Minus size={10} />
      </button>
      <button
        onClick={() => setEditing(true)}
        className={`min-w-[2.5rem] text-center text-sm font-semibold px-1 rounded hover:bg-charcoal-700 transition-colors ${isLow ? "text-amber-400" : "text-white"}`}
      >
        {qty}
      </button>
      <button
        onClick={() => commit(qty + 1)}
        disabled={isPending}
        className="w-5 h-5 flex items-center justify-center rounded text-charcoal-500 hover:text-white hover:bg-charcoal-700 transition-colors disabled:opacity-30"
      >
        <Plus size={10} />
      </button>
    </div>
  );
}

export default function InventoryClient({ items, userRole }: InventoryClientProps) {
  const [search, setSearch] = useState("");
  const [showLowOnly, setShowLowOnly] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null | undefined>(undefined);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const lowStockItems = useMemo(
    () => items.filter((i) => i.quantity <= i.low_stock_threshold),
    [items]
  );

  const filtered = useMemo(() => {
    return items.filter((i) => {
      const matchesSearch =
        search.trim() === "" ||
        i.item_name.toLowerCase().includes(search.toLowerCase()) ||
        (i.supplier ?? "").toLowerCase().includes(search.toLowerCase());
      const matchesLow = !showLowOnly || i.quantity <= i.low_stock_threshold;
      return matchesSearch && matchesLow;
    });
  }, [items, search, showLowOnly]);

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await deleteInventoryItem(id);
      setDeletingId(null);
    });
  };

  return (
    <>
      {/* Low stock alert banner */}
      {lowStockItems.length > 0 && (
        <div className="flex items-start gap-3 p-4 mb-6 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-400 text-sm font-medium">
              {lowStockItems.length} item{lowStockItems.length !== 1 ? "s" : ""} running low
            </p>
            <p className="text-amber-400/70 text-xs mt-0.5">
              {lowStockItems.map((i) => i.item_name).join(", ")}
            </p>
          </div>
          <button
            onClick={() => setShowLowOnly((v) => !v)}
            className="ml-auto text-xs text-amber-400 hover:text-amber-300 underline shrink-0"
          >
            {showLowOnly ? "Show all" : "View only"}
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items..."
            className="pl-8 pr-3 py-1.5 rounded-lg bg-charcoal-900 border border-charcoal-700 text-white text-xs placeholder:text-charcoal-500 focus:outline-none focus:border-brand-500 w-full"
          />
        </div>
        <Button
          onClick={() => setEditingItem(null)}
          className="ml-auto bg-brand-500 hover:bg-brand-600 text-white text-sm"
        >
          <Plus size={15} className="mr-1.5" />
          Add Item
        </Button>
      </div>

      {/* Table */}
      <div className="bg-charcoal-900 border border-charcoal-800 rounded-xl overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-3 px-4 py-2.5 border-b border-charcoal-800 text-xs font-medium text-charcoal-500 uppercase tracking-wider">
          <span>Item</span>
          <span className="text-center">Qty</span>
          <span className="text-right">Cost</span>
          <span className="text-right">Price</span>
          <span className="text-right hidden sm:block">Margin</span>
          <span></span>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center text-charcoal-600 text-sm">
            {items.length === 0 ? "No items yet. Add your first inventory item." : "No items match your search."}
          </div>
        ) : (
          <div className="divide-y divide-charcoal-800">
            {filtered.map((item) => {
              const isLow = item.quantity <= item.low_stock_threshold;
              return (
                <div
                  key={item.id}
                  className={`grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-3 items-center px-4 py-3 hover:bg-charcoal-800/40 transition-colors ${isLow ? "bg-amber-500/5" : ""}`}
                >
                  {/* Item name + meta */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white text-sm font-medium truncate">{item.item_name}</p>
                      {isLow && <AlertTriangle size={12} className="text-amber-400 shrink-0" />}
                    </div>
                    <p className="text-charcoal-500 text-xs mt-0.5 truncate">
                      {item.unit}
                      {item.supplier && ` · ${item.supplier}`}
                      {item.last_restocked && ` · Restocked ${formatDate(item.last_restocked)}`}
                    </p>
                    <p className="text-charcoal-600 text-xs">
                      Alert at {item.low_stock_threshold} {item.unit}
                    </p>
                  </div>

                  {/* Quantity editor */}
                  <div className="flex justify-center">
                    <QuantityEditor item={item} />
                  </div>

                  {/* Cost */}
                  <p className="text-charcoal-400 text-sm text-right">{formatPeso(item.unit_cost)}</p>

                  {/* Selling price */}
                  <p className="text-white text-sm text-right">{formatPeso(item.selling_price)}</p>

                  {/* Margin */}
                  <div className="text-right hidden sm:flex items-center justify-end gap-1">
                    <TrendingUp size={12} className="text-charcoal-600" />
                    <MarginBadge cost={item.unit_cost} price={item.selling_price} />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingItem(item)}
                      className="p-1.5 text-charcoal-500 hover:text-white hover:bg-charcoal-700 rounded transition-colors"
                      title="Edit"
                    >
                      <Pencil size={13} />
                    </button>
                    {deletingId === item.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={isPending}
                          className="text-xs text-red-400 hover:text-red-300 px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20"
                        >
                          {isPending ? "…" : "Yes"}
                        </button>
                        <button
                          onClick={() => setDeletingId(null)}
                          className="text-xs text-charcoal-400 hover:text-white px-1.5 py-0.5"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeletingId(item.id)}
                        className="p-1.5 text-charcoal-500 hover:text-red-400 hover:bg-charcoal-700 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {editingItem !== undefined && (
        <InventoryModal
          item={editingItem ?? undefined}
          onClose={() => setEditingItem(undefined)}
        />
      )}
    </>
  );
}
