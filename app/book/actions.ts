"use server";

import { createClient } from "@/lib/supabase/server";
import { getSelfShootSlots, isDailyCapReached, type SlotAvailabilityReason } from "@/lib/utils/slots";
import { sendBookingConfirmation } from "@/lib/email";
import { logBookingToSheet } from "@/lib/google-sheets";
import type { Booking, Service } from "@/types";

export interface AvailableSlotsResult {
  slots: string[];
  reason: SlotAvailabilityReason;
  blockedReason?: string | null;
}

export interface BookedMilestoneSlotsResult {
  booked: string[];
  closed: boolean;
  closedReason?: string | null;
}

async function fetchDateBlock(
  supabase: Awaited<ReturnType<typeof createClient>>,
  dateStr: string
): Promise<{ blocked: boolean; reason: string | null }> {
  const { data } = await supabase
    .from("blocked_dates")
    .select("reason")
    .eq("date", dateStr)
    .maybeSingle();
  if (!data) return { blocked: false, reason: null };
  return { blocked: true, reason: (data.reason as string | null) ?? null };
}

async function fetchSelfShootCap(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<number | null> {
  const { data } = await supabase
    .from("studio_settings")
    .select("max_self_shoots_per_day")
    .eq("id", 1)
    .maybeSingle();
  return (data?.max_self_shoots_per_day as number | null) ?? null;
}

export async function getServicesForBooking(): Promise<Service[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("services")
    .select("*")
    .eq("is_active", true)
    .order("price", { ascending: true });
  return (data ?? []) as Service[];
}

export async function getAvailableSlots(
  dateStr: string,
  serviceId: string
): Promise<AvailableSlotsResult> {
  const supabase = await createClient();

  const { data: serviceData } = await supabase
    .from("services")
    .select("*")
    .eq("id", serviceId)
    .single();

  if (!serviceData) return { slots: [], reason: "no-slots" };
  const service = serviceData as Service;

  if (service.category !== "self-shoot") return { slots: [], reason: "no-slots" };

  const block = await fetchDateBlock(supabase, dateStr);
  if (block.blocked) {
    return { slots: [], reason: "blocked", blockedReason: block.reason };
  }

  const { data: bookings } = await supabase
    .from("bookings")
    .select("*, service:services(*)")
    .eq("booking_date", dateStr)
    .eq("booking_status", "confirmed")
    .eq("service.category", "self-shoot");

  const confirmed = (bookings ?? []) as Booking[];

  const cap = await fetchSelfShootCap(supabase);
  if (isDailyCapReached(confirmed.length, cap)) {
    return { slots: [], reason: "capped" };
  }

  const slots = getSelfShootSlots(dateStr, service, confirmed);
  if (slots.length === 0) return { slots: [], reason: "no-slots" };
  return { slots, reason: "open" };
}

export async function getBookedMilestoneSlots(
  dateStr: string
): Promise<BookedMilestoneSlotsResult> {
  const supabase = await createClient();

  const block = await fetchDateBlock(supabase, dateStr);
  if (block.blocked) {
    return { booked: [], closed: true, closedReason: block.reason };
  }

  const { data } = await supabase
    .from("bookings")
    .select("booking_time, service:services!package_id(category)")
    .eq("booking_date", dateStr)
    .neq("booking_status", "cancelled");

  if (!data) return { booked: [], closed: false };

  const booked = (data as unknown as { booking_time: string; service: { category: string } | null }[])
    .filter((b) => b.service?.category === "milestone" || b.service?.category === "coverage")
    .map((b) => b.booking_time.substring(0, 5));

  return { booked, closed: false };
}

export async function createPublicBooking(input: {
  serviceId: string;
  date: string;
  time: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  totalAmount: number;
  downpaymentAmount: number;
  addonNotes?: string;
  receiptUrl?: string;
  celebrantName?: string;
  turningAge?: string;
  theme?: string;
}): Promise<{ success: true; token: string; status: string } | { error: string }> {
  const supabase = await createClient();

  const { data: serviceData } = await supabase
    .from("services")
    .select("*")
    .eq("id", input.serviceId)
    .single();

  if (!serviceData) return { error: "Package not found." };
  const service = serviceData as Service;

  const block = await fetchDateBlock(supabase, input.date);
  if (block.blocked) {
    return {
      error: block.reason
        ? `Studio is closed on this date: ${block.reason}. Please pick another.`
        : "Studio is closed on this date. Please pick another.",
    };
  }

  if (service.category === "self-shoot") {
    const { data: sameDayBookings } = await supabase
      .from("bookings")
      .select("id, service:services(category)")
      .eq("booking_date", input.date)
      .eq("booking_status", "confirmed");

    const selfShootCount = (sameDayBookings ?? []).filter((b) => {
      const svc = Array.isArray(b.service) ? b.service[0] : b.service;
      return svc?.category === "self-shoot";
    }).length;

    const cap = await fetchSelfShootCap(supabase);
    if (isDailyCapReached(selfShootCount, cap)) {
      return { error: "Self-shoot sessions for this date are fully booked. Please pick another date." };
    }
  }

  const isRequest = service.category === "milestone" || service.category === "coverage";
  const bookingStatus = isRequest ? "pending" : "confirmed";

  const payment_status =
    input.downpaymentAmount >= input.totalAmount ? "paid"
    : input.downpaymentAmount > 0 ? "partial"
    : "unpaid";

  const { data: inserted, error } = await supabase
    .from("bookings")
    .insert({
      client_name: input.clientName.trim(),
      client_phone: input.clientPhone.trim(),
      client_email: input.clientEmail.trim() || null,
      booking_date: input.date,
      booking_time: input.time,
      package_id: input.serviceId,
      total_amount: input.totalAmount,
      downpayment_amount: input.downpaymentAmount,
      downpayment_paid: false,
      payment_status,
      booking_status: bookingStatus,
      notes: input.addonNotes ?? null,
      receipt_url: input.receiptUrl ?? null,
      created_by: null,
    })
    .select("id, booking_token")
    .single();

  if (error) return { error: error.message };
  if (!inserted) return { error: "Booking could not be created." };

  const token = inserted.booking_token as string;

  if (input.clientEmail) {
    await sendBookingConfirmation({
      clientName: input.clientName,
      clientEmail: input.clientEmail,
      bookingDate: input.date,
      bookingTime: input.time,
      serviceName: service.name,
      totalAmount: input.totalAmount,
      downpaymentAmount: input.downpaymentAmount,
      balance: input.totalAmount - input.downpaymentAmount,
      // Booking-time email is always the "to be confirmed" variant; the
      // confirmation email is sent later when staff approve the receipt.
      bookingStatus: "pending",
      bookingToken: token,
    });
  }

  await logBookingToSheet({
    bookingId: inserted.id as string,
    clientName: input.clientName,
    clientPhone: input.clientPhone,
    clientEmail: input.clientEmail,
    bookingDate: input.date,
    bookingTime: input.time,
    packageName: service.name,
    addons: input.addonNotes ?? "",
    total: input.totalAmount,
    downpayment: input.downpaymentAmount,
    balance: input.totalAmount - input.downpaymentAmount,
    bookingStatus,
    paymentStatus: payment_status,
    receiptUrl: input.receiptUrl,
    celebrantName: input.celebrantName,
    turningAge: input.turningAge,
    theme: input.theme,
  });

  return { success: true, token, status: bookingStatus };
}
