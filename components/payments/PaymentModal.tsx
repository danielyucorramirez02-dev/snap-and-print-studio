"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { paymentSchema, type PaymentFormData } from "@/lib/validations/payment";
import { addPayment } from "@/app/(dashboard)/payments/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, AlertCircle, Banknote, Smartphone, Building2 } from "lucide-react";
import { format } from "date-fns";
import { formatPeso } from "@/lib/utils/formatters";
import type { Booking } from "@/types";

interface PaymentModalProps {
  booking: Booking;
  onClose: () => void;
}

const PAYMENT_METHODS: { id: "cash" | "gcash" | "bank"; label: string; icon: React.ReactNode }[] = [
  { id: "cash",  label: "Cash",          icon: <Banknote size={15} /> },
  { id: "gcash", label: "GCash",         icon: <Smartphone size={15} /> },
  { id: "bank",  label: "Bank Transfer", icon: <Building2 size={15} /> },
];

export default function PaymentModal({ booking, onClose }: PaymentModalProps) {
  const [serverError, setServerError] = useState("");
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      booking_id: booking.id,
      amount: booking.balance > 0 ? booking.balance : 0,
      payment_method: "cash",
      payment_date: format(new Date(), "yyyy-MM-dd"),
      notes: "",
    },
  });

  const selectedMethod = watch("payment_method");

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const onSubmit = (data: PaymentFormData) => {
    setServerError("");
    startTransition(async () => {
      const result = await addPayment(data);
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
      <div className="bg-charcoal-900 border border-charcoal-700 rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-charcoal-800">
          <div>
            <h2 className="text-lg font-semibold text-white">Add Payment</h2>
            <p className="text-charcoal-400 text-xs mt-0.5">{booking.client_name}</p>
          </div>
          <button onClick={onClose} className="text-charcoal-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Balance summary */}
        <div className="mx-6 mt-5 flex gap-3">
          <div className="flex-1 bg-charcoal-800 rounded-lg p-3">
            <p className="text-xs text-charcoal-500 mb-0.5">Total</p>
            <p className="text-white font-semibold text-sm">{formatPeso(booking.total_amount)}</p>
          </div>
          <div className="flex-1 bg-charcoal-800 rounded-lg p-3">
            <p className="text-xs text-charcoal-500 mb-0.5">Paid so far</p>
            <p className="text-green-400 font-semibold text-sm">{formatPeso(booking.downpayment_amount)}</p>
          </div>
          <div className="flex-1 bg-charcoal-800 rounded-lg p-3">
            <p className="text-xs text-charcoal-500 mb-0.5">Balance</p>
            <p className="text-amber-400 font-semibold text-sm">{formatPeso(booking.balance)}</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
          <input type="hidden" {...register("booking_id")} />

          {/* Payment Method */}
          <div className="space-y-1.5">
            <Label className="text-charcoal-300">Payment Method <span className="text-red-400">*</span></Label>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setValue("payment_method", m.id, { shouldValidate: true })}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-lg border text-xs font-medium transition-colors ${
                    selectedMethod === m.id
                      ? "bg-brand-500/15 text-brand-400 border-brand-500/30"
                      : "bg-charcoal-800 text-charcoal-400 border-charcoal-700 hover:text-white hover:border-charcoal-600"
                  }`}
                >
                  {m.icon}
                  {m.label}
                </button>
              ))}
            </div>
            {errors.payment_method && (
              <p className="text-red-400 text-xs">{errors.payment_method.message}</p>
            )}
          </div>

          {/* Amount & Date */}
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
              {errors.amount && (
                <p className="text-red-400 text-xs">{errors.amount.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-charcoal-300">Date <span className="text-red-400">*</span></Label>
              <Input
                {...register("payment_date")}
                type="date"
                className="bg-charcoal-800 border-charcoal-700 text-white focus:border-brand-500"
              />
              {errors.payment_date && (
                <p className="text-red-400 text-xs">{errors.payment_date.message}</p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-charcoal-300">Notes <span className="text-charcoal-500 text-xs font-normal">(optional)</span></Label>
            <Input
              {...register("notes")}
              placeholder="e.g. GCash ref #123456"
              className="bg-charcoal-800 border-charcoal-700 text-white placeholder:text-charcoal-500 focus:border-brand-500"
            />
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
              {isPending ? "Saving..." : "Log Payment"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
