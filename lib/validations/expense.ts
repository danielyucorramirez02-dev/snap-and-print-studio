import { z } from "zod";

export const expenseSchema = z.object({
  category: z.enum(["supplies", "utilities", "equipment", "other"], {
    required_error: "Select a category",
  }),
  description: z.string().min(1, "Description is required"),
  amount: z.coerce.number().min(1, "Amount must be at least ₱1"),
  expense_date: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
});

export type ExpenseFormData = z.infer<typeof expenseSchema>;
