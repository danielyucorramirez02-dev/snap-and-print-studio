"use server";

import { createClient } from "@/lib/supabase/server";
import {
  getSelfShootBlockMinutes,
  getSelfShootSlots,
  isDailyCapReached,
  isWholeDayBlock,
  rangesOverlap,
  toMinutes,
  toTimeString,
  type SlotAvailabilityReason,
  type TimeBlock,
} from "@/lib/utils/slots";
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
): Promise<{ fullDay: boolean; reason: string | null; ranges: TimeBlock[] }> {
  const { data: timeSlots } = await supabase
    .from("blocked_time_slots")
    .select("start_time, end_time")
    .eq("date", dateStr);

  const slotRanges = (timeSlots ?? []).map((slot) => ({
    start_time: (slot.start_time as string).substring(0, 5),
    end_time: (slot.end_time as string).substring(0, 5),
  }));

  const { data, error } = await supabase
    .from("blocked_dates")
    .select("reason, start_time, end_time")
    .eq("date", dateStr)
    .maybeSingle();

  if (error) {
    const { data: legacyData } = await supabase
      .from("blocked_dates")
      .select("reason")
      .eq("date", dateStr)
      .maybeSingle();
    if (!legacyData) return { fullDay: false, reason: null, ranges: slotRanges };
    return { fullDay: true, reason: (legacyData.reason as string | null) ?? null, ranges: [] };
  }

  if (!data) return { fullDay: false, reason: null, ranges: slotRanges };

  const block = {
    start_time: (data.start_time as string | null) ?? null,
    end_time: (data.end_time as string | null) ?? null,
  };

  return {
    fullDay: isWholeDayBlock(block),
    reason: (data.reason as string | null) ?? null,
    ranges: isWholeDayBlock(block) ? slotRanges : [block, ...slotRanges],
  };
}

function bookingConflictsWithBlock(time: string, service: Service, block: TimeBlock): boolean {
  if (isWholeDayBlock(block)) return true;
  const start = time.substring(0, 5);
  const duration = service.category === "self-shoot"
    ? getSelfShootBlockMinutes(service.name)
    : service.duration_minutes;
  const end = toTimeString(toMinutes(start) + duration);
  return rangesOverlap(start, end, block.start_time!, block.end_time!);
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

type PublicBookingSlot = {
  id: string;
  booking_time: string;
  booking_status: string;
  service: {
    name?: string;
    category: string | null;
    duration_minutes?: number;
  } | null;
};

async function fetchPublicBookingsForDate(
  supabase: Awaited<ReturnType<typeof createClient>>,
  dateStr: string
): Promise<PublicBookingSlot[]> {
  const { data: rpcData, error: rpcError } = await supabase
    .rpc("public_get_bookings_for_date", { p_date: dateStr });

  if (!rpcError && rpcData) {
    return rpcData as PublicBookingSlot[];
  }

  const { data } = await supabase
    .from("bookings")
    .select("id, booking_time, booking_status, service:services!package_id(name, category, duration_minutes)")
    .eq("booking_date", dateStr)
    .neq("booking_status", "cancelled");

  return (data ?? []) as unknown as PublicBookingSlot[];
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
  if (block.fullDay) {
    return { slots: [], reason: "blocked", blockedReason: block.reason };
  }

  // Pending bookings also hold their slot — staff has not rejected them yet.
  const heldBookings = (await fetchPublicBookingsForDate(supabase, dateStr))
    .filter((b) => ["pending", "confirmed"].includes(b.booking_status))
    .filter((b) => b.service?.category === "self-shoot")
    .map((b) => ({
      ...b,
      service: b.service
        ? { ...b.service, price: 0, inclusions: [], is_active: true, created_at: "" }
        : undefined,
    })) as unknown as Booking[];

  const cap = await fetchSelfShootCap(supabase);
  if (isDailyCapReached(heldBookings.length, cap)) {
    return { slots: [], reason: "capped" };
  }

  const slots = getSelfShootSlots(dateStr, service, heldBookings, block.ranges);
  if (slots.length === 0) return { slots: [], reason: "no-slots" };
  return { slots, reason: "open" };
}

export async function getBookedMilestoneSlots(
  dateStr: string
): Promise<BookedMilestoneSlotsResult> {
  const supabase = await createClient();

  const block = await fetchDateBlock(supabase, dateStr);
  if (block.fullDay) {
    return { booked: [], closed: true, closedReason: block.reason };
  }

  const booked = (await fetchPublicBookingsForDate(supabase, dateStr))
    .filter((b) => b.service?.category === "milestone" || b.service?.category === "coverage")
    .map((b) => b.booking_time.substring(0, 5));

  const blockedSlots = ["08:00", "09:00", "10:00", "14:00", "15:00", "16:00"].filter((slot) =>
    block.ranges.some((range) => rangesOverlap(slot, toTimeString(toMinutes(slot) + 60), range.start_time!, range.end_time!))
  );

  return { booked: Array.from(new Set([...booked, ...blockedSlots])), closed: false };
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
  if (block.fullDay) {
    return {
      error: block.reason
        ? `Studio is closed on this date: ${block.reason}. Please pick another.`
        : "Studio is closed on this date. Please pick another.",
    };
  }

  if (block.ranges.some((range) => bookingConflictsWithBlock(input.time, service, range))) {
    return {
      error: block.reason
        ? `Studio is unavailable at that time: ${block.reason}. Please pick another time.`
        : "Studio is unavailable at that time. Please pick another time.",
    };
  }

  if (service.category === "self-shoot") {
    const selfShootCount = (await fetchPublicBookingsForDate(supabase, input.date))
      .filter((b) => ["pending", "confirmed"].includes(b.booking_status))
      .filter((b) => b.service?.category === "self-shoot")
      .length;

    const cap = await fetchSelfShootCap(supabase);
    if (isDailyCapReached(selfShootCount, cap)) {
      return { error: "Self-shoot sessions for this date are fully booked. Please pick another date." };
    }
  }

  // All public bookings start pending. Staff confirms after verifying the
  // GCash receipt (self-shoot) or the requested schedule (milestone/coverage).
  const bookingStatus = "pending";

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
