import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Images } from "lucide-react";
import type { Booking, UserRole } from "@/types";
import GalleryClient from "@/components/gallery/GalleryClient";

export default async function GalleryPage() {
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
    .select("id, client_name, client_email, booking_date, booking_time, booking_status, production_status, booking_token, service:services(name)")
    .neq("booking_status", "cancelled")
    .order("booking_date", { ascending: false });

  const allBookings = (bookings ?? []) as unknown as Booking[];
  const userRole = (profile?.role ?? "staff") as UserRole;

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center shrink-0">
          <Images size={20} className="text-brand-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Client Gallery</h1>
          <p className="text-charcoal-400 text-sm">Session photos stored per booking</p>
        </div>
      </div>

      <GalleryClient bookings={allBookings} userRole={userRole} />
    </div>
  );
}
