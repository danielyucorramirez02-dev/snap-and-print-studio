import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CalendarDays } from "lucide-react";
import type { Booking, Service, UserRole, BlockedDate } from "@/types";
import CalendarClient from "@/components/bookings/CalendarClient";

export default async function CalendarPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const [{ data: services }, { data: bookings }, { data: blockedRows }] = await Promise.all([
    supabase
      .from("services")
      .select("*")
      .eq("is_active", true)
      .order("price", { ascending: true }),
    supabase
      .from("bookings")
      .select("*, service:services(*)")
      .order("booking_date", { ascending: true })
      .order("booking_time", { ascending: true }),
    supabase
      .from("blocked_dates")
      .select("date, reason, created_at, created_by"),
  ]);

  const allBookings = (bookings ?? []) as Booking[];
  const allServices = (services ?? []) as Service[];
  const blockedDates = (blockedRows ?? []) as BlockedDate[];
  const userRole = (profile?.role ?? "staff") as UserRole;

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center shrink-0">
          <CalendarDays size={20} className="text-brand-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Calendar</h1>
          <p className="text-charcoal-400 text-sm">
            {allBookings.length} booking{allBookings.length !== 1 ? "s" : ""} total
          </p>
        </div>
      </div>

      <CalendarClient
        bookings={allBookings}
        services={allServices}
        userRole={userRole}
        blockedDates={blockedDates}
      />
    </div>
  );
}
