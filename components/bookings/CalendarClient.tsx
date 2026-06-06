"use client";

import { useMemo, useState } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  format,
  addMonths,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus, CalendarX, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatTime } from "@/lib/utils/formatters";
import BookingModal from "@/components/bookings/BookingModal";
import BookingDrawer from "@/components/bookings/BookingDrawer";
import {
  PRODUCTION_STATUS_SHORT_LABELS,
  PRODUCTION_STATUS_STYLES,
  normalizeProductionStatus,
} from "@/lib/booking-production";
import type { Booking, Service, UserRole, PaymentStatus, BlockedDate, BlockedTimeSlot } from "@/types";

interface CalendarClientProps {
  bookings: Booking[];
  services: Service[];
  userRole: UserRole;
  blockedDates: BlockedDate[];
  blockedTimeSlots: BlockedTimeSlot[];
}

const STATUS_CHIP: Record<PaymentStatus, string> = {
  paid: "bg-green-500/15 text-green-400 border-green-500/25",
  partial: "bg-amber-500/15 text-amber-400 border-amber-500/25",
  unpaid: "bg-red-500/15 text-red-400 border-red-500/25",
};

const PENDING_CHIP = "bg-amber-500/10 text-amber-300 border-amber-500/40 border-dashed";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_CHIPS = 3;

function formatBlockLabel(block: BlockedDate | BlockedTimeSlot): string {
  const reason = block.reason ? `: ${block.reason}` : "";
  if (block.start_time && block.end_time) {
    return `${formatTime(block.start_time)}-${formatTime(block.end_time)}${reason}`;
  }
  return block.reason ?? "Whole day";
}

interface BookingChipProps {
  booking: Booking;
  onClick: () => void;
}

function BookingChip({ booking, onClick }: BookingChipProps) {
  const isPending = booking.booking_status === "pending";
  const chipClass = isPending ? PENDING_CHIP : STATUS_CHIP[booking.payment_status];
  const productionStatus = normalizeProductionStatus(booking.production_status);
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`w-full text-left text-xs px-1.5 py-0.5 rounded border truncate transition-opacity hover:opacity-75 ${chipClass}`}
    >
      {isPending && <span className="mr-0.5">⏳</span>}
      <span className="font-medium">{formatTime(booking.booking_time)}</span>{" "}
      <span>{booking.client_name}</span>
      {booking.attendance_status === "no_show" && <span className="ml-1 text-red-300">| No-show</span>}
      {!isPending && productionStatus !== "not_started" && (
        <span className="ml-1 opacity-80">| {PRODUCTION_STATUS_SHORT_LABELS[productionStatus]}</span>
      )}
    </button>
  );
}

interface DayCellProps {
  day: Date;
  bookings: Booking[];
  isCurrentMonth: boolean;
  isTodayDate: boolean;
  blockedReason: string | null | undefined;
  isBlocked: boolean;
  onBookingClick: (b: Booking) => void;
  onDayClick: () => void;
}

function DayCell({ day, bookings, isCurrentMonth, isTodayDate, blockedReason, isBlocked, onBookingClick, onDayClick }: DayCellProps) {
  const visible = bookings.slice(0, MAX_CHIPS);
  const overflow = bookings.length - MAX_CHIPS;
  const hasBookings = bookings.length > 0;

  const baseBg = isCurrentMonth ? "bg-charcoal-900" : "bg-charcoal-950";
  const blockedBg = isBlocked ? "bg-red-500/10" : "";

  return (
    <div
      onClick={hasBookings ? onDayClick : undefined}
      className={`relative min-h-[100px] border-r border-b border-charcoal-800 p-1.5 ${baseBg} ${blockedBg} ${hasBookings ? "cursor-pointer hover:brightness-110 transition-all" : ""}`}
    >
      <div className="flex items-center justify-between mb-1">
        <span
          className={`text-xs font-medium inline-flex w-6 h-6 items-center justify-center rounded-full ${
            isTodayDate
              ? "bg-brand-500 text-white"
              : isCurrentMonth
              ? "text-charcoal-300"
              : "text-charcoal-600"
          }`}
        >
          {format(day, "d")}
        </span>
        {isBlocked && (
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-500/20 text-red-300 border border-red-500/30"
            title={blockedReason ? `Blocked: ${blockedReason}` : "Blocked"}
          >
            <CalendarX size={10} />
            BLOCKED
          </span>
        )}
      </div>
      {isBlocked && blockedReason && (
        <p className="text-[10px] text-red-300/70 mb-1 truncate" title={blockedReason}>
          {blockedReason}
        </p>
      )}
      <div className="space-y-0.5">
        {visible.map((b) => (
          <BookingChip key={b.id} booking={b} onClick={() => onBookingClick(b)} />
        ))}
        {overflow > 0 && (
          <p className="text-xs text-brand-400 font-medium pl-1">+{overflow} more</p>
        )}
      </div>
    </div>
  );
}

interface DayDetailModalProps {
  day: Date;
  bookings: Booking[];
  onBookingClick: (b: Booking) => void;
  onClose: () => void;
}

function DayDetailModal({ day, bookings, onBookingClick, onClose }: DayDetailModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-charcoal-900 border border-charcoal-700 rounded-xl w-full max-w-sm max-h-[80vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-charcoal-800 shrink-0">
          <div>
            <h3 className="text-white font-semibold text-sm">{format(day, "EEEE, MMMM d")}</h3>
            <p className="text-charcoal-500 text-xs">
              {bookings.length} booking{bookings.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button onClick={onClose} className="text-charcoal-400 hover:text-white transition-colors" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto divide-y divide-charcoal-800">
          {bookings.map((b) => {
            const isPending = b.booking_status === "pending";
            const productionStatus = normalizeProductionStatus(b.production_status);
            return (
              <button
                key={b.id}
                onClick={() => onBookingClick(b)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-charcoal-800/60 transition-colors"
              >
                <span className="text-sm font-semibold text-brand-400 w-16 shrink-0">{formatTime(b.booking_time)}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-white text-sm font-medium truncate">{b.client_name}</p>
                  <p className="text-charcoal-400 text-xs truncate">{b.service?.name ?? "—"}</p>
                </div>
                <span className={`shrink-0 text-[11px] font-medium capitalize px-2 py-0.5 rounded-full border ${isPending ? PENDING_CHIP : STATUS_CHIP[b.payment_status]}`}>
                  {isPending ? "Pending" : b.payment_status}
                </span>
                {!isPending && (
                  <span className={`shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full border ${PRODUCTION_STATUS_STYLES[productionStatus]}`}>
                    {PRODUCTION_STATUS_SHORT_LABELS[productionStatus]}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function CalendarClient({ bookings, services, userRole: _userRole, blockedDates, blockedTimeSlots }: CalendarClientProps) {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerBooking, setDrawerBooking] = useState<Booking | undefined>(undefined);
  const [dayDetail, setDayDetail] = useState<{ day: Date; bookings: Booking[] } | null>(null);

  const blockedByDate = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const bd of blockedDates) {
      map.set(bd.date, [formatBlockLabel(bd)]);
    }
    for (const slot of blockedTimeSlots) {
      const existing = map.get(slot.date) ?? [];
      map.set(slot.date, [...existing, formatBlockLabel(slot)]);
    }
    return map;
  }, [blockedDates, blockedTimeSlots]);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [currentMonth]);

  // Group bookings by "YYYY-MM-DD" key — use local date parsing to avoid UTC timezone shift
  const bookingsByDate = useMemo(() => {
    const map = new Map<string, Booking[]>();
    const gridStart = calendarDays[0];
    const gridEnd = calendarDays[calendarDays.length - 1];

    for (const booking of bookings) {
      const d = new Date(booking.booking_date + "T00:00:00");
      if (d < gridStart || d > gridEnd) continue;
      const key = booking.booking_date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(booking);
    }
    return map;
  }, [bookings, calendarDays]);

  return (
    <>
      <div className="bg-charcoal-900 border border-charcoal-800 rounded-xl overflow-hidden">
        {/* Calendar header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-charcoal-800">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentMonth((d) => subMonths(d, 1))}
              className="p-1.5 rounded-md text-charcoal-400 hover:text-white hover:bg-charcoal-800 transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <h2 className="text-white font-semibold text-base min-w-[140px] text-center">
              {format(currentMonth, "MMMM yyyy")}
            </h2>
            <button
              onClick={() => setCurrentMonth((d) => addMonths(d, 1))}
              className="p-1.5 rounded-md text-charcoal-400 hover:text-white hover:bg-charcoal-800 transition-colors"
            >
              <ChevronRight size={18} />
            </button>
            <button
              onClick={() => setCurrentMonth(startOfMonth(new Date()))}
              className="ml-1 px-2.5 py-1 text-xs rounded-md text-charcoal-400 border border-charcoal-700 hover:text-white hover:bg-charcoal-800 transition-colors"
            >
              Today
            </button>
          </div>

          <Button
            onClick={() => setModalOpen(true)}
            className="bg-brand-500 hover:bg-brand-600 text-white text-sm"
          >
            <Plus size={16} className="mr-1.5" />
            New Booking
          </Button>
        </div>

        {/* Day-of-week labels */}
        <div className="grid grid-cols-7 border-b border-charcoal-800">
          {DAY_LABELS.map((day) => (
            <div
              key={day}
              className="text-center text-xs font-medium text-charcoal-500 py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 border-l border-t border-charcoal-800">
          {calendarDays.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const dayBookings = bookingsByDate.get(key) ?? [];
            const isBlocked = blockedByDate.has(key);
            const blockedReason = blockedByDate.get(key)?.join(", ") ?? null;
            return (
              <DayCell
                key={key}
                day={day}
                bookings={dayBookings}
                isCurrentMonth={isSameMonth(day, currentMonth)}
                isTodayDate={isToday(day)}
                isBlocked={isBlocked}
                blockedReason={blockedReason}
                onBookingClick={setDrawerBooking}
                onDayClick={() => setDayDetail({ day, bookings: dayBookings })}
              />
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 px-4 py-3 border-t border-charcoal-800 flex-wrap">
          {(["paid", "partial", "unpaid"] as PaymentStatus[]).map((s) => (
            <div key={s} className="flex items-center gap-1.5">
              <span className={`inline-block w-2.5 h-2.5 rounded-sm border ${STATUS_CHIP[s]}`} />
              <span className="text-xs text-charcoal-500 capitalize">{s}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-red-500/20 border border-red-500/30" />
            <span className="text-xs text-charcoal-500">Blocked</span>
          </div>
        </div>
      </div>

      {/* New Booking Modal */}
      {modalOpen && (
        <BookingModal
          services={services}
          onClose={() => setModalOpen(false)}
        />
      )}

      {/* Booking Detail Drawer */}
      {drawerBooking && (
        <BookingDrawer
          booking={drawerBooking}
          onClose={() => setDrawerBooking(undefined)}
        />
      )}

      {/* Day Detail Modal */}
      {dayDetail && (
        <DayDetailModal
          day={dayDetail.day}
          bookings={dayDetail.bookings}
          onBookingClick={(b) => { setDayDetail(null); setDrawerBooking(b); }}
          onClose={() => setDayDetail(null)}
        />
      )}
    </>
  );
}
