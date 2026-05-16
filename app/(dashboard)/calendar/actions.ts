"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { bookingSchema, type BookingFormData } from "@/lib/validations/booking";
import { sendBookingConfirmation, sendGalleryLink } from "@/lib/email";
import { logBookingToSheet, updateBookingInSheet, deleteBookingFromSheet } from "@/lib/google-sheets";

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
    celebrant_name, turning_age, theme,
  } = parsed.data;

  // Combine milestone details + free notes into one stored string
  const noteParts: string[] = [];
  if (celebrant_name) noteParts.push(`Celebrant: ${celebrant_name}`);
  if (turning_age) noteParts.push(`Turning: ${turning_age}`);
  if (theme) noteParts.push(`Theme: ${theme}`);
  if (notes) noteParts.push(notes);
  const combinedNotes = noteParts.length > 0 ? noteParts.join(" | ") : null;

  const payment_status =
    downpayment_amount >= total_amount ? "paid"
    : downpayment_amount > 0 ? "partial"
    : "unpaid";

  const { data: inserted, error } = await supabase.from("bookings").insert({
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
    notes: combinedNotes,
    created_by: user.id,
  }).select("id").single();

  if (error) return { error: error.message };

  const { data: service } = await supabase.from("services").select("name").eq("id", package_id).single();
  await logBookingToSheet({
    bookingId: inserted?.id,
    clientName: client_name,
    clientPhone: client_phone,
    clientEmail: client_email || "",
    bookingDate: booking_date,
    bookingTime: booking_time,
    packageName: service?.name ?? "",
    addons: notes || "",
    total: total_amount,
    downpayment: downpayment_amount,
    balance: total_amount - downpayment_amount,
    bookingStatus: "confirmed",
    paymentStatus: payment_status,
    celebrantName: celebrant_name,
    turningAge: turning_age,
    theme,
  });

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

  await updateBookingInSheet(bookingId, {
    paymentStatus: "paid",
    downpayment: booking.total_amount,
    balance: 0,
  });

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

  await updateBookingInSheet(bookingId, {
    paymentStatus: payment_status,
    downpayment: newDownpayment,
    balance: total - newDownpayment,
  });

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

  await deleteBookingFromSheet(bookingId);

  revalidatePath("/calendar");
  return { success: true };
}

export async function confirmBooking(
  bookingId: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { data: booking, error: fetchError } = await supabase
    .from("bookings")
    .select("*, service:services(name)")
    .eq("id", bookingId)
    .single();

  if (fetchError || !booking) return { error: "Booking not found." };

  const { error } = await supabase
    .from("bookings")
    .update({ booking_status: "confirmed" })
    .eq("id", bookingId);

  if (error) return { error: error.message };

  await updateBookingInSheet(bookingId, { bookingStatus: "confirmed" });

  // Notify the client that their booking is now confirmed. A missing email or
  // a send failure must not block the confirmation itself.
  if (booking.client_email) {
    await sendBookingConfirmation({
      clientName: booking.client_name,
      clientEmail: booking.client_email,
      bookingDate: booking.booking_date,
      bookingTime: booking.booking_time,
      serviceName: booking.service?.name ?? "—",
      totalAmount: booking.total_amount,
      downpaymentAmount: booking.downpayment_amount,
      balance: booking.balance,
      bookingStatus: "confirmed",
      bookingToken: booking.booking_token,
    });
  }

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

  await updateBookingInSheet(bookingId, {
    total: newTotal,
    paymentStatus: payment_status,
    balance: newTotal - Number(booking.downpayment_amount),
  });

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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  await updateBookingInSheet(bookingId, {
    sessionGalleryUrl: `${appUrl}/my-booking/${data.booking_token}`,
  });

  return { success: true };
}
