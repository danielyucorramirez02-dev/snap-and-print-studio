import { notFound } from "next/navigation";
import {
  CalendarDays,
  Camera,
  CheckCircle2,
  Clock,
  Download,
  ImageIcon,
  MessageCircle,
  Package,
  Wallet,
} from "lucide-react";
import { MESSENGER_URL } from "@/lib/studio";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatPeso, formatTime } from "@/lib/utils/formatters";
import {
  PRODUCTION_STATUS_LABELS,
  PRODUCTION_STATUS_STYLES,
  normalizeProductionStatus,
} from "@/lib/booking-production";
import type { Booking, BookingStatus, PaymentStatus, ProductionStatus } from "@/types";

const PAYMENT_STYLES: Record<PaymentStatus, string> = {
  paid: "bg-green-500/15 text-green-300 border-green-500/25",
  partial: "bg-amber-500/15 text-amber-300 border-amber-500/25",
  unpaid: "bg-red-500/15 text-red-300 border-red-500/25",
};

const BOOKING_STYLES: Record<BookingStatus, string> = {
  confirmed: "bg-green-500/15 text-green-300 border-green-500/25",
  pending: "bg-amber-500/15 text-amber-300 border-amber-500/25",
  cancelled: "bg-red-500/15 text-red-300 border-red-500/25",
};

const BUCKET = "sessions";

function bookingStatusLabel(status: BookingStatus) {
  if (status === "confirmed") return "Confirmed";
  if (status === "pending") return "Pending confirmation";
  return "Cancelled";
}

function paymentStatusLabel(status: PaymentStatus) {
  if (status === "paid") return "Fully paid";
  if (status === "partial") return "Partially paid";
  return "Payment pending";
}

function galleryStatusCopy(status: ProductionStatus, photoCount: number) {
  if (photoCount > 0) {
    return {
      title: "Your gallery is ready",
      body: `${photoCount} photo${photoCount === 1 ? "" : "s"} available. Tap any photo to open the full-size image.`,
    };
  }

  if (status === "editing") {
    return {
      title: "Your photos are being edited",
      body: "The studio is preparing your gallery. Photos will appear here once they are ready.",
    };
  }

  if (status === "ready" || status === "delivered") {
    return {
      title: "Gallery delivery in progress",
      body: "The gallery is being prepared for upload. Please check this link again shortly.",
    };
  }

  return {
    title: "Gallery not ready yet",
    body: "Session photos will appear here once the studio uploads them.",
  };
}

export default async function MyBookingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();

  const { data: rpcData, error: rpcError } = await supabase
    .rpc("public_get_booking_by_token", { p_token: token })
    .single();

  const { data: fallbackData } = rpcError
    ? await supabase
        .from("bookings")
        .select("*, service:services(name, price, inclusions, duration_minutes)")
        .eq("booking_token", token)
        .single()
    : { data: null };

  const data = rpcData ?? fallbackData;
  if (!data) notFound();

  const booking = data as unknown as Booking;
  const productionStatus = normalizeProductionStatus(
    (data as { production_status?: ProductionStatus | null }).production_status
  );

  const { data: photoFiles } = await supabase.storage
    .from(BUCKET)
    .list(booking.id, { sortBy: { column: "created_at", order: "asc" } });

  const photos = (photoFiles ?? [])
    .filter((file) => file.name !== ".emptyFolderPlaceholder")
    .map((file) => {
      const { data: urlData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(`${booking.id}/${file.name}`);

      return {
        name: file.name,
        url: urlData.publicUrl,
      };
    });

  const galleryCopy = galleryStatusCopy(productionStatus, photos.length);

  return (
    <div className="space-y-4 animate-fade-in-up">
      <section className="rounded-2xl border border-charcoal-800 bg-charcoal-900/80 p-5 shadow-xl shadow-black/20">
        <div className="flex flex-wrap gap-2">
          <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${BOOKING_STYLES[booking.booking_status]}`}>
            {bookingStatusLabel(booking.booking_status)}
          </span>
          <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${PAYMENT_STYLES[booking.payment_status]}`}>
            {paymentStatusLabel(booking.payment_status)}
          </span>
          <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${PRODUCTION_STATUS_STYLES[productionStatus]}`}>
            {PRODUCTION_STATUS_LABELS[productionStatus]}
          </span>
        </div>

        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-300">Booking for</p>
          <h2 className="mt-1 text-2xl font-bold text-white">{booking.client_name}</h2>
          <p className="mt-2 text-sm text-charcoal-400">
            {booking.service?.name ?? "Studio session"} at Snap & Print Studio
          </p>
        </div>
      </section>

      {booking.booking_status === "pending" && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200">
          <p className="font-semibold">Awaiting confirmation</p>
          <p className="mt-1 text-xs text-amber-200/80">
            Your booking request has been received. The studio will confirm your preferred schedule shortly.
          </p>
        </div>
      )}

      <section className="rounded-2xl border border-charcoal-800 bg-charcoal-900 p-5">
        <div className="mb-4 flex items-center gap-2">
          <Camera size={16} className="text-brand-400" />
          <p className="text-xs font-semibold uppercase tracking-wider text-charcoal-500">Gallery</p>
        </div>

        <div className="rounded-xl border border-charcoal-800 bg-charcoal-950/60 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-brand-500/20 bg-brand-500/10">
              <ImageIcon size={18} className="text-brand-300" />
            </div>
            <div>
              <p className="font-semibold text-white">{galleryCopy.title}</p>
              <p className="mt-1 text-sm text-charcoal-400">{galleryCopy.body}</p>
            </div>
          </div>
        </div>

        {photos.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {photos.map((photo, index) => (
              <a
                key={photo.name}
                href={photo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative block overflow-hidden rounded-xl border border-charcoal-800 bg-charcoal-950"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={`Session photo ${index + 1}`}
                  className="aspect-square w-full object-cover transition duration-300 group-hover:scale-105"
                />
                <span className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100">
                  <Download size={14} />
                </span>
              </a>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-charcoal-800 bg-charcoal-900 p-5">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-charcoal-500">Session details</p>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <CalendarDays size={16} className="shrink-0 text-brand-400" />
            <div>
              <p className="text-xs text-charcoal-500">Date</p>
              <p className="font-medium text-white">{formatDate(booking.booking_date)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Clock size={16} className="shrink-0 text-brand-400" />
            <div>
              <p className="text-xs text-charcoal-500">Time</p>
              <p className="font-medium text-white">
                {formatTime(booking.booking_time)}
                {booking.booking_status === "pending" && (
                  <span className="ml-1 text-xs text-charcoal-500">(preferred)</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Package size={16} className="shrink-0 text-brand-400" />
            <div>
              <p className="text-xs text-charcoal-500">Package</p>
              <p className="font-medium text-white">{booking.service?.name ?? "Studio session"}</p>
            </div>
          </div>

          {booking.notes && (
            <div className="border-t border-charcoal-800 pt-4">
              <p className="mb-1 text-xs text-charcoal-500">Notes</p>
              <p className="text-sm text-charcoal-300">{booking.notes}</p>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-charcoal-800 bg-charcoal-900 p-5">
        <div className="mb-4 flex items-center gap-2">
          <Wallet size={15} className="text-brand-400" />
          <p className="text-xs font-semibold uppercase tracking-wider text-charcoal-500">Payment</p>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-charcoal-400">Total</span>
            <span className="font-medium text-white">{formatPeso(booking.total_amount)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-charcoal-400">Amount paid</span>
            <span className="font-medium text-green-300">{formatPeso(booking.downpayment_amount)}</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-charcoal-800 pt-2 text-sm">
            <span className="text-charcoal-400">Balance due</span>
            <span className={`font-bold ${booking.balance <= 0 ? "text-green-300" : "text-amber-300"}`}>
              {formatPeso(booking.balance)}
            </span>
          </div>
        </div>

        {booking.payment_status === "paid" ? (
          <div className="mt-3 flex items-center gap-2 text-sm text-green-300">
            <CheckCircle2 size={14} />
            Fully paid. Thank you!
          </div>
        ) : (
          <p className="mt-3 text-xs text-charcoal-500">
            Please settle your balance on or before your session date.
          </p>
        )}
      </section>

      <div className="flex items-start gap-2 rounded-xl border border-charcoal-800 bg-charcoal-900 p-3 text-xs text-charcoal-400">
        <Clock size={13} className="mt-0.5 shrink-0 text-amber-400" />
        <span>
          <strong className="text-amber-300">Bawal ma-late po!</strong> Arrive 15 minutes or more late and there is a PHP 50 fee. A no-show means your downpayment is non-refundable.
        </span>
      </div>

      <a
        href={MESSENGER_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0084FF] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0072e0]"
      >
        <MessageCircle size={16} />
        Message us on Messenger
      </a>
    </div>
  );
}
