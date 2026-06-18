import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendBookingReminder, sendStudioArrivalReminder } from "@/lib/email";
import { manilaDateString, minutesUntilBooking } from "@/lib/utils/booking-time";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface BookingRow {
  id: string;
  client_name: string;
  client_phone: string;
  client_email: string | null;
  booking_date: string;
  booking_time: string;
  booking_token: string;
  total_amount: number;
  downpayment_amount: number;
  service: { name: string } | { name: string }[] | null;
}

const REMINDER_WINDOW_MINUTES = { min: 20, max: 35 };

function addDays(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const expectedSecret = process.env.CRON_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!expectedSecret) {
    return NextResponse.json(
      { error: "Server misconfigured: CRON_SECRET not set." },
      { status: 500 }
    );
  }
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Server misconfigured: Supabase service role key not set." },
      { status: 500 }
    );
  }
  if (auth !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const today = manilaDateString();
  const tomorrow = addDays(today, 1);

  const { data: candidates, error: queryError } = await supabase
    .from("bookings")
    .select(
      "id, client_name, client_phone, client_email, booking_date, booking_time, booking_token, total_amount, downpayment_amount, service:services(name)"
    )
    .eq("booking_status", "confirmed")
    .eq("reminder_sent", false)
    .in("booking_date", [today, tomorrow]);

  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 500 });
  }

  const dueBookings = ((candidates as BookingRow[] | null) ?? []).filter((booking) => {
    const minutesUntil = minutesUntilBooking(booking.booking_date, booking.booking_time);
    return minutesUntil >= REMINDER_WINDOW_MINUTES.min && minutesUntil <= REMINDER_WINDOW_MINUTES.max;
  });

  let clientSent = 0;
  let studioSent = 0;
  let skippedNoEmail = 0;
  const errors: { id: string; error: string }[] = [];

  for (const b of dueBookings) {
    const service = Array.isArray(b.service) ? b.service[0] : b.service;
    const serviceName = service?.name ?? "Session";

    const total = Number(b.total_amount);
    const paid = Number(b.downpayment_amount);
    const balance = Math.max(0, total - paid);
    const leadMinutes = minutesUntilBooking(b.booking_date, b.booking_time);

    const studioResult = await sendStudioArrivalReminder({
      clientName: b.client_name,
      clientPhone: b.client_phone,
      clientEmail: b.client_email,
      bookingDate: b.booking_date,
      bookingTime: b.booking_time,
      serviceName,
      balance,
      leadMinutes,
      bookingToken: b.booking_token,
    });

    if ("error" in studioResult) {
      errors.push({ id: b.id, error: `Studio reminder: ${studioResult.error ?? "Email send failed"}` });
      continue;
    }
    studioSent++;

    if (!b.client_email) {
      skippedNoEmail++;
    } else {
      const emailResult = await sendBookingReminder({
        clientName: b.client_name,
        clientEmail: b.client_email,
        bookingDate: b.booking_date,
        bookingTime: b.booking_time,
        serviceName,
        balance,
        leadMinutes,
        bookingToken: b.booking_token,
      });

      if ("error" in emailResult) {
        errors.push({ id: b.id, error: `Client reminder: ${emailResult.error ?? "Email send failed"}` });
      } else {
        clientSent++;
      }
    }

    const { error: updateError } = await supabase
      .from("bookings")
      .update({ reminder_sent: true })
      .eq("id", b.id);

    if (updateError) {
      errors.push({
        id: b.id,
        error: `Email sent but failed to mark reminder_sent: ${updateError.message}`,
      });
      continue;
    }

  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    todayManila: today,
    reminderWindowMinutes: REMINDER_WINDOW_MINUTES,
    due: dueBookings.length,
    studioSent,
    clientSent,
    skippedNoEmail,
    errors,
  });
}
