"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { inventorySchema, type InventoryFormData } from "@/lib/validations/inventory";
import { createInventoryItem, updateInventoryItem } from "@/app/(dashboard)/inventory/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, AlertCircle } from "lucide-react";
import type { InventoryItem } from "@/types";

interface InventoryModalProps {
  item?: InventoryItem;
  onClose: () => void;
}

const COMMON_UNITS = ["sheets", "rolls", "pcs", "boxes", "bottles", "reams", "sets", "pairs"];

export default function InventoryModal({ item, onClose }: InventoryModalProps) {
  const isEditing = !!item;
  const [serverError, setServerError] = useState("");
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<InventoryFormData>({
    resolver: zodResolver(inventorySchema),
    defaultValues: item
      ? {
          item_name: item.item_name,
          quantity: item.quantity,
          unit: item.unit,
          unit_cost: item.unit_cost,
          selling_price: item.selling_price,
          low_stock_threshold: item.low_stock_threshold,
          supplier: item.supplier ?? "",
          last_restocked: item.last_restocked ?? "",
        }
      : {
          item_name: "",
          quantity: 0,
          unit: "pcs",
          unit_cost: 0,
          selling_price: 0,
          low_stock_threshold: 5,
          supplier: "",
          last_restocked: "",
        },
  });

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const onSubmit = (data: InventoryFormData) => {
    setServerError("");
    startTransition(async () => {
      const result = isEditing
        ? await updateInventoryItem(item.id, data)
        : await createInventoryItem(data);

      if ("error" in result) {
        setServerError(result.error);
        return;
      }
      reset();
      onClose();
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-charcoal-900 border border-charcoal-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-charcoal-800 sticky top-0 bg-charcoal-900 rounded-t-2xl">
          <h2 className="text-lg font-semibold text-white">
            {isEditing ? "Edit Item" : "Add Item"}
          </h2>
          <button onClick={onClose} className="text-charcoal-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
          {/* Item Name */}
          <div className="space-y-1.5">
            <Label className="text-charcoal-300">Item Name <span className="text-red-400">*</span></Label>
            <Input
              {...register("item_name")}
              placeholder="e.g. 4R Photo Paper"
              className="bg-charcoal-800 border-charcoal-700 text-white placeholder:text-charcoal-500 focus:border-brand-500"
            />
            {errors.item_name && <p className="text-red-400 text-xs">{errors.item_name.message}</p>}
          </div>

          {/* Quantity + Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-charcoal-300">Quantity <span className="text-red-400">*</span></Label>
              <Input
                {...register("quantity")}
                type="number"
                min={0}
                step={1}
                className="bg-charcoal-800 border-charcoal-700 text-white focus:border-brand-500"
              />
              {errors.quantity && <p className="text-red-400 text-xs">{errors.quantity.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-charcoal-300">Unit <span className="text-red-400">*</span></Label>
              <div className="relative">
                <Input
                  {...register("unit")}
                  list="unit-options"
                  placeholder="e.g. sheets"
                  className="bg-charcoal-800 border-charcoal-700 text-white placeholder:text-charcoal-500 focus:border-brand-500"
                />
                <datalist id="unit-options">
                  {COMMON_UNITS.map((u) => <option key={u} value={u} />)}
                </datalist>
              </div>
              {errors.unit && <p className="text-red-400 text-xs">{errors.unit.message}</p>}
            </div>
          </div>

          {/* Cost + Selling Price */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-charcoal-300">Unit Cost (₱) <span className="text-red-400">*</span></Label>
              <Input
                {...register("unit_cost")}
                type="number"
                min={0}
                step={0.01}
                className="bg-charcoal-800 border-charcoal-700 text-white focus:border-brand-500"
              />
              {errors.unit_cost && <p className="text-red-400 text-xs">{errors.unit_cost.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-charcoal-300">Selling Price (₱) <span className="text-red-400">*</span></Label>
              <Input
                {...register("selling_price")}
                type="number"
                min={0}
                step={0.01}
                className="bg-charcoal-800 border-charcoal-700 text-white focus:border-brand-500"
              />
              {errors.selling_price && <p className="text-red-400 text-xs">{errors.selling_price.message}</p>}
            </div>
          </div>

          {/* Low Stock Threshold */}
          <div className="space-y-1.5">
            <Label className="text-charcoal-300">Low Stock Alert When Below <span className="text-red-400">*</span></Label>
            <Input
              {...register("low_stock_threshold")}
              type="number"
              min={0}
              step={1}
              className="bg-charcoal-800 border-charcoal-700 text-white focus:border-brand-500"
            />
            {errors.low_stock_threshold && <p className="text-red-400 text-xs">{errors.low_stock_threshold.message}</p>}
          </div>

          {/* Supplier + Last Restocked */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-charcoal-300">Supplier <span className="text-charcoal-500 text-xs font-normal">(optional)</span></Label>
              <Input
                {...register("supplier")}
                placeholder="e.g. National Bookstore"
                className="bg-charcoal-800 border-charcoal-700 text-white placeholder:text-charcoal-500 focus:border-brand-500"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-charcoal-300">Last Restocked <span className="text-charcoal-500 text-xs font-normal">(optional)</span></Label>
              <Input
                {...register("last_restocked")}
                type="date"
                className="bg-charcoal-800 border-charcoal-700 text-white focus:border-brand-500"
              />
            </div>
          </div>

          {/* Server error */}
          {serverError && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              {serverError}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 border-charcoal-700 text-charcoal-300 hover:text-white hover:bg-charcoal-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="flex-1 bg-brand-500 hover:bg-brand-600 text-white disabled:opacity-40"
            >
              {isPending ? "Saving..." : isEditing ? "Save Changes" : "Add Item"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
