import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BarChart3 } from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import ReportsClient from "@/components/reports/ReportsClient";
import type { Booking, InventoryItem } from "@/types";

export type MonthRevenue = { month: string; total: number; collected: number };
export type PackageStat = { name: string; count: number; revenue: number };
export type UpcomingBooking = {
  id: string;
  client_name: string;
  booking_date: string;
  booking_time: string;
  service_name: string;
  payment_status: string;
  balance: number;
};

export default async function ReportsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // Only owners can access reports
  if (profile?.role !== "owner") redirect("/calendar");

  const { data: bookings } = await supabase
    .from("bookings")
    .select("*, service:services(name, price)")
    .order("booking_date", { ascending: false });

  const { data: inventory } = await supabase
    .from("inventory")
    .select("*");

  const allBookings = (bookings ?? []) as Booking[];
  const allInventory = (inventory ?? []) as InventoryItem[];

  // --- Monthly revenue (last 6 months) ---
  const monthlyRevenue: MonthRevenue[] = [];
  for (let i = 5; i >= 0; i--) {
    const monthDate = subMonths(new Date(), i);
    const monthStart = startOfMonth(monthDate).toISOString().split("T")[0];
    const monthEnd = endOfMonth(monthDate).toISOString().split("T")[0];
    const label = format(monthDate, "MMM yyyy");

    const monthBookings = allBookings.filter(
      (b) => b.booking_date >= monthStart && b.booking_date <= monthEnd
    );

    monthlyRevenue.push({
      month: label,
      total: monthBookings.reduce((s, b) => s + b.total_amount, 0),
      collected: monthBookings.reduce((s, b) => s + b.downpayment_amount, 0),
    });
  }

  // --- Package popularity (top 6) ---
  const packageMap = new Map<string, { count: number; revenue: number }>();
  for (const b of allBookings) {
    const name = b.service?.name ?? "Unknown Package";
    const cur = packageMap.get(name) ?? { count: 0, revenue: 0 };
    packageMap.set(name, {
      count: cur.count + 1,
      revenue: cur.revenue + b.total_amount,
    });
  }
  const packageStats: PackageStat[] = Array.from(packageMap.entries())
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // --- Upcoming bookings (next 7 days) ---
  const today = new Date().toISOString().split("T")[0];
  const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const upcomingBookings: UpcomingBooking[] = allBookings
    .filter((b) => b.booking_date >= today && b.booking_date <= in7Days)
    .sort((a, b) => a.booking_date.localeCompare(b.booking_date) || a.booking_time.localeCompare(b.booking_time))
    .map((b) => ({
      id: b.id,
      client_name: b.client_name,
      booking_date: b.booking_date,
      booking_time: b.booking_time,
      service_name: b.service?.name ?? "Unknown Package",
      payment_status: b.payment_status,
      balance: b.balance,
    }));

  // --- Summary stats ---
  const totalRevenue = allBookings.reduce((s, b) => s + b.downpayment_amount, 0);
  const totalOutstanding = allBookings
    .filter((b) => b.payment_status !== "paid")
    .reduce((s, b) => s + b.balance, 0);
  const inventoryValue = allInventory.reduce((s, i) => s + i.unit_cost * i.quantity, 0);
  const paidCount = allBookings.filter((b) => b.payment_status === "paid").length;

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center shrink-0">
          <BarChart3 size={20} className="text-brand-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Reports</h1>
          <p className="text-charcoal-400 text-sm">Business overview · {allBookings.length} bookings total</p>
        </div>
      </div>

      <ReportsClient
        monthlyRevenue={monthlyRevenue}
        packageStats={packageStats}
        upcomingBookings={upcomingBookings}
        totalRevenue={totalRevenue}
        totalOutstanding={totalOutstanding}
        inventoryValue={inventoryValue}
        totalBookings={allBookings.length}
        paidCount={paidCount}
      />
    </div>
  );
}
