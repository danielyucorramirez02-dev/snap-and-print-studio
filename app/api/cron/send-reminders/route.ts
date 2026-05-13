import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendBookingReminder } from "@/lib/email";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface BookingRow {
  id: string;
  client_name: string;
  client_email: string | null;
  booking_date: string;
  booking_time: string;
  booking_token: string;
  total_amount: number;
  downpayment_amount: number;
  service: { name: string } | { name: string }[] | null;
}

function tomorrowDateInManila(): string {
  // Manila is UTC+8 (no DST). Shift current UTC time to Manila, add 1 day,
  // then format as YYYY-MM-DD using UTC getters (we already pre-shifted).
  const shifted = new Date(Date.now() + 8 * 60 * 60 * 1000 + 24 * 60 * 60 * 1000);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const d = String(shifted.getUTCDate()).padStart(2, "0");
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

  const tomorrow = tomorrowDateInManila();

  const { data: due, error: queryError } = await supabase
    .from("bookings")
    .select(
      "id, client_name, client_email, booking_date, booking_time, booking_token, total_amount, downpayment_amount, service:services(name)"
    )
    .eq("booking_status", "confirmed")
    .eq("reminder_sent", false)
    .eq("booking_date", tomorrow);

  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 500 });
  }

  const dueBookings = (due as BookingRow[] | null) ?? [];

  let sent = 0;
  let skippedNoEmail = 0;
  const errors: { id: string; error: string }[] = [];

  for (const b of dueBookings) {
    if (!b.client_email) {
      skippedNoEmail++;
      continue;
    }

    const service = Array.isArray(b.service) ? b.service[0] : b.service;
    const serviceName = service?.name ?? "Session";

    const total = Number(b.total_amount);
    const paid = Number(b.downpayment_amount);
    const balance = Math.max(0, total - paid);

    const emailResult = await sendBookingReminder({
      clientName: b.client_name,
      clientEmail: b.client_email,
      bookingDate: b.booking_date,
      bookingTime: b.booking_time,
      serviceName,
      balance,
      bookingToken: b.booking_token,
    });

    if ("error" in emailResult) {
      errors.push({ id: b.id, error: emailResult.error });
      continue;
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

    sent++;
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    tomorrowManila: tomorrow,
    due: dueBookings.length,
    sent,
    skippedNoEmail,
    errors,
  });
}
