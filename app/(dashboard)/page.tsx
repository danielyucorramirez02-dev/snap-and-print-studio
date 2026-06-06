import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  CalendarClock, BellRing, Wallet, ChevronRight, CheckCircle2, CalendarRange, ClipboardList,
  ArrowUpRight, Clock, CreditCard, Frame, Image, Mail, Package, PlusCircle, Sparkles, UserX, type LucideIcon,
} from "lucide-react";
import { formatDate, formatTime, formatPeso } from "@/lib/utils/formatters";
import TodayPostCard from "@/components/dashboard/TodayPostCard";
import {
  PRODUCTION_STATUS_LABELS,
  PRODUCTION_STATUS_SHORT_LABELS,
  PRODUCTION_STATUS_STYLES,
  normalizeProductionStatus,
} from "@/lib/booking-production";
import type { Booking, ContentBankItem, InventoryItem } from "@/types";

const PAYMENT_BADGE: Record<string, string> = {
  paid: "bg-green-500/15 text-green-400 border-green-500/25",
  partial: "bg-amber-500/15 text-amber-400 border-amber-500/25",
  unpaid: "bg-red-500/15 text-red-400 border-red-500/25",
};

// The studio runs in the Philippines (UTC+8); "today" must be the Manila date.
function manilaParts() {
  const date = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
  const hour = Number(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Manila", hour12: false, hour: "2-digit" })
  );
  return { date, hour };
}

function addDays(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().split("T")[0];
}

function StatTile({
  icon: Icon, label, value, accent, detail,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  accent: string;
  detail?: string;
}) {
  return (
    <div className="dashboard-card-lift group rounded-lg border border-white/10 bg-[#211f1b]/90 p-4 shadow-sm shadow-black/10 hover:border-white/15 hover:bg-[#24221e]">
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-md ${accent}`}>
          <Icon size={18} />
        </div>
        {detail && <p className="max-w-[8rem] text-right text-[11px] leading-4 text-charcoal-500">{detail}</p>}
      </div>
      <p className="mt-5 text-2xl font-bold leading-none text-white">{value}</p>
      <p className="mt-1.5 text-xs text-charcoal-400">{label}</p>
      <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/[0.045]">
        <div className="dashboard-meter h-full rounded-full bg-brand-400/55" />
      </div>
    </div>
  );
}

function HeroMetric({
  label, value, detail, tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: "brand" | "green" | "blue";
}) {
  const toneClass = {
    brand: "border-brand-500/25 bg-brand-500/10 text-brand-300",
    green: "border-green-500/25 bg-green-500/10 text-green-300",
    blue: "border-sky-500/25 bg-sky-500/10 text-sky-300",
  }[tone];

  return (
    <div className={`dashboard-card-lift rounded-lg border px-3 py-3 ${toneClass}`}>
      <p className="text-2xl font-bold leading-none text-white">{value}</p>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em]">{label}</p>
      <p className="mt-1 text-xs leading-4 text-charcoal-400">{detail}</p>
      <div className="dashboard-scan-line mt-3 h-px rounded-full bg-white/10" />
    </div>
  );
}

function QuickAction({
  href, icon: Icon, label, detail,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  detail: string;
}) {
  return (
    <Link
      href={href}
      className="dashboard-card-lift group flex items-center gap-3 rounded-lg border border-white/10 bg-[#211f1b]/80 px-3 py-3 hover:border-brand-500/30 hover:bg-[#27241f]"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.045] text-brand-300">
        <Icon size={17} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{label}</p>
        <p className="truncate text-xs text-charcoal-500">{detail}</p>
      </div>
      <ArrowUpRight size={15} className="shrink-0 text-charcoal-600 transition-colors group-hover:text-brand-300" />
    </Link>
  );
}

function BookingRow({ booking, showDate }: { booking: Booking; showDate?: boolean }) {
  const productionStatus = normalizeProductionStatus(booking.production_status);
  const isNoShow = booking.attendance_status === "no_show";
  return (
    <div className="flex items-center gap-3 border-t border-white/10 px-4 py-3 transition-colors hover:bg-white/[0.035] first:border-t-0">
      <div className="w-16 shrink-0 text-center">
        <p className="text-sm font-semibold text-brand-400">{formatTime(booking.booking_time)}</p>
        {showDate && (
          <p className="text-[10px] text-charcoal-500 mt-0.5">{formatDate(booking.booking_date)}</p>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-white text-sm font-medium truncate">{booking.client_name}</p>
        <p className="text-charcoal-400 text-xs truncate">{booking.service?.name ?? "—"}</p>
      </div>
      <span className={`shrink-0 text-[11px] font-semibold capitalize px-2 py-0.5 rounded-full border ${PAYMENT_BADGE[booking.payment_status] ?? PAYMENT_BADGE.unpaid}`}>
        {booking.payment_status}
      </span>
      {booking.booking_status === "confirmed" && (
        <span className={`hidden shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full border sm:inline-flex ${PRODUCTION_STATUS_STYLES[productionStatus]}`}>
          {PRODUCTION_STATUS_SHORT_LABELS[productionStatus]}
        </span>
      )}
      {isNoShow && (
        <span className="hidden shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-red-500/25 bg-red-500/10 text-red-300 sm:inline-flex">
          No-show
        </span>
      )}
    </div>
  );
}

function SectionCard({
  title, count, children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="dashboard-card-lift overflow-hidden rounded-lg border border-white/10 bg-[#211f1b]/90 shadow-sm shadow-black/10">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        {count !== undefined && count > 0 && (
          <span className="text-xs font-semibold text-charcoal-400">{count}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-6 text-charcoal-500 text-sm">
      <CheckCircle2 size={15} className="text-green-500/60 shrink-0" />
      {text}
    </div>
  );
}

interface WorkItem {
  key: string;
  title: string;
  detail: string;
  href: string;
  cta: string;
  icon: LucideIcon;
  tone: "red" | "amber" | "green" | "blue" | "brand";
  meta?: string;
}

const WORK_TONE: Record<WorkItem["tone"], string> = {
  red: "border-red-500/25 bg-red-500/10 text-red-300",
  amber: "border-amber-500/25 bg-amber-500/10 text-amber-300",
  green: "border-green-500/25 bg-green-500/10 text-green-300",
  blue: "border-sky-500/25 bg-sky-500/10 text-sky-300",
  brand: "border-brand-500/25 bg-brand-500/10 text-brand-300",
};

function WorkQueue({ items }: { items: WorkItem[] }) {
  const visible = items.slice(0, 7);

  return (
    <div className="dashboard-card-lift overflow-hidden rounded-xl border border-white/10 bg-[#211f1b]/95 shadow-lg shadow-black/20">
      <div className="flex items-start justify-between gap-4 border-b border-white/10 bg-[#25221d] px-4 py-4 sm:px-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-400">Today&apos;s Work</p>
          <h2 className="mt-1 text-xl font-bold text-white">What needs attention now</h2>
          <p className="mt-1 text-sm text-charcoal-400">Prioritized from bookings, payments, gallery, reminders, and inventory.</p>
        </div>
        <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${
          items.length > 0
            ? "border-amber-500/25 bg-amber-500/10 text-amber-300"
            : "border-green-500/25 bg-green-500/10 text-green-300"
        }`}>
          {items.length > 0 ? `${items.length} open` : "Clear"}
        </span>
      </div>

      {visible.length === 0 ? (
        <div className="flex items-start gap-3 px-4 py-5 sm:px-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-green-500/25 bg-green-500/10 text-green-300">
            <CheckCircle2 size={19} />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">All caught up for now.</p>
            <p className="mt-0.5 text-sm text-charcoal-400">No urgent bookings, payments, reminders, gallery, or inventory tasks detected.</p>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-white/10">
          {visible.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.key}
                href={item.href}
                className="group flex items-start gap-3 px-4 py-4 transition-all duration-200 hover:translate-x-1 hover:bg-white/[0.045] sm:px-5"
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${WORK_TONE[item.tone]}`}>
                  <Icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    {item.meta && <span className="text-[11px] font-medium text-charcoal-500">{item.meta}</span>}
                  </div>
                  <p className="mt-0.5 text-sm leading-5 text-charcoal-400">{item.detail}</p>
                </div>
                <span className="hidden shrink-0 items-center gap-1 text-xs font-semibold text-brand-400 group-hover:text-brand-300 sm:inline-flex">
                  {item.cta} <ChevronRight size={14} />
                </span>
              </Link>
            );
          })}
          {items.length > visible.length && (
            <div className="px-4 py-3 text-center text-xs text-charcoal-500 sm:px-5">
              {items.length - visible.length} more lower-priority task{items.length - visible.length !== 1 ? "s" : ""} hidden for focus.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default async function DashboardHomePage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();
  const rawName = (profile?.full_name ?? "").trim();
  const firstName = rawName && !rawName.includes("@") ? rawName.split(" ")[0] : "team";

  const { data: bookingsData } = await supabase
    .from("bookings")
    .select("*, service:services(name)")
    .neq("booking_status", "cancelled")
    .order("booking_date", { ascending: true })
    .order("booking_time", { ascending: true });
  const bookings = (bookingsData ?? []) as Booking[];

  const { data: inventoryData } = await supabase
    .from("inventory")
    .select("*")
    .order("item_name", { ascending: true });
  const inventoryItems = (inventoryData ?? []) as InventoryItem[];

  const { date: today, hour } = manilaParts();
  const tomorrow = addDays(today, 1);
  const weekAgo = addDays(today, -6);
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const todaysSessions = bookings.filter((b) => b.booking_date === today);
  const pendingApprovals = bookings.filter((b) => b.booking_status === "pending");
  const receiptApprovals = bookings.filter((b) => b.receipt_url && !b.downpayment_paid);
  const dueToday = bookings.filter(
    (b) => b.booking_date === today && b.balance > 0 && b.payment_status !== "paid"
  );
  const dueTomorrow = bookings.filter(
    (b) => b.booking_date === tomorrow && b.balance > 0 && b.payment_status !== "paid"
  );
  const reminderFollowUps = bookings.filter(
    (b) => b.booking_date === tomorrow && b.booking_status === "confirmed" && !b.reminder_sent && !!b.client_email
  );
  const shootsToMarkDone = bookings
    .filter((b) => b.booking_status === "confirmed" && b.booking_date < today && normalizeProductionStatus(b.production_status) === "not_started")
    .slice(0, 3);
  const editingQueue = bookings
    .filter((b) => b.booking_status === "confirmed" && ["shoot_done", "editing"].includes(normalizeProductionStatus(b.production_status)))
    .slice(0, 3);
  const readyToDeliver = bookings
    .filter((b) => b.booking_status === "confirmed" && normalizeProductionStatus(b.production_status) === "ready")
    .slice(0, 3);
  const noShowFollowUps = bookings
    .filter((b) => b.booking_status === "confirmed" && b.attendance_status === "no_show")
    .slice(0, 3);
  const lowStockItems = inventoryItems.filter((item) => item.quantity <= item.low_stock_threshold);
  const upcoming = bookings.filter((b) => b.booking_date > today).slice(0, 6);
  const outstanding = bookings.filter(
    (b) => b.booking_date >= today && b.payment_status !== "paid" && b.balance > 0
  );
  const outstandingTotal = outstanding.reduce((sum, b) => sum + b.balance, 0);

  // Posting streak — rolling 7-day window (the daily-post KPI).
  const { data: postsData } = await supabase
    .from("studio_posts")
    .select("posted_on")
    .gte("posted_on", weekAgo);
  const posts = postsData ?? [];
  const postsThisWeek = posts.length;
  const postedToday = posts.some((p) => p.posted_on === today);

  const { data: contentData } = await supabase
    .from("content_bank")
    .select("*")
    .neq("status", "posted")
    .order("target_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(4);
  const contentItems = (contentData ?? []) as ContentBankItem[];
  const readyContent = contentItems.filter((item) => item.status === "edited" || item.status === "captioned").length;
  const receiptApprovalIds = new Set(receiptApprovals.map((booking) => booking.id));
  const workItems: WorkItem[] = [
    ...receiptApprovals.slice(0, 4).map((booking): WorkItem => ({
      key: `receipt-${booking.id}`,
      title: `Approve GCash receipt: ${booking.client_name}`,
      detail: `${formatDate(booking.booking_date)} at ${formatTime(booking.booking_time)} · ${booking.service?.name ?? "Package"} · downpayment ${formatPeso(booking.downpayment_amount)}`,
      href: "/payments",
      cta: "Review",
      icon: CreditCard,
      tone: "amber",
      meta: "Payment",
    })),
    ...pendingApprovals
      .filter((booking) => !receiptApprovalIds.has(booking.id))
      .slice(0, 4)
      .map((booking): WorkItem => ({
        key: `pending-${booking.id}`,
        title: `Confirm booking request: ${booking.client_name}`,
        detail: `${formatDate(booking.booking_date)} at ${formatTime(booking.booking_time)} · ${booking.service?.name ?? "Package"}`,
        href: "/calendar",
        cta: "Open",
        icon: BellRing,
        tone: "amber",
        meta: "Booking",
      })),
    ...dueToday.slice(0, 3).map((booking): WorkItem => ({
      key: `balance-today-${booking.id}`,
      title: `Collect balance today: ${booking.client_name}`,
      detail: `${formatPeso(booking.balance)} due · ${formatTime(booking.booking_time)} · ${booking.service?.name ?? "Package"}`,
      href: "/payments",
      cta: "Collect",
      icon: Wallet,
      tone: "green",
      meta: "Today",
    })),
    ...dueTomorrow.slice(0, 2).map((booking): WorkItem => ({
      key: `balance-tomorrow-${booking.id}`,
      title: `Balance due tomorrow: ${booking.client_name}`,
      detail: `${formatPeso(booking.balance)} due · ${formatTime(booking.booking_time)} · ${booking.service?.name ?? "Package"}`,
      href: "/payments",
      cta: "Check",
      icon: Wallet,
      tone: "green",
      meta: "Tomorrow",
    })),
    ...reminderFollowUps.slice(0, 2).map((booking): WorkItem => ({
      key: `reminder-${booking.id}`,
      title: `Reminder not sent: ${booking.client_name}`,
      detail: `Tomorrow at ${formatTime(booking.booking_time)} · email available`,
      href: "/calendar",
      cta: "Open",
      icon: Mail,
      tone: "blue",
      meta: "Reminder",
    })),
    ...shootsToMarkDone.map((booking): WorkItem => ({
      key: `shoot-done-${booking.id}`,
      title: `Mark shoot done: ${booking.client_name}`,
      detail: `${formatDate(booking.booking_date)} shoot · ${booking.service?.name ?? "Package"}`,
      href: "/calendar",
      cta: "Open",
      icon: CheckCircle2,
      tone: "blue",
      meta: PRODUCTION_STATUS_LABELS.not_started,
    })),
    ...editingQueue.map((booking): WorkItem => {
      const status = normalizeProductionStatus(booking.production_status);
      return {
        key: `production-${booking.id}`,
        title: `${PRODUCTION_STATUS_LABELS[status]}: ${booking.client_name}`,
        detail: `${formatDate(booking.booking_date)} shoot · move to Ready when photos are done`,
        href: "/calendar",
        cta: "Open",
        icon: Image,
        tone: "brand",
        meta: "Production",
      };
    }),
    ...readyToDeliver.map((booking): WorkItem => ({
      key: `deliver-${booking.id}`,
      title: `Deliver gallery: ${booking.client_name}`,
      detail: `${formatDate(booking.booking_date)} shoot · upload/send gallery then mark Delivered`,
      href: "/gallery",
      cta: "Gallery",
      icon: Image,
      tone: "green",
      meta: PRODUCTION_STATUS_LABELS.ready,
    })),
    ...noShowFollowUps.map((booking): WorkItem => ({
      key: `no-show-${booking.id}`,
      title: `No-show follow-up: ${booking.client_name}`,
      detail: `${formatDate(booking.booking_date)} at ${formatTime(booking.booking_time)} · check policy or reschedule`,
      href: "/calendar",
      cta: "Open",
      icon: UserX,
      tone: "red",
      meta: "Attendance",
    })),
    ...lowStockItems.slice(0, 3).map((item): WorkItem => ({
      key: `stock-${item.id}`,
      title: `Low stock: ${item.item_name}`,
      detail: `${item.quantity} ${item.unit} left · alert at ${item.low_stock_threshold}`,
      href: "/inventory",
      cta: "Restock",
      icon: Package,
      tone: "red",
      meta: "Inventory",
    })),
  ];
  const nextSession = todaysSessions[0] ?? upcoming[0];
  const nextSessionLabel = nextSession
    ? `${formatTime(nextSession.booking_time)} | ${nextSession.client_name}`
    : "No session queued";
  const nextSessionDetail = nextSession
    ? `${nextSession.service?.name ?? "Package"} | ${formatDate(nextSession.booking_date)}`
    : "Use New Booking when a walk-in confirms.";

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-xl border border-white/10 bg-[#211f1b] shadow-lg shadow-black/20">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
          <div className="border-b border-white/10 p-5 sm:p-6 lg:border-b-0 lg:border-r">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-brand-500/25 bg-brand-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-300">
                <span className="mr-2 inline-block h-2 w-2 rounded-full bg-green-400 dashboard-live-dot" />
                Today&apos;s Studio
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1 text-xs font-medium text-charcoal-400">
                {formatDate(today)}
              </span>
            </div>
            <h1 className="mt-4 text-2xl font-bold leading-tight text-white sm:text-3xl">
              {greeting}, {firstName}.
            </h1>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <HeroMetric
                label="Open work"
                value={String(workItems.length)}
                detail={workItems.length > 0 ? "Tasks waiting" : "Clear for now"}
                tone="brand"
              />
              <HeroMetric
                label="Next session"
                value={nextSession ? formatTime(nextSession.booking_time) : "--"}
                detail={nextSession ? nextSession.client_name : "No schedule yet"}
                tone="blue"
              />
              <HeroMetric
                label="To collect"
                value={formatPeso(outstandingTotal)}
                detail={`${outstanding.length} unpaid booking${outstanding.length !== 1 ? "s" : ""}`}
                tone="green"
              />
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-4">
              {[
                ["Confirm", pendingApprovals.length],
                ["Shoot", todaysSessions.length],
                ["Collect", dueToday.length],
                ["Post", postedToday ? "Done" : `${postsThisWeek}/7`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-white">{label}</p>
                    <p className="text-xs font-semibold text-brand-300">{value}</p>
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.055]">
                    <div className="dashboard-meter h-full rounded-full bg-brand-400/60" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col justify-between gap-5 p-5 sm:p-6">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-charcoal-500">Next up</p>
              <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.035] p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-sky-500/25 bg-sky-500/10 text-sky-300">
                    <Clock size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{nextSessionLabel}</p>
                    <p className="mt-1 text-xs leading-5 text-charcoal-400">{nextSessionDetail}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <QuickAction href="/new-booking" icon={PlusCircle} label="Create booking" detail="Walk-in or manual booking" />
              <QuickAction href="/calendar" icon={CalendarRange} label="Open calendar" detail="Schedule, slots, and follow-ups" />
              <QuickAction href="/caption" icon={Sparkles} label="Write caption" detail="Generate or modify post copy" />
              <QuickAction href="/photo-tool" icon={Frame} label="Photo tools" detail="Prepare posts and wall prints" />
            </div>
          </div>
        </div>
      </section>
      {/* Stat tiles */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile
          icon={CalendarClock}
          label="Sessions today"
          value={String(todaysSessions.length)}
          detail={`${upcoming.length} coming up`}
          accent="bg-brand-500/10 text-brand-400 border border-brand-500/20"
        />
        <StatTile
          icon={BellRing}
          label="Pending approvals"
          value={String(pendingApprovals.length)}
          detail={`${receiptApprovals.length} receipts`}
          accent="bg-amber-500/10 text-amber-400 border border-amber-500/20"
        />
        <StatTile
          icon={Wallet}
          label="Money to collect"
          value={formatPeso(outstandingTotal)}
          detail={`${dueToday.length} due today`}
          accent="bg-green-500/10 text-green-400 border border-green-500/20"
        />
      </div>

      {/* Staff task queue */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
        <div className="space-y-5">
          <WorkQueue items={workItems} />
        </div>

      {/* Today's post — daily-post ritual nudge */}
        <div className="space-y-5">
          <TodayPostCard postedToday={postedToday} postsThisWeek={postsThisWeek} />

          <SectionCard title="Content Bank" count={contentItems.length}>
        {contentItems.length === 0 ? (
          <div className="px-4 py-5">
            <div className="flex items-center gap-2 text-charcoal-500 text-sm">
              <ClipboardList size={15} className="text-brand-500/70 shrink-0" />
              Add reusable post ideas so daily-post has material ready.
            </div>
            <Link
              href="/content"
              className="mt-3 inline-flex items-center gap-1 text-brand-400 text-sm font-medium hover:text-brand-300"
            >
              Start the content bank <ChevronRight size={15} />
            </Link>
          </div>
        ) : (
          <>
            <div className="border-b border-white/10 px-4 py-3">
              <p className="text-charcoal-400 text-xs">
                {readyContent} ready item{readyContent !== 1 ? "s" : ""} · build toward 10 reusable posts
              </p>
            </div>
            {contentItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 border-t border-white/10 px-4 py-3 first:border-t-0">
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium truncate">{item.title}</p>
                  <p className="text-charcoal-500 text-xs capitalize">{item.status.replace("-", " ")} · {item.post_type.replace("-", " ")}</p>
                </div>
                {item.target_date && <span className="text-xs text-charcoal-500 shrink-0">{formatDate(item.target_date)}</span>}
              </div>
            ))}
            <Link
              href="/content"
              className="flex items-center justify-center gap-1 border-t border-white/10 px-4 py-3 text-sm font-medium text-brand-400 transition-colors hover:bg-white/[0.045]"
            >
              Open content bank <ChevronRight size={15} />
            </Link>
          </>
        )}
          </SectionCard>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
      {/* Today's sessions */}
      <SectionCard title="Today's Sessions" count={todaysSessions.length}>
        {todaysSessions.length === 0 ? (
          <EmptyState text="No sessions booked for today." />
        ) : (
          todaysSessions.map((b) => <BookingRow key={b.id} booking={b} />)
        )}
      </SectionCard>

      {/* Needs approval */}
      <SectionCard title="Needs Approval" count={pendingApprovals.length}>
        {pendingApprovals.length === 0 ? (
          <EmptyState text="All caught up — no bookings waiting for approval." />
        ) : (
          <>
            {pendingApprovals.slice(0, 6).map((b) => (
              <BookingRow key={b.id} booking={b} showDate />
            ))}
            <Link
              href="/payments"
              className="flex items-center justify-center gap-1 border-t border-white/10 px-4 py-3 text-sm font-medium text-brand-400 transition-colors hover:bg-white/[0.045]"
            >
              Review &amp; approve in Payments <ChevronRight size={15} />
            </Link>
          </>
        )}
      </SectionCard>

      {/* Coming up */}
      <SectionCard title="Coming Up" count={upcoming.length}>
        {upcoming.length === 0 ? (
          <EmptyState text="No upcoming bookings yet." />
        ) : (
          <>
            {upcoming.map((b) => <BookingRow key={b.id} booking={b} showDate />)}
            <Link
              href="/calendar"
              className="flex items-center justify-center gap-1 border-t border-white/10 px-4 py-3 text-sm font-medium text-brand-400 transition-colors hover:bg-white/[0.045]"
            >
              <CalendarRange size={15} /> Open the full calendar
            </Link>
          </>
        )}
      </SectionCard>
      </div>
    </div>
  );
}
