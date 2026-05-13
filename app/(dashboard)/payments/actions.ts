"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { paymentSchema, type PaymentFormData } from "@/lib/validations/payment";
import { sendDownpaymentConfirmed } from "@/lib/email";
import { updateBookingInSheet } from "@/lib/google-sheets";

export async function addPayment(
  data: PaymentFormData
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const parsed = paymentSchema.safeParse(data);
  if (!parsed.success) return { error: "Invalid form data." };

  const { booking_id, amount, payment_method, payment_date, notes } = parsed.data;

  const { data: booking, error: fetchError } = await supabase
    .from("bookings")
    .select("total_amount, downpayment_amount")
    .eq("id", booking_id)
    .single();

  if (fetchError || !booking) return { error: "Booking not found." };

  const { error: insertError } = await supabase.from("payment_history").insert({
    booking_id,
    amount,
    payment_method,
    payment_date,
    notes: notes || null,
    recorded_by: user.id,
  });

  if (insertError) return { error: insertError.message };

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

export async function approveDownpaymentReceipt(
  bookingId: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { data: booking, error: fetchError } = await supabase
    .from("bookings")
    .select("id, client_name, client_email, booking_date, booking_time, booking_token, total_amount, downpayment_amount, downpayment_paid, receipt_url, service:services(name)")
    .eq("id", bookingId)
    .single();

  if (fetchError || !booking) return { error: "Booking not found." };
  if (!booking.receipt_url) return { error: "No receipt uploaded for this booking." };
  if (booking.downpayment_paid) return { error: "Downpayment is already approved." };

  const amount = Number(booking.downpayment_amount);
  if (amount <= 0) return { error: "Downpayment amount is zero — nothing to approve." };

  const today = new Date().toISOString().split("T")[0];

  const { error: insertError } = await supabase.from("payment_history").insert({
    booking_id: bookingId,
    amount,
    payment_method: "gcash",
    payment_date: today,
    notes: "Approved from uploaded receipt",
    recorded_by: user.id,
  });

  if (insertError) return { error: insertError.message };

  const total = Number(booking.total_amount);
  const payment_status =
    amount >= total ? "paid"
    : amount > 0 ? "partial"
    : "unpaid";

  const { error: updateError } = await supabase
    .from("bookings")
    .update({
      downpayment_paid: true,
      payment_status,
    })
    .eq("id", bookingId);

  if (updateError) return { error: updateError.message };

  const service = Array.isArray(booking.service) ? booking.service[0] : booking.service;
  const serviceName = service?.name ?? "Session";

  if (booking.client_email) {
    await sendDownpaymentConfirmed({
      clientName: booking.client_name,
      clientEmail: booking.client_email,
      bookingDate: booking.booking_date,
      bookingTime: booking.booking_time,
      serviceName,
      downpaymentAmount: amount,
      balance: total - amount,
      bookingToken: booking.booking_token,
    });
  }

  await updateBookingInSheet(bookingId, {
    paymentStatus: payment_status,
    downpayment: amount,
    balance: total - amount,
  });

  revalidatePath("/payments");
  revalidatePath("/calendar");
  return { success: true };
}
