"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { bookingSchema, type BookingFormData } from "@/lib/validations/booking";
import { sendBookingConfirmation, sendGalleryLink } from "@/lib/email";
import { logBookingToSheet, updateBookingInSheet, deleteBookingFromSheet } from "@/lib/google-sheets";
import { PRODUCTION_STATUS_ORDER } from "@/lib/booking-production";
import { violatesBookingLeadTime } from "@/lib/utils/booking-time";
import type { AttendanceStatus, ProductionStatus } from "@/types";

const COVERAGE_EVENT_TYPES = ["Debut", "Birthday", "Baptism", "Wedding", "Other"] as const;
const COVERAGE_SECOND_PLACE_EVENTS = new Set<string>(["Baptism", "Wedding"]);

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
    event_type, event_place_primary, event_place_secondary,
  } = parsed.data;

  if (violatesBookingLeadTime(booking_date, booking_time)) {
    return { error: "Please book more than 1 hour before the session time." };
  }

  const { data: service } = await supabase
    .from("services")
    .select("name, category")
    .eq("id", package_id)
    .single();

  if (!service) return { error: "Package not found." };

  if (service.category === "coverage") {
    if (!event_type || !COVERAGE_EVENT_TYPES.includes(event_type as typeof COVERAGE_EVENT_TYPES[number])) {
      return { error: "Please choose the event type." };
    }
    if (!event_place_primary?.trim()) {
      return { error: "Please enter the event place." };
    }
  }

  // Combine structured details + free notes into one stored string
  const noteParts: string[] = [];
  if (celebrant_name) noteParts.push(`Celebrant: ${celebrant_name}`);
  if (turning_age) noteParts.push(`Turning: ${turning_age}`);
  if (theme) noteParts.push(`Theme: ${theme}`);
  if (service.category === "coverage") {
    if (event_type) noteParts.push(`Event: ${event_type}`);
    if (event_place_primary) noteParts.push(`Place: ${event_place_primary.trim()}`);
    if (event_type && COVERAGE_SECOND_PLACE_EVENTS.has(event_type) && event_place_secondary?.trim()) {
      noteParts.push(`Second place: ${event_place_secondary.trim()}`);
    }
  }
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
    eventType: service.category === "coverage" ? event_type : undefined,
    eventPlacePrimary: service.category === "coverage" ? event_place_primary?.trim() : undefined,
    eventPlaceSecondary: service.category === "coverage" && event_type && COVERAGE_SECOND_PLACE_EVENTS.has(event_type)
      ? event_place_secondary?.trim()
      : undefined,
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

export async function updateProductionStatus(
  bookingId: string,
  productionStatus: ProductionStatus
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  if (!PRODUCTION_STATUS_ORDER.includes(productionStatus)) {
    return { error: "Invalid production status." };
  }

  const { error } = await supabase
    .from("bookings")
    .update({ production_status: productionStatus })
    .eq("id", bookingId);

  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath("/calendar");
  revalidatePath("/gallery");
  return { success: true };
}

export async function updateInternalNotes(
  bookingId: string,
  internalNotes: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase
    .from("bookings")
    .update({ internal_notes: internalNotes.trim() || null })
    .eq("id", bookingId);

  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath("/calendar");
  return { success: true };
}

export async function updateBookingNavigationLocation(
  bookingId: string,
  location: { label: string; latitude: number; longitude: number } | null
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "owner") return { error: "Only the owner can update booking locations." };

  if (location) {
    const label = location.label.trim();
    if (!label || label.length > 200) return { error: "Please enter a valid location name." };
    if (!Number.isFinite(location.latitude) || location.latitude < -90 || location.latitude > 90) {
      return { error: "Please choose a valid map pin." };
    }
    if (!Number.isFinite(location.longitude) || location.longitude < -180 || location.longitude > 180) {
      return { error: "Please choose a valid map pin." };
    }
  }

  const { error } = await supabase
    .from("bookings")
    .update({
      navigation_label: location?.label.trim() ?? null,
      navigation_latitude: location?.latitude ?? null,
      navigation_longitude: location?.longitude ?? null,
    })
    .eq("id", bookingId);

  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath("/calendar");
  return { success: true };
}

export async function updateAttendanceStatus(
  bookingId: string,
  attendanceStatus: AttendanceStatus
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  if (!["scheduled", "arrived", "no_show"].includes(attendanceStatus)) {
    return { error: "Invalid attendance status." };
  }

  const update =
    attendanceStatus === "no_show"
      ? { attendance_status: attendanceStatus, no_show_at: new Date().toISOString(), no_show_by: user.id }
      : { attendance_status: attendanceStatus, no_show_at: null, no_show_by: null };

  const { error } = await supabase
    .from("bookings")
    .update(update)
    .eq("id", bookingId);

  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath("/calendar");
  return { success: true };
}

export async function cancelBookingWithReason(
  bookingId: string,
  reason: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const cleanReason = reason.trim();
  if (cleanReason.length < 3) {
    return { error: "Please add a short reason before cancelling." };
  }

  const { error } = await supabase
    .from("bookings")
    .update({
      booking_status: "cancelled",
      cancel_reason: cleanReason,
      cancelled_at: new Date().toISOString(),
      cancelled_by: user.id,
    })
    .eq("id", bookingId);

  if (error) return { error: error.message };

  await updateBookingInSheet(bookingId, { bookingStatus: "cancelled" });

  revalidatePath("/");
  revalidatePath("/calendar");
  revalidatePath("/payments");
  return { success: true };
}

export async function rescheduleBooking(
  bookingId: string,
  bookingDate: string,
  bookingTime: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  if (!/^\d{4}-\d{2}-\d{2}$/.test(bookingDate)) {
    return { error: "Please choose a valid date." };
  }
  if (!/^\d{2}:\d{2}$/.test(bookingTime)) {
    return { error: "Please choose a valid time." };
  }
  if (violatesBookingLeadTime(bookingDate, bookingTime)) {
    return { error: "Please book more than 1 hour before the session time." };
  }

  const { data: booking, error: fetchError } = await supabase
    .from("bookings")
    .select("booking_date, booking_time, internal_notes")
    .eq("id", bookingId)
    .single();

  if (fetchError || !booking) return { error: "Booking not found." };

  if (booking.booking_date === bookingDate && booking.booking_time.slice(0, 5) === bookingTime) {
    return { success: true };
  }

  const note = `Rescheduled from ${booking.booking_date} ${booking.booking_time.slice(0, 5)} to ${bookingDate} ${bookingTime}.`;
  const existingNotes = typeof booking.internal_notes === "string" ? booking.internal_notes.trim() : "";
  const internalNotes = existingNotes ? `${existingNotes}\n${note}` : note;

  const { error } = await supabase
    .from("bookings")
    .update({
      booking_date: bookingDate,
      booking_time: bookingTime,
      internal_notes: internalNotes,
      reminder_sent: false,
    })
    .eq("id", bookingId);

  if (error) return { error: error.message };

  await updateBookingInSheet(bookingId, {
    bookingDate,
    bookingTime,
  });

  revalidatePath("/");
  revalidatePath("/calendar");
  revalidatePath("/payments");
  revalidatePath("/gallery");
  return { success: true };
}
