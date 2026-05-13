import { Resend } from "resend";
import { formatDate, formatTime, formatPeso } from "@/lib/utils/formatters";

const STUDIO_NAME = "Snap & Print Studio";
const STUDIO_ADDRESS = "Phase 5, Block 22, Lot 37 Pandi Residence 1, Mapulang Lupa, Pandi Bulacan";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function getResend() {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

function getFromEmail() {
  return process.env.RESEND_FROM_EMAIL ?? "noreply@resend.dev";
}

function baseTemplate(title: string, body: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f1a;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;">
    <div style="background:#1a1a2e;padding:32px 24px;text-align:center;border-bottom:2px solid #f59e0b;">
      <div style="font-size:32px;margin-bottom:8px;">📸</div>
      <h1 style="color:#f59e0b;margin:0;font-size:22px;font-weight:bold;">${STUDIO_NAME}</h1>
      <p style="color:#6b6b8a;margin:4px 0 0;font-size:13px;">${STUDIO_ADDRESS}</p>
    </div>
    <div style="background:#16162a;padding:32px 24px;">
      <h2 style="color:#ffffff;margin:0 0 20px;font-size:18px;">${title}</h2>
      ${body}
    </div>
    <div style="background:#0f0f1a;padding:20px 24px;text-align:center;border-top:1px solid #2a2a3a;">
      <p style="color:#6b6b8a;font-size:12px;margin:0;">
        Thank you for choosing ${STUDIO_NAME}! 🌟<br>
        Searchable on Waze & Google Maps as "${STUDIO_NAME}"
      </p>
    </div>
  </div>
</body>
</html>`;
}

function detailRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 12px;color:#9999bb;font-size:13px;width:140px;">${label}</td>
    <td style="padding:8px 12px;color:#ffffff;font-size:13px;">${value}</td>
  </tr>`;
}

function ctaButton(text: string, url: string): string {
  return `<div style="text-align:center;margin:24px 0;">
    <a href="${url}" style="display:inline-block;background:#f59e0b;color:#000000;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px;">${text}</a>
  </div>`;
}

export interface BookingEmailData {
  clientName: string;
  clientEmail: string;
  bookingDate: string;
  bookingTime: string;
  serviceName: string;
  totalAmount: number;
  downpaymentAmount: number;
  balance: number;
  bookingStatus: string;
  bookingToken: string;
}

export async function sendBookingConfirmation(data: BookingEmailData) {
  const resend = getResend();
  if (!resend) return { error: "Email not configured. Add RESEND_API_KEY to .env.local." };

  const bookingUrl = `${APP_URL}/my-booking/${data.bookingToken}`;
  const isPending = data.bookingStatus === "pending";

  const body = `
    <p style="color:#ccccdd;margin:0 0 20px;font-size:14px;line-height:1.6;">
      Hi <strong style="color:#fff;">${data.clientName}</strong>!
      ${isPending
        ? "Your session <strong>request</strong> has been received. We will review your preferred schedule and confirm your booking shortly."
        : "Your session is <strong>confirmed</strong>! We look forward to seeing you."}
    </p>
    <table style="width:100%;border-collapse:collapse;background:#1a1a2e;border-radius:8px;overflow:hidden;margin-bottom:20px;">
      ${detailRow("Date", formatDate(data.bookingDate))}
      ${detailRow("Time", isPending ? `${formatTime(data.bookingTime)} (preferred)` : formatTime(data.bookingTime))}
      ${detailRow("Package", data.serviceName)}
      ${detailRow("Total", formatPeso(data.totalAmount))}
      ${detailRow("Paid", formatPeso(data.downpaymentAmount))}
      ${detailRow("Balance Due", formatPeso(data.balance))}
      ${detailRow("Status", isPending ? "⏳ Pending Confirmation" : "✅ Confirmed")}
    </table>
    ${isPending
      ? `<p style="color:#f59e0b;font-size:13px;background:#f59e0b15;border:1px solid #f59e0b30;padding:12px;border-radius:8px;">
          We will reach out to confirm your preferred schedule. Check your booking status anytime using the link below.
        </p>`
      : ""}
    <p style="color:#f59e0b;font-size:13px;background:#f59e0b15;border:1px solid #f59e0b30;padding:12px;border-radius:8px;margin-top:16px;">
      ⏰ <strong>Late policy:</strong> Arrivals 15 minutes or more past your scheduled time will incur a ₱50 late fee.
    </p>
    ${ctaButton("View My Booking →", bookingUrl)}
    <p style="color:#6b6b8a;font-size:12px;text-align:center;">
      Or copy this link: <a href="${bookingUrl}" style="color:#f59e0b;">${bookingUrl}</a>
    </p>
  `;

  const { error } = await resend.emails.send({
    from: getFromEmail(),
    to: data.clientEmail,
    subject: isPending
      ? `📸 Booking Request Received — ${STUDIO_NAME}`
      : `✅ Booking Confirmed — ${STUDIO_NAME}`,
    html: baseTemplate(
      isPending ? "Booking Request Received!" : "Your Session is Confirmed!",
      body
    ),
  });

  if (error) return { error: error.message };
  return { success: true };
}

export interface DownpaymentConfirmedData {
  clientName: string;
  clientEmail: string;
  bookingDate: string;
  bookingTime: string;
  serviceName: string;
  downpaymentAmount: number;
  balance: number;
  bookingToken: string;
}

export async function sendDownpaymentConfirmed(data: DownpaymentConfirmedData) {
  const resend = getResend();
  if (!resend) return { error: "Email not configured. Add RESEND_API_KEY to .env.local." };

  const bookingUrl = `${APP_URL}/my-booking/${data.bookingToken}`;

  const body = `
    <p style="color:#ccccdd;margin:0 0 20px;font-size:14px;line-height:1.6;">
      Hi <strong style="color:#fff;">${data.clientName}</strong>!
      We received your downpayment. Your booking is now <strong style="color:#22c55e;">confirmed</strong>. 🎉
    </p>
    <table style="width:100%;border-collapse:collapse;background:#1a1a2e;border-radius:8px;overflow:hidden;margin-bottom:20px;">
      ${detailRow("Date", formatDate(data.bookingDate))}
      ${detailRow("Time", formatTime(data.bookingTime))}
      ${detailRow("Package", data.serviceName)}
      ${detailRow("Downpayment Received", formatPeso(data.downpaymentAmount))}
      ${detailRow("Balance Due on Session", formatPeso(data.balance))}
      ${detailRow("Status", "✅ Confirmed")}
    </table>
    <p style="color:#f59e0b;font-size:13px;background:#f59e0b15;border:1px solid #f59e0b30;padding:12px;border-radius:8px;">
      ⏰ <strong>Late policy:</strong> Arrivals 15 minutes or more past your scheduled time will incur a ₱50 late fee.
    </p>
    ${ctaButton("View My Booking →", bookingUrl)}
    <p style="color:#6b6b8a;font-size:12px;text-align:center;">
      Or copy this link: <a href="${bookingUrl}" style="color:#f59e0b;">${bookingUrl}</a>
    </p>
  `;

  const { error } = await resend.emails.send({
    from: getFromEmail(),
    to: data.clientEmail,
    subject: `✅ Downpayment Confirmed — ${STUDIO_NAME}`,
    html: baseTemplate("Downpayment Confirmed!", body),
  });

  if (error) return { error: error.message };
  return { success: true };
}

export interface BookingReminderData {
  clientName: string;
  clientEmail: string;
  bookingDate: string;
  bookingTime: string;
  serviceName: string;
  balance: number;
  bookingToken: string;
}

export async function sendBookingReminder(data: BookingReminderData) {
  const resend = getResend();
  if (!resend) return { error: "Email not configured. Add RESEND_API_KEY to .env.local." };

  const bookingUrl = `${APP_URL}/my-booking/${data.bookingToken}`;

  const body = `
    <p style="color:#ccccdd;margin:0 0 20px;font-size:14px;line-height:1.6;">
      Hi <strong style="color:#fff;">${data.clientName}</strong>!
      Just a friendly reminder — your session at <strong>${STUDIO_NAME}</strong> is <strong style="color:#f59e0b;">tomorrow</strong>. We can't wait to see you!
    </p>
    <table style="width:100%;border-collapse:collapse;background:#1a1a2e;border-radius:8px;overflow:hidden;margin-bottom:20px;">
      ${detailRow("Date", formatDate(data.bookingDate))}
      ${detailRow("Time", formatTime(data.bookingTime))}
      ${detailRow("Package", data.serviceName)}
      ${data.balance > 0 ? detailRow("Balance Due on Arrival", formatPeso(data.balance)) : detailRow("Status", "✅ Fully Paid")}
    </table>
    <p style="color:#f59e0b;font-size:13px;background:#f59e0b15;border:1px solid #f59e0b30;padding:12px;border-radius:8px;margin-bottom:12px;">
      📍 <strong>Location:</strong> ${STUDIO_ADDRESS}<br>
      Searchable on Waze &amp; Google Maps as &quot;${STUDIO_NAME}&quot;
    </p>
    <p style="color:#f59e0b;font-size:13px;background:#f59e0b15;border:1px solid #f59e0b30;padding:12px;border-radius:8px;">
      ⏰ <strong>Late policy:</strong> Arrivals 15 minutes or more past your scheduled time will incur a ₱50 late fee.
    </p>
    ${ctaButton("View My Booking →", bookingUrl)}
    <p style="color:#6b6b8a;font-size:12px;text-align:center;">
      Need to reschedule? Reply to this email or message us on Facebook.
    </p>
  `;

  const { error } = await resend.emails.send({
    from: getFromEmail(),
    to: data.clientEmail,
    subject: `⏰ Reminder: Your session tomorrow — ${STUDIO_NAME}`,
    html: baseTemplate("Your session is tomorrow!", body),
  });

  if (error) return { error: error.message };
  return { success: true };
}

export async function sendGalleryLink(data: {
  clientName: string;
  clientEmail: string;
  bookingDate: string;
  bookingToken: string;
}) {
  const resend = getResend();
  if (!resend) return { error: "Email not configured. Add RESEND_API_KEY to .env.local." };

  const bookingUrl = `${APP_URL}/my-booking/${data.bookingToken}`;

  const body = `
    <p style="color:#ccccdd;margin:0 0 20px;font-size:14px;line-height:1.6;">
      Hi <strong style="color:#fff;">${data.clientName}</strong>!
      Your session photos from <strong>${formatDate(data.bookingDate)}</strong> are now ready to view. 🎉
    </p>
    <p style="color:#ccccdd;font-size:14px;">
      Click the button below to view and download your photos. This link is private — only you have it.
    </p>
    ${ctaButton("View My Photos →", bookingUrl)}
    <p style="color:#6b6b8a;font-size:12px;text-align:center;">
      Or copy this link: <a href="${bookingUrl}" style="color:#f59e0b;">${bookingUrl}</a>
    </p>
  `;

  const { error } = await resend.emails.send({
    from: getFromEmail(),
    to: data.clientEmail,
    subject: `📸 Your Photos Are Ready — ${STUDIO_NAME}`,
    html: baseTemplate("Your Photos Are Ready! 🌟", body),
  });

  if (error) return { error: error.message };
  return { success: true };
}
