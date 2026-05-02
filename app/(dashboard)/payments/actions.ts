"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { paymentSchema, type PaymentFormData } from "@/lib/validations/payment";

export async function addPayment(
  data: PaymentFormData
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const parsed = paymentSchema.safeParse(data);
  if (!parsed.success) return { error: "Invalid form data." };

  const { booking_id, amount, payment_method, payment_date, notes } = parsed.data;

  // Fetch current booking to update its payment fields
  const { data: booking, error: fetchError } = await supabase
    .from("bookings")
    .select("total_amount, downpayment_amount")
    .eq("id", booking_id)
    .single();

  if (fetchError || !booking) return { error: "Booking not found." };

  // Log the payment entry
  const { error: insertError } = await supabase.from("payment_history").insert({
    booking_id,
    amount,
    payment_method,
    payment_date,
    notes: notes || null,
    recorded_by: user.id,
  });

  if (insertError) return { error: insertError.message };

  // Update booking's downpayment_amount and recompute status
  const newDownpayment = Number(booking.downpayment_amount) + amount;
  const total = Number(booking.total_amount);
  const payment_status =
    newDownpayment >= total ? "paid"
    : newDownpayment > 0 ? "partial"
    : "unpaid";

  const { error: updateError } = await supabase
    .from("bookings")
    .update({
      downpayment_amount: newDownpayment,
      downpayment_paid: newDownpayment > 0,
      payment_status,
    })
    .eq("id", booking_id);

  if (updateError) return { error: updateError.message };

  revalidatePath("/payments");
  revalidatePath("/calendar");
  return { success: true };
}
