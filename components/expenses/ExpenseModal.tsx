"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { expenseSchema, type ExpenseFormData } from "@/lib/validations/expense";
import { createExpense } from "@/app/(dashboard)/expenses/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import type { ExpenseCategory } from "@/types";

interface ExpenseModalProps {
  onClose: () => void;
}

const CATEGORIES: { id: ExpenseCategory; label: string; emoji: string }[] = [
  { id: "supplies",   label: "Supplies",   emoji: "🛒" },
  { id: "utilities",  label: "Utilities",  emoji: "💡" },
  { id: "equipment",  label: "Equipment",  emoji: "📷" },
  { id: "other",      label: "Other",      emoji: "📦" },
];

export default function ExpenseModal({ onClose }: ExpenseModalProps) {
  const [serverError, setServerError] = useState("");
  const [isPending, startTransition] = useTransition();

  const { register, handleSubmit, watch, setValue, formState: { errors }, reset } =
    useForm<ExpenseFormData>({
      resolver: zodResolver(expenseSchema),
      defaultValues: {
        category: "supplies",
        description: "",
        amount: 0,
        expense_date: format(new Date(), "yyyy-MM-dd"),
        notes: "",
      },
    });

  const selectedCategory = watch("category");

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const onSubmit = (data: ExpenseFormData) => {
    setServerError("");
    startTransition(async () => {
      const result = await createExpense(data);
      if ("error" in result) { setServerError(result.error); return; }
      reset();
      onClose();
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-charcoal-900 border border-charcoal-700 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-charcoal-800">
          <h2 className="text-lg font-semibold text-white">Log Expense</h2>
          <button onClick={onClose} className="text-charcoal-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
          {/* Category */}
          <div className="space-y-1.5">
            <Label className="text-charcoal-300">Category <span className="text-red-400">*</span></Label>
            <div className="grid grid-cols-4 gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setValue("category", c.id, { shouldValidate: true })}
                  className={`flex flex-col items-center gap-1 py-2.5 rounded-lg border text-xs font-medium transition-colors ${
                    selectedCategory === c.id
                      ? "bg-brand-500/15 text-brand-400 border-brand-500/30"
                      : "bg-charcoal-800 text-charcoal-400 border-charcoal-700 hover:text-white hover:border-charcoal-600"
                  }`}
                >
                  <span className="text-base">{c.emoji}</span>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-charcoal-300">Description <span className="text-red-400">*</span></Label>
            <Input
              {...register("description")}
              placeholder="e.g. Photo paper restock"
              className="bg-charcoal-800 border-charcoal-700 text-white placeholder:text-charcoal-500 focus:border-brand-500"
            />
            {errors.description && <p className="text-red-400 text-xs">{errors.description.message}</p>}
          </div>

          {/* Amount + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-charcoal-300">Amount (₱) <span className="text-red-400">*</span></Label>
              <Input
                {...register("amount")}
                type="number"
                min={1}
                step={0.01}
                className="bg-charcoal-800 border-charcoal-700 text-white focus:border-brand-500"
              />
              {errors.amount && <p className="text-red-400 text-xs">{errors.amount.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-charcoal-300">Date <span className="text-red-400">*</span></Label>
              <Input
                {...register("expense_date")}
                type="date"
                className="bg-charcoal-800 border-charcoal-700 text-white focus:border-brand-500"
              />
              {errors.expense_date && <p className="text-red-400 text-xs">{errors.expense_date.message}</p>}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-charcoal-300">Notes <span className="text-charcoal-500 text-xs font-normal">(optional)</span></Label>
            <Input
              {...register("notes")}
              placeholder="e.g. Bought at SM Pandi"
              className="bg-charcoal-800 border-charcoal-700 text-white placeholder:text-charcoal-500 focus:border-brand-500"
            />
          </div>

          {serverError && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              {serverError}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" onClick={onClose}
              className="flex-1 border-charcoal-700 text-charcoal-300 hover:text-white hover:bg-charcoal-800">
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}
              className="flex-1 bg-brand-500 hover:bg-brand-600 text-white disabled:opacity-40">
              {isPending ? "Saving..." : "Log Expense"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
