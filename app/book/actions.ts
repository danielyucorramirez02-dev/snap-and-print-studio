"use server";

import { createClient } from "@/lib/supabase/server";
import { getSelfShootSlots } from "@/lib/utils/slots";
import { sendBookingConfirmation } from "@/lib/email";
import { logBookingToSheet } from "@/lib/google-sheets";
import type { Booking, Service } from "@/types";

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
): Promise<string[]> {
  const supabase = await createClient();

  const { data: serviceData } = await supabase
    .from("services")
    .select("*")
    .eq("id", serviceId)
    .single();

  if (!serviceData) return [];
  const service = serviceData as Service;

  if (service.category !== "self-shoot") return [];

  const { data: bookings } = await supabase
    .from("bookings")
    .select("*, service:services(*)")
    .eq("booking_date", dateStr)
    .eq("booking_status", "confirmed")
    .eq("service.category", "self-shoot");

  const confirmed = (bookings ?? []) as Booking[];
  return getSelfShootSlots(dateStr, service, confirmed);
}

export async function getBookedMilestoneSlots(dateStr: string): Promise<string[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("bookings")
    .select("booking_time, service:services!package_id(category)")
    .eq("booking_date", dateStr)
    .neq("booking_status", "cancelled");

  if (!data) return [];

  return (data as unknown as { booking_time: string; service: { category: string } | null }[])
    .filter((b) => b.service?.category === "milestone" || b.service?.category === "coverage")
    .map((b) => b.booking_time.substring(0, 5));
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
      bookingStatus,
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
