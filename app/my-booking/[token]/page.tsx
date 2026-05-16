import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { formatDate, formatTime, formatPeso } from "@/lib/utils/formatters";
import { CheckCircle2, Clock, CalendarDays, Package, Wallet } from "lucide-react";
import type { Booking, PaymentStatus, BookingStatus } from "@/types";

const PAYMENT_STYLES: Record<PaymentStatus, string> = {
  paid:    "bg-green-500/15 text-green-400 border-green-500/25",
  partial: "bg-amber-500/15 text-amber-400 border-amber-500/25",
  unpaid:  "bg-red-500/15 text-red-400 border-red-500/25",
};

const BOOKING_STYLES: Record<BookingStatus, string> = {
  confirmed: "bg-green-500/15 text-green-400 border-green-500/25",
  pending:   "bg-amber-500/15 text-amber-400 border-amber-500/25",
  cancelled: "bg-red-500/15 text-red-400 border-red-500/25",
};

const BUCKET = "sessions";

export default async function MyBookingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("bookings")
    .select("*, service:services(name, price, inclusions, duration_minutes)")
    .eq("booking_token", token)
    .single();

  if (!data) notFound();
  const booking = data as unknown as Booking;

  // Fetch session photos from storage
  const { data: photoFiles } = await supabase.storage
    .from(BUCKET)
    .list(booking.id, { sortBy: { column: "created_at", order: "asc" } });

  const photos = (photoFiles ?? [])
    .filter((f) => f.name !== ".emptyFolderPlaceholder")
    .map((f) => {
      const { data: urlData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(`${booking.id}/${f.name}`);
      return urlData.publicUrl;
    });

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Status badges */}
      <div className="flex gap-2 flex-wrap">
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border shadow-sm ${BOOKING_STYLES[booking.booking_status]}`}>
          {booking.booking_status === "confirmed" ? "✅ Confirmed" :
           booking.booking_status === "pending"   ? "⏳ Pending Confirmation" : "❌ Cancelled"}
        </span>
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border shadow-sm ${PAYMENT_STYLES[booking.payment_status]}`}>
          {booking.payment_status === "paid" ? "💳 Fully Paid" :
           booking.payment_status === "partial" ? "💳 Partially Paid" : "💳 Payment Pending"}
        </span>
      </div>

      {/* Pending notice */}
      {booking.booking_status === "pending" && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm">
          <p className="font-semibold mb-1">Awaiting Confirmation</p>
          <p className="text-amber-400/80 text-xs">
            Your booking request has been received. The studio will confirm your preferred schedule shortly. Please wait for our message.
          </p>
        </div>
      )}

      {/* Session details */}
      <div className="bg-charcoal-900 border border-charcoal-800 rounded-xl p-5 space-y-4">
        <p className="text-xs font-semibold text-charcoal-500 uppercase tracking-wider">Session Details</p>

        <div className="flex items-center gap-3">
          <CalendarDays size={16} className="text-brand-400 shrink-0" />
          <div>
            <p className="text-charcoal-500 text-xs">Date</p>
            <p className="text-white font-medium">{formatDate(booking.booking_date)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Clock size={16} className="text-brand-400 shrink-0" />
          <div>
            <p className="text-charcoal-500 text-xs">Time</p>
            <p className="text-white font-medium">
              {formatTime(booking.booking_time)}
              {booking.booking_status === "pending" && <span className="text-charcoal-500 text-xs ml-1">(preferred)</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Package size={16} className="text-brand-400 shrink-0" />
          <div>
            <p className="text-charcoal-500 text-xs">Package</p>
            <p className="text-white font-medium">{booking.service?.name ?? "—"}</p>
          </div>
        </div>
        {booking.notes && (
          <div className="pt-2 border-t border-charcoal-800">
            <p className="text-charcoal-500 text-xs mb-1">Notes</p>
            <p className="text-charcoal-300 text-sm">{booking.notes}</p>
          </div>
        )}
      </div>

      {/* Payment summary */}
      <div className="bg-charcoal-900 border border-charcoal-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Wallet size={15} className="text-brand-400" />
          <p className="text-xs font-semibold text-charcoal-500 uppercase tracking-wider">Payment</p>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-charcoal-400">Total</span>
            <span className="text-white font-medium">{formatPeso(booking.total_amount)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-charcoal-400">Amount Paid</span>
            <span className="text-green-400 font-medium">{formatPeso(booking.downpayment_amount)}</span>
          </div>
          <div className="flex justify-between text-sm border-t border-charcoal-800 pt-2 mt-2">
            <span className="text-charcoal-400">Balance Due</span>
            <span className={`font-bold ${booking.balance <= 0 ? "text-green-400" : "text-amber-400"}`}>
              {formatPeso(booking.balance)}
            </span>
          </div>
        </div>
        {booking.payment_status === "paid" && (
          <div className="flex items-center gap-2 mt-3 text-green-400 text-sm">
            <CheckCircle2 size={14} /> Fully paid — thank you!
          </div>
        )}
        {booking.balance > 0 && (
          <p className="text-charcoal-500 text-xs mt-3">
            Please settle your balance on or before your session date.
          </p>
        )}
      </div>

      {/* Late policy */}
      <div className="flex items-start gap-2 p-3 rounded-xl bg-charcoal-900 border border-charcoal-800 text-xs text-charcoal-400">
        <Clock size={13} className="text-amber-400 shrink-0 mt-0.5" />
        <span><strong className="text-amber-400">Bawal ma-late po!</strong> Arrive 15 minutes or more late and there is a ₱50 fee. A no-show means your downpayment is non-refundable.</span>
      </div>

      {/* Session photos */}
      {photos.length > 0 && (
        <div className="bg-charcoal-900 border border-charcoal-800 rounded-xl p-5">
          <p className="text-xs font-semibold text-charcoal-500 uppercase tracking-wider mb-4">
            Your Photos ({photos.length})
          </p>
          <div className="grid grid-cols-2 gap-2">
            {photos.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Photo ${i + 1}`}
                  className="w-full aspect-square object-cover border border-charcoal-700 hover:scale-105 hover:border-brand-500/40 transition-all duration-300 ease-out" />
              </a>
            ))}
          </div>
          <p className="text-charcoal-600 text-xs mt-3 text-center">Tap a photo to view full size</p>
        </div>
      )}

      {photos.length === 0 && booking.booking_status === "confirmed" && (
        <div className="text-center py-6 text-charcoal-600 text-sm">
          📁 Session photos will appear here once your gallery is ready.
        </div>
      )}
    </div>
  );
}
