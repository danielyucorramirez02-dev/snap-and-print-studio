import { z } from "zod";

export const paymentSchema = z.object({
  booking_id: z.string().uuid("Invalid booking."),
  amount: z.coerce.number().min(1, "Amount must be at least ₱1"),
  payment_method: z.enum(["cash", "gcash", "bank"], {
    required_error: "Select a payment method",
  }),
  payment_date: z.string().min(1, "Payment date is required"),
  notes: z.string().optional(),
});

export type PaymentFormData = z.infer<typeof paymentSchema>;
