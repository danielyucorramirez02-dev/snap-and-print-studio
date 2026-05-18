import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  CalendarClock, BellRing, Wallet, ChevronRight, CheckCircle2, CalendarRange, ClipboardList,
} from "lucide-react";
import { formatDate, formatTime, formatPeso } from "@/lib/utils/formatters";
import TodayPostCard from "@/components/dashboard/TodayPostCard";
import type { Booking, ContentBankItem } from "@/types";

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

function StatTile({
  icon: Icon, label, value, accent,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="rounded-xl bg-charcoal-900 border border-charcoal-700 p-4">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${accent}`}>
        <Icon size={18} />
      </div>
      <p className="text-2xl font-bold text-white leading-none">{value}</p>
      <p className="text-charcoal-400 text-xs mt-1.5">{label}</p>
    </div>
  );
}

function BookingRow({ booking, showDate }: { booking: Booking; showDate?: boolean }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-t border-charcoal-800 first:border-t-0">
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
    <div className="rounded-xl bg-charcoal-900 border border-charcoal-700 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-charcoal-800">
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

export default async function DashboardHomePage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();
  const firstName = (profile?.full_name ?? "").trim().split(" ")[0] || "there";

  const { data: bookingsData } = await supabase
    .from("bookings")
    .select("*, service:services(name)")
    .neq("booking_status", "cancelled")
    .order("booking_date", { ascending: true })
    .order("booking_time", { ascending: true });
  const bookings = (bookingsData ?? []) as Booking[];

  const { date: today, hour } = manilaParts();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const todaysSessions = bookings.filter((b) => b.booking_date === today);
  const pendingApprovals = bookings.filter((b) => b.booking_status === "pending");
  const upcoming = bookings.filter((b) => b.booking_date > today).slice(0, 6);
  const outstanding = bookings.filter(
    (b) => b.booking_date >= today && b.payment_status !== "paid" && b.balance > 0
  );
  const outstandingTotal = outstanding.reduce((sum, b) => sum + b.balance, 0);

  // Posting streak — rolling 7-day window (the daily-post KPI).
  const weekAgoDate = new Date(today);
  weekAgoDate.setUTCDate(weekAgoDate.getUTCDate() - 6);
  const weekAgo = weekAgoDate.toISOString().split("T")[0];

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

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-white">{greeting}, {firstName}!</h1>
        <p className="text-charcoal-400 text-sm mt-0.5">
          {formatDate(today)} · Here&apos;s your studio at a glance.
        </p>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-3 gap-3">
        <StatTile
          icon={CalendarClock}
          label="Sessions today"
          value={String(todaysSessions.length)}
          accent="bg-brand-500/10 text-brand-400 border border-brand-500/20"
        />
        <StatTile
          icon={BellRing}
          label="Pending approvals"
          value={String(pendingApprovals.length)}
          accent="bg-amber-500/10 text-amber-400 border border-amber-500/20"
        />
        <StatTile
          icon={Wallet}
          label="Money to collect"
          value={formatPeso(outstandingTotal)}
          accent="bg-green-500/10 text-green-400 border border-green-500/20"
        />
      </div>

      {/* Today's post — daily-post ritual nudge */}
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
            <div className="px-4 py-3 border-b border-charcoal-800">
              <p className="text-charcoal-400 text-xs">
                {readyContent} ready item{readyContent !== 1 ? "s" : ""} · build toward 10 reusable posts
              </p>
            </div>
            {contentItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 px-4 py-3 border-t border-charcoal-800 first:border-t-0">
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium truncate">{item.title}</p>
                  <p className="text-charcoal-500 text-xs capitalize">{item.status.replace("-", " ")} · {item.post_type.replace("-", " ")}</p>
                </div>
                {item.target_date && <span className="text-xs text-charcoal-500 shrink-0">{formatDate(item.target_date)}</span>}
              </div>
            ))}
            <Link
              href="/content"
              className="flex items-center justify-center gap-1 px-4 py-3 border-t border-charcoal-800 text-brand-400 text-sm font-medium hover:bg-charcoal-800/60 transition-colors"
            >
              Open content bank <ChevronRight size={15} />
            </Link>
          </>
        )}
      </SectionCard>

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
              className="flex items-center justify-center gap-1 px-4 py-3 border-t border-charcoal-800 text-brand-400 text-sm font-medium hover:bg-charcoal-800/60 transition-colors"
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
              className="flex items-center justify-center gap-1 px-4 py-3 border-t border-charcoal-800 text-brand-400 text-sm font-medium hover:bg-charcoal-800/60 transition-colors"
            >
              <CalendarRange size={15} /> Open the full calendar
            </Link>
          </>
        )}
      </SectionCard>
    </div>
  );
}
