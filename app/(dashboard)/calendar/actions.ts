"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { bookingSchema, type BookingFormData } from "@/lib/validations/booking";
import { sendBookingConfirmation, sendGalleryLink } from "@/lib/email";

export async function createBooking(
  data: BookingFormData
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const parsed = bookingSchema.safeParse(data);
  if (!parsed.success) return { error: "Invalid form data." };

  const {
    client_name, client_phone, client_email,
    booking_date, booking_time, package_id,
    total_amount, downpayment_amount, notes,
  } = parsed.data;

  const payment_status =
    downpayment_amount >= total_amount ? "paid"
    : downpayment_amount > 0 ? "partial"
    : "unpaid";

  const { error } = await supabase.from("bookings").insert({
    client_name,
    client_phone,
    client_email: client_email || null,
    booking_date,
    booking_time,
    package_id,
    total_amount,
    downpayment_amount,
    downpayment_paid: downpayment_amount > 0,
    payment_status,
    notes: notes || null,
    created_by: user.id,
  });

  if (error) return { error: error.message };
  revalidatePath("/calendar");
  return { success: true };
}

export async function markBookingPaid(
  bookingId: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { data: booking, error: fetchError } = await supabase
    .from("bookings")
    .select("total_amount")
    .eq("id", bookingId)
    .single();

  if (fetchError || !booking) return { error: "Booking not found." };

  const { error } = await supabase
    .from("bookings")
    .update({
      downpayment_amount: booking.total_amount,
      downpayment_paid: true,
      payment_status: "paid",
    })
    .eq("id", bookingId);

  if (error) return { error: error.message };
  revalidatePath("/calendar");
  return { success: true };
}

export async function updatePaymentStatus(
  bookingId: string,
  newDownpayment: number
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { data: booking, error: fetchError } = await supabase
    .from("bookings")
    .select("total_amount")
    .eq("id", bookingId)
    .single();

  if (fetchError || !booking) return { error: "Booking not found." };

  const total = booking.total_amount as number;
  const payment_status =
    newDownpayment >= total ? "paid"
    : newDownpayment > 0 ? "partial"
    : "unpaid";

  const { error } = await supabase
    .from("bookings")
    .update({
      downpayment_amount: newDownpayment,
      downpayment_paid: newDownpayment > 0,
      payment_status,
    })
    .eq("id", bookingId);

  if (error) return { error: error.message };
  revalidatePath("/calendar");
  return { success: true };
}

export async function deleteBooking(
  bookingId: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase
    .from("bookings")
    .delete()
    .eq("id", bookingId);

  if (error) return { error: error.message };
  revalidatePath("/calendar");
  return { success: true };
}

export async function confirmBooking(
  bookingId: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase
    .from("bookings")
    .update({ booking_status: "confirmed" })
    .eq("id", bookingId);

  if (error) return { error: error.message };
  revalidatePath("/calendar");
  return { success: true };
}

export async function addLateFee(
  bookingId: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { data: booking, error: fetchError } = await supabase
    .from("bookings")
    .select("total_amount, downpayment_amount")
    .eq("id", bookingId)
    .single();

  if (fetchError || !booking) return { error: "Booking not found." };

  const newTotal = Number(booking.total_amount) + 50;
  const payment_status =
    booking.downpayment_amount >= newTotal ? "paid"
    : booking.downpayment_amount > 0 ? "partial"
    : "unpaid";

  const { error } = await supabase
    .from("bookings")
    .update({ total_amount: newTotal, payment_status })
    .eq("id", bookingId);

  if (error) return { error: error.message };
  revalidatePath("/calendar");
  revalidatePath("/payments");
  return { success: true };
}

export async function sendConfirmationEmail(
  bookingId: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { data, error: fetchError } = await supabase
    .from("bookings")
    .select("*, service:services(name)")
    .eq("id", bookingId)
    .single();

  if (fetchError || !data) return { error: "Booking not found." };
  if (!data.client_email) return { error: "This client has no email address on file." };

  const result = await sendBookingConfirmation({
    clientName: data.client_name,
    clientEmail: data.client_email,
    bookingDate: data.booking_date,
    bookingTime: data.booking_time,
    serviceName: data.service?.name ?? "—",
    totalAmount: data.total_amount,
    downpaymentAmount: data.downpayment_amount,
    balance: data.balance,
    bookingStatus: data.booking_status,
    bookingToken: data.booking_token,
  });
  if ("error" in result) return { error: result.error ?? "Email send failed." };
  return { success: true };
}

export async function sendGalleryEmail(
  bookingId: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { data, error: fetchError } = await supabase
    .from("bookings")
    .select("client_name, client_email, booking_date, booking_token")
    .eq("id", bookingId)
    .single();

  if (fetchError || !data) return { error: "Booking not found." };
  if (!data.client_email) return { error: "This client has no email address on file." };

  const result = await sendGalleryLink({
    clientName: data.client_name,
    clientEmail: data.client_email,
    bookingDate: data.booking_date,
    bookingToken: data.booking_token,
  });
  if ("error" in result) return { error: result.error ?? "Email send failed." };
  return { success: true };
}
