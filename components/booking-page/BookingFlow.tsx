"use client";

import { useState, useTransition, useMemo } from "react";
import { getAvailableSlots, getBookedMilestoneSlots, createPublicBooking } from "@/app/book/actions";
import {
  MILESTONE_EARLY_SLOTS, MILESTONE_LATE_SLOTS,
  type MilestoneHalfDay,
  type SlotAvailabilityReason,
  getStudioHoursForDate, formatSlotLabel, getSelfShootBlockMinutes,
} from "@/lib/utils/slots";
import { formatPeso } from "@/lib/utils/formatters";
import { getSelfShootAddons } from "@/lib/booking-addons";
import { createClient } from "@/lib/supabase/client";
import {
  ChevronLeft, CheckCircle2, Loader2, AlertCircle,
  Clock, CalendarDays, Copy, Check, Upload, X, MessageCircle,
  Camera, Cake, PartyPopper, MapPin,
  type LucideIcon,
} from "lucide-react";
import { MESSENGER_URL } from "@/lib/studio";
import type { Service } from "@/types";

type Step = "type" | "theme" | "package" | "additionals" | "event" | "datetime" | "info" | "payment" | "success";
type SessionType = "self-shoot" | "milestone" | "coverage";

const SESSION_TYPES: { id: SessionType; icon: LucideIcon; label: string; desc: string; img: string; tag: string }[] = [
  {
    id: "self-shoot",
    icon: Camera,
    label: "Self-Shoot",
    desc: "Solo, couples, or group sessions inside the studio",
    img: "/packages/solo-muna.jpg",
    tag: "Studio",
  },
  {
    id: "milestone",
    icon: Cake,
    label: "Milestone",
    desc: "Birthday, baptism, or special occasion shoots",
    img: "/theme-photos/pink-castle.jpg",
    tag: "Setup",
  },
  {
    id: "coverage",
    icon: PartyPopper,
    label: "Photo Coverage",
    desc: "Event coverage at your venue",
    img: "/coverage/Debut.jpg",
    tag: "Event",
  },
];

const STEPS_SELF_SHOOT: Step[] = ["type", "package", "additionals", "datetime", "info", "payment"];
const STEPS_MILESTONE: Step[]  = ["type", "theme", "package", "datetime", "info", "payment"];
const STEPS_COVERAGE: Step[]   = ["type", "package", "event", "datetime", "info", "payment"];
const MAX_STEPS = Math.max(STEPS_SELF_SHOOT.length, STEPS_MILESTONE.length, STEPS_COVERAGE.length);

const STEP_LABELS: Record<Step, string> = {
  type: "Session",
  theme: "Theme",
  package: "Package",
  additionals: "Add-ons",
  event: "Event Details",
  datetime: "Schedule",
  info: "Contact",
  payment: "Payment",
  success: "Done",
};

// Milestone themes — each with its sample setup photo in /public/theme-photos.
const MILESTONE_THEMES: { value: string; emoji: string; img: string }[] = [
  { value: "Car",         emoji: "🚗", img: "/theme-photos/car.jpg" },
  { value: "Jungle",      emoji: "🌿", img: "/theme-photos/jungle.jpg" },
  { value: "Police",      emoji: "👮", img: "/theme-photos/police.jpg" },
  { value: "Pink Castle", emoji: "🏰", img: "/theme-photos/pink-castle.jpg" },
  { value: "Mermaid",     emoji: "🧜", img: "/theme-photos/mermaid.jpg" },
];

const COVERAGE_EVENT_TYPES = ["Debut", "Birthday", "Baptism", "Wedding", "Other"] as const;
const COVERAGE_SECOND_PLACE_EVENTS = new Set<string>(["Baptism", "Wedding"]);
const NEARBY_PANDI_TERMS = [
  "pandi",
  "bunsuran",
  "cacarong",
  "mapulang lupa",
  "malibong",
  "masagana",
  "masuso",
  "pinagkuartelan",
  "bagbaguin",
  "baka-bakahan",
  "manatal",
  "balagtas",
  "bocaue",
  "santa maria",
  "sta maria",
  "plaridel",
  "bustos",
];

const GCASH_NUMBER = "09623028470";
const GCASH_NAME   = "Daniel R.";

// Manila calendar date — the studio and its customers are in PH (UTC+8).
// Using UTC here could be off by a day near midnight Manila time.
const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });

// Sample photo for each package card. Files live in /public.
function packageImage(name: string): string | null {
  const n = name.toLowerCase();
  if (n.includes("solo")) return "/packages/solo-muna.jpg";
  if (n.includes("pakner")) return "/packages/pakners.jpg";
  if (n.includes("trio")) return "/packages/trio.jpg";
  if (n.includes("tropa")) return "/packages/tropa-time.jpg";
  if (n.includes("family")) return "/packages/family.jpg";
  if (n.includes("wedding")) return "/coverage/Wedding.jpg";
  if (n.includes("baptism") || n.includes("christening")) return "/coverage/Baptism.jpg";
  if (n.includes("debut")) return "/coverage/Debut.jpg";
  if (n.includes("birthday")) return "/coverage/7th Birthday.jpg";
  return null;
}

function normalizeAddress(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
}

function getCoverageTransportEstimate(primaryPlace: string, secondaryPlace: string) {
  const places = [primaryPlace, secondaryPlace]
    .map((place) => normalizeAddress(place))
    .filter(Boolean);

  if (places.length === 0) {
    return {
      label: "Waiting for address",
      fee: 0,
      detected: false,
    };
  }

  const isNearby = places.every((place) =>
    NEARBY_PANDI_TERMS.some((term) => place.includes(term))
  );

  return {
    label: isNearby ? "Pandi / nearby" : "Outside / far",
    fee: isNearby ? 0 : 300,
    detected: true,
  };
}

function StepIndicator({ index, total, label }: { index: number; total: number; label: string }) {
  if (index < 0) return null;
  return (
    <div className="mb-6">
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="font-semibold uppercase tracking-[0.16em] text-brand-300">{label}</span>
        <span className="text-charcoal-500">Step {index + 1} of {total}</span>
      </div>
      <div className="flex gap-1">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${i <= index ? "bg-brand-500" : "bg-charcoal-800"}`}
          />
        ))}
      </div>
    </div>
  );
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
  const [slotsReason, setSlotsReason] = useState<SlotAvailabilityReason | null>(null);
  const [blockedReason, setBlockedReason] = useState<string | null>(null);
  const [halfDay, setHalfDay] = useState<MilestoneHalfDay | null>(null);
  const [bookedMilestoneSlots, setBookedMilestoneSlots] = useState<string[]>([]);
  const [milestoneDateClosed, setMilestoneDateClosed] = useState<{ closed: boolean; reason: string | null }>({ closed: false, reason: null });
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [celebrantName, setCelebrantName] = useState("");
  const [turningAge, setTurningAge] = useState("");
  const [milestoneTheme, setMilestoneTheme] = useState("");
  const [coverageEventType, setCoverageEventType] = useState("");
  const [coveragePlacePrimary, setCoveragePlacePrimary] = useState("");
  const [coveragePlaceSecondary, setCoveragePlaceSecondary] = useState("");
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

  const stepsForFlow =
    sessionType === "self-shoot" ? STEPS_SELF_SHOOT
    : sessionType === "milestone" ? STEPS_MILESTONE
    : STEPS_COVERAGE;
  const stepIndex = stepsForFlow.indexOf(step);
  const totalSteps = stepsForFlow.length;

  const requiredDownpayment = sessionType === "self-shoot" ? 50 : 200;

  const addons = useMemo(() => getSelfShootAddons(selectedService?.name), [selectedService]);

  const selectedAddons = addons.filter((a) => selectedAddonIds.has(a.id));
  const addonTotal = selectedAddons.reduce((sum, a) => sum + a.price, 0);
  const coverageTransportEstimate = getCoverageTransportEstimate(coveragePlacePrimary, coveragePlaceSecondary);
  const coverageTransportFee = sessionType === "coverage" && coverageTransportEstimate.detected ? coverageTransportEstimate.fee : 0;
  const grandTotal = (selectedService?.price ?? 0) + addonTotal + coverageTransportFee;
  const canAddSecondPlace = COVERAGE_SECOND_PLACE_EVENTS.has(coverageEventType);
  const isWeddingCoveragePackage = selectedService?.name.toLowerCase().includes("wedding") ?? false;

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
    setSlotsReason(null);
    setBlockedReason(null);
    setBookedMilestoneSlots([]);
    setMilestoneDateClosed({ closed: false, reason: null });
    if (!selectedService || !d) return;
    setLoadingSlots(true);
    if (isRequestBooking) {
      const result = await getBookedMilestoneSlots(d);
      setBookedMilestoneSlots(result.booked);
      setMilestoneDateClosed({ closed: result.closed, reason: result.closedReason ?? null });
    } else {
      const result = await getAvailableSlots(d, selectedService.id);
      setSlots(result.slots);
      setSlotsReason(result.reason);
      setBlockedReason(result.blockedReason ?? null);
    }
    setLoadingSlots(false);
  };

  const validateInfo = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Name is required";
    const cleanPhone = phone.replace(/[\s-]/g, "");
    if (!phone.trim()) e.phone = "Phone is required";
    else if (!/^(09\d{9}|\+639\d{9})$/.test(cleanPhone)) e.phone = "Enter a valid PH mobile number (e.g. 09171234567)";
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Enter a valid email";
    if (sessionType === "milestone") {
      if (!celebrantName.trim()) e.celebrantName = "Celebrant name is required";
      if (!turningAge.trim()) e.turningAge = "Turning age is required";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateCoverage = () => {
    const e: Record<string, string> = {};
    if (!coverageEventType) e.coverageEventType = "Event type is required";
    if (!coveragePlacePrimary.trim()) e.coveragePlacePrimary = "Event place is required";
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
      if (sessionType === "coverage") {
        noteParts.push(`Event: ${coverageEventType}`);
        noteParts.push(`Place: ${coveragePlacePrimary.trim()}`);
        if (canAddSecondPlace && coveragePlaceSecondary.trim()) {
          noteParts.push(`Second place: ${coveragePlaceSecondary.trim()}`);
        }
        if (coverageTransportEstimate.detected) {
          noteParts.push(`Transport estimate: ${coverageTransportEstimate.label} (${formatPeso(coverageTransportFee)}, may change after photographer review)`);
        }
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
        eventType: sessionType === "coverage" ? coverageEventType : undefined,
        eventPlacePrimary: sessionType === "coverage" ? coveragePlacePrimary.trim() : undefined,
        eventPlaceSecondary: sessionType === "coverage" && canAddSecondPlace ? coveragePlaceSecondary.trim() : undefined,
      });

      if ("error" in res) { setServerError(res.error); return; }
      setResult({ token: res.token, status: res.status });
      setStep("success");
    });
  };

  const bookingUrl = result ? `${window.location.origin}/my-booking/${result.token}` : "";

  // ── Step: Session Type ────────────────────────────────────────────────────
  if (step === "type") return (
    <div key="step-type" className="min-w-0 animate-fade-in-up">
      <StepIndicator index={0} total={MAX_STEPS} label={STEP_LABELS.type} />
      <h2 className="text-white font-semibold text-xl mb-1">What type of session?</h2>
      <p className="text-charcoal-400 text-sm mb-5">Choose the session that fits your occasion</p>
      <div className="space-y-3">
        {SESSION_TYPES.map((t) => {
          const Icon = t.icon;
          return (
          <button key={t.id} onClick={() => {
              setSessionType(t.id);
              setSelectedService(null);
              setSelectedAddonIds(new Set());
              setCoverageEventType("");
              setCoveragePlacePrimary("");
              setCoveragePlaceSecondary("");
              setStep(t.id === "milestone" ? "theme" : "package");
            }}
            className="group flex min-w-0 w-full max-w-full overflow-hidden rounded-xl border border-white/10 bg-charcoal-900/80 text-left shadow-lg shadow-black/20 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-brand-500/60 hover:bg-brand-500/5 hover:shadow-brand-500/10 active:translate-y-0 active:scale-[0.99]">
            <div className="relative min-h-[96px] w-[92px] shrink-0 overflow-hidden bg-charcoal-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={t.img} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/10 to-black/45" />
              <div className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur">
                <Icon size={11} />
                {t.tag}
              </div>
            </div>
            <div className="min-w-0 p-4">
              <p className="text-base font-semibold text-white">{t.label}</p>
              <p className="mt-1 whitespace-normal break-words text-sm leading-5 text-charcoal-400">{t.desc}</p>
              <span className="mt-3 inline-flex items-center text-xs font-semibold text-brand-300">
                Select package
              </span>
            </div>
          </button>
        );})}
      </div>
    </div>
  );

  // ── Step: Theme (Milestone only) ──────────────────────────────────────────
  if (step === "theme") return (
    <div key="step-theme" className="animate-fade-in-up">
      <button onClick={() => setStep("type")} className="flex items-center gap-1 text-charcoal-400 hover:text-white text-sm mb-4 transition-colors">
        <ChevronLeft size={16} /> Back
      </button>
      <StepIndicator index={stepIndex} total={totalSteps} label={STEP_LABELS.theme} />
      <h2 className="text-white font-semibold text-lg mb-1">Pick a theme</h2>
      <p className="text-charcoal-400 text-sm mb-5">Choose the setup for your milestone shoot — tap one to continue</p>
      <div className="grid grid-cols-2 gap-2.5">
        {MILESTONE_THEMES.map((t) => {
          const selected = milestoneTheme === t.value;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => { setMilestoneTheme(t.value); setStep("package"); }}
              className={`relative rounded-xl overflow-hidden border text-left transition-all duration-200 active:scale-[0.98] ${
                selected
                  ? "border-brand-500 ring-2 ring-brand-500/40"
                  : "border-charcoal-700 hover:border-brand-500/50"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={t.img} alt={t.value} className="w-full aspect-[4/3] object-cover" />
              <div className="flex items-center justify-between gap-1 px-3 py-2.5 bg-charcoal-800">
                <span className={`text-sm font-medium ${selected ? "text-brand-300" : "text-white"}`}>
                  {t.emoji} {t.value}
                </span>
                {selected && <CheckCircle2 size={15} className="text-brand-400 shrink-0" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  // ── Step: Package ─────────────────────────────────────────────────────────
  if (step === "package") return (
    <div key="step-package" className="animate-fade-in-up">
      <button onClick={() => setStep(sessionType === "milestone" ? "theme" : "type")} className="flex items-center gap-1 text-charcoal-400 hover:text-white text-sm mb-4 transition-colors">
        <ChevronLeft size={16} /> Back
      </button>
      <StepIndicator index={stepIndex} total={totalSteps} label={STEP_LABELS.package} />
      <h2 className="text-white font-semibold text-lg mb-1">Choose a package</h2>
      <p className="text-charcoal-400 text-sm mb-5">All prices are in Philippine Peso (₱)</p>
      {sessionType === "self-shoot" && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs mb-4">
          <span className="shrink-0 mt-0.5">✨</span>
          You can add extras (hard copies, backgrounds, props, etc.) on the next step.
        </div>
      )}
      <div className="space-y-3">
        {filteredServices.map((s) => {
          const img = packageImage(s.name);
          const isWeddingPackage = s.name.toLowerCase().includes("wedding");
          return (
            <button key={s.id} onClick={() => {
              setSelectedService(s);
              setSelectedAddonIds(new Set());
              if (sessionType === "coverage") {
                setCoverageEventType(isWeddingPackage ? "Wedding" : "");
              }
              setDate("");
              setTime("");
              setSlots([]);
              setStep(
                sessionType === "self-shoot" ? "additionals"
                : sessionType === "coverage" ? "event"
                : "datetime"
              );
            }}
              className="w-full p-4 rounded-xl bg-charcoal-900 border border-charcoal-700 hover:border-brand-500/60 hover:bg-brand-500/5 hover:shadow-lg hover:shadow-brand-500/10 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all duration-200 ease-out text-left">
              <div className="flex items-start gap-3">
                {img && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={img}
                    alt={s.name}
                    className="w-24 h-32 rounded-lg object-cover shrink-0 border border-charcoal-700"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-white font-semibold">{s.name}</p>
                  {s.description && <p className="text-charcoal-400 text-xs mt-0.5">{s.description}</p>}
                  <ul className="mt-2 space-y-0.5">
                    {s.inclusions.map((inc, i) => (
                      <li key={i} className="text-charcoal-400 text-xs flex items-center gap-1">
                        <span className="text-brand-500">✓</span> {inc}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-brand-400 font-bold text-lg">{formatPeso(s.price)}</p>
                  <p className="text-charcoal-500 text-xs">{s.duration_minutes} min</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  // ── Step: Additionals (Self-Shoot only) ───────────────────────────────────
  if (step === "additionals") return (
    <div key="step-additionals" className="animate-fade-in-up">
      <button onClick={() => setStep("package")} className="flex items-center gap-1 text-charcoal-400 hover:text-white text-sm mb-4 transition-colors">
        <ChevronLeft size={16} /> Back
      </button>
      <StepIndicator index={stepIndex} total={totalSteps} label={STEP_LABELS.additionals} />
      <h2 className="text-white font-semibold text-lg mb-1">
        Add-ons <span className="text-charcoal-500 text-sm font-normal">(optional)</span>
      </h2>
      <p className="text-charcoal-400 text-sm mb-5">Customize your session with extras</p>

      <div className="space-y-2 mb-5">
        {addons.map((addon) => {
          const checked = selectedAddonIds.has(addon.id);
          return (
            <label key={addon.id}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-200 active:scale-[0.99] ${
                checked
                  ? "bg-brand-500/10 border-brand-500/40 ring-1 ring-brand-500/30 shadow-sm shadow-brand-500/20"
                  : "bg-charcoal-800 border-charcoal-700 hover:border-brand-500/40 hover:bg-charcoal-800/80"
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
        className="w-full py-3.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm shadow-lg shadow-brand-500/30 hover:shadow-xl hover:shadow-brand-500/40 active:scale-[0.98] transition-all duration-200 ease-out">
        Continue
      </button>
    </div>
  );

  // ── Step: Date & Time ─────────────────────────────────────────────────────
  if (step === "event") return (
    <div key="step-event" className="animate-fade-in-up">
      <button onClick={() => setStep("package")} className="flex items-center gap-1 text-charcoal-400 hover:text-white text-sm mb-4 transition-colors">
        <ChevronLeft size={16} /> Back
      </button>
      <StepIndicator index={stepIndex} total={totalSteps} label={STEP_LABELS.event} />
      <h2 className="text-white font-semibold text-xl mb-1">Event details</h2>
      <p className="text-charcoal-400 text-sm mb-5">Tell us what we&apos;re covering and where we&apos;re going</p>

      {isWeddingCoveragePackage ? (
        <div className="mb-5 rounded-xl border border-brand-500 bg-brand-500/15 px-3 py-3 text-sm font-semibold text-brand-200 ring-2 ring-brand-500/25">
          Wedding
          <p className="mt-1 text-xs font-normal text-charcoal-400">
            Event type is fixed because you chose a wedding package.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 mb-5">
          {COVERAGE_EVENT_TYPES.map((event) => {
            const selected = coverageEventType === event;
            return (
              <button
                key={event}
                type="button"
                onClick={() => {
                  setCoverageEventType(event);
                  if (!COVERAGE_SECOND_PLACE_EVENTS.has(event)) setCoveragePlaceSecondary("");
                }}
                className={`rounded-xl border px-3 py-3 text-left text-sm font-semibold transition-all duration-200 active:scale-[0.98] ${
                  selected
                    ? "border-brand-500 bg-brand-500/15 text-brand-200 ring-2 ring-brand-500/25"
                    : "border-charcoal-700 bg-charcoal-800 text-charcoal-300 hover:border-brand-500/40 hover:text-white"
                }`}
              >
                {event}
              </button>
            );
          })}
        </div>
      )}
      {errors.coverageEventType && <p className="text-red-400 text-xs -mt-3 mb-4">{errors.coverageEventType}</p>}

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-charcoal-300 text-sm">Full address <span className="text-red-400">*</span></label>
          <div className="relative">
            <MapPin size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-500" />
            <input
              value={coveragePlacePrimary}
              onChange={(e) => setCoveragePlacePrimary(e.target.value)}
              placeholder="e.g. St. Augustine Parish, Pandi"
              className="w-full rounded-lg border border-charcoal-700 bg-charcoal-800 px-9 py-2.5 text-sm text-white placeholder:text-charcoal-500 focus:outline-none focus:border-brand-500"
            />
          </div>
          <p className="text-xs text-charcoal-500">Include the town or municipality so we can estimate transpo.</p>
          {errors.coveragePlacePrimary && <p className="text-red-400 text-xs">{errors.coveragePlacePrimary}</p>}
        </div>

        {canAddSecondPlace && (
          <div className="space-y-1.5">
            <label className="text-charcoal-300 text-sm">
              Second address <span className="text-charcoal-500 text-xs font-normal">(optional)</span>
            </label>
            <div className="relative">
              <MapPin size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-500" />
              <input
                value={coveragePlaceSecondary}
                onChange={(e) => setCoveragePlaceSecondary(e.target.value)}
                placeholder="e.g. Reception venue"
                className="w-full rounded-lg border border-charcoal-700 bg-charcoal-800 px-9 py-2.5 text-sm text-white placeholder:text-charcoal-500 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>
        )}

        <div className="rounded-xl border border-charcoal-700 bg-charcoal-800 px-3 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-charcoal-200">Transport estimate</p>
              <p className="mt-0.5 text-xs text-charcoal-500">
                Based on the address you entered.
              </p>
            </div>
            <span className={`shrink-0 text-sm font-bold ${coverageTransportFee > 0 ? "text-brand-400" : "text-green-400"}`}>
              {!coverageTransportEstimate.detected
                ? "Auto"
                : coverageTransportFee > 0 ? `+${formatPeso(coverageTransportFee)}` : "Free"}
            </span>
          </div>
          {coverageTransportEstimate.detected && (
            <p className="mt-2 text-xs text-charcoal-400">{coverageTransportEstimate.label}</p>
          )}
          <p className="mt-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs leading-5 text-amber-300">
            Transpo fee is not final. It can still change after you talk with the photographer.
          </p>
        </div>

        {canAddSecondPlace && (
          <div className="rounded-lg border border-brand-500/20 bg-brand-500/10 px-3 py-2.5 text-xs leading-5 text-brand-200">
            For baptism or wedding, the first place is usually church or ceremony. The second place can be the reception venue.
          </div>
        )}

        <button
          onClick={() => { if (validateCoverage()) setStep("datetime"); }}
          className="w-full rounded-xl bg-brand-500 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 transition-all duration-200 ease-out hover:bg-brand-600 hover:shadow-xl hover:shadow-brand-500/40 active:scale-[0.98]"
        >
          Continue
        </button>
      </div>
    </div>
  );

  if (step === "datetime") return (
    <div key="step-datetime" className="animate-fade-in-up">
      <button onClick={() => setStep(
        sessionType === "self-shoot" ? "additionals"
        : sessionType === "coverage" ? "event"
        : "package"
      )}
        className="flex items-center gap-1 text-charcoal-400 hover:text-white text-sm mb-4 transition-colors">
        <ChevronLeft size={16} /> Back
      </button>
      <StepIndicator index={stepIndex} total={totalSteps} label={STEP_LABELS.datetime} />
      <h2 className="text-white font-semibold text-lg mb-1">Pick a date &amp; time</h2>
      {isRequestBooking && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm mb-4">
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          This is a booking <strong>request</strong>. We&apos;ll confirm your preferred schedule after reviewing availability.
        </div>
      )}
      {sessionType === "self-shoot" && selectedService && (
        <div className="flex items-start gap-2 text-xs text-charcoal-500 mb-4">
          <Clock size={13} className="shrink-0 mt-0.5" />
          <span>
            Your <strong className="text-charcoal-300">{selectedService.name}</strong> session is{" "}
            <strong className="text-charcoal-300">
              {getSelfShootBlockMinutes(selectedService.name) === 90 ? "1.5 hours" : "1 hour"}
            </strong>, starting exactly at your booked time —{" "}
            <strong className="text-charcoal-300">bawal ma-late po!</strong> 15+ minutes late means a ₱50 fee,
            and a no-show means your downpayment is non-refundable.
          </span>
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
            ) : milestoneDateClosed.closed ? (
              <div className="flex items-start gap-2 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Studio is closed on this date.</p>
                  {milestoneDateClosed.reason && (
                    <p className="text-red-300/80 text-xs mt-0.5">Reason: {milestoneDateClosed.reason}</p>
                  )}
                  <p className="text-red-300/80 text-xs mt-1">Please pick another date.</p>
                </div>
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
                      className={`w-full p-4 rounded-xl border text-left transition-all duration-200 ease-out ${
                        allBooked
                          ? "bg-charcoal-900 border-charcoal-800 opacity-40 cursor-not-allowed"
                          : "bg-charcoal-800 border-charcoal-700 hover:border-brand-500/60 hover:bg-brand-500/5 hover:shadow-lg hover:shadow-brand-500/10 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99]"
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
                        className={`py-2.5 rounded-lg border text-sm font-medium transition-all duration-200 active:scale-[0.97] ${
                          isBooked
                            ? "bg-charcoal-900 border-charcoal-800 text-charcoal-700 cursor-not-allowed line-through"
                            : time === slot
                            ? "bg-brand-500/20 border-brand-500/60 text-brand-300 ring-2 ring-brand-500/30 shadow-md shadow-brand-500/20"
                            : "bg-charcoal-800 border-charcoal-700 text-charcoal-300 hover:border-brand-500/40 hover:bg-brand-500/5 hover:text-white"
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
            slotsReason === "blocked" ? (
              <div className="flex items-start gap-2 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Studio is closed on this date.</p>
                  {blockedReason && (
                    <p className="text-red-300/80 text-xs mt-0.5">Reason: {blockedReason}</p>
                  )}
                  <p className="text-red-300/80 text-xs mt-1">Please pick another date.</p>
                </div>
              </div>
            ) : slotsReason === "capped" ? (
              <div className="flex items-start gap-2 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Self-shoot sessions fully booked for this date.</p>
                  <p className="text-amber-300/80 text-xs mt-1">Please pick another date.</p>
                </div>
              </div>
            ) : slotsReason === "closed-day" ? (
              <div className="text-center py-6">
                <p className="text-charcoal-500 text-sm">Studio is closed on this day of the week.</p>
                <p className="text-charcoal-600 text-xs mt-1">Try picking another date.</p>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-charcoal-500 text-sm">No available slots for this day.</p>
                <p className="text-charcoal-600 text-xs mt-1">Try picking a different date.</p>
              </div>
            )
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {slots.map((slot) => (
                <button key={slot} onClick={() => setTime(slot)}
                  className={`py-2.5 rounded-lg border text-sm font-medium transition-all duration-200 active:scale-[0.97] ${
                    time === slot
                      ? "bg-brand-500/20 border-brand-500/60 text-brand-300 ring-2 ring-brand-500/30 shadow-md shadow-brand-500/20"
                      : "bg-charcoal-800 border-charcoal-700 text-charcoal-300 hover:border-brand-500/40 hover:bg-brand-500/5 hover:text-white"
                  }`}>
                  {formatSlotLabel(slot)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <button onClick={() => setStep("info")} disabled={!date || !time}
        className="w-full mt-6 py-3.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm shadow-lg shadow-brand-500/30 hover:shadow-xl hover:shadow-brand-500/40 active:scale-[0.98] transition-all duration-200 ease-out disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:scale-100">
        Continue
      </button>
    </div>
  );

  // ── Step: Personal Info ───────────────────────────────────────────────────
  if (step === "info") return (
    <div key="step-info" className="animate-fade-in-up">
      <button onClick={() => setStep("datetime")} className="flex items-center gap-1 text-charcoal-400 hover:text-white text-sm mb-4 transition-colors">
        <ChevronLeft size={16} /> Back
      </button>
      <StepIndicator index={stepIndex} total={totalSteps} label={STEP_LABELS.info} />
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
        {sessionType === "coverage" && coverageEventType && (
          <div className="flex justify-between text-sm">
            <span className="text-charcoal-400">Event</span>
            <span className="text-white">{coverageEventType}</span>
          </div>
        )}
        {sessionType === "coverage" && coveragePlacePrimary.trim() && (
          <div className="flex justify-between gap-3 text-sm">
            <span className="text-charcoal-400">Place</span>
            <span className="text-white text-right">{coveragePlacePrimary.trim()}</span>
          </div>
        )}
        {sessionType === "coverage" && canAddSecondPlace && coveragePlaceSecondary.trim() && (
          <div className="flex justify-between gap-3 text-sm">
            <span className="text-charcoal-400">Second place</span>
            <span className="text-white text-right">{coveragePlaceSecondary.trim()}</span>
          </div>
        )}
        {sessionType === "coverage" && coverageTransportEstimate.detected && (
          <div className="flex justify-between text-sm">
            <span className="text-charcoal-400">Transport estimate</span>
            <span className={coverageTransportFee > 0 ? "text-brand-400" : "text-green-400"}>
              {coverageTransportFee > 0 ? `+${formatPeso(coverageTransportFee)}` : "Free"}
            </span>
          </div>
        )}
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
          </>
        )}

        <div className="flex items-start gap-2 p-3 rounded-lg bg-charcoal-800 border border-charcoal-700 text-xs text-charcoal-400">
          <Clock size={13} className="shrink-0 mt-0.5 text-amber-400" />
          <span><strong className="text-amber-400">Bawal ma-late po!</strong> Arrive 15 minutes or more late and there is a ₱50 fee. A no-show means your downpayment is non-refundable.</span>
        </div>
        <button onClick={() => { if (validateInfo()) setStep("payment"); }}
          className="w-full py-3.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm shadow-lg shadow-brand-500/30 hover:shadow-xl hover:shadow-brand-500/40 active:scale-[0.98] transition-all duration-200 ease-out">
          Continue
        </button>
      </div>
    </div>
  );

  // ── Step: Payment / GCash Downpayment ─────────────────────────────────────
  if (step === "payment") return (
    <div key="step-payment" className="animate-fade-in-up">
      <button onClick={() => setStep("info")} className="flex items-center gap-1 text-charcoal-400 hover:text-white text-sm mb-4 transition-colors">
        <ChevronLeft size={16} /> Back
      </button>
      <StepIndicator index={stepIndex} total={totalSteps} label={STEP_LABELS.payment} />
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
          <label className="group flex flex-col items-center gap-2 p-6 rounded-xl border-2 border-dashed border-charcoal-700 hover:border-brand-500/60 hover:bg-brand-500/5 hover:shadow-lg hover:shadow-brand-500/10 active:scale-[0.99] transition-all duration-200 cursor-pointer">
            <Upload size={24} className="text-charcoal-500 transition-all duration-200 group-hover:text-brand-400 group-hover:scale-110" />
            <span className="text-charcoal-400 text-sm group-hover:text-white transition-colors">Tap to upload screenshot</span>
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
        className="w-full py-3.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm shadow-lg shadow-brand-500/30 hover:shadow-xl hover:shadow-brand-500/40 active:scale-[0.98] transition-all duration-200 ease-out disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:scale-100"
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
    <div key="step-success" className="text-center animate-fade-in-up">
      <div className="w-20 h-20 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-green-500/20 animate-scale-bounce">
        <CheckCircle2 size={40} className="text-green-400" />
      </div>
      <h2 className="text-white font-bold text-2xl mb-2">
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
        {sessionType === "coverage" && (
          <>
            <div className="flex justify-between text-sm">
              <span className="text-charcoal-400">Event</span>
              <span className="text-white">{coverageEventType}</span>
            </div>
            <div className="flex justify-between gap-3 text-sm">
              <span className="text-charcoal-400">Place</span>
              <span className="text-white text-right">{coveragePlacePrimary.trim()}</span>
            </div>
            {canAddSecondPlace && coveragePlaceSecondary.trim() && (
              <div className="flex justify-between gap-3 text-sm">
                <span className="text-charcoal-400">Second place</span>
                <span className="text-white text-right">{coveragePlaceSecondary.trim()}</span>
              </div>
            )}
            {coverageTransportEstimate.detected && (
              <div className="flex justify-between text-sm">
                <span className="text-charcoal-400">Transport estimate</span>
                <span className={coverageTransportFee > 0 ? "text-brand-400" : "text-green-400"}>
                  {coverageTransportFee > 0 ? `+${formatPeso(coverageTransportFee)}` : "Free"}
                </span>
              </div>
            )}
          </>
        )}
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
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm shadow-lg shadow-brand-500/30 hover:shadow-xl hover:shadow-brand-500/40 active:scale-[0.98] transition-all duration-200 ease-out animate-soft-pulse">
          <CalendarDays size={16} />
          View My Booking Status
        </a>
        <p className="text-charcoal-600 text-xs">Save this link to check your booking anytime:</p>
        <p className="text-brand-400 text-xs break-all bg-charcoal-900 border border-charcoal-800 rounded-lg px-3 py-2">
          {bookingUrl}
        </p>
        <a href={MESSENGER_URL} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-[#0084FF] hover:bg-[#0072e0] text-white font-semibold text-sm shadow-lg shadow-[#0084FF]/25 active:scale-[0.98] transition-all duration-200 ease-out">
          <MessageCircle size={16} />
          Message Us on Messenger
        </a>
        <p className="text-charcoal-600 text-xs">
          Reach us fast on Facebook — just send your name and booking date.
        </p>
      </div>
    </div>
  );
}
