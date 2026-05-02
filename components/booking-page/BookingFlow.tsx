"use client";

import { useState, useTransition, useMemo } from "react";
import { getAvailableSlots, getBookedMilestoneSlots, createPublicBooking } from "@/app/book/actions";
import {
  MILESTONE_EARLY_SLOTS, MILESTONE_LATE_SLOTS,
  type MilestoneHalfDay,
  getStudioHoursForDate, formatSlotLabel,
} from "@/lib/utils/slots";
import { formatPeso } from "@/lib/utils/formatters";
import { createClient } from "@/lib/supabase/client";
import {
  ChevronLeft, CheckCircle2, Loader2, AlertCircle,
  Clock, CalendarDays, Copy, Check, Upload, X,
} from "lucide-react";
import type { Service } from "@/types";

type Step = "type" | "package" | "additionals" | "datetime" | "info" | "payment" | "success";
type SessionType = "self-shoot" | "milestone" | "coverage";

const SESSION_TYPES: { id: SessionType; emoji: string; label: string; desc: string }[] = [
  { id: "self-shoot", emoji: "📸", label: "Self-Shoot", desc: "Solo, couples, or group sessions inside the studio" },
  { id: "milestone",  emoji: "🎂", label: "Milestone",  desc: "Birthday, baptism, or special occasion shoots" },
  { id: "coverage",   emoji: "🎉", label: "Photo Coverage", desc: "Event coverage at your venue" },
];

const STEPS_SELF_SHOOT: Step[] = ["type", "package", "additionals", "datetime", "info", "payment"];
const STEPS_OTHER: Step[]      = ["type", "package", "datetime", "info", "payment"];

const GCASH_NUMBER = "09623028470";
const GCASH_NAME   = "Daniel R.";

const today = new Date().toISOString().split("T")[0];

function StepIndicator({ index, total }: { index: number; total: number }) {
  if (index < 0) return null;
  return (
    <div className="flex gap-1 mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1 flex-1 rounded-full transition-colors ${i <= index ? "bg-brand-500" : "bg-charcoal-800"}`}
        />
      ))}
    </div>
  );
}

interface AddonItem {
  id: string;
  label: string;
  price: number;
}

interface BookingFlowProps {
  services: Service[];
}

export default function BookingFlow({ services }: BookingFlowProps) {
  const [step, setStep] = useState<Step>("type");
  const [sessionType, setSessionType] = useState<SessionType | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedAddonIds, setSelectedAddonIds] = useState<Set<string>>(new Set());
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [halfDay, setHalfDay] = useState<MilestoneHalfDay | null>(null);
  const [bookedMilestoneSlots, setBookedMilestoneSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [celebrantName, setCelebrantName] = useState("");
  const [turningAge, setTurningAge] = useState("");
  const [milestoneTheme, setMilestoneTheme] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [downpaymentConfirmed, setDownpaymentConfirmed] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [serverError, setServerError] = useState("");
  const [result, setResult] = useState<{ token: string; status: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredServices = services.filter((s) => s.category === sessionType);
  const isRequestBooking = sessionType === "milestone" || sessionType === "coverage";
  const studioHours = date && !isRequestBooking ? getStudioHoursForDate(date) : null;

  const stepsForFlow = sessionType === "self-shoot" ? STEPS_SELF_SHOOT : STEPS_OTHER;
  const stepIndex = stepsForFlow.indexOf(step);
  const totalSteps = stepsForFlow.length;

  const requiredDownpayment = sessionType === "self-shoot" ? 50 : 200;

  const addons: AddonItem[] = useMemo(() => {
    const isSoloOrPakners = selectedService ? /solo|pakner/i.test(selectedService.name) : true;
    return [
      { id: "4r-hard-copy",      label: "4R Hard Copy",                                                                           price: 30  },
      { id: "additional-person", label: "Additional Person",                                                                       price: 80  },
      { id: "a4-sintra-board",   label: "A4 Sintra Board",                                                                         price: 90  },
      { id: "a4-print",          label: "A4 Print",                                                                                price: 70  },
      { id: "props-access",      label: "Full Access to All Props",                                                                 price: 50  },
      { id: "add-background",    label: "Add 1 Background",                                                                        price: 150 },
      { id: "all-soft-copies",   label: isSoloOrPakners ? "All Soft Copies (Solo/Pakners)" : "All Soft Copies (Trio/Tropa/Family)", price: isSoloOrPakners ? 100 : 150 },
    ];
  }, [selectedService]);

  const selectedAddons = addons.filter((a) => selectedAddonIds.has(a.id));
  const addonTotal = selectedAddons.reduce((sum, a) => sum + a.price, 0);
  const grandTotal = (selectedService?.price ?? 0) + addonTotal;

  const toggleAddon = (id: string) => {
    setSelectedAddonIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDateChange = async (d: string) => {
    setDate(d);
    setTime("");
    setHalfDay(null);
    setSlots([]);
    setBookedMilestoneSlots([]);
    if (!selectedService || !d) return;
    setLoadingSlots(true);
    if (isRequestBooking) {
      const booked = await getBookedMilestoneSlots(d);
      setBookedMilestoneSlots(booked);
    } else {
      const available = await getAvailableSlots(d, selectedService.id);
      setSlots(available);
    }
    setLoadingSlots(false);
  };

  const validateInfo = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Name is required";
    if (!phone.trim()) e.phone = "Phone is required";
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Enter a valid email";
    if (sessionType === "milestone") {
      if (!celebrantName.trim()) e.celebrantName = "Celebrant name is required";
      if (!turningAge.trim()) e.turningAge = "Turning age is required";
      if (!milestoneTheme.trim()) e.milestoneTheme = "Theme is required";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setServerError("Receipt image must be less than 5MB.");
      return;
    }
    setReceiptFile(file);
    setReceiptPreview(URL.createObjectURL(file));
    setServerError("");
  };

  const removeReceipt = () => {
    setReceiptFile(null);
    setReceiptPreview(null);
  };

  const copyGcashNumber = () => {
    navigator.clipboard.writeText(GCASH_NUMBER).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSubmit = () => {
    if (!selectedService) return;
    if (!receiptFile) { setServerError("Please upload a screenshot of your GCash receipt before confirming."); return; }
    if (!downpaymentConfirmed) { setServerError("Please confirm that you have sent the downpayment."); return; }
    setServerError("");

    startTransition(async () => {
      // 1. Upload receipt to Supabase Storage
      const supabase = createClient();
      const ext = receiptFile.name.split(".").pop() ?? "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("receipts")
        .upload(path, receiptFile, { contentType: receiptFile.type });

      if (uploadError || !uploadData) {
        setServerError("Failed to upload receipt. Please check your connection and try again.");
        return;
      }

      const { data: { publicUrl } } = supabase.storage.from("receipts").getPublicUrl(uploadData.path);

      // 2. Create booking
      const noteParts: string[] = [];
      if (sessionType === "milestone") {
        noteParts.push(`Celebrant: ${celebrantName}`);
        noteParts.push(`Turning: ${turningAge}`);
        noteParts.push(`Theme: ${milestoneTheme}`);
      }
      if (selectedAddons.length > 0) {
        noteParts.push("Additionals: " + selectedAddons.map((a) => `${a.label} (₱${a.price})`).join(", "));
      }
      const addonNotes = noteParts.length > 0 ? noteParts.join(" | ") : undefined;

      const res = await createPublicBooking({
        serviceId: selectedService.id,
        date,
        time,
        clientName: name,
        clientPhone: phone,
        clientEmail: email,
        totalAmount: grandTotal,
        downpaymentAmount: requiredDownpayment,
        addonNotes,
        receiptUrl: publicUrl,
        celebrantName: sessionType === "milestone" ? celebrantName : undefined,
        turningAge: sessionType === "milestone" ? turningAge : undefined,
        theme: sessionType === "milestone" ? milestoneTheme : undefined,
      });

      if ("error" in res) { setServerError(res.error); return; }
      setResult({ token: res.token, status: res.status });
      setStep("success");
    });
  };

  const bookingUrl = result ? `${window.location.origin}/my-booking/${result.token}` : "";

  // ── Step: Session Type ────────────────────────────────────────────────────
  if (step === "type") return (
    <div>
      <StepIndicator index={0} total={5} />
      <h2 className="text-white font-semibold text-lg mb-1">What type of session?</h2>
      <p className="text-charcoal-400 text-sm mb-5">Choose the session that fits your occasion</p>
      <div className="space-y-3">
        {SESSION_TYPES.map((t) => (
          <button key={t.id} onClick={() => {
            setSessionType(t.id);
            setSelectedService(null);
            setSelectedAddonIds(new Set());
            setStep("package");
          }}
            className="w-full flex items-center gap-4 p-4 rounded-xl bg-charcoal-900 border border-charcoal-700 hover:border-brand-500/50 hover:bg-brand-500/5 transition-colors text-left">
            <span className="text-3xl">{t.emoji}</span>
            <div>
              <p className="text-white font-medium">{t.label}</p>
              <p className="text-charcoal-400 text-sm">{t.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  // ── Step: Package ─────────────────────────────────────────────────────────
  if (step === "package") return (
    <div>
      <button onClick={() => setStep("type")} className="flex items-center gap-1 text-charcoal-400 hover:text-white text-sm mb-4 transition-colors">
        <ChevronLeft size={16} /> Back
      </button>
      <StepIndicator index={stepIndex} total={totalSteps} />
      <h2 className="text-white font-semibold text-lg mb-1">Choose a package</h2>
      <p className="text-charcoal-400 text-sm mb-5">All prices are in Philippine Peso (₱)</p>
      {sessionType === "self-shoot" && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs mb-4">
          <span className="shrink-0 mt-0.5">✨</span>
          You can add extras (hard copies, backgrounds, props, etc.) on the next step.
        </div>
      )}
      <div className="space-y-3">
        {filteredServices.map((s) => (
          <button key={s.id} onClick={() => {
            setSelectedService(s);
            setSelectedAddonIds(new Set());
            setDate("");
            setTime("");
            setSlots([]);
            setStep(sessionType === "self-shoot" ? "additionals" : "datetime");
          }}
            className="w-full p-4 rounded-xl bg-charcoal-900 border border-charcoal-700 hover:border-brand-500/50 hover:bg-brand-500/5 transition-colors text-left">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-white font-semibold">{s.name}</p>
                {s.description && <p className="text-charcoal-400 text-xs mt-0.5">{s.description}</p>}
                <ul className="mt-2 space-y-0.5">
                  {s.inclusions.slice(0, 4).map((inc, i) => (
                    <li key={i} className="text-charcoal-400 text-xs flex items-center gap-1">
                      <span className="text-brand-500">✓</span> {inc}
                    </li>
                  ))}
                  {s.inclusions.length > 4 && (
                    <li className="text-charcoal-600 text-xs">+{s.inclusions.length - 4} more inclusions</li>
                  )}
                </ul>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-brand-400 font-bold text-lg">{formatPeso(s.price)}</p>
                <p className="text-charcoal-500 text-xs">{s.duration_minutes} min</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  // ── Step: Additionals (Self-Shoot only) ───────────────────────────────────
  if (step === "additionals") return (
    <div>
      <button onClick={() => setStep("package")} className="flex items-center gap-1 text-charcoal-400 hover:text-white text-sm mb-4 transition-colors">
        <ChevronLeft size={16} /> Back
      </button>
      <StepIndicator index={stepIndex} total={totalSteps} />
      <h2 className="text-white font-semibold text-lg mb-1">
        Add-ons <span className="text-charcoal-500 text-sm font-normal">(optional)</span>
      </h2>
      <p className="text-charcoal-400 text-sm mb-5">Customize your session with extras</p>

      <div className="space-y-2 mb-5">
        {addons.map((addon) => {
          const checked = selectedAddonIds.has(addon.id);
          return (
            <label key={addon.id}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                checked
                  ? "bg-brand-500/10 border-brand-500/40"
                  : "bg-charcoal-800 border-charcoal-700 hover:border-charcoal-600"
              }`}>
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleAddon(addon.id)}
                className="accent-brand-500 shrink-0"
              />
              <span className={`flex-1 text-sm ${checked ? "text-white" : "text-charcoal-300"}`}>
                {addon.label}
              </span>
              <span className={`text-sm font-semibold shrink-0 ${checked ? "text-brand-400" : "text-charcoal-400"}`}>
                +{formatPeso(addon.price)}
              </span>
            </label>
          );
        })}
      </div>

      <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl p-4 mb-5">
        <div className="flex justify-between text-sm mb-1.5">
          <span className="text-charcoal-400">{selectedService?.name}</span>
          <span className="text-white">{formatPeso(selectedService?.price ?? 0)}</span>
        </div>
        {selectedAddons.map((a) => (
          <div key={a.id} className="flex justify-between text-sm mb-1.5">
            <span className="text-charcoal-400">+ {a.label}</span>
            <span className="text-brand-400">+{formatPeso(a.price)}</span>
          </div>
        ))}
        <div className="flex justify-between text-sm border-t border-charcoal-700 pt-2 mt-1">
          <span className="text-charcoal-300 font-medium">Total</span>
          <span className="text-brand-400 font-bold">{formatPeso(grandTotal)}</span>
        </div>
      </div>

      <button onClick={() => setStep("datetime")}
        className="w-full py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm transition-colors">
        Continue
      </button>
    </div>
  );

  // ── Step: Date & Time ─────────────────────────────────────────────────────
  if (step === "datetime") return (
    <div>
      <button onClick={() => setStep(sessionType === "self-shoot" ? "additionals" : "package")}
        className="flex items-center gap-1 text-charcoal-400 hover:text-white text-sm mb-4 transition-colors">
        <ChevronLeft size={16} /> Back
      </button>
      <StepIndicator index={stepIndex} total={totalSteps} />
      <h2 className="text-white font-semibold text-lg mb-1">Pick a date &amp; time</h2>
      {isRequestBooking && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm mb-4">
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          This is a booking <strong>request</strong>. We&apos;ll confirm your preferred schedule after reviewing availability.
        </div>
      )}
      {studioHours && (
        <div className="flex items-center gap-2 text-xs text-charcoal-500 mb-4">
          <Clock size={13} />
          Studio hours on this day: {formatSlotLabel(studioHours.open)} – {formatSlotLabel(studioHours.close)}
        </div>
      )}
      <div className="space-y-1.5 mb-5">
        <label className="text-charcoal-300 text-sm">Date <span className="text-red-400">*</span></label>
        <input type="date" min={today} value={date}
          onChange={(e) => handleDateChange(e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg bg-charcoal-800 border border-charcoal-700 text-white text-sm focus:outline-none focus:border-brand-500"
        />
      </div>
      {date && (
        <div className="space-y-2">
          <label className="text-charcoal-300 text-sm">
            {isRequestBooking ? "Preferred time" : "Available slots"} <span className="text-red-400">*</span>
          </label>
          {isRequestBooking ? (
            loadingSlots ? (
              <div className="flex items-center gap-2 text-charcoal-400 text-sm py-4">
                <Loader2 size={15} className="animate-spin" /> Checking availability…
              </div>
            ) : !halfDay ? (
              /* Step 1: pick Early or Late */
              <div className="space-y-2">
                {(
                  [
                    { id: "early" as MilestoneHalfDay, emoji: "🌅", label: "Early Session", slots: MILESTONE_EARLY_SLOTS },
                    { id: "late"  as MilestoneHalfDay, emoji: "🌆", label: "Late Session",  slots: MILESTONE_LATE_SLOTS  },
                  ] as const
                ).map(({ id, emoji, label, slots: halfSlots }) => {
                  const allBooked = halfSlots.every((t) => bookedMilestoneSlots.includes(t));
                  return (
                    <button key={id}
                      onClick={() => !allBooked && setHalfDay(id)}
                      disabled={allBooked}
                      className={`w-full p-4 rounded-xl border text-left transition-colors ${
                        allBooked
                          ? "bg-charcoal-900 border-charcoal-800 opacity-40 cursor-not-allowed"
                          : "bg-charcoal-800 border-charcoal-700 hover:border-brand-500/50 hover:bg-brand-500/5"
                      }`}
                    >
                      <p className={`font-medium text-sm ${allBooked ? "text-charcoal-500" : "text-white"}`}>
                        {emoji} {label}
                        {allBooked && <span className="ml-2 text-xs font-normal">— Fully booked</span>}
                      </p>
                      <p className="text-charcoal-500 text-xs mt-0.5">
                        {halfSlots.map((t) => formatSlotLabel(t)).join(" · ")}
                      </p>
                    </button>
                  );
                })}
              </div>
            ) : (
              /* Step 2: pick specific time within chosen half-day */
              <div className="space-y-3">
                <button
                  onClick={() => { setHalfDay(null); setTime(""); }}
                  className="flex items-center gap-1 text-charcoal-400 hover:text-white text-xs transition-colors"
                >
                  <ChevronLeft size={13} />
                  {halfDay === "early" ? "🌅 Early Session" : "🌆 Late Session"} — change
                </button>
                <div className="grid grid-cols-3 gap-2">
                  {(halfDay === "early" ? MILESTONE_EARLY_SLOTS : MILESTONE_LATE_SLOTS).map((slot) => {
                    const isBooked = bookedMilestoneSlots.includes(slot);
                    return (
                      <button key={slot}
                        onClick={() => !isBooked && setTime(slot)}
                        disabled={isBooked}
                        className={`py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                          isBooked
                            ? "bg-charcoal-900 border-charcoal-800 text-charcoal-700 cursor-not-allowed line-through"
                            : time === slot
                            ? "bg-brand-500/15 border-brand-500/40 text-brand-400"
                            : "bg-charcoal-800 border-charcoal-700 text-charcoal-300 hover:border-brand-500/30 hover:text-white"
                        }`}
                      >
                        {formatSlotLabel(slot)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )
          ) : loadingSlots ? (
            <div className="flex items-center gap-2 text-charcoal-400 text-sm py-4">
              <Loader2 size={15} className="animate-spin" /> Checking availability…
            </div>
          ) : slots.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-charcoal-500 text-sm">No available slots for this day.</p>
              <p className="text-charcoal-600 text-xs mt-1">Try picking a different date.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {slots.map((slot) => (
                <button key={slot} onClick={() => setTime(slot)}
                  className={`py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                    time === slot
                      ? "bg-brand-500/15 border-brand-500/40 text-brand-400"
                      : "bg-charcoal-800 border-charcoal-700 text-charcoal-300 hover:border-brand-500/30 hover:text-white"
                  }`}>
                  {formatSlotLabel(slot)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <button onClick={() => setStep("info")} disabled={!date || !time}
        className="w-full mt-6 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
        Continue
      </button>
    </div>
  );

  // ── Step: Personal Info ───────────────────────────────────────────────────
  if (step === "info") return (
    <div>
      <button onClick={() => setStep("datetime")} className="flex items-center gap-1 text-charcoal-400 hover:text-white text-sm mb-4 transition-colors">
        <ChevronLeft size={16} /> Back
      </button>
      <StepIndicator index={stepIndex} total={totalSteps} />
      <h2 className="text-white font-semibold text-lg mb-1">Your details</h2>
      <p className="text-charcoal-400 text-sm mb-5">We&apos;ll use this to confirm your booking</p>

      <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl p-4 mb-5 space-y-1.5">
        <p className="text-charcoal-500 text-xs uppercase tracking-wider mb-2">Booking Summary</p>
        <div className="flex justify-between text-sm">
          <span className="text-charcoal-400">Package</span>
          <span className="text-white font-medium">{selectedService?.name}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-charcoal-400">Date</span>
          <span className="text-white">{date}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-charcoal-400">Time</span>
          <span className="text-white">{formatSlotLabel(time)}{isRequestBooking ? " (preferred)" : ""}</span>
        </div>
        {selectedAddons.length > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-charcoal-400">Add-ons</span>
            <span className="text-brand-400">+{formatPeso(addonTotal)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm border-t border-charcoal-700 pt-1.5 mt-1.5">
          <span className="text-charcoal-400">Total</span>
          <span className="text-brand-400 font-bold">{formatPeso(grandTotal)}</span>
        </div>
      </div>

      <div className="space-y-4">
        {/* Milestone heading hint */}
        {sessionType === "milestone" && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs">
            <span className="shrink-0">🎂</span>
            Fill in your contact details first, then the celebrant info below.
          </div>
        )}
        <div className="space-y-1.5">
          <label className="text-charcoal-300 text-sm">Full Name <span className="text-red-400">*</span></label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Maria Santos"
            className="w-full px-3 py-2.5 rounded-lg bg-charcoal-800 border border-charcoal-700 text-white text-sm placeholder:text-charcoal-500 focus:outline-none focus:border-brand-500" />
          {errors.name && <p className="text-red-400 text-xs">{errors.name}</p>}
        </div>
        <div className="space-y-1.5">
          <label className="text-charcoal-300 text-sm">Phone Number <span className="text-red-400">*</span></label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09171234567"
            className="w-full px-3 py-2.5 rounded-lg bg-charcoal-800 border border-charcoal-700 text-white text-sm placeholder:text-charcoal-500 focus:outline-none focus:border-brand-500" />
          {errors.phone && <p className="text-red-400 text-xs">{errors.phone}</p>}
        </div>
        <div className="space-y-1.5">
          <label className="text-charcoal-300 text-sm">
            Email <span className="text-charcoal-500 text-xs font-normal">(optional — to receive confirmation)</span>
          </label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="maria@email.com" type="email"
            className="w-full px-3 py-2.5 rounded-lg bg-charcoal-800 border border-charcoal-700 text-white text-sm placeholder:text-charcoal-500 focus:outline-none focus:border-brand-500" />
          {errors.email && <p className="text-red-400 text-xs">{errors.email}</p>}
        </div>

        {sessionType === "milestone" && (
          <>
            <div className="flex items-center gap-2 pt-1">
              <div className="flex-1 h-px bg-charcoal-700" />
              <span className="text-charcoal-500 text-xs uppercase tracking-wider">🎂 Milestone Details</span>
              <div className="flex-1 h-px bg-charcoal-700" />
            </div>
            <div className="space-y-1.5">
              <label className="text-charcoal-300 text-sm">Celebrant Name <span className="text-red-400">*</span></label>
              <input value={celebrantName} onChange={(e) => setCelebrantName(e.target.value)} placeholder="e.g. Sofia Grace"
                className="w-full px-3 py-2.5 rounded-lg bg-charcoal-800 border border-charcoal-700 text-white text-sm placeholder:text-charcoal-500 focus:outline-none focus:border-brand-500" />
              {errors.celebrantName && <p className="text-red-400 text-xs">{errors.celebrantName}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-charcoal-300 text-sm">Turning Age <span className="text-red-400">*</span></label>
              <input value={turningAge} onChange={(e) => setTurningAge(e.target.value)} placeholder="e.g. 7"
                className="w-full px-3 py-2.5 rounded-lg bg-charcoal-800 border border-charcoal-700 text-white text-sm placeholder:text-charcoal-500 focus:outline-none focus:border-brand-500" />
              {errors.turningAge && <p className="text-red-400 text-xs">{errors.turningAge}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-charcoal-300 text-sm">Theme <span className="text-red-400">*</span></label>
              <select value={milestoneTheme} onChange={(e) => setMilestoneTheme(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-charcoal-800 border border-charcoal-700 text-white text-sm focus:outline-none focus:border-brand-500">
                <option value="">— Select a theme —</option>
                <option value="Car">🚗 Car</option>
                <option value="Jungle">🌿 Jungle</option>
                <option value="Police">👮 Police</option>
                <option value="Pink Castle">🏰 Pink Castle</option>
                <option value="Mermaid">🧜 Mermaid</option>
              </select>
              {errors.milestoneTheme && <p className="text-red-400 text-xs">{errors.milestoneTheme}</p>}
            </div>
          </>
        )}

        <div className="flex items-start gap-2 p-3 rounded-lg bg-charcoal-800 border border-charcoal-700 text-xs text-charcoal-400">
          <Clock size={13} className="shrink-0 mt-0.5 text-amber-400" />
          <span><strong className="text-amber-400">Late policy:</strong> Arrivals 15 minutes or more past your scheduled time will incur a ₱50 late fee.</span>
        </div>
        <button onClick={() => { if (validateInfo()) setStep("payment"); }}
          className="w-full py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm transition-colors">
          Continue
        </button>
      </div>
    </div>
  );

  // ── Step: Payment / GCash Downpayment ─────────────────────────────────────
  if (step === "payment") return (
    <div>
      <button onClick={() => setStep("info")} className="flex items-center gap-1 text-charcoal-400 hover:text-white text-sm mb-4 transition-colors">
        <ChevronLeft size={16} /> Back
      </button>
      <StepIndicator index={stepIndex} total={totalSteps} />
      <h2 className="text-white font-semibold text-lg mb-1">Send Downpayment</h2>
      <p className="text-charcoal-400 text-sm mb-5">
        A downpayment is required to secure your booking slot.
      </p>

      {/* Amount card */}
      <div className="text-center bg-charcoal-800 border border-charcoal-700 rounded-xl p-5 mb-5">
        <p className="text-charcoal-400 text-sm mb-1">Required downpayment</p>
        <p className="text-4xl font-bold text-brand-400">{formatPeso(requiredDownpayment)}</p>
        <p className="text-charcoal-500 text-xs mt-2">
          Balance of{" "}
          <span className="text-charcoal-300 font-medium">{formatPeso(grandTotal - requiredDownpayment)}</span>{" "}
          is due on your session day
        </p>
      </div>

      {/* GCash QR */}
      <div className="flex flex-col items-center mb-4">
        <div className="bg-white p-3 rounded-2xl shadow-lg mb-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/gcash-qr.jpg"
            alt="GCash QR Code"
            width={180}
            height={180}
            className="object-contain rounded-lg"
          />
        </div>
        <p className="text-charcoal-400 text-sm text-center">
          Scan with your <strong className="text-white">GCash</strong> app
        </p>
      </div>

      {/* Manual GCash number */}
      <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl p-4 mb-5">
        <p className="text-charcoal-500 text-xs uppercase tracking-wider mb-3">Or send directly to</p>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-white font-bold text-lg tracking-wide">{GCASH_NUMBER}</p>
            <p className="text-charcoal-400 text-sm">{GCASH_NAME}</p>
          </div>
          <button
            onClick={copyGcashNumber}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              copied
                ? "bg-green-500/15 border border-green-500/30 text-green-400"
                : "bg-charcoal-700 hover:bg-charcoal-600 text-charcoal-300 hover:text-white"
            }`}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <p className="text-charcoal-600 text-xs mt-3">
          Send exactly <strong className="text-brand-400">{formatPeso(requiredDownpayment)}</strong> — use your GCash app or ask someone to help you.
        </p>
      </div>

      {/* Receipt upload */}
      <div className="mb-4 space-y-2">
        <div className="flex items-center gap-1.5">
          <p className="text-charcoal-300 text-sm font-medium">GCash Receipt <span className="text-red-400">*</span></p>
        </div>
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs mb-2">
          <AlertCircle size={13} className="shrink-0 mt-0.5" />
          Screenshot your GCash receipt <strong>before closing the app</strong>, then upload it here.
        </div>

        {receiptPreview ? (
          <div className="relative rounded-xl overflow-hidden border border-charcoal-700">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={receiptPreview} alt="Receipt preview" className="w-full max-h-52 object-contain bg-charcoal-800" />
            <button
              onClick={removeReceipt}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-charcoal-900/80 flex items-center justify-center text-charcoal-300 hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
            <div className="px-3 py-2 bg-charcoal-800 flex items-center gap-1.5 text-xs text-green-400">
              <Check size={12} /> Receipt ready to upload
            </div>
          </div>
        ) : (
          <label className="flex flex-col items-center gap-2 p-6 rounded-xl border-2 border-dashed border-charcoal-700 hover:border-brand-500/50 hover:bg-brand-500/5 transition-colors cursor-pointer">
            <Upload size={24} className="text-charcoal-500" />
            <span className="text-charcoal-400 text-sm">Tap to upload screenshot</span>
            <span className="text-charcoal-600 text-xs">JPG, PNG · Max 5MB</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleReceiptChange}
              className="hidden"
            />
          </label>
        )}
      </div>

      {/* Confirmation checkbox */}
      <label className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors mb-4 ${
        downpaymentConfirmed
          ? "bg-green-500/10 border-green-500/30"
          : "bg-charcoal-800 border-charcoal-700 hover:border-charcoal-600"
      }`}>
        <input
          type="checkbox"
          checked={downpaymentConfirmed}
          onChange={(e) => setDownpaymentConfirmed(e.target.checked)}
          className="mt-0.5 accent-brand-500 shrink-0"
        />
        <span className="text-charcoal-300 text-sm leading-relaxed">
          I have sent <strong className="text-white">{formatPeso(requiredDownpayment)}</strong> via GCash and uploaded my receipt.
          I understand my booking will be confirmed after the studio verifies the payment.
        </span>
      </label>

      {serverError && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-4">
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          {serverError}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!downpaymentConfirmed || !receiptFile || isPending}
        className="w-full py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isPending ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin" /> Uploading &amp; submitting…
          </span>
        ) : isRequestBooking ? "Submit Booking Request" : "Confirm My Booking"}
      </button>
    </div>
  );

  // ── Step: Success ─────────────────────────────────────────────────────────
  return (
    <div className="text-center">
      <div className="w-16 h-16 rounded-full bg-green-500/15 border border-green-500/25 flex items-center justify-center mx-auto mb-5">
        <CheckCircle2 size={32} className="text-green-400" />
      </div>
      <h2 className="text-white font-bold text-xl mb-2">
        {result?.status === "pending" ? "Request Submitted!" : "You're Booked! 🎉"}
      </h2>
      <p className="text-charcoal-400 text-sm mb-6 leading-relaxed">
        {result?.status === "pending"
          ? "We received your booking request and downpayment. The studio will confirm your schedule shortly."
          : "Your downpayment receipt has been received. The studio will verify it and confirm your slot shortly."}
        {email && " A confirmation has been sent to your email."}
      </p>

      <div className="bg-charcoal-900 border border-charcoal-700 rounded-xl p-4 mb-6 text-left space-y-2">
        <p className="text-charcoal-500 text-xs uppercase tracking-wider mb-3">Your Booking</p>
        <div className="flex justify-between text-sm">
          <span className="text-charcoal-400">Package</span>
          <span className="text-white">{selectedService?.name}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-charcoal-400">Date</span>
          <span className="text-white">{date}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-charcoal-400">Time</span>
          <span className="text-white">{formatSlotLabel(time)}{isRequestBooking ? " (preferred)" : ""}</span>
        </div>
        {sessionType === "milestone" && (
          <>
            <div className="flex justify-between text-sm">
              <span className="text-charcoal-400">Celebrant</span>
              <span className="text-white">{celebrantName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-charcoal-400">Turning</span>
              <span className="text-white">{turningAge}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-charcoal-400">Theme</span>
              <span className="text-white">{milestoneTheme}</span>
            </div>
          </>
        )}
        {selectedAddons.length > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-charcoal-400">Add-ons</span>
            <span className="text-brand-400">+{formatPeso(addonTotal)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm border-t border-charcoal-700 pt-2 mt-1">
          <span className="text-charcoal-400">Total</span>
          <span className="text-white font-bold">{formatPeso(grandTotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-charcoal-400">Downpayment sent</span>
          <span className="text-green-400 font-medium">{formatPeso(requiredDownpayment)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-charcoal-400">Balance on session day</span>
          <span className="text-amber-400 font-medium">{formatPeso(grandTotal - requiredDownpayment)}</span>
        </div>
      </div>

      <div className="space-y-3">
        <a href={bookingUrl}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm transition-colors">
          <CalendarDays size={16} />
          View My Booking Status
        </a>
        <p className="text-charcoal-600 text-xs">Save this link to check your booking anytime:</p>
        <p className="text-brand-400 text-xs break-all bg-charcoal-900 border border-charcoal-800 rounded-lg px-3 py-2">
          {bookingUrl}
        </p>
      </div>
    </div>
  );
}
