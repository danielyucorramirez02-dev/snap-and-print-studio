import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CreditCard } from "lucide-react";
import type { Booking, PaymentHistory, UserRole } from "@/types";
import PaymentsClient from "@/components/payments/PaymentsClient";

export default async function PaymentsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const { data: bookings } = await supabase
    .from("bookings")
    .select("*, service:services(name, price)")
    .order("booking_date", { ascending: false });

  const { data: paymentHistory } = await supabase
    .from("payment_history")
    .select("*")
    .order("payment_date", { ascending: false });

  const allBookings = (bookings ?? []) as Booking[];
  const allPayments = (paymentHistory ?? []) as PaymentHistory[];
  const userRole = (profile?.role ?? "staff") as UserRole;

  const totalRevenue = allBookings
    .filter((b) => b.payment_status === "paid")
    .reduce((sum, b) => sum + b.total_amount, 0);

  const totalOutstanding = allBookings
    .filter((b) => b.payment_status !== "paid")
    .reduce((sum, b) => sum + b.balance, 0);

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center shrink-0">
          <CreditCard size={20} className="text-brand-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Payments</h1>
          <p className="text-charcoal-400 text-sm">
            {allBookings.length} booking{allBookings.length !== 1 ? "s" : ""} · {allPayments.length} payment{allPayments.length !== 1 ? "s" : ""} logged
          </p>
        </div>
      </div>

      <PaymentsClient
        bookings={allBookings}
        paymentHistory={allPayments}
        userRole={userRole}
        totalRevenue={totalRevenue}
        totalOutstanding={totalOutstanding}
      />
    </div>
  );
}
