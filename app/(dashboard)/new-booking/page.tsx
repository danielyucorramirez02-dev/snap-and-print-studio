import { createClient } from "@/lib/supabase/server";
import OwnerBookingForm from "@/components/bookings/OwnerBookingForm";
import type { Service } from "@/types";

export default async function NewBookingPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("services")
    .select("*")
    .eq("is_active", true)
    .order("price", { ascending: true });

  const services = (data ?? []) as Service[];

  return (
    <div className="max-w-2xl mx-auto py-2">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">New Booking</h1>
        <p className="text-charcoal-400 text-sm mt-1">
          Fill in the details below. The booking will be saved to the calendar and logged to Google Sheets automatically.
        </p>
      </div>
      <OwnerBookingForm services={services} />
    </div>
  );
}
