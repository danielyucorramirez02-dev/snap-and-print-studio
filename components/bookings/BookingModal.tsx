"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { bookingSchema, type BookingFormData } from "@/lib/validations/booking";
import { createBooking } from "@/app/(dashboard)/calendar/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { formatPeso } from "@/lib/utils/formatters";
import type { Service } from "@/types";

const COVERAGE_EVENT_TYPES = ["Debut", "Birthday", "Baptism", "Wedding", "Other"] as const;
const COVERAGE_SECOND_PLACE_EVENTS = new Set<string>(["Baptism", "Wedding"]);

interface BookingModalProps {
  services: Service[];
  onClose: () => void;
}

export default function BookingModal({ services, onClose }: BookingModalProps) {
  const [serverError, setServerError] = useState("");
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      client_name: "",
      client_phone: "",
      client_email: "",
      booking_date: format(new Date(), "yyyy-MM-dd"),
      booking_time: "09:00",
      package_id: "",
      total_amount: 0,
      downpayment_amount: 0,
      notes: "",
      event_type: "",
      event_place_primary: "",
      event_place_secondary: "",
    },
  });

  const selectedPackageId = watch("package_id");
  const coverageEventType = watch("event_type") ?? "";
  const totalAmount = watch("total_amount") || 0;
  const downpaymentAmount = watch("downpayment_amount") || 0;
  const balance = Number(totalAmount) - Number(downpaymentAmount);
  const selectedService = services.find((s) => s.id === selectedPackageId);
  const isCoverage = selectedService?.category === "coverage";
  const canAddSecondPlace = COVERAGE_SECOND_PLACE_EVENTS.has(coverageEventType);

  useEffect(() => {
    if (!selectedPackageId) return;
    if (selectedService) setValue("total_amount", selectedService.price, { shouldValidate: false });
  }, [selectedPackageId, selectedService, setValue]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const onSubmit = (data: BookingFormData) => {
    setServerError("");
    startTransition(async () => {
      const result = await createBooking(data);
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
          <h2 className="text-lg font-semibold text-white">New Booking</h2>
          <button
            onClick={onClose}
            className="text-charcoal-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
          {/* Client Name */}
          <div className="space-y-1.5">
            <Label className="text-charcoal-300">Client Name <span className="text-red-400">*</span></Label>
            <Input
              {...register("client_name")}
              placeholder="e.g. Maria Santos"
              className="bg-charcoal-800 border-charcoal-700 text-white placeholder:text-charcoal-500 focus:border-brand-500"
            />
            {errors.client_name && (
              <p className="text-red-400 text-xs">{errors.client_name.message}</p>
            )}
          </div>

          {/* Phone & Email */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-charcoal-300">Phone <span className="text-red-400">*</span></Label>
              <Input
                {...register("client_phone")}
                placeholder="09171234567"
                className="bg-charcoal-800 border-charcoal-700 text-white placeholder:text-charcoal-500 focus:border-brand-500"
              />
              {errors.client_phone && (
                <p className="text-red-400 text-xs">{errors.client_phone.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-charcoal-300">Email <span className="text-charcoal-500 text-xs font-normal">(optional)</span></Label>
              <Input
                {...register("client_email")}
                type="email"
                placeholder="client@email.com"
                className="bg-charcoal-800 border-charcoal-700 text-white placeholder:text-charcoal-500 focus:border-brand-500"
              />
              {errors.client_email && (
                <p className="text-red-400 text-xs">{errors.client_email.message}</p>
              )}
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-charcoal-300">Date <span className="text-red-400">*</span></Label>
              <Input
                {...register("booking_date")}
                type="date"
                className="bg-charcoal-800 border-charcoal-700 text-white focus:border-brand-500"
              />
              {errors.booking_date && (
                <p className="text-red-400 text-xs">{errors.booking_date.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-charcoal-300">Time <span className="text-red-400">*</span></Label>
              <Input
                {...register("booking_time")}
                type="time"
                className="bg-charcoal-800 border-charcoal-700 text-white focus:border-brand-500"
              />
              {errors.booking_time && (
                <p className="text-red-400 text-xs">{errors.booking_time.message}</p>
              )}
            </div>
          </div>

          {/* Package */}
          <div className="space-y-1.5">
            <Label className="text-charcoal-300">Package <span className="text-red-400">*</span></Label>
            <select
              {...register("package_id")}
              className="w-full px-3 py-2 rounded-md bg-charcoal-800 border border-charcoal-700 text-white text-sm focus:outline-none focus:border-brand-500"
            >
              <option value="" disabled>Select a package...</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — {formatPeso(s.price)}
                </option>
              ))}
            </select>
            {errors.package_id && (
              <p className="text-red-400 text-xs">{errors.package_id.message}</p>
            )}
          </div>

          {/* Coverage Details */}
          {isCoverage && (
            <div className="space-y-3 rounded-xl border border-brand-500/20 bg-charcoal-900 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-charcoal-500">Coverage Details</p>
              <div className="space-y-1.5">
                <Label className="text-charcoal-300">Event <span className="text-red-400">*</span></Label>
                <input type="hidden" {...register("event_type")} />
                <select
                  value={coverageEventType}
                  onChange={(e) => {
                    setValue("event_type", e.target.value, { shouldValidate: true });
                    if (!COVERAGE_SECOND_PLACE_EVENTS.has(e.target.value)) {
                      setValue("event_place_secondary", "", { shouldValidate: false });
                    }
                  }}
                  className="w-full px-3 py-2 rounded-md bg-charcoal-800 border border-charcoal-700 text-white text-sm focus:outline-none focus:border-brand-500"
                >
                  <option value="">Select event type</option>
                  {COVERAGE_EVENT_TYPES.map((event) => (
                    <option key={event} value={event}>{event}</option>
                  ))}
                </select>
                {errors.event_type && (
                  <p className="text-red-400 text-xs">{errors.event_type.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-charcoal-300">Place <span className="text-red-400">*</span></Label>
                <Input
                  {...register("event_place_primary")}
                  placeholder="e.g. St. Augustine Parish, Pandi"
                  className="bg-charcoal-800 border-charcoal-700 text-white placeholder:text-charcoal-500 focus:border-brand-500"
                />
                {errors.event_place_primary && (
                  <p className="text-red-400 text-xs">{errors.event_place_primary.message}</p>
                )}
              </div>
              {canAddSecondPlace && (
                <div className="space-y-1.5">
                  <Label className="text-charcoal-300">Second Place <span className="text-charcoal-500 text-xs font-normal">(optional)</span></Label>
                  <Input
                    {...register("event_place_secondary")}
                    placeholder="e.g. Reception venue"
                    className="bg-charcoal-800 border-charcoal-700 text-white placeholder:text-charcoal-500 focus:border-brand-500"
                  />
                </div>
              )}
            </div>
          )}

          {/* Amounts */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-charcoal-300">Total Amount (₱) <span className="text-red-400">*</span></Label>
              <Input
                {...register("total_amount")}
                type="number"
                min={0}
                step={0.01}
                className="bg-charcoal-800 border-charcoal-700 text-white focus:border-brand-500"
              />
              {errors.total_amount && (
                <p className="text-red-400 text-xs">{errors.total_amount.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-charcoal-300">Downpayment (₱)</Label>
              <Input
                {...register("downpayment_amount")}
                type="number"
                min={0}
                step={0.01}
                className="bg-charcoal-800 border-charcoal-700 text-white focus:border-brand-500"
              />
              {errors.downpayment_amount && (
                <p className="text-red-400 text-xs">{errors.downpayment_amount.message}</p>
              )}
            </div>
          </div>

          {/* Balance display */}
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-charcoal-800 border border-charcoal-700">
            <span className="text-charcoal-400 text-sm">Balance due</span>
            <span className={`text-sm font-semibold ${balance <= 0 ? "text-green-400" : "text-amber-400"}`}>
              {formatPeso(Math.max(0, balance))}
            </span>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-charcoal-300">Notes <span className="text-charcoal-500 text-xs font-normal">(optional)</span></Label>
            <textarea
              {...register("notes")}
              rows={3}
              placeholder="Costume details, special requests..."
              className="w-full px-3 py-2 rounded-md bg-charcoal-800 border border-charcoal-700 text-white text-sm placeholder:text-charcoal-500 focus:outline-none focus:border-brand-500 resize-none"
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
              {isPending ? "Saving..." : "Save Booking"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
