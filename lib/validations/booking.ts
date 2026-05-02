import { z } from "zod";

export const bookingSchema = z.object({
  client_name: z.string().min(1, "Client name is required"),
  client_phone: z.string().min(1, "Phone number is required"),
  client_email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  booking_date: z.string().min(1, "Booking date is required"),
  booking_time: z.string().min(1, "Booking time is required"),
  package_id: z.string().uuid("Please select a package"),
  total_amount: z.coerce.number().min(1, "Total must be at least ₱1"),
  downpayment_amount: z.coerce.number().min(0, "Downpayment cannot be negative"),
  notes: z.string().optional(),
  celebrant_name: z.string().optional(),
  turning_age: z.string().optional(),
  theme: z.string().optional(),
}).refine(
  (d) => d.downpayment_amount <= d.total_amount,
  { message: "Downpayment cannot exceed the total amount", path: ["downpayment_amount"] }
);

export type BookingFormData = z.infer<typeof bookingSchema>;
