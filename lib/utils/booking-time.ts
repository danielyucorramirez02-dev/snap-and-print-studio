const MANILA_UTC_OFFSET_MS = 8 * 60 * 60 * 1000;
const BOOKING_LEAD_TIME_MINUTES = 60;

export function manilaDateString(nowMs = Date.now()): string {
  const shifted = new Date(nowMs + MANILA_UTC_OFFSET_MS);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const d = String(shifted.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function bookingStartMs(date: string, time: string): number {
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = time.substring(0, 5).split(":").map(Number);
  return Date.UTC(year, month - 1, day, hours, minutes) - MANILA_UTC_OFFSET_MS;
}

export function minutesUntilBooking(date: string, time: string, nowMs = Date.now()): number {
  return Math.floor((bookingStartMs(date, time) - nowMs) / 60000);
}

export function violatesBookingLeadTime(date: string, time: string, nowMs = Date.now()): boolean {
  return bookingStartMs(date, time) - nowMs <= BOOKING_LEAD_TIME_MINUTES * 60 * 1000;
}

export function filterSlotsByLeadTime(date: string, slots: string[], nowMs = Date.now()): string[] {
  return slots.filter((slot) => !violatesBookingLeadTime(date, slot, nowMs));
}
