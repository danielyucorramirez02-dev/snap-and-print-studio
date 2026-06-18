"use client";

import { useState, useTransition, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { bookingSchema, type BookingFormData } from "@/lib/validations/booking";
import { createBooking } from "@/app/(dashboard)/calendar/actions";
import { formatAddonNotes, getSelfShootAddons } from "@/lib/booking-addons";
import { formatPeso } from "@/lib/utils/formatters";
import { CheckCircle2, AlertCircle, CalendarDays } from "lucide-react";
import type { Service } from "@/types";
import Link from "next/link";

const PRESET_THEMES = ["Car", "Jungle", "Police", "Pink Castle", "Mermaid"];
const COVERAGE_EVENT_TYPES = ["Debut", "Birthday", "Baptism", "Wedding", "Other"] as const;
const COVERAGE_SECOND_PLACE_EVENTS = new Set<string>(["Baptism", "Wedding"]);

const today = new Date().toISOString().split("T")[0];

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold text-charcoal-500 uppercase tracking-wider mb-3">{children}</h3>
  );
}

function Field({ label, required, error, children }: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-charcoal-300 text-sm">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  );
}

export default function OwnerBookingForm({ services }: { services: Service[] }) {
  const [serverError, setServerError] = useState("");
  const [success, setSuccess] = useState(false);
  const [selectedAddonIds, setSelectedAddonIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const {
    register, handleSubmit, watch, setValue,
    formState: { errors },
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      client_name: "", client_phone: "", client_email: "",
      booking_date: today, booking_time: "09:00",
      package_id: "",
      total_amount: 0, downpayment_amount: 0,
      notes: "", celebrant_name: "", turning_age: "", theme: "",
      event_type: "", event_place_primary: "", event_place_secondary: "",
    },
  });

  const packageId    = watch("package_id");
  const totalAmount  = Number(watch("total_amount")) || 0;
  const downpayment  = Number(watch("downpayment_amount")) || 0;
  const currentTheme = watch("theme") ?? "";
  const coverageEventType = watch("event_type") ?? "";
  const balance      = Math.max(0, totalAmount - downpayment);

  const selectedService = services.find((s) => s.id === packageId);
  const isSelfShoot = selectedService?.category === "self-shoot";
  const isMilestone = selectedService?.category === "milestone";
  const isCoverage = selectedService?.category === "coverage";
  const canAddSecondPlace = COVERAGE_SECOND_PLACE_EVENTS.has(coverageEventType);
  const addons = getSelfShootAddons(selectedService?.name);
  const selectedAddons = isSelfShoot ? addons.filter((addon) => selectedAddonIds.has(addon.id)) : [];
  const addonTotal = selectedAddons.reduce((sum, addon) => sum + addon.price, 0);

  useEffect(() => {
    if (selectedService) {
      setValue("total_amount", selectedService.price + addonTotal, { shouldValidate: false });
    }
  }, [selectedService, addonTotal, setValue]);

  useEffect(() => {
    if (!isSelfShoot) setSelectedAddonIds(new Set());
  }, [isSelfShoot]);

  const toggleAddon = (id: string) => {
    setSelectedAddonIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onSubmit = (data: BookingFormData) => {
    setServerError("");
    startTransition(async () => {
      const addonNotes = formatAddonNotes(selectedAddons);
      const notes = [addonNotes, data.notes?.trim()].filter(Boolean).join(" | ");
      const result = await createBooking({
        ...data,
        notes,
      });
      if ("error" in result) { setServerError(result.error); return; }
      setSuccess(true);
    });
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-green-500/15 border border-green-500/25 flex items-center justify-center mb-5">
          <CheckCircle2 size={32} className="text-green-400" />
        </div>
        <h2 className="text-white font-bold text-xl mb-2">Booking Saved!</h2>
        <p className="text-charcoal-400 text-sm mb-8">The booking has been added to the calendar and logged to Google Sheets.</p>
        <div className="flex gap-3">
          <Link href="/calendar"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm transition-colors">
            <CalendarDays size={16} />
            View Calendar
          </Link>
          <button onClick={() => setSuccess(false)}
            className="px-5 py-2.5 rounded-xl bg-charcoal-800 hover:bg-charcoal-700 border border-charcoal-700 text-charcoal-300 hover:text-white font-semibold text-sm transition-colors">
            Add Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-2xl">

      {/* ── Client Info ── */}
      <section className="bg-charcoal-900 border border-charcoal-800 rounded-2xl p-5">
        <SectionHeader>Client Info</SectionHeader>
        <div className="space-y-4">
          <Field label="Full Name" required error={errors.client_name?.message}>
            <input {...register("client_name")} placeholder="e.g. Maria Santos"
              className="w-full px-3 py-2.5 rounded-lg bg-charcoal-800 border border-charcoal-700 text-white text-sm placeholder:text-charcoal-500 focus:outline-none focus:border-brand-500" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone" required error={errors.client_phone?.message}>
              <input {...register("client_phone")} placeholder="09171234567"
                className="w-full px-3 py-2.5 rounded-lg bg-charcoal-800 border border-charcoal-700 text-white text-sm placeholder:text-charcoal-500 focus:outline-none focus:border-brand-500" />
            </Field>
            <Field label="Email" error={errors.client_email?.message}>
              <input {...register("client_email")} type="email" placeholder="optional"
                className="w-full px-3 py-2.5 rounded-lg bg-charcoal-800 border border-charcoal-700 text-white text-sm placeholder:text-charcoal-500 focus:outline-none focus:border-brand-500" />
            </Field>
          </div>
        </div>
      </section>

      {/* ── Session ── */}
      <section className="bg-charcoal-900 border border-charcoal-800 rounded-2xl p-5">
        <SectionHeader>Session Details</SectionHeader>
        <div className="space-y-4">
          <Field label="Package" required error={errors.package_id?.message}>
            <select {...register("package_id")}
              className="w-full px-3 py-2.5 rounded-lg bg-charcoal-800 border border-charcoal-700 text-white text-sm focus:outline-none focus:border-brand-500">
              <option value="">— Select a package —</option>
              {["self-shoot", "milestone", "coverage"].map((cat) => {
                const pkgs = services.filter((s) => s.category === cat);
                if (!pkgs.length) return null;
                return (
                  <optgroup key={cat} label={cat === "self-shoot" ? "📸 Self-Shoot" : cat === "milestone" ? "🎂 Milestone" : "🎉 Coverage"}>
                    {pkgs.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} — {formatPeso(s.price)}</option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date" required error={errors.booking_date?.message}>
              <input {...register("booking_date")} type="date"
                className="w-full px-3 py-2.5 rounded-lg bg-charcoal-800 border border-charcoal-700 text-white text-sm focus:outline-none focus:border-brand-500" />
            </Field>
            <Field label="Time" required error={errors.booking_time?.message}>
              <input {...register("booking_time")} type="time"
                className="w-full px-3 py-2.5 rounded-lg bg-charcoal-800 border border-charcoal-700 text-white text-sm focus:outline-none focus:border-brand-500" />
            </Field>
          </div>
        </div>
      </section>

      {/* ── Coverage Details (only when coverage package selected) ── */}
      {isCoverage && (
        <section className="bg-charcoal-900 border border-brand-500/20 rounded-2xl p-5">
          <SectionHeader>Coverage Details</SectionHeader>
          <div className="space-y-4">
            <Field label="Event" required error={errors.event_type?.message}>
              <input type="hidden" {...register("event_type")} />
              <select
                value={coverageEventType}
                onChange={(e) => {
                  setValue("event_type", e.target.value, { shouldValidate: true });
                  if (!COVERAGE_SECOND_PLACE_EVENTS.has(e.target.value)) {
                    setValue("event_place_secondary", "", { shouldValidate: false });
                  }
                }}
                className="w-full px-3 py-2.5 rounded-lg bg-charcoal-800 border border-charcoal-700 text-white text-sm focus:outline-none focus:border-brand-500"
              >
                <option value="">Select event type</option>
                {COVERAGE_EVENT_TYPES.map((event) => (
                  <option key={event} value={event}>{event}</option>
                ))}
              </select>
            </Field>
            <Field label="Place" required error={errors.event_place_primary?.message}>
              <input {...register("event_place_primary")} placeholder="e.g. St. Augustine Parish, Pandi"
                className="w-full px-3 py-2.5 rounded-lg bg-charcoal-800 border border-charcoal-700 text-white text-sm placeholder:text-charcoal-500 focus:outline-none focus:border-brand-500" />
            </Field>
            {canAddSecondPlace && (
              <Field label="Second Place">
                <input {...register("event_place_secondary")} placeholder="e.g. Reception venue"
                  className="w-full px-3 py-2.5 rounded-lg bg-charcoal-800 border border-charcoal-700 text-white text-sm placeholder:text-charcoal-500 focus:outline-none focus:border-brand-500" />
              </Field>
            )}
          </div>
        </section>
      )}

      {/* ── Milestone Details (only when milestone package selected) ── */}
      {isMilestone && (
        <section className="bg-charcoal-900 border border-brand-500/20 rounded-2xl p-5">
          <SectionHeader>🎂 Milestone Details</SectionHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Celebrant Name" required error={errors.celebrant_name?.message}>
                <input {...register("celebrant_name")} placeholder="e.g. Sofia Grace"
                  className="w-full px-3 py-2.5 rounded-lg bg-charcoal-800 border border-charcoal-700 text-white text-sm placeholder:text-charcoal-500 focus:outline-none focus:border-brand-500" />
              </Field>
              <Field label="Turning Age" required error={errors.turning_age?.message}>
                <input {...register("turning_age")} placeholder="e.g. 7"
                  className="w-full px-3 py-2.5 rounded-lg bg-charcoal-800 border border-charcoal-700 text-white text-sm placeholder:text-charcoal-500 focus:outline-none focus:border-brand-500" />
              </Field>
            </div>
            <Field label="Theme" required error={errors.theme?.message}>
              <input {...register("theme")} placeholder="Type any theme, e.g. Space Cowboy, Barbie..."
                className="w-full px-3 py-2.5 rounded-lg bg-charcoal-800 border border-charcoal-700 text-white text-sm placeholder:text-charcoal-500 focus:outline-none focus:border-brand-500 mb-2" />
              <p className="text-charcoal-500 text-xs mb-2">Quick fill — available studio themes:</p>
              <div className="flex flex-wrap gap-2">
                {PRESET_THEMES.map((t) => (
                  <button key={t} type="button"
                    onClick={() => setValue("theme", t, { shouldValidate: true })}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      currentTheme === t
                        ? "bg-brand-500/20 border-brand-500/50 text-brand-300"
                        : "bg-charcoal-800 border-charcoal-700 text-charcoal-400 hover:border-brand-500/30 hover:text-white"
                    }`}>
                    {t}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        </section>
      )}

      {/* ── Payment ── */}
      {isSelfShoot && (
        <section className="bg-charcoal-900 border border-charcoal-800 rounded-2xl p-5">
          <SectionHeader>Add-ons (Optional)</SectionHeader>
          <div className="space-y-2">
            {addons.map((addon) => {
              const checked = selectedAddonIds.has(addon.id);
              return (
                <label
                  key={addon.id}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                    checked
                      ? "border-brand-500/40 bg-brand-500/10 text-white"
                      : "border-charcoal-700 bg-charcoal-800 text-charcoal-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleAddon(addon.id)}
                    className="accent-brand-500"
                  />
                  <span className="flex-1">{addon.label}</span>
                  <span className={checked ? "font-semibold text-brand-400" : "text-charcoal-400"}>
                    +{formatPeso(addon.price)}
                  </span>
                </label>
              );
            })}
          </div>
        </section>
      )}

      <section className="bg-charcoal-900 border border-charcoal-800 rounded-2xl p-5">
        <SectionHeader>Payment</SectionHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Total Amount (₱)" required error={errors.total_amount?.message}>
              <input {...register("total_amount")} type="number" min={0} step={1}
                className="w-full px-3 py-2.5 rounded-lg bg-charcoal-800 border border-charcoal-700 text-white text-sm focus:outline-none focus:border-brand-500" />
            </Field>
            <Field label="Downpayment (₱)" error={errors.downpayment_amount?.message}>
              <input {...register("downpayment_amount")} type="number" min={0} step={1}
                className="w-full px-3 py-2.5 rounded-lg bg-charcoal-800 border border-charcoal-700 text-white text-sm focus:outline-none focus:border-brand-500" />
            </Field>
          </div>
          {errors.downpayment_amount && (
            <p className="text-red-400 text-xs -mt-2">{errors.downpayment_amount.message}</p>
          )}
          <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-charcoal-800 border border-charcoal-700">
            <span className="text-charcoal-400 text-sm">Balance due on session day</span>
            <span className={`text-sm font-bold ${balance === 0 ? "text-green-400" : "text-amber-400"}`}>
              {formatPeso(balance)}
            </span>
          </div>
        </div>
      </section>

      {/* ── Notes ── */}
      <section className="bg-charcoal-900 border border-charcoal-800 rounded-2xl p-5">
        <SectionHeader>Notes (Optional)</SectionHeader>
        <textarea {...register("notes")} rows={3}
          placeholder="Special requests, costume details, reminders..."
          className="w-full px-3 py-2.5 rounded-lg bg-charcoal-800 border border-charcoal-700 text-white text-sm placeholder:text-charcoal-500 focus:outline-none focus:border-brand-500 resize-none" />
      </section>

      {serverError && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          {serverError}
        </div>
      )}

      <button type="submit" disabled={isPending}
        className="w-full py-3.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
        {isPending ? "Saving & logging to Sheet…" : "Save Booking"}
      </button>
    </form>
  );
}
