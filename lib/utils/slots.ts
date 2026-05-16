import type { Booking, Service } from "@/types";

// Online-bookable hours per day of week (0=Sun ... 6=Sat). Opens at 10am so
// pre-booked sessions can be prepared ahead; physical walk-ins are 1pm-7pm.
export const STUDIO_HOURS: Record<number, { open: string; close: string } | null> = {
  0: { open: "10:00", close: "19:00" }, // Sunday
  1: { open: "10:00", close: "19:00" }, // Monday
  2: { open: "10:00", close: "19:00" }, // Tuesday
  3: { open: "10:00", close: "19:00" }, // Wednesday
  4: { open: "10:00", close: "16:00" }, // Thursday
  5: { open: "10:00", close: "19:00" }, // Friday
  6: { open: "10:00", close: "19:00" }, // Saturday
};

// Each self-shoot booking holds the slot for a fixed block so bookings stay
// spaced out. First three packages (Solo Muna, Pakners, Trio) hold it for
// 1 hour; the last two (Tropa Time, Family) need 1.5 hours.
export function getSelfShootBlockMinutes(name: string): number {
  const n = name.toLowerCase();
  if (n.includes("tropa") || n.includes("family")) return 90;
  return 60;
}

export function isSelfShoot(category: string | null): boolean {
  return category === "self-shoot";
}

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function toTimeString(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

export function formatSlotLabel(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${displayH}:${m.toString().padStart(2, "0")} ${period}`;
}

export function getStudioHoursForDate(dateStr: string): { open: string; close: string } | null {
  // Parse as local date to avoid UTC shift
  const d = new Date(dateStr + "T00:00:00");
  return STUDIO_HOURS[d.getDay()] ?? null;
}

// Generate available 15-minute self-shoot slots for a date + service,
// blocking slots that conflict with existing confirmed bookings.
export function getSelfShootSlots(
  dateStr: string,
  service: Service,
  confirmedBookings: Booking[]
): string[] {
  const hours = getStudioHoursForDate(dateStr);
  if (!hours) return [];

  const openMin = toMinutes(hours.open);
  const closeMin = toMinutes(hours.close);
  const newBlock = getSelfShootBlockMinutes(service.name);

  const slots: string[] = [];

  // Slots are offered every 15 minutes; a slot is unavailable when its
  // booking block would overlap the block of an existing booking.
  for (let start = openMin; start + newBlock <= closeMin; start += 15) {
    const newEnd = start + newBlock;

    const conflict = confirmedBookings.some((b) => {
      const existingStart = toMinutes(b.booking_time);
      const existingEnd =
        existingStart +
        (b.service ? getSelfShootBlockMinutes(b.service.name) : 60);

      return start < existingEnd && newEnd > existingStart;
    });

    if (!conflict) slots.push(toTimeString(start));
  }

  return slots;
}

// Fixed milestone/coverage time slots
export const MILESTONE_EARLY_SLOTS = ["08:00", "09:00", "10:00"] as const;
export const MILESTONE_LATE_SLOTS  = ["14:00", "15:00", "16:00"] as const;
export type MilestoneHalfDay = "early" | "late";

// Reasons a date may have no bookable slots
export type SlotAvailabilityReason = "open" | "closed-day" | "blocked" | "capped" | "no-slots";

export function isDailyCapReached(
  confirmedSelfShootsCount: number,
  dailyCap: number | null | undefined
): boolean {
  if (dailyCap === null || dailyCap === undefined) return false;
  return confirmedSelfShootsCount >= dailyCap;
}
